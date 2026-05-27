package services

import (
	"context"
	"encoding/json"
	"fmt"
	"net/url"
	"strconv"
	"strings"
	"time"

	"github.com/travel/backend/internal/database"
	"github.com/travel/backend/internal/models"
	"github.com/travel/backend/pkg/config"
	"github.com/travel/backend/pkg/logger"
	"gorm.io/datatypes"
	"gorm.io/gorm"
)

type SyncService struct {
	publicProxy *HeadoutProxyService
	db          *gorm.DB
}

func NewSyncService(cfg *config.Config) *SyncService {
	publicCfg := *cfg
	publicCfg.HeadoutURL = cfg.HeadoutProdBaseURL

	return &SyncService{
		publicProxy: NewHeadoutProxyService(&publicCfg),
		db:          database.GetDB(),
	}
}

type SyncResult struct {
	TotalProducts  int `json:"total_products"`
	Imported       int `json:"imported"`
	Updated        int `json:"updated"`
	Skipped        int `json:"skipped"`
	Errors         int `json:"errors"`
}

func (s *SyncService) SyncExperiences(ctx context.Context, cityCodes []string) (*SyncResult, error) {
	result := &SyncResult{}

	cities := cityCodes
	if len(cities) == 0 {
		cities = s.getDefaultCities()
	}

	for _, city := range cities {
		r, err := s.syncCity(ctx, city)
		if err != nil {
			logger.Errorf("Failed to sync city %s: %v", city, err)
			result.Errors++
			continue
		}
		result.TotalProducts += r.TotalProducts
		result.Imported += r.Imported
		result.Updated += r.Updated
		result.Skipped += r.Skipped
		result.Errors += r.Errors
	}

	logger.Infof("Sync complete: %d total, %d imported, %d updated, %d skipped, %d errors",
		result.TotalProducts, result.Imported, result.Updated, result.Skipped, result.Errors)

	return result, nil
}

func (s *SyncService) SyncSingleExperience(ctx context.Context, headoutID string) (*models.ExperienceGTTD, error) {
	logger.Infof("Syncing single experience: %s", headoutID)

	upstream, err := s.publicProxy.Get(ctx, "/v1/product/get/"+url.PathEscape(headoutID), url.Values{}, false)
	if err != nil {
		return nil, fmt.Errorf("fetch product %s: %w", headoutID, err)
	}

	if upstream.StatusCode < 200 || upstream.StatusCode >= 300 {
		return nil, fmt.Errorf("headout returned %d for product %s", upstream.StatusCode, headoutID)
	}

	return s.processProduct(ctx, upstream.Body)
}

func (s *SyncService) syncCity(ctx context.Context, cityCode string) (*SyncResult, error) {
	logger.Infof("Syncing city: %s", cityCode)
	result := &SyncResult{}

	page := 0
	limit := 50
	maxPages := 10

	for page < maxPages {
		query := url.Values{}
		query.Set("cityCode", cityCode)
		currencyCode := "USD" // default, can be made configurable
		query.Set("currencyCode", currencyCode)
		query.Set("language", "en")
		query.Set("limit", strconv.Itoa(limit))
		query.Set("offset", strconv.Itoa(page*limit))

		upstream, err := s.publicProxy.Get(ctx, "/v1/product/listing/list-by/city", query, false)
		if err != nil {
			return result, fmt.Errorf("fetch page %d: %w", page, err)
		}

		if upstream.StatusCode < 200 || upstream.StatusCode >= 300 {
			return result, fmt.Errorf("headout returned %d on page %d", upstream.StatusCode, page)
		}

		var payload interface{}
		if err := json.Unmarshal(upstream.Body, &payload); err != nil {
			return result, fmt.Errorf("decode page %d: %w", page, err)
		}

		products := extractProductsFromPayload(payload)
		if len(products) == 0 {
			break
		}

		for _, product := range products {
			productJSON, _ := json.Marshal(product)
			exp, err := s.processProduct(ctx, productJSON)
			if err != nil {
				logger.Warnf("Skipping product: %v", err)
				result.Skipped++
				continue
			}
			if exp != nil {
				result.Imported++
			}
			result.TotalProducts++
		}

		if len(products) < limit {
			break
		}
		page++
	}

	return result, nil
}

func (s *SyncService) processProduct(ctx context.Context, productJSON []byte) (*models.ExperienceGTTD, error) {
	var raw map[string]interface{}
	if err := json.Unmarshal(productJSON, &raw); err != nil {
		return nil, fmt.Errorf("parse product: %w", err)
	}

	headoutID := extractString(raw, "id", "product_id", "headout_id")
	if headoutID == "" {
		return nil, fmt.Errorf("no id in product")
	}

	title := extractString(raw, "title", "name")
	if title == "" {
		return nil, fmt.Errorf("no title for product %s", headoutID)
	}

	description := extractString(raw, "description", "short_description", "long_description")
	city := extractString(raw, "location", "city", "city_name", "cityCode")
	if city == "" {
		city = extractNestedString(raw, "city", "name")
	}
	country := extractString(raw, "country", "country_name")

	latitude := extractFloat(raw, "latitude", "lat")
	longitude := extractFloat(raw, "longitude", "lng", "lon")
	rating := extractFloat(raw, "rating", "average_rating", "headout_rating")
	reviewCount := int(extractFloat(raw, "review_count", "ratings_count", "headout_review_count"))

	imageURL := extractString(raw, "image_url", "thumbnail", "hero_image", "mainImage")
	if imageURL == "" {
		imageURL = extractNestedString(raw, "image", "url")
	}

	var images []map[string]interface{}
	if imageURL != "" {
		images = append(images, map[string]interface{}{
			"url": imageURL,
			"type": "PHOTO",
		})
	}
	if imgs, ok := raw["images"].([]interface{}); ok {
		for _, img := range imgs {
			if imgMap, ok := img.(map[string]interface{}); ok {
				images = append(images, imgMap)
			}
		}
	}

	durationMin := int(extractFloat(raw, "duration_min_seconds", "minDuration"))
	durationMax := int(extractFloat(raw, "duration_max_seconds", "maxDuration"))
	if durationMin == 0 && durationMax == 0 {
		durationText := extractString(raw, "duration", "duration_text")
		if durationText != "" {
			durationMin, durationMax = parseDurationText(durationText)
		}
	}

	cancellationPolicy := extractMap(raw, "cancellation_policy", "cancellationPolicy")

	now := time.Now()

	var imagesData datatypes.JSONType[[]map[string]interface{}]
	imagesData.Scan(images)
	var cancPolicy datatypes.JSONType[map[string]interface{}]
	cancPolicy.Scan(cancellationPolicy)
	var rawData datatypes.JSONType[map[string]interface{}]
	rawData.Scan(raw)

	gttdExp := models.ExperienceGTTD{
		HeadoutID:          headoutID,
		Title:              title,
		Description:        description,
		City:               city,
		Country:            country,
		Latitude:           latitude,
		Longitude:          longitude,
		HeadoutRating:      rating,
		HeadoutReviewCount: reviewCount,
		Images:             imagesData,
		DurationMinSeconds: durationMin,
		DurationMaxSeconds: durationMax,
		CancellationPolicy: cancPolicy,
		RawHeadoutData:     rawData,
		IsActive:           true,
		GTTDEnabled:        false,
		CreatedAt:          now,
		UpdatedAt:          now,
	}

	syncErr := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var existing models.ExperienceGTTD
		err := tx.Where("headout_id = ?", headoutID).First(&existing).Error

		if err == nil {
			gttdExp.ID = existing.ID
			gttdExp.CreatedAt = existing.CreatedAt
			gttdExp.Options = existing.Options
			return tx.Model(&existing).Updates(map[string]interface{}{
				"title":                title,
				"description":          description,
				"city":                 city,
				"country":              country,
				"latitude":             latitude,
				"longitude":            longitude,
				"headout_rating":       rating,
				"headout_review_count": reviewCount,
				"images":               imagesData,
				"duration_min_seconds": durationMin,
				"duration_max_seconds": durationMax,
				"cancellation_policy":  cancPolicy,
				"raw_headout_data":     rawData,
				"updated_at":           now,
			}).Error
		}

		return tx.Create(&gttdExp).Error
	})

	if syncErr != nil {
		return nil, fmt.Errorf("save experience %s: %w", headoutID, syncErr)
	}

	syncExp := &models.Experience{}
	err := s.db.WithContext(ctx).Where("headout_id = ?", headoutID).First(&syncExp).Error
	if err != nil {
		newExp := models.Experience{
			HeadoutID:   headoutID,
			Title:       title,
			Description: description,
			Location:    city,
			Latitude:    latitude,
			Longitude:   longitude,
			Duration:    fmt.Sprintf("%d-%d min", durationMin/60, durationMax/60),
			Price:       extractFloat(raw, "price", "starting_price", "base_price"),
			Currency:    extractString(raw, "currency", "currencyCode", "currency_code"),
			Rating:      float32(rating),
			ReviewCount: reviewCount,
			ImageURL:    imageURL,
			Status:      "active",
			LastSyncedAt: &now,
		}
		if newExp.Currency == "" {
			newExp.Currency = "USD"
		}
		if err := s.db.WithContext(ctx).Create(&newExp).Error; err != nil {
			logger.Warnf("Failed to create Experience record for %s: %v", headoutID, err)
		}
	} else {
		s.db.WithContext(ctx).Model(syncExp).Updates(map[string]interface{}{
			"title":        title,
			"description":  description,
			"location":     city,
			"latitude":     latitude,
			"longitude":    longitude,
			"price":        extractFloat(raw, "price", "starting_price", "base_price"),
			"rating":       float32(rating),
			"review_count": reviewCount,
			"image_url":    imageURL,
			"last_synced_at": &now,
		})
	}

	return &gttdExp, nil
}

func (s *SyncService) getDefaultCities() []string {
	return []string{
		"NEW_YORK", "PARIS", "LONDON", "DUBAI", "SINGAPORE",
		"BARCELONA", "ROME", "AMSTERDAM", "BANGKOK", "TOKYO",
		"LOS_ANGELES", "LAS_VEGAS", "ORLANDO", "SAN_FRANCISCO",
	}
}

func extractProductsFromPayload(payload interface{}) []map[string]interface{} {
	root, ok := payload.(map[string]interface{})
	if !ok {
		return nil
	}

	keys := []string{"data", "products", "items", "results"}
	for _, key := range keys {
		if value, exists := root[key]; exists {
			if list, ok := value.([]interface{}); ok {
				result := make([]map[string]interface{}, 0, len(list))
				for _, item := range list {
					if m, ok := item.(map[string]interface{}); ok {
						result = append(result, m)
					}
				}
				if len(result) > 0 {
					return result
				}
			}
			if nested, ok := value.(map[string]interface{}); ok {
				for _, nk := range keys {
					if nv, exists := nested[nk]; exists {
						if list, ok := nv.([]interface{}); ok {
							result := make([]map[string]interface{}, 0, len(list))
							for _, item := range list {
								if m, ok := item.(map[string]interface{}); ok {
									result = append(result, m)
								}
							}
							if len(result) > 0 {
								return result
							}
						}
					}
				}
			}
		}
	}

	return nil
}

func extractString(data map[string]interface{}, keys ...string) string {
	for _, key := range keys {
		if val, ok := data[key].(string); ok && strings.TrimSpace(val) != "" {
			return strings.TrimSpace(val)
		}
	}
	return ""
}

func extractNestedString(data map[string]interface{}, path ...string) string {
	current := data
	for i, key := range path {
		if i == len(path)-1 {
			if val, ok := current[key].(string); ok {
				return val
			}
			return ""
		}
		if next, ok := current[key].(map[string]interface{}); ok {
			current = next
		} else {
			return ""
		}
	}
	return ""
}

func extractFloat(data map[string]interface{}, keys ...string) float64 {
	for _, key := range keys {
		if val, ok := data[key]; ok {
			switch v := val.(type) {
			case float64:
				return v
			case float32:
				return float64(v)
			case int:
				return float64(v)
			case int64:
				return float64(v)
			case json.Number:
				if f, err := v.Float64(); err == nil {
					return f
				}
			case string:
				if f, err := strconv.ParseFloat(strings.TrimSpace(v), 64); err == nil {
					return f
				}
			}
		}
	}
	return 0
}

func extractMap(data map[string]interface{}, keys ...string) map[string]interface{} {
	for _, key := range keys {
		if val, ok := data[key].(map[string]interface{}); ok {
			return val
		}
	}
	return nil
}

func parseDurationText(text string) (int, int) {
	text = strings.ToLower(strings.TrimSpace(text))

	hours := 0
	minutes := 0

	parts := strings.Split(text, " ")
	for i, part := range parts {
		cleaned := strings.TrimSpace(part)
		num, err := strconv.Atoi(cleaned)
		if err != nil {
			continue
		}
		if i+1 < len(parts) {
			next := parts[i+1]
			if strings.HasPrefix(next, "hour") || strings.HasPrefix(next, "hr") {
				hours = num
			} else if strings.HasPrefix(next, "min") {
				minutes = num
			} else if strings.HasPrefix(next, "day") || strings.HasPrefix(next, "d") {
				hours = num * 24
			}
		}
	}

	totalMin := hours*60 + minutes
	if totalMin <= 0 {
		totalMin = 120
	}

	return totalMin * 60, totalMin * 60
}


