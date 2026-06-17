package handlers

import (
	"encoding/json"
	"fmt"
	"math/rand"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/travel/backend/internal/models"
	"github.com/travel/backend/internal/services"
	"github.com/travel/backend/pkg/config"
	"github.com/travel/backend/pkg/logger"
	"gorm.io/gorm"
)

type ExperienceHandler struct {
	headoutProxySvc *services.HeadoutProxyService
	db              *gorm.DB
	catalogSvc      *services.ExperienceCatalogService
}

func NewExperienceHandler(db *gorm.DB) *ExperienceHandler {
	cfg := config.Load()
	return &ExperienceHandler{
		headoutProxySvc: services.NewHeadoutProxyService(cfg),
		db:              db,
		catalogSvc:      services.NewExperienceCatalogService(db),
	}
}

func (h *ExperienceHandler) isFetchFresh() bool {
	if h.db == nil {
		return true
	}
	var setting models.Setting
	if err := h.db.Where("key = ?", "fetch_fresh").First(&setting).Error; err != nil {
		return true
	}
	return setting.Value != "false"
}

var popularCities = []string{
	"New York", "Paris", "London", "Dubai", "Tokyo",
	"Barcelona", "Rome", "Singapore", "Bangkok", "Istanbul",
	"Sydney", "Amsterdam", "Las Vegas", "San Francisco", "Los Angeles",
	"Orlando", "Hong Kong", "Bali", "Cancun", "Miami",
	"Prague", "Vienna", "Berlin", "Madrid", "Lisbon",
	"Budapest", "Athens", "Kuala Lumpur", "Mumbai", "Seoul",
}

// convertExperiencePrices converts the Price field of each experience from its stored
// currency to toCurrency using the exchange rate service.
// If toCurrency is empty it defaults to "USD". The Currency field is updated only
// when conversion actually succeeds; entries whose currency pair cannot be resolved
// are left unchanged so the frontend can attempt its own conversion.
func convertExperiencePrices(experiences []models.Experience, toCurrency string) {
	if toCurrency == "" {
		toCurrency = "USD"
	}
	erSvc := GetExchangeRateService()
	rates, err := erSvc.Rates()
	if err != nil {
		return // rates unavailable; leave prices in their original currency
	}
	for i := range experiences {
		fromCurrency := experiences[i].Currency
		if fromCurrency == "" {
			fromCurrency = "USD"
		}
		if fromCurrency == toCurrency {
			continue
		}
		fromRate, ok1 := rates[fromCurrency]
		_, ok2 := rates[toCurrency]
		if !ok1 || !ok2 || fromRate == 0 {
			continue // unknown currency pair; leave unchanged
		}
		experiences[i].Price = erSvc.Convert(experiences[i].Price, fromCurrency, toCurrency)
		experiences[i].Currency = toCurrency
	}
}

// GetExperiences returns experiences — from DB when fetch_fresh=false, Headout otherwise
func (h *ExperienceHandler) GetExperiences(c *gin.Context) {
	location := c.Query("location")
	q := c.Query("q")
	category := c.Query("category")
	sort := c.Query("sort")
	currencyCode := c.Query("currencyCode")
	page := parseIntQuery(c, "page", 1)
	limit := parseIntQuery(c, "limit", 24)

	if !h.isFetchFresh() && h.catalogSvc != nil {
		result, err := h.catalogSvc.ListExperiences(c.Request.Context(), category, location, q, sort, currencyCode, page, limit)
		if err == nil && result.Count > 0 {
			convertExperiencePrices(result.Experiences, currencyCode)
			c.JSON(http.StatusOK, gin.H{
				"data":          result.Experiences,
				"count":         result.Count,
				"page":          result.Page,
				"limit":         result.Limit,
				"total_pages":   result.TotalPages,
				"currency_code": strings.ToUpper(defaultIfEmpty(currencyCode, "USD")),
			})
			return
		}
		// Experiences table is empty or errored — fall back to products table
		if h.db != nil {
			products := h.fetchExperiencesFromProductsTable(category, location, q, page, limit)
			if len(products) > 0 {
				convertExperiencePrices(products, currencyCode)
				totalPages := 1
				if len(products) >= limit {
					totalPages = page + 1
				}
				c.JSON(http.StatusOK, gin.H{
					"data":          products,
					"count":         len(products),
					"page":          page,
					"limit":         limit,
					"total_pages":   totalPages,
					"currency_code": strings.ToUpper(defaultIfEmpty(currencyCode, "USD")),
				})
				return
			}
		}
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
		}
		if h.db != nil {
			products := h.fetchExperiencesFromProductsTable(category, location, q, page, limit)
			if len(products) > 0 {
				totalPages := 1
				if len(products) >= limit {
					totalPages = page + 1
				}
				c.JSON(http.StatusOK, gin.H{
					"data":          products,
					"count":         len(products),
					"page":          page,
					"limit":         limit,
					"total_pages":   totalPages,
					"currency_code": strings.ToUpper(defaultIfEmpty(currencyCode, "USD")),
				})
				return
			}
		}
		c.JSON(http.StatusOK, gin.H{
			"data": []models.Experience{}, "count": 0, "page": page, "limit": limit,
			"total_pages": 0, "currency_code": strings.ToUpper(defaultIfEmpty(currencyCode, "USD")),
		})
		return
	}

	// If location is derived from query text, use that
	if q != "" && location == "" {
		location = q
	}

	if location != "" {
		liveExperiences, liveErr := h.fetchLiveExperiencesForLocation(c, location, page, limit)
		if liveErr != nil && q != "" && location == q {
			h.searchByQueryAcrossCities(c, q, page, limit, currencyCode)
			return
		}
		if liveErr != nil {
			logger.Errorf("Failed to fetch from Headout: %v", liveErr)
			if h.db != nil {
				products := h.fetchExperiencesFromProductsTable(category, location, q, page, limit)
				if len(products) > 0 {
					totalPages := 1
					if len(products) >= limit {
						totalPages = page + 1
					}
					c.JSON(http.StatusOK, gin.H{
						"data":          products,
						"count":         len(products),
						"page":          page,
						"limit":         limit,
						"total_pages":   totalPages,
						"currency_code": strings.ToUpper(defaultIfEmpty(currencyCode, "USD")),
					})
					return
				}
			}
			c.JSON(http.StatusOK, gin.H{
				"data": []models.Experience{}, "count": 0, "page": page, "limit": limit,
				"total_pages": 0, "currency_code": strings.ToUpper(defaultIfEmpty(currencyCode, "USD")),
			})
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

	// No location specified — fetch from random popular cities for a diverse mix
	h.fetchRandomExperiences(c, page, limit, currencyCode)
}

// GetExperienceByID returns a single experience by ID — from DB when fetch_fresh=false, Headout otherwise
func (h *ExperienceHandler) GetExperienceByID(c *gin.Context) {
	id := c.Param("id")
	currencyCode := c.Query("currencyCode")

	if !h.isFetchFresh() && h.catalogSvc != nil {
		exp, err := h.catalogSvc.GetExperienceByID(c.Request.Context(), id)
		if err == nil && exp != nil {
			c.JSON(http.StatusOK, gin.H{"data": exp})
			return
		}
	}

	liveExp, liveErr := h.fetchLiveExperienceByID(c, id, currencyCode)
	if liveErr != nil {
		logger.Errorf("Headout fetch for experience %s failed: %v", id, liveErr)
		c.JSON(http.StatusNotFound, gin.H{"error": "Experience not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": liveExp})
}

// GetExperienceByCityAndSlug returns a single experience by city and slug — from DB when fetch_fresh=false, Headout otherwise
func (h *ExperienceHandler) GetExperienceByCityAndSlug(c *gin.Context) {
	city := c.Param("city")
	slug := c.Param("slug")
	currencyCode := c.Query("currencyCode")

	if !h.isFetchFresh() && h.catalogSvc != nil {
		exp, err := h.catalogSvc.GetExperienceByCityAndSlug(c.Request.Context(), city, slug)
		if err == nil && exp != nil {
			c.JSON(http.StatusOK, gin.H{"data": exp})
			return
		}
	}

	liveExp, liveErr := h.fetchLiveExperienceByCityAndSlug(c, city, slug, currencyCode)
	if liveErr != nil {
		logger.Errorf("Headout fetch for %s/%s failed: %v", city, slug, liveErr)
		c.JSON(http.StatusNotFound, gin.H{"error": "Experience not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": liveExp})
}

// SearchExperiences searches for experiences — from DB when fetch_fresh=false, Headout otherwise
func (h *ExperienceHandler) SearchExperiences(c *gin.Context) {
	category := c.Query("category")
	location := c.Query("location")
	q := c.Query("q")
	currencyCode := c.Query("currencyCode")
	page := parseIntQuery(c, "page", 1)
	limit := parseIntQuery(c, "limit", 24)

	if !h.isFetchFresh() && h.catalogSvc != nil {
		result, err := h.catalogSvc.SearchExperiences(c.Request.Context(), category, location, q, "", currencyCode, page, limit)
		if err == nil && result.Count > 0 {
			convertExperiencePrices(result.Experiences, currencyCode)
			c.JSON(http.StatusOK, gin.H{
				"data":          result.Experiences,
				"count":         result.Count,
				"page":          result.Page,
				"limit":         result.Limit,
				"total_pages":   result.TotalPages,
				"currency_code": strings.ToUpper(defaultIfEmpty(currencyCode, "USD")),
			})
			return
		}
		// Experiences table is empty or errored — fall back to products table
		if h.db != nil {
			products := h.fetchExperiencesFromProductsTable(category, location, q, page, limit)
			if len(products) > 0 {
				convertExperiencePrices(products, currencyCode)
				totalPages := 1
				if len(products) >= limit {
					totalPages = page + 1
				}
				c.JSON(http.StatusOK, gin.H{
					"data":          products,
					"count":         len(products),
					"page":          page,
					"limit":         limit,
					"total_pages":   totalPages,
					"currency_code": strings.ToUpper(defaultIfEmpty(currencyCode, "USD")),
				})
				return
			}
		}
	}

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

	// When a query filter is active, fetch more data so the filter has a larger pool to match against
	fetchLimit := limit
	if q != "" && fetchLimit < 50 {
		fetchLimit = 50
	}

	liveExperiences, liveErr := h.fetchLiveExperiencesForLocation(c, searchLocation, 1, fetchLimit)

	if liveErr != nil && q != "" && location == "" && c.Query("city") == "" {
		// q was used as a location name but Headout rejected it (e.g. "burj khalifa")
		// Fall back to multi-city query search
		h.searchByQueryAcrossCities(c, q, page, limit, currencyCode)
		return
	}

	if liveErr != nil {
		logger.Errorf("Failed to fetch from Headout: %v", liveErr)
		c.JSON(http.StatusBadGateway, gin.H{"error": "failed to fetch from Headout"})
		return
	}

	results := liveExperiences
	if q != "" {
		results = filterExperiencesByQuery(results, q)
	}

	// Trim back to the original limit after filtering
	if q != "" && len(results) > limit {
		results = results[:limit]
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

func (h *ExperienceHandler) fetchRandomExperiences(c *gin.Context, page, limit int, currencyCode string) {
	numCities := 5
	perm := rand.Perm(len(popularCities))
	selectedCities := make([]string, 0, numCities)
	for i := 0; i < numCities && i < len(perm); i++ {
		selectedCities = append(selectedCities, popularCities[perm[i]])
	}

	perCity := (limit / len(selectedCities)) + 2
	if perCity < 4 {
		perCity = 4
	}

	type cityResult struct {
		city       string
		experiences []models.Experience
	}

	var mu sync.Mutex
	var wg sync.WaitGroup
	results := make([]cityResult, 0, len(selectedCities))
	errs := make([]error, 0, len(selectedCities))

	for _, city := range selectedCities {
		wg.Add(1)
		go func(cityName string) {
			defer wg.Done()
			exps, err := h.fetchLiveExperiencesForLocation(c, cityName, 1, perCity)
			mu.Lock()
			if err != nil {
				logger.Errorf("Random fetch failed for %s: %v", cityName, err)
				errs = append(errs, err)
			} else {
				logger.Infof("Random fetch got %d experiences from %s", len(exps), cityName)
				results = append(results, cityResult{city: cityName, experiences: exps})
			}
			mu.Unlock()
		}(city)
	}
	wg.Wait()

	if len(results) == 0 {
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

	allExperiences := make([]models.Experience, 0, limit)
	for _, r := range results {
		allExperiences = append(allExperiences, r.experiences...)
	}

	rand.Shuffle(len(allExperiences), func(i, j int) {
		allExperiences[i], allExperiences[j] = allExperiences[j], allExperiences[i]
	})

	if len(allExperiences) > limit {
		allExperiences = allExperiences[:limit]
	}

	deduped := make([]models.Experience, 0, len(allExperiences))
	seen := make(map[string]bool)
	for _, e := range allExperiences {
		if !seen[e.HeadoutID] {
			seen[e.HeadoutID] = true
			deduped = append(deduped, e)
		}
	}

	convertExperiencePrices(deduped, currencyCode)

	totalPages := 1
	if len(deduped) >= limit {
		totalPages = page + 1
	}

	c.JSON(http.StatusOK, gin.H{
		"data":          deduped,
		"count":         len(deduped),
		"page":          page,
		"limit":         limit,
		"total_pages":   totalPages,
		"currency_code": strings.ToUpper(defaultIfEmpty(currencyCode, "USD")),
	})
}

// searchByQueryAcrossCities fetches from all popular cities and filters by query text.
// Used when q is provided without a valid city/location.
func (h *ExperienceHandler) searchByQueryAcrossCities(c *gin.Context, q string, page, limit int, currencyCode string) {
	perCity := (limit / len(popularCities)) + 20
	if perCity < 20 {
		perCity = 20
	}

	type cityResult struct {
		city       string
		experiences []models.Experience
	}

	var mu sync.Mutex
	var wg sync.WaitGroup
	results := make([]cityResult, 0, len(popularCities))

	// Use a semaphore to limit concurrency to 5 simultaneous API calls
	sem := make(chan struct{}, 5)

	for _, city := range popularCities {
		wg.Add(1)
		sem <- struct{}{}
		go func(cityName string) {
			defer wg.Done()
			defer func() { <-sem }()
			exps, err := h.fetchLiveExperiencesForLocation(c, cityName, 1, perCity)
			mu.Lock()
			if err == nil {
				filtered := filterExperiencesByQuery(exps, q)
				if len(filtered) > 0 {
					results = append(results, cityResult{city: cityName, experiences: filtered})
				}
			}
			mu.Unlock()
		}(city)
	}
	wg.Wait()

	if len(results) == 0 {
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

	allExperiences := make([]models.Experience, 0, limit)
	for _, r := range results {
		allExperiences = append(allExperiences, r.experiences...)
	}

	if len(allExperiences) > limit {
		allExperiences = allExperiences[:limit]
	}

	deduped := make([]models.Experience, 0, len(allExperiences))
	seen := make(map[string]bool)
	for _, e := range allExperiences {
		if !seen[e.HeadoutID] {
			seen[e.HeadoutID] = true
			deduped = append(deduped, e)
		}
	}

	convertExperiencePrices(deduped, currencyCode)

	totalPages := 1
	if len(deduped) >= limit {
		totalPages = page + 1
	}

	c.JSON(http.StatusOK, gin.H{
		"data":          deduped,
		"count":         len(deduped),
		"page":          page,
		"limit":         limit,
		"total_pages":   totalPages,
		"currency_code": strings.ToUpper(defaultIfEmpty(currencyCode, "USD")),
	})
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
	query.Set("languageCode", "EN")
	query.Set("limit", "50")
	query.Set("offset", "0")

	upstream, err := h.headoutProxySvc.Get(c.Request.Context(), "/v2/products/", query, true)
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
	query.Set("languageCode", defaultIfEmpty(c.Query("languageCode"), "EN"))
	query.Set("limit", strconv.Itoa(limit))
	query.Set("offset", strconv.Itoa(offset))

	upstream, err := h.headoutProxySvc.Get(c.Request.Context(), "/v2/products/", query, true)
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
		currency = getNestedString(item, "currency", "code")
	}
	if currency == "" {
		currency = "USD"
	}

	rating := float32(firstNonZero(getFloat(item, "rating", "average_rating"), getNestedFloat(item, "ratingCumulative", "avg")))
	reviewCount := int(firstNonZero(getFloat(item, "review_count", "ratings_count"), getNestedFloat(item, "ratingCumulative", "count")))
	if rating == 0 {
		if rs, ok := item["reviewsSummary"].(map[string]interface{}); ok {
			rating = float32(getFloat(rs, "averageRating"))
			reviewCount = int(getFloat(rs, "ratingsCount"))
		}
	}

	price := firstNonZero(getFloat(item, "price", "starting_price", "base_price"), getNestedFloat(item, "pricing", "minimumPrice", "finalPrice"), getNestedFloat(item, "pricing", "headoutSellingPrice"))

	imageURL := firstNonEmpty(getString(item, "image_url", "thumbnail", "hero_image"), getNestedString(item, "image", "url"))
	if imageURL == "" {
		if media, ok := item["media"].([]interface{}); ok && len(media) > 0 {
			if first, ok := media[0].(map[string]interface{}); ok {
				imageURL = getString(first, "url")
			}
		}
	}

	return models.Experience{
		ID:          fallbackID,
		HeadoutID:   headoutID,
		Title:       title,
		Description: description,
		Category:    firstNonEmpty(getString(item, "category", "primary_category"), getNestedString(item, "primaryCategory", "name")),
		Location:    location,
		Duration:    getString(item, "duration", "duration_text"),
		Price:       price,
		Currency:    currency,
		Rating:      rating,
		ReviewCount: reviewCount,
		ImageURL:    imageURL,
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

// fetchExperiencesFromProductsTable queries the products table and converts to Experience format.
// Used as fallback when the experiences table is empty.
func (h *ExperienceHandler) fetchExperiencesFromProductsTable(category, location, q string, page, limit int) []models.Experience {
	offset := (page - 1) * limit
	query := h.db.Model(&models.Product{}).Where("title != '' AND (is_available = ? OR is_available IS NULL)", true)

	if location != "" {
		query = query.Where("LOWER(city_name) LIKE ? OR LOWER(city_code) LIKE ?",
			"%"+strings.ToLower(location)+"%", "%"+strings.ToLower(toCityCode(location))+"%")
	}
	if category != "" {
		query = query.Where("LOWER(category) LIKE ?", "%"+strings.ToLower(category)+"%")
	}
	if q != "" {
		like := "%" + strings.ToLower(q) + "%"
		query = query.Where("LOWER(title) LIKE ? OR LOWER(description) LIKE ? OR LOWER(category) LIKE ?", like, like, like)
	}

	var dbProducts []models.Product
	if err := query.Order("title asc").Offset(offset).Limit(limit).Find(&dbProducts).Error; err != nil {
		logger.Errorf("Failed to fetch products from products table: %v", err)
		return nil
	}

	experiences := make([]models.Experience, 0, len(dbProducts))
	for i, p := range dbProducts {
		experiences = append(experiences, models.Experience{
			ID:          uint(i + 1),
			HeadoutID:   p.HeadoutID,
			Title:       p.Title,
			Description: p.Description,
			Category:    p.Category,
			Location:    p.CityName,
			Duration:    p.Duration,
			Price:       p.PriceFrom,
			Currency:    p.Currency,
			Rating:      float32(p.Rating),
			ReviewCount: p.ReviewCount,
			ImageURL:    p.ImageURL,
			Status:      "active",
		})
	}
	return experiences
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
