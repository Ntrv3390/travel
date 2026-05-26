package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/travel/backend/internal/database"
	"github.com/travel/backend/internal/models"
	"github.com/travel/backend/internal/services"
	"github.com/travel/backend/pkg/config"
	"github.com/travel/backend/pkg/logger"
)

type ExperienceHandler struct {
	service         *services.ExperienceCatalogService
	headoutProxySvc *services.HeadoutProxyService
	publicProxySvc  *services.HeadoutProxyService
}

func NewExperienceHandler() *ExperienceHandler {
	cfg := config.Load()
	publicCfg := *cfg
	publicCfg.HeadoutURL = cfg.HeadoutProdBaseURL
	return &ExperienceHandler{
		service:         services.NewExperienceCatalogService(database.GetDB()),
		headoutProxySvc: services.NewHeadoutProxyService(cfg),
		publicProxySvc:  services.NewHeadoutProxyService(&publicCfg),
	}
}

// GetExperiences returns paginated experiences
func (h *ExperienceHandler) GetExperiences(c *gin.Context) {
	category := c.Query("category")
	location := c.Query("location")
	page := parseIntQuery(c, "page", 1)
	limit := parseIntQuery(c, "limit", 12)

	result, err := h.service.ListExperiences(c.Request.Context(), category, location, page, limit)
	if err != nil {
		logger.Errorf("Failed to fetch experiences: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to fetch experiences",
		})
		return
	}

	if len(result.Experiences) == 0 {
		liveExperiences, liveErr := h.fetchLiveExperiences(c, limit)
		if liveErr != nil {
			logger.Warnf("Live Headout fetch failed, returning DB result: %v", liveErr)
		} else if len(liveExperiences) > 0 {
			c.JSON(http.StatusOK, gin.H{
				"data":        liveExperiences,
				"count":       len(liveExperiences),
				"page":        1,
				"limit":       limit,
				"total_pages": 1,
			})
			return
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"data":        result.Experiences,
		"count":       result.Count,
		"page":        result.Page,
		"limit":       result.Limit,
		"total_pages": result.TotalPages,
	})
}

// GetExperienceByID returns a single experience by ID
func (h *ExperienceHandler) GetExperienceByID(c *gin.Context) {
	id := c.Param("id")
	experience, err := h.service.GetExperienceByID(c.Request.Context(), id)
	if err != nil {
		logger.Errorf("Failed to fetch experience: %v", err)
		c.JSON(http.StatusNotFound, gin.H{
			"error": "Experience not found",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": experience,
	})
}

// GetExperienceByCityAndSlug returns a single experience by city and slug
func (h *ExperienceHandler) GetExperienceByCityAndSlug(c *gin.Context) {
	city := c.Param("city")
	slug := c.Param("slug")

	experience, err := h.service.GetExperienceByCityAndSlug(c.Request.Context(), city, slug)
	if err != nil {
		logger.Errorf("Failed to fetch experience by slug: %v", err)
		c.JSON(http.StatusNotFound, gin.H{"error": "Experience not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": experience})
}

// SearchExperiences searches for experiences by category/location with pagination
func (h *ExperienceHandler) SearchExperiences(c *gin.Context) {
	category := c.Query("category")
	location := c.Query("location")
	page := parseIntQuery(c, "page", 1)
	limit := parseIntQuery(c, "limit", 12)

	result, err := h.service.SearchExperiences(c.Request.Context(), category, location, page, limit)
	if err != nil {
		logger.Errorf("Failed to search experiences: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to search experiences",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data":        result.Experiences,
		"count":       result.Count,
		"page":        result.Page,
		"limit":       result.Limit,
		"total_pages": result.TotalPages,
	})
}

func parseIntQuery(c *gin.Context, key string, fallback int) int {
	if value := c.Query(key); value != "" {
		if parsed, err := strconv.Atoi(value); err == nil && parsed > 0 {
			return parsed
		}
	}
	return fallback
}

func (h *ExperienceHandler) fetchLiveExperiences(c *gin.Context, limit int) ([]models.Experience, error) {
	query := url.Values{}
	query.Set("cityCode", toCityCode(c.Query("location")))
	query.Set("currencyCode", strings.ToUpper(defaultIfEmpty(c.Query("currencyCode"), "USD")))
	query.Set("language", defaultIfEmpty(c.Query("language"), "en"))
	query.Set("limit", strconv.Itoa(limit))
	query.Set("offset", "0")

	upstream, err := h.publicProxySvc.Get(c.Request.Context(), "/v1/product/listing/list-by/city", query, false)
	if err != nil {
		return nil, err
	}

	if upstream.StatusCode < http.StatusOK || upstream.StatusCode >= http.StatusMultipleChoices {
		bodyPreview := string(upstream.Body)
		if len(bodyPreview) > 300 {
			bodyPreview = bodyPreview[:300]
		}
		return nil, fmt.Errorf("live headout returned status %d: %s", upstream.StatusCode, bodyPreview)
	}

	var payload interface{}
	if unmarshalErr := json.Unmarshal(upstream.Body, &payload); unmarshalErr != nil {
		return nil, unmarshalErr
	}

	products := extractProductsArray(payload)
	if len(products) == 0 {
		return []models.Experience{}, nil
	}

	experiences := make([]models.Experience, 0, min(limit, len(products)))
	for idx, item := range products {
		if len(experiences) >= limit {
			break
		}
		mapped, ok := mapHeadoutProductToExperience(item, uint(idx+1))
		if ok {
			experiences = append(experiences, mapped)
		}
	}

	return experiences, nil
}

func extractProductsArray(payload interface{}) []map[string]interface{} {
	root, ok := payload.(map[string]interface{})
	if !ok {
		return nil
	}

	keys := []string{"data", "products", "items", "results"}
	for _, key := range keys {
		if value, exists := root[key]; exists {
			if products := toMapArray(value); len(products) > 0 {
				return products
			}

			if nested, isMap := value.(map[string]interface{}); isMap {
				nestedKeys := []string{"products", "items", "results", "data"}
				for _, nestedKey := range nestedKeys {
					if products := toMapArray(nested[nestedKey]); len(products) > 0 {
						return products
					}
				}
			}
		}
	}

	return nil
}

func toMapArray(value interface{}) []map[string]interface{} {
	list, ok := value.([]interface{})
	if !ok {
		return nil
	}

	products := make([]map[string]interface{}, 0, len(list))
	for _, item := range list {
		if product, ok := item.(map[string]interface{}); ok {
			products = append(products, product)
		}
	}

	return products
}

func mapHeadoutProductToExperience(item map[string]interface{}, fallbackID uint) (models.Experience, bool) {
	headoutID := getString(item, "id", "product_id", "headout_id")
	title := getString(item, "title", "name")
	if headoutID == "" || title == "" {
		return models.Experience{}, false
	}

	description := getString(item, "description", "short_description")
	location := getString(item, "location", "city", "city_name")
	if location == "" {
		location = getNestedString(item, "city", "name")
	}
	if location == "" {
		location = "unknown"
	}

	currency := getString(item, "currency", "currency_code")
	if currency == "" {
		currency = "USD"
	}

	return models.Experience{
		ID:          fallbackID,
		HeadoutID:   headoutID,
		Title:       title,
		Description: description,
		Category:    firstNonEmpty(getString(item, "category", "primary_category"), getNestedString(item, "primaryCategory", "name")),
		Location:    location,
		Duration:    getString(item, "duration", "duration_text"),
		Price:       firstNonZero(getFloat(item, "price", "starting_price", "base_price"), getNestedFloat(item, "pricing", "minimumPrice", "finalPrice")),
		Currency:    currency,
		Rating:      float32(firstNonZero(getFloat(item, "rating", "average_rating"), getNestedFloat(item, "ratingCumulative", "avg"))),
		ReviewCount: int(firstNonZero(getFloat(item, "review_count", "ratings_count"), getNestedFloat(item, "ratingCumulative", "count"))),
		ImageURL:    firstNonEmpty(getString(item, "image_url", "thumbnail", "hero_image"), getNestedString(item, "image", "url")),
		Status:      "active",
	}, true
}

func getString(item map[string]interface{}, keys ...string) string {
	for _, key := range keys {
		if value, exists := item[key]; exists {
			switch v := value.(type) {
			case string:
				if v != "" {
					return v
				}
			}
		}
	}
	return ""
}

func getFloat(item map[string]interface{}, keys ...string) float64 {
	for _, key := range keys {
		if value, exists := item[key]; exists {
			switch v := value.(type) {
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
			}
		}
	}
	return 0
}

func getNestedString(item map[string]interface{}, path ...string) string {
	value := getNestedValue(item, path...)
	if str, ok := value.(string); ok {
		return str
	}
	return ""
}

func getNestedFloat(item map[string]interface{}, path ...string) float64 {
	value := getNestedValue(item, path...)
	switch v := value.(type) {
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
	}
	return 0
}

func getNestedValue(item map[string]interface{}, path ...string) interface{} {
	var current interface{} = item
	for _, key := range path {
		asMap, ok := current.(map[string]interface{})
		if !ok {
			return nil
		}
		next, exists := asMap[key]
		if !exists {
			return nil
		}
		current = next
	}
	return current
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if value != "" {
			return value
		}
	}
	return ""
}

func firstNonZero(values ...float64) float64 {
	for _, value := range values {
		if value != 0 {
			return value
		}
	}
	return 0
}

func defaultIfEmpty(value string, fallback string) string {
	if strings.TrimSpace(value) == "" {
		return fallback
	}
	return value
}

func toCityCode(location string) string {
	trimmed := strings.TrimSpace(location)
	if trimmed == "" {
		return "NEW_YORK"
	}

	replacer := strings.NewReplacer("-", "_", " ", "_")
	return strings.ToUpper(replacer.Replace(trimmed))
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
