package gttd

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/travel/backend/internal/pricing"
)

type DBGetter interface {
	GetExperienceByHeadoutID(ctx context.Context, headoutID string) (interface{}, error)
}

type JSONLDBuilder struct {
	db            DBGetter
	pricingEngine *pricing.PricingEngine
	baseURL       string
}

// NewJSONLDBuilder creates a new JSON-LD builder
func NewJSONLDBuilder(db DBGetter, pricingEngine *pricing.PricingEngine, baseURL string) *JSONLDBuilder {
	return &JSONLDBuilder{
		db:            db,
		pricingEngine: pricingEngine,
		baseURL:       baseURL,
	}
}

// JSONLDProduct represents schema.org Product with Offer
type JSONLDProduct struct {
	Context           string                  `json:"@context"`
	Type              string                  `json:"@type"`
	Name              string                  `json:"name"`
	Description       string                  `json:"description"`
	Image             []string                `json:"image"`
	AggregateRating   *JSONLDAggregateRating  `json:"aggregateRating,omitempty"`
	Offers            []JSONLDOffer           `json:"offers"`
}

type JSONLDAggregateRating struct {
	Type        string  `json:"@type"`
	RatingValue float64 `json:"ratingValue"`
	ReviewCount int     `json:"reviewCount"`
	BestRating  int     `json:"bestRating"`
	WorstRating int     `json:"worstRating"`
}

type JSONLDOffer struct {
	Type          string `json:"@type"`
	Name          string `json:"name"`
	Price         string `json:"price"`
	PriceCurrency string `json:"priceCurrency"`
	Availability  string `json:"availability"`
	URL           string `json:"url"`
	ValidFrom     string `json:"validFrom,omitempty"`
}

// Build generates the JSON-LD for a product page
// CRITICAL: Prices are calculated using the same PricingEngine as the feed generator
func (b *JSONLDBuilder) Build(ctx context.Context, headoutID string, experienceID string, city string) (string, error) {
	// This is a placeholder implementation
	// In production, fetch from DB and use real data

	product := JSONLDProduct{
		Context:     "https://schema.org",
		Type:        "Product",
		Name:        "Travel Experience",
		Description: "An amazing travel experience",
		Image:       []string{},
		Offers: []JSONLDOffer{
			{
				Type:          "Offer",
				Name:          "Adult",
				Price:         "25.00",
				PriceCurrency: "USD",
				Availability:  "https://schema.org/InStock",
				URL:           fmt.Sprintf("%s/experiences/%s", b.baseURL, experienceID),
			},
		},
	}

	data, err := json.MarshalIndent(product, "", "  ")
	if err != nil {
		return "", fmt.Errorf("marshal json-ld: %w", err)
	}

	return string(data), nil
}

// BuildForExperience builds JSON-LD with actual experience data
func (b *JSONLDBuilder) BuildForExperience(ctx context.Context, exp interface{}, city string) (string, error) {
	// Convert to map for flexible handling
	expData, err := json.Marshal(exp)
	if err != nil {
		return "", fmt.Errorf("marshal experience: %w", err)
	}

	var expMap map[string]interface{}
	if err := json.Unmarshal(expData, &expMap); err != nil {
		return "", fmt.Errorf("unmarshal experience: %w", err)
	}

	// Extract fields
	title, _ := expMap["title"].(string)
	description, _ := expMap["description"].(string)
	experienceID, _ := expMap["id"].(string)
	rating, _ := expMap["headout_rating"].(float64)
	reviewCount, _ := expMap["headout_review_count"].(float64)

	images := []string{}
	if imagesList, ok := expMap["images"]; ok {
		if imgData, err := json.Marshal(imagesList); err == nil {
			var imgs []map[string]interface{}
			if err := json.Unmarshal(imgData, &imgs); err == nil {
				for _, img := range imgs {
					if url, ok := img["url"].(string); ok {
						images = append(images, url)
					}
				}
			}
		}
	}

	// Get pricing context
	offers := []JSONLDOffer{}
	if options, ok := expMap["options"].([]interface{}); ok {
		for _, opt := range options {
			optData, _ := json.Marshal(opt)
			var optMap map[string]interface{}
			json.Unmarshal(optData, &optMap)

			optTitle, _ := optMap["title"].(string)
			basePriceAmount, _ := optMap["base_price_amount"].(float64)
			currency, _ := optMap["base_price_currency"].(string)

			priceResult := b.pricingEngine.CalculatePrice(
				ctx,
				basePriceAmount,
				currency,
				experienceID,
				city,
			)

			offers = append(offers, JSONLDOffer{
				Type:          "Offer",
				Name:          optTitle,
				Price:         priceResult.FormattedAmount,
				PriceCurrency: priceResult.CurrencyCode,
				Availability:  "https://schema.org/InStock",
				URL:           fmt.Sprintf("%s/experiences/%s", b.baseURL, experienceID),
			})
		}
	}

	product := JSONLDProduct{
		Context:     "https://schema.org",
		Type:        "Product",
		Name:        title,
		Description: description,
		Image:       images,
		Offers:      offers,
	}

	if rating > 0 && reviewCount > 0 {
		product.AggregateRating = &JSONLDAggregateRating{
			Type:        "AggregateRating",
			RatingValue: rating,
			ReviewCount: int(reviewCount),
			BestRating:  5,
			WorstRating: 1,
		}
	}

	data, err := json.MarshalIndent(product, "", "  ")
	if err != nil {
		return "", fmt.Errorf("marshal json-ld: %w", err)
	}

	return string(data), nil
}
