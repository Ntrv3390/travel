package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/travel/backend/internal/models"
	"github.com/travel/backend/internal/services"
	"github.com/travel/backend/pkg/config"
	"github.com/travel/backend/pkg/logger"
)

type ExperienceHandler struct {
	headoutProxySvc *services.HeadoutProxyService
}

func NewExperienceHandler() *ExperienceHandler {
	cfg := config.Load()
	return &ExperienceHandler{
		headoutProxySvc: services.NewHeadoutProxyService(cfg),
	}
}

// GetExperiences returns experiences — always from Headout live
func (h *ExperienceHandler) GetExperiences(c *gin.Context) {
	category := c.Query("category")
	location := c.Query("location")
	q := c.Query("q")
	currencyCode := c.Query("currencyCode")
	page := parseIntQuery(c, "page", 1)
	limit := parseIntQuery(c, "limit", 12)

	if category != "" {
		h.fetchByCategory(c, category, currencyCode, page, limit)
		return
	}

	if q != "" && location != "" {
		liveExperiences, liveErr := h.fetchLiveExperiencesForLocation(c, location, page, limit)
		if liveErr == nil && len(liveExperiences) > 0 {
			filtered := filterExperiencesByQuery(liveExperiences, q)
			totalPages := 1
			if len(filtered) >= limit {
				totalPages = page + 1
			}
			c.JSON(http.StatusOK, gin.H{
				"data":          filtered,
				"count":         len(filtered),
				"page":          page,
				"limit":         limit,
				"total_pages":   totalPages,
				"currency_code": strings.ToUpper(defaultIfEmpty(currencyCode, "USD")),
			})
			return
		}
		if liveErr != nil {
			logger.Errorf("Failed to fetch from Headout: %v", liveErr)
			c.JSON(http.StatusBadGateway, gin.H{"error": "failed to fetch from Headout"})
			return
		}
	}

	// If location is derived from query text, use that
	if q != "" && location == "" {
		location = q
	}

	if location != "" {
		liveExperiences, liveErr := h.fetchLiveExperiencesForLocation(c, location, page, limit)
		if liveErr != nil {
			logger.Errorf("Failed to fetch from Headout: %v", liveErr)
			c.JSON(http.StatusBadGateway, gin.H{"error": "failed to fetch from Headout"})
			return
		}
		totalPages := 1
		if len(liveExperiences) >= limit {
			totalPages = page + 1
		}
		c.JSON(http.StatusOK, gin.H{
			"data":          liveExperiences,
			"count":         len(liveExperiences),
			"page":          page,
			"limit":         limit,
			"total_pages":   totalPages,
			"currency_code": strings.ToUpper(defaultIfEmpty(currencyCode, "USD")),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data":         []models.Experience{},
		"count":        0,
		"page":         page,
		"limit":        limit,
		"total_pages":  0,
		"currency_code": strings.ToUpper(defaultIfEmpty(currencyCode, "USD")),
	})
}

// GetExperienceByID returns a single experience by ID — always from Headout
func (h *ExperienceHandler) GetExperienceByID(c *gin.Context) {
	id := c.Param("id")
	currencyCode := c.Query("currencyCode")

	liveExp, liveErr := h.fetchLiveExperienceByID(c, id, currencyCode)
	if liveErr != nil {
		logger.Errorf("Headout fetch for experience %s failed: %v", id, liveErr)
		c.JSON(http.StatusNotFound, gin.H{"error": "Experience not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": liveExp})
}

// GetExperienceByCityAndSlug returns a single experience by city and slug — always from Headout
func (h *ExperienceHandler) GetExperienceByCityAndSlug(c *gin.Context) {
	city := c.Param("city")
	slug := c.Param("slug")
	currencyCode := c.Query("currencyCode")

	liveExp, liveErr := h.fetchLiveExperienceByCityAndSlug(c, city, slug, currencyCode)
	if liveErr != nil {
		logger.Errorf("Headout fetch for %s/%s failed: %v", city, slug, liveErr)
		c.JSON(http.StatusNotFound, gin.H{"error": "Experience not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": liveExp})
}

// SearchExperiences searches for experiences — always from Headout
func (h *ExperienceHandler) SearchExperiences(c *gin.Context) {
	category := c.Query("category")
	location := c.Query("location")
	q := c.Query("q")
	currencyCode := c.Query("currencyCode")
	page := parseIntQuery(c, "page", 1)
	limit := parseIntQuery(c, "limit", 12)

	searchLocation := location
	if searchLocation == "" {
		searchLocation = c.Query("city")
	}
	if searchLocation == "" && q != "" {
		searchLocation = q
	}

	if category != "" {
		h.fetchByCategory(c, category, currencyCode, page, limit)
		return
	}

	if searchLocation == "" {
		c.JSON(http.StatusOK, gin.H{
			"data":          []models.Experience{},
			"count":         0,
			"page":          page,
			"limit":         limit,
			"total_pages":   0,
			"currency_code": strings.ToUpper(defaultIfEmpty(currencyCode, "USD")),
		})
		return
	}

	liveExperiences, liveErr := h.fetchLiveExperiencesForLocation(c, searchLocation, page, limit)

	if liveErr != nil {
		logger.Errorf("Failed to fetch from Headout: %v", liveErr)
		c.JSON(http.StatusBadGateway, gin.H{"error": "failed to fetch from Headout"})
		return
	}

	results := liveExperiences
	if q != "" {
		results = filterExperiencesByQuery(results, q)
	}

	totalPages := 1
	if len(results) >= limit {
		totalPages = page + 1
	}
	c.JSON(http.StatusOK, gin.H{
		"data":          results,
		"count":         len(results),
		"page":          page,
		"limit":         limit,
		"total_pages":   totalPages,
		"currency_code": strings.ToUpper(defaultIfEmpty(currencyCode, "USD")),
	})
}

func (h *ExperienceHandler) fetchByCategory(c *gin.Context, category, currencyCode string, page, limit int) {
	offset := (page - 1) * limit
	query := url.Values{}
	query.Set("categoryId", category)
	query.Set("currencyCode", strings.ToUpper(defaultIfEmpty(currencyCode, "USD")))
	query.Set("language", "en")
	query.Set("limit", strconv.Itoa(limit))
	query.Set("offset", strconv.Itoa(offset))

	upstream, err := h.headoutProxySvc.Get(c.Request.Context(), "/v1/product/listing/list-by/category", query, true)
	if err != nil {
		logger.Errorf("Headout category fetch failed: %v", err)
		c.JSON(http.StatusBadGateway, gin.H{"error": "failed to fetch from Headout"})
		return
	}

	var payload interface{}
	if err := json.Unmarshal(upstream.Body, &payload); err != nil {
		logger.Errorf("Failed to decode Headout response: %v", err)
		c.JSON(http.StatusBadGateway, gin.H{"error": "failed to parse Headout response"})
		return
	}

	products := extractProductsArray(payload)
	experiences := make([]models.Experience, 0, len(products))
	for idx, item := range products {
		mapped, ok := mapHeadoutProductToExperience(item, uint(idx+1))
		if ok {
			experiences = append(experiences, mapped)
		}
	}

	totalPages := 1
	if len(experiences) >= limit {
		totalPages = page + 1
	}
	c.JSON(http.StatusOK, gin.H{
		"data":          experiences,
		"count":         len(experiences),
		"page":          page,
		"limit":         limit,
		"total_pages":   totalPages,
		"currency_code": strings.ToUpper(defaultIfEmpty(currencyCode, "USD")),
	})
}

func filterExperiencesByQuery(experiences []models.Experience, query string) []models.Experience {
	if query == "" {
		return experiences
	}
	lower := strings.ToLower(strings.TrimSpace(query))
	filtered := make([]models.Experience, 0, len(experiences))
	for _, e := range experiences {
		if strings.Contains(strings.ToLower(e.Title), lower) ||
			strings.Contains(strings.ToLower(e.Description), lower) ||
			strings.Contains(strings.ToLower(e.Category), lower) {
			filtered = append(filtered, e)
		}
	}
	return filtered
}

// SyncExperiences triggers a sync of experiences from Headout into the local DB
func (h *ExperienceHandler) SyncExperiences(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"message": "Sync not available — all data comes from Headout live"})
}

// SyncExperienceByID syncs a single experience by Headout ID
func (h *ExperienceHandler) SyncExperienceByID(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"message": "Sync not available — all data comes from Headout live"})
}

// GetAvailability returns inventory for a variant/date.
func (h *ExperienceHandler) GetAvailability(c *gin.Context) {
	variantID := strings.TrimSpace(c.Query("variantId"))
	if variantID == "" {
		variantID = strings.TrimSpace(c.Param("id"))
	}

	date := strings.TrimSpace(c.Query("date"))
	if variantID == "" || date == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "variantId and date are required"})
		return
	}

	if _, err := time.Parse("2006-01-02", date); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid date, expected YYYY-MM-DD"})
		return
	}

	parsedDate, _ := time.Parse("2006-01-02", date)
	today := time.Now()
	today = time.Date(today.Year(), today.Month(), today.Day(), 0, 0, 0, 0, today.Location())
	parsedDate = time.Date(parsedDate.Year(), parsedDate.Month(), parsedDate.Day(), 0, 0, 0, 0, parsedDate.Location())
	if parsedDate.Before(today) {
		date = today.Format("2006-01-02")
	}

	query := url.Values{}
	query.Set("variantId", variantID)
	query.Set("startDateTime", date+"T00:00:00")
	query.Set("endDateTime", date+"T23:59:59")

	upstream, err := h.headoutProxySvc.Get(c.Request.Context(), "/v1/inventory/list-by/variant", query, true)
	if err != nil {
		logger.Errorf("Failed to fetch availability from Headout: %v", err)
		c.JSON(http.StatusBadGateway, gin.H{"error": "failed to fetch availability"})
		return
	}

	contentType := upstream.Headers.Get("Content-Type")
	if contentType == "" {
		contentType = "application/json"
	}
	c.Data(upstream.StatusCode, contentType, upstream.Body)
}

func parseIntQuery(c *gin.Context, key string, fallback int) int {
	if value := c.Query(key); value != "" {
		if parsed, err := strconv.Atoi(value); err == nil && parsed > 0 {
			return parsed
		}
	}
	return fallback
}

func (h *ExperienceHandler) fetchLiveExperienceByID(c *gin.Context, headoutID, currencyCode string) (*models.Experience, error) {
	query := url.Values{}
	if currencyCode != "" {
		query.Set("currencyCode", strings.ToUpper(currencyCode))
	}
	upstream, err := h.headoutProxySvc.Get(c.Request.Context(), "/v1/product/get/"+url.PathEscape(headoutID), query, true)
	if err != nil {
		return nil, fmt.Errorf("headout request: %w", err)
	}

	if upstream.StatusCode < 200 || upstream.StatusCode >= 300 {
		return nil, fmt.Errorf("headout returned status %d", upstream.StatusCode)
	}

	var payload interface{}
	if err := json.Unmarshal(upstream.Body, &payload); err != nil {
		return nil, fmt.Errorf("decode response: %w", err)
	}

	product := extractSingleProduct(payload)
	if product == nil {
		return nil, fmt.Errorf("no product data in response")
	}

	mapped, ok := mapHeadoutProductToExperience(product, 1)
	if !ok {
		return nil, fmt.Errorf("could not map headout product")
	}

	return &mapped, nil
}

func (h *ExperienceHandler) fetchLiveExperienceByCityAndSlug(c *gin.Context, city, slug, currencyCode string) (*models.Experience, error) {
	cityCode := toCityCode(city)

	query := url.Values{}
	query.Set("cityCode", cityCode)
	query.Set("currencyCode", strings.ToUpper(defaultIfEmpty(currencyCode, "USD")))
	query.Set("language", "en")
	query.Set("limit", "50")
	query.Set("offset", "0")

	upstream, err := h.headoutProxySvc.Get(c.Request.Context(), "/v1/product/listing/list-by/city", query, true)
	if err != nil {
		return nil, fmt.Errorf("headout request: %w", err)
	}

	if upstream.StatusCode < 200 || upstream.StatusCode >= 300 {
		return nil, fmt.Errorf("headout returned status %d", upstream.StatusCode)
	}

	var payload interface{}
	if err := json.Unmarshal(upstream.Body, &payload); err != nil {
		return nil, fmt.Errorf("decode response: %w", err)
	}

	products := extractProductsArray(payload)
	for _, item := range products {
		title := getString(item, "title", "name")
		if title == "" {
			continue
		}
		itemSlug := slugify(title)
		if strings.EqualFold(itemSlug, slug) {
			mapped, ok := mapHeadoutProductToExperience(item, 1)
			if ok {
				return &mapped, nil
			}
		}
	}

	return nil, fmt.Errorf("no experience found for %s/%s", city, slug)
}

func extractSingleProduct(payload interface{}) map[string]interface{} {
	root, ok := payload.(map[string]interface{})
	if !ok {
		return nil
	}

	keys := []string{"data", "product", "result"}
	for _, key := range keys {
		if value, exists := root[key]; exists {
			if product, ok := value.(map[string]interface{}); ok {
				return product
			}
		}
	}

	return root
}

func slugify(value string) string {
	value = strings.ToLower(strings.TrimSpace(value))
	var result strings.Builder
	lastDash := false
	for _, r := range value {
		if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') {
			result.WriteRune(r)
			lastDash = false
		} else if !lastDash {
			result.WriteRune('-')
			lastDash = true
		}
	}
	return strings.Trim(result.String(), "-")
}

func (h *ExperienceHandler) fetchLiveExperiences(c *gin.Context, page, limit int) ([]models.Experience, error) {
	return h.fetchLiveExperiencesForLocation(c, c.Query("location"), page, limit)
}

func (h *ExperienceHandler) fetchLiveExperiencesForLocation(c *gin.Context, location string, page, limit int) ([]models.Experience, error) {
	cityCode := toCityCode(location)
	if cityCode == "" {
		return nil, fmt.Errorf("no city code provided for live fetch")
	}

	offset := (page - 1) * limit
	query := url.Values{}
	query.Set("cityCode", cityCode)
	query.Set("currencyCode", strings.ToUpper(defaultIfEmpty(c.Query("currencyCode"), "USD")))
	query.Set("language", defaultIfEmpty(c.Query("language"), "en"))
	query.Set("limit", strconv.Itoa(limit))
	query.Set("offset", strconv.Itoa(offset))

	upstream, err := h.headoutProxySvc.Get(c.Request.Context(), "/v1/product/listing/list-by/city", query, true)
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
	headoutID := extractID(item)
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

func extractID(item map[string]interface{}) string {
	for _, key := range []string{"id", "product_id", "headout_id"} {
		if value, exists := item[key]; exists {
			switch v := value.(type) {
			case string:
				if v != "" {
					return v
				}
			case float64:
				if v > 0 {
					return strconv.FormatInt(int64(v), 10)
				}
			case json.Number:
				if str := v.String(); str != "" {
					return str
				}
			}
		}
	}
	return ""
}

func toCityCode(location string) string {
	trimmed := strings.TrimSpace(location)
	if trimmed == "" {
		return ""
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
