package gttd

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"time"
	"traviia/internal/models"
	"traviia/internal/pricing"
)

const (
	MaxProductsPerShard = 500
	FeedOutputDir       = "/tmp/gttd_feeds"
)

// DBInterface defines database operations needed for feed generation
type DBInterface interface {
	GetGTTDEnabledExperiences(ctx context.Context) ([]models.ExperienceGTTD, error)
	GetApplicablePricingRule(ctx context.Context, experienceID string, city string) *models.PricingRule
}

// DBExperience represents an experience with options for feed generation
type DBExperience struct {
	ID                    string
	HeadoutID             string
	Title                 string
	Description           string
	City                  string
	Country               string
	Latitude              float64
	Longitude             float64
	POIID                 string
	POIName               string
	HeadoutRating         float64
	HeadoutReviewCount    int
	Images                []map[string]interface{}
	OperatorName          string
	OperatorDescription   string
	Categories            []string
	Languages             []string
	DurationMinSeconds    int
	DurationMaxSeconds    int
	CancellationPolicy    *map[string]interface{}
	Options               []DBOption
}

// DBOption represents an experience option/variant
type DBOption struct {
	HeadoutVariantID  string
	Title             string
	BasePriceAmount   float64
	BasePriceCurrency string
	FulfillmentMobile bool
	FulfillmentPrint  bool
	FulfillmentPickup bool
	Inclusions        []string
	Exclusions        []string
	Highlights        []string
}

type FeedGenerator struct {
	db            DBInterface
	pricingEngine *pricing.PricingEngine
	baseURL       string
}

// NewFeedGenerator creates a new feed generator
func NewFeedGenerator(db DBInterface, pricingEngine *pricing.PricingEngine, baseURL string) *FeedGenerator {
	return &FeedGenerator{
		db:            db,
		pricingEngine: pricingEngine,
		baseURL:       baseURL,
	}
}

// GenerateFeed builds the complete ProductFeed and writes JSON files to disk
func (g *FeedGenerator) GenerateFeed(ctx context.Context) ([]string, error) {
	// Fetch all GTTD-enabled experiences
	experiences, err := g.db.GetGTTDEnabledExperiences(ctx)
	if err != nil {
		return nil, fmt.Errorf("fetch experiences: %w", err)
	}

	// Convert to GTTD Product structs
	products := make([]Product, 0, len(experiences))
	for _, exp := range experiences {
		// Map GTTD experience to DBExperience
		dbExp := g.mapExperienceToDBExperience(exp)
		p, err := g.buildProduct(ctx, dbExp)
		if err != nil {
			// Log and skip, don't fail the whole feed
			continue
		}
		products = append(products, p)
	}

	if len(products) == 0 {
		return nil, fmt.Errorf("no valid products to include in feed")
	}

	// Shard if needed
	shards := shardProducts(products, MaxProductsPerShard)
	nonce := generateNonce()
	totalShards := len(shards)

	// Ensure output directory exists
	if err := os.MkdirAll(FeedOutputDir, 0755); err != nil {
		return nil, fmt.Errorf("create output dir: %w", err)
	}

	// Write each shard to a JSON file
	filePaths := make([]string, 0, totalShards)
	for i, shard := range shards {
		feed := ProductFeed{
			FeedMetadata: FeedMetadata{
				ShardID:               i,
				TotalShardsCount:      totalShards,
				Nonce:                 nonce,
				ProcessingInstruction: ProcessingInstruction,
			},
			Products: shard,
		}

		fileName := fmt.Sprintf("traviia_gttd_feed_shard_%d_%d.json", i, nonce)
		filePath := filepath.Join(FeedOutputDir, fileName)

		data, err := json.MarshalIndent(feed, "", "  ")
		if err != nil {
			return nil, fmt.Errorf("marshal feed shard %d: %w", i, err)
		}

		if err := os.WriteFile(filePath, data, 0644); err != nil {
			return nil, fmt.Errorf("write feed shard %d: %w", i, err)
		}

		filePaths = append(filePaths, filePath)
	}

	return filePaths, nil
}

// mapExperienceToDBExperience converts GTTD model to DBExperience
func (g *FeedGenerator) mapExperienceToDBExperience(exp models.ExperienceGTTD) DBExperience {
	var images []map[string]interface{}
	if err := json.Unmarshal(exp.Images, &images); err != nil {
		images = []map[string]interface{}{}
	}

	var categories []string
	_ = json.Unmarshal(exp.Categories, &categories)

	var languages []string
	_ = json.Unmarshal(exp.Languages, &languages)

	var cancPolicy *map[string]interface{}
	if len(exp.CancellationPolicy) > 0 {
		var cp map[string]interface{}
		if err := json.Unmarshal(exp.CancellationPolicy, &cp); err == nil {
			cancPolicy = &cp
		}
	}

	var options []DBOption
	for _, opt := range exp.Options {
		var inclusions, exclusions, highlights []string
		json.Unmarshal(opt.Inclusions, &inclusions)
		json.Unmarshal(opt.Exclusions, &exclusions)
		json.Unmarshal(opt.Highlights, &highlights)

		options = append(options, DBOption{
			HeadoutVariantID:  opt.HeadoutVariantID,
			Title:             opt.Title,
			BasePriceAmount:   opt.BasePriceAmount,
			BasePriceCurrency: opt.BasePriceCurrency,
			FulfillmentMobile: opt.FulfillmentMobile,
			FulfillmentPrint:  opt.FulfillmentPrint,
			FulfillmentPickup: opt.FulfillmentPickup,
			Inclusions:        inclusions,
			Exclusions:        exclusions,
			Highlights:        highlights,
		})
	}

	return DBExperience{
		ID:                  exp.ID,
		HeadoutID:           exp.HeadoutID,
		Title:               exp.Title,
		Description:         exp.Description,
		City:                exp.City,
		Country:             exp.Country,
		Latitude:            exp.Latitude,
		Longitude:           exp.Longitude,
		POIID:               exp.POIID,
		POIName:             exp.POIName,
		HeadoutRating:       exp.HeadoutRating,
		HeadoutReviewCount:  exp.HeadoutReviewCount,
		Images:              images,
		OperatorName:        exp.OperatorName,
		OperatorDescription: exp.OperatorDescription,
		Categories:          categories,
		Languages:           languages,
		DurationMinSeconds:  exp.DurationMinSeconds,
		DurationMaxSeconds:  exp.DurationMaxSeconds,
		CancellationPolicy:  cancPolicy,
		Options:             options,
	}
}

// buildProduct converts a DB experience + its options into a GTTD Product struct
func (g *FeedGenerator) buildProduct(ctx context.Context, exp DBExperience) (Product, error) {
	// Validate required fields
	if exp.POIID == "" {
		return Product{}, fmt.Errorf("experience %s has no POI ID", exp.ID)
	}
	if len(exp.Options) == 0 {
		return Product{}, fmt.Errorf("experience %s has no options", exp.ID)
	}

	// Build options
	options := make([]Option, 0, len(exp.Options))
	for _, opt := range exp.Options {
		o, err := g.buildOption(ctx, exp, opt)
		if err != nil {
			continue
		}
		options = append(options, o)
	}
	if len(options) == 0 {
		return Product{}, fmt.Errorf("experience %s has no valid options", exp.ID)
	}

	// Build product_features
	features := []TextFeature{}
	if len(exp.Options) > 0 {
		opt := exp.Options[0]
		for _, inc := range opt.Inclusions {
			features = append(features, TextFeature{
				FeatureType: FeatureInclusion,
				Value:       NewEnglishText(inc),
			})
		}
		for _, exc := range opt.Exclusions {
			features = append(features, TextFeature{
				FeatureType: FeatureExclusion,
				Value:       NewEnglishText(exc),
			})
		}
		for _, hl := range opt.Highlights {
			features = append(features, TextFeature{
				FeatureType: FeatureHighlight,
				Value:       NewEnglishText(hl),
			})
		}
	}

	// Build categories
	categories := []Category{}
	for _, cat := range exp.Categories {
		categories = append(categories, Category{CategoryType: cat})
	}

	// Build media
	media := []Media{}
	for _, img := range exp.Images {
		if url, ok := img["url"].(string); ok {
			media = append(media, Media{
				URL:  url,
				Type: "PHOTO",
			})
		}
	}

	// Build related location (POI)
	relatedLocations := []RelatedLocation{
		{
			Location: GeoLocation{
				PlaceID: exp.POIID,
			},
			Relation: RelationAttraction,
			LocationName: func() *LocalizedTextSet {
				t := NewEnglishText(exp.POIName)
				return &t
			}(),
		},
	}

	return Product{
		ID:                fmt.Sprintf("traviia-%s", exp.HeadoutID),
		Title:             NewEnglishText(exp.Title),
		Description:       NewEnglishText(exp.Description),
		Brand:             &Brand{Name: NewEnglishText("Traviia")},
		Rating: func() *Rating {
			if exp.HeadoutRating > 0 && exp.HeadoutReviewCount > 0 {
				return &Rating{
					AverageValue: exp.HeadoutRating,
					RatingCount:  exp.HeadoutReviewCount,
				}
			}
			return nil
		}(),
		ProductFeatures:   features,
		ProductCategories: categories,
		RelatedLocations:  relatedLocations,
		Operator: &Operator{
			Name: NewEnglishText(exp.OperatorName),
		},
		Options: options,
		Media:   media,
	}, nil
}

// buildOption converts a DB option into a GTTD Option struct
func (g *FeedGenerator) buildOption(ctx context.Context, exp DBExperience, opt DBOption) (Option, error) {
	// Calculate final price using PricingEngine
	priceResult := g.pricingEngine.CalculatePrice(
		ctx,
		opt.BasePriceAmount,
		opt.BasePriceCurrency,
		exp.ID,
		exp.City,
	)

	// Build the deep link URL
	landingPageURL := fmt.Sprintf("%s/%s/%s?variant=%s",
		g.baseURL,
		slugify(exp.City),
		slugify(exp.Title),
		opt.HeadoutVariantID,
	)
	listingPageURL := fmt.Sprintf("%s/%s", g.baseURL, slugify(exp.City))

	// Build languages
	languages := []Language{}
	for _, lang := range exp.Languages {
		languages = append(languages, Language{LanguageCode: lang})
	}
	if len(languages) == 0 {
		languages = []Language{{LanguageCode: "en"}}
	}

	// Build cancellation policy
	var cancPolicy *CancellationPolicy
	if exp.CancellationPolicy != nil {
		cancPolicy = &CancellationPolicy{
			RefundConditions: []RefundCondition{
				{
					MinDurationBeforeStartTime: Duration{
						MinDurationSeconds: 86400, // 24 hours default
					},
					RefundPercent: 100,
				},
			},
		}
	}

	return Option{
		ID:    fmt.Sprintf("opt-%s", opt.HeadoutVariantID),
		Title: NewEnglishText(opt.Title),
		LandingPage: DeepLink{
			URL: landingPageURL,
		},
		LandingPageListView: &DeepLink{
			URL: listingPageURL,
		},
		PriceOptions: []PriceOption{
			{
				ID:    fmt.Sprintf("price-%s-adult", opt.HeadoutVariantID),
				Title: NewEnglishText("Adult"),
				Price: Price{
					Value:        priceResult.FormattedAmount,
					CurrencyCode: priceResult.CurrencyCode,
				},
			},
		},
		CancellationPolicy: cancPolicy,
		Duration: func() *Duration {
			if exp.DurationMinSeconds > 0 {
				return &Duration{
					MinDurationSeconds: exp.DurationMinSeconds,
					MaxDurationSeconds: exp.DurationMaxSeconds,
				}
			}
			return nil
		}(),
		Languages: languages,
		Fulfillment: &Fulfillment{
			Mobile:      opt.FulfillmentMobile,
			PrintAtHome: opt.FulfillmentPrint,
			Pickup:      opt.FulfillmentPickup,
		},
	}, nil
}

// Helper functions

func shardProducts(products []Product, maxPerShard int) [][]Product {
	var shards [][]Product
	for i := 0; i < len(products); i += maxPerShard {
		end := i + maxPerShard
		if end > len(products) {
			end = len(products)
		}
		shards = append(shards, products[i:end])
	}
	if len(shards) == 0 {
		shards = [][]Product{{}}
	}
	return shards
}

func generateNonce() int64 {
	return time.Now().UnixNano() / int64(time.Millisecond)
}

// slugify converts "New York" → "new-york"
func slugify(s string) string {
	s = strings.ToLower(s)
	re := regexp.MustCompile(`[^a-z0-9]+`)
	s = re.ReplaceAllString(s, "-")
	s = strings.Trim(s, "-")
	return s
}
