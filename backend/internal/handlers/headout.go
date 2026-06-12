package handlers

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
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

// headoutTTLCache caches Headout API responses in memory to absorb repeated identical requests.
// Used for seatmap endpoints which Headout can serve slowly (5–10 s).
var headoutTTLCache sync.Map // key: string → *headoutCacheEntry

type headoutCacheEntry struct {
	body      []byte
	status    int
	expiresAt time.Time
}

func headoutCacheGet(key string) (*headoutCacheEntry, bool) {
	v, ok := headoutTTLCache.Load(key)
	if !ok {
		return nil, false
	}
	entry := v.(*headoutCacheEntry)
	if time.Now().After(entry.expiresAt) {
		headoutTTLCache.Delete(key)
		return nil, false
	}
	return entry, true
}

func headoutCacheSet(key string, status int, body []byte, ttl time.Duration) {
	headoutTTLCache.Store(key, &headoutCacheEntry{
		body:      body,
		status:    status,
		expiresAt: time.Now().Add(ttl),
	})
}

type HeadoutHandler struct {
	service       *services.HeadoutProxyService
	publicService *services.HeadoutProxyService
	db            *gorm.DB
}

func NewHeadoutHandler(cfg *config.Config, db *gorm.DB) *HeadoutHandler {
	return &HeadoutHandler{
		service:       services.NewHeadoutProxyService(cfg),
		publicService: services.NewHeadoutProxyService(cfg),
		db:            db,
	}
}

// v1 endpoints
func (h *HeadoutHandler) GetProductByID(c *gin.Context) {
	path := fmt.Sprintf("/v1/product/get/%s", url.PathEscape(c.Param("productId")))
	h.proxyGetWithService(c, h.publicService, path, false)
}

func (h *HeadoutHandler) ListProductsByCity(c *gin.Context) {
	h.proxyGetWithService(c, h.publicService, "/v2/products/", false)
}

func (h *HeadoutHandler) ListProductsByCategory(c *gin.Context) {
	h.proxyGetWithService(c, h.publicService, "/v1/product/listing/list-by/category", false)
}

func (h *HeadoutHandler) ListInventoryByVariant(c *gin.Context) {
	h.proxyGetWithService(c, h.publicService, "/v1/inventory/list-by/variant", false)
}

func (h *HeadoutHandler) ListBookings(c *gin.Context) {
	h.proxyGet(c, "/v1/booking", true)
}

func (h *HeadoutHandler) GetBookingByID(c *gin.Context) {
	if !isFetchFresh() {
		h.getBookingFromDB(c)
		return
	}
	path := fmt.Sprintf("/v1/booking/%s", url.PathEscape(c.Param("id")))
	h.proxyGet(c, path, true)
}

func (h *HeadoutHandler) getBookingFromDB(c *gin.Context) {
	bookingID := c.Param("id")
	if bookingID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "booking id is required"})
		return
	}

	// Try local_bookings first (fetch_fresh=false path)
	var local models.LocalBooking
	if err := h.db.Where("booking_ref = ?", bookingID).First(&local).Error; err == nil {
		startDT := local.Date
		if local.StartTime != "" && local.StartTime != "00:00" {
			startDT = local.Date + "T" + local.StartTime + ":00"
		}
		c.JSON(http.StatusOK, gin.H{
			"bookingId":             local.BookingRef,
			"partnerReferenceId":    local.BookingRef,
			"status":                "CONFIRMED",
			"firstName":             local.FirstName,
			"lastName":              local.LastName,
			"productName":           local.ProductName,
			"variantName":           local.VariantName,
			"confirmationEmailSent": local.ConfirmationSent,
			"startDateTime":         startDT,
			"price": gin.H{
				"amount":       local.TotalAmount,
				"currencyCode": local.CurrencyCode,
			},
		})
		return
	}

	// Fall back to main bookings table
	var booking models.Booking
	if err := h.db.Where("booking_id = ?", bookingID).First(&booking).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "booking not found"})
		return
	}

	startDT := ""
	if !booking.StartDateTime.IsZero() {
		startDT = booking.StartDateTime.Format(time.RFC3339)
	}
	c.JSON(http.StatusOK, gin.H{
		"bookingId":             booking.BookingID,
		"partnerReferenceId":    booking.PartnerReferenceID,
		"status":                "CONFIRMED",
		"firstName":             booking.FirstName,
		"lastName":              booking.LastName,
		"productName":           booking.ProductName,
		"variantName":           booking.VariantName,
		"confirmationEmailSent": booking.ConfirmationEmailSent,
		"startDateTime":         startDT,
		"price": gin.H{
			"amount":       booking.TotalAmount,
			"currencyCode": booking.CurrencyCode,
		},
	})
}

func (h *HeadoutHandler) CreateBooking(c *gin.Context) {
	h.proxyBodyRequest(c, http.MethodPost, "/v1/booking", true)
}

func (h *HeadoutHandler) UpdateBooking(c *gin.Context) {
	path := fmt.Sprintf("/v1/booking/%s", url.PathEscape(c.Param("id")))
	h.proxyBodyRequest(c, http.MethodPut, path, true)
}

func (h *HeadoutHandler) ListCities(c *gin.Context) {
	h.proxyGetWithService(c, h.publicService, "/v1/city", false)
}

func (h *HeadoutHandler) ListCategoriesByCityV1(c *gin.Context) {
	h.proxyGetWithService(c, h.publicService, "/v1/category/list-by/city", false)
}

// v2 endpoints


func (h *HeadoutHandler) ListCitiesV2(c *gin.Context) {
	if isFetchFresh() {
		h.listCitiesFromHeadout(c)
		return
	}
	h.listCitiesFromDB(c)
}

func (h *HeadoutHandler) listCitiesFromHeadout(c *gin.Context) {
	q := c.Request.URL.Query()

	offset := 0
	if v := q.Get("offset"); v != "" {
		parsed, err := strconv.Atoi(v)
		if err != nil || parsed < 0 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "offset must be a non-negative integer"})
			return
		}
		offset = parsed
	}

	limit := 20
	if v := q.Get("limit"); v != "" {
		parsed, err := strconv.Atoi(v)
		if err != nil || parsed < 0 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "limit must be a non-negative integer"})
			return
		}
		if parsed > 40 {
			limit = 40
		} else {
			limit = parsed
		}
	}

	headoutLimit := limit
	if headoutLimit > 200 {
		headoutLimit = 200
	}

	type cityRaw struct {
		Code    string  `json:"code"`
		Name    string  `json:"name"`
		Image   *struct {
			URL string `json:"url"`
		} `json:"image"`
		Country *struct {
			Code string `json:"code"`
			Name string `json:"name"`
		} `json:"country"`
		Timezone string `json:"timezone"`
	}

	allCities := make([]cityRaw, 0, limit)
	var total int
	var lastNextURL string

	for len(allCities) < limit {
		pq := url.Values{}
		pq.Set("limit", strconv.Itoa(headoutLimit))
		pq.Set("offset", strconv.Itoa(offset))

		upstream, err := h.publicService.Get(c.Request.Context(), "/v2/cities/", pq, true)
		if err != nil {
			h.handleProxyError(c, err)
			return
		}
		if upstream.StatusCode < 200 || upstream.StatusCode >= 300 {
			c.Data(upstream.StatusCode, upstream.Headers.Get("Content-Type"), upstream.Body)
			return
		}

		var page struct {
			Cities  []cityRaw `json:"cities"`
			Total   int       `json:"total"`
			NextURL string    `json:"nextUrl"`
		}
		if err := json.Unmarshal(upstream.Body, &page); err != nil {
			c.Data(upstream.StatusCode, upstream.Headers.Get("Content-Type"), upstream.Body)
			return
		}

		if len(page.Cities) == 0 {
			break
		}

		needed := limit - len(allCities)
		if len(page.Cities) <= needed {
			allCities = append(allCities, page.Cities...)
		} else {
			allCities = append(allCities, page.Cities[:needed]...)
		}

		if total == 0 && page.Total > 0 {
			total = page.Total
		}

		lastNextURL = page.NextURL

		if len(page.Cities) < headoutLimit || page.NextURL == "" {
			break
		}
		offset += headoutLimit
	}

	result := make([]map[string]interface{}, 0, len(allCities))
	for _, cty := range allCities {
		entry := map[string]interface{}{
			"code":     cty.Code,
			"name":     cty.Name,
			"timezone": cty.Timezone,
		}
		if cty.Image != nil {
			entry["image"] = map[string]interface{}{"url": cty.Image.URL}
		}
		if cty.Country != nil {
			entry["country"] = map[string]interface{}{"code": cty.Country.Code, "name": cty.Country.Name}
		}
		result = append(result, entry)
	}

	var nextOffset *int
	if lastNextURL != "" {
		parsedURL, err := url.Parse(lastNextURL)
		if err == nil {
			if ns := parsedURL.Query().Get("offset"); ns != "" {
				if n, err := strconv.Atoi(ns); err == nil {
					nextOffset = &n
				}
			}
		}
	}
	if nextOffset == nil && len(result) > 0 && total > len(result) {
		val := offset + limit
		nextOffset = &val
	}

	response := map[string]interface{}{
		"cities":     result,
		"total":      total,
		"nextUrl":    lastNextURL,
		"nextOffset": nextOffset,
	}
	c.JSON(http.StatusOK, response)
}

func (h *HeadoutHandler) listCitiesFromDB(c *gin.Context) {
	q := c.Request.URL.Query()

	offset := 0
	if v := q.Get("offset"); v != "" {
		parsed, err := strconv.Atoi(v)
		if err != nil || parsed < 0 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "offset must be a non-negative integer"})
			return
		}
		offset = parsed
	}

	limit := 20
	if v := q.Get("limit"); v != "" {
		parsed, err := strconv.Atoi(v)
		if err != nil || parsed < 0 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "limit must be a non-negative integer"})
			return
		}
		if parsed > 40 {
			limit = 40
		} else {
			limit = parsed
		}
	}

	var total int64
	h.db.Model(&models.City{}).Count(&total)

	var cities []models.City
	h.db.Order("name asc").Offset(offset).Limit(limit).Find(&cities)

	type cityResponse struct {
		Code      string                `json:"code"`
		Name      string                `json:"name"`
		Image     models.CityImageJSON  `json:"image"`
		Country   models.CityCountryJSON `json:"country"`
		Timezone  string                `json:"timezone"`
	}

	resultCities := make([]cityResponse, 0, len(cities))
	for _, cty := range cities {
		resultCities = append(resultCities, cityResponse{
			Code:     cty.Code,
			Name:     cty.Name,
			Image:    models.CityImageJSON{URL: cty.ImageURL},
			Country:  models.CityCountryJSON{Code: cty.CountryCode, Name: cty.CountryName},
			Timezone: cty.Timezone,
		})
	}

	var nextOffset *int
	if offset+limit < int(total) {
		val := offset + limit
		nextOffset = &val
	}

	c.JSON(http.StatusOK, gin.H{
		"cities":     resultCities,
		"nextUrl":    nil,
		"prevUrl":    nil,
		"total":      total,
		"nextOffset": nextOffset,
	})
}

var productPopularCities = []string{
	"NEW_YORK", "PARIS", "LONDON", "DUBAI", "TOKYO",
	"BARCELONA", "ROME", "SINGAPORE", "BANGKOK", "ISTANBUL",
	"SYDNEY", "AMSTERDAM", "LAS_VEGAS", "SAN_FRANCISCO", "LOS_ANGELES",
	"ORLANDO", "HONG_KONG", "MUMBAI", "CANCUN", "MIAMI",
}

func (h *HeadoutHandler) ListProductsV2(c *gin.Context) {
	q := c.Request.URL.Query()

	if !isFetchFresh() {
		h.listProductsFromDB(c, q)
		return
	}

	limit := 20
	if v := q.Get("limit"); v != "" {
		parsed, err := strconv.Atoi(v)
		if err != nil || parsed < 0 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "limit must be a non-negative integer"})
			return
		}
		if parsed > 100 {
			limit = 100
		} else {
			limit = parsed
		}
	}

	offset := 0
	if v := q.Get("offset"); v != "" {
		parsed, err := strconv.Atoi(v)
		if err != nil || parsed < 0 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "offset must be a non-negative integer"})
			return
		}
		offset = parsed
	}

	currencyCode := strings.TrimSpace(q.Get("currencyCode"))

	cityCode := strings.TrimSpace(q.Get("cityCode"))
	if cityCode != "" && cityCode != "undefined" && cityCode != "null" {
		q.Set("offset", strconv.Itoa(offset))
		q.Set("limit", strconv.Itoa(limit))
		cacheKey := "products-v2-city:" + q.Encode()
		if entry, ok := headoutCacheGet(cacheKey); ok {
			c.Data(entry.status, "application/json", entry.body)
			return
		}
		upstream, err := h.service.Get(c.Request.Context(), "/v2/products", q, true)
		if err != nil {
			h.handleProxyError(c, err)
			return
		}
		if upstream.StatusCode >= 200 && upstream.StatusCode < 300 {
			headoutCacheSet(cacheKey, upstream.StatusCode, upstream.Body, 5*time.Minute)
		}
		h.writeUpstreamResponse(c, upstream)
		return
	}

	h.fetchRandomProductsV2(c, limit, offset, currencyCode)
}

func (h *HeadoutHandler) listProductsFromDB(c *gin.Context, q url.Values) {
	offset := 0
	if v := q.Get("offset"); v != "" {
		parsed, err := strconv.Atoi(v)
		if err != nil || parsed < 0 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "offset must be a non-negative integer"})
			return
		}
		offset = parsed
	}

	limit := 20
	if v := q.Get("limit"); v != "" {
		parsed, err := strconv.Atoi(v)
		if err != nil || parsed < 0 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "limit must be a non-negative integer"})
			return
		}
		if parsed > 100 {
			limit = 100
		} else {
			limit = parsed
		}
	}

	cityCode := strings.TrimSpace(q.Get("cityCode"))
	category := strings.TrimSpace(q.Get("category"))

	query := h.db.Model(&models.Product{})
	if cityCode != "" && cityCode != "undefined" && cityCode != "null" {
		query = query.Where("city_code = ?", cityCode)
	}
	if category != "" && category != "undefined" && category != "null" {
		query = query.Where("category ILIKE ?", "%"+category+"%")
	}
	// Filter out unavailable products from user-facing listings
	query = query.Where("is_available = ?", true)

	var total int64
	query.Count(&total)

	var products []models.Product
	query.Order("title asc").Offset(offset).Limit(limit).Find(&products)

	type productResponse struct {
		ID          string  `json:"id"`
		Title       string  `json:"title"`
		CityCode    string  `json:"cityCode"`
		CityName    string  `json:"cityName"`
		Category    string  `json:"category"`
		ImageURL    string  `json:"imageUrl"`
		FromPrice   float64 `json:"fromPrice"`
		Currency    string  `json:"currency"`
		Rating      float64 `json:"rating"`
		ReviewCount int     `json:"reviewCount"`
		Duration    string  `json:"duration"`
		Latitude    float64 `json:"latitude"`
		Longitude   float64 `json:"longitude"`
	}

	resultProducts := make([]productResponse, 0, len(products))
	for _, p := range products {
		resultProducts = append(resultProducts, productResponse{
			ID:          p.HeadoutID,
			Title:       p.Title,
			CityCode:    p.CityCode,
			CityName:    p.CityName,
			Category:    p.Category,
			ImageURL:    p.ImageURL,
			FromPrice:   p.PriceFrom,
			Currency:    p.Currency,
			Rating:      p.Rating,
			ReviewCount: p.ReviewCount,
			Duration:    p.Duration,
		})
	}

	var nextOffset *int
	if offset+limit < int(total) {
		val := offset + limit
		nextOffset = &val
	}

	c.JSON(http.StatusOK, gin.H{
		"products":   resultProducts,
		"total":      total,
		"nextOffset": nextOffset,
		"nextUrl":    nil,
		"prevUrl":    nil,
	})
}

func (h *HeadoutHandler) fetchRandomProductsV2(c *gin.Context, limit int, offset int, currencyCode string) {
	if len(productPopularCities) == 0 {
		c.JSON(http.StatusOK, gin.H{"products": []json.RawMessage{}, "total": 0, "nextOffset": nil})
		return
	}

	cityIndex := offset / limit
	if cityIndex >= len(productPopularCities) {
		c.JSON(http.StatusOK, gin.H{"products": []json.RawMessage{}, "total": 0, "nextOffset": nil})
		return
	}

	cityName := productPopularCities[cityIndex]

	query := url.Values{}
	query.Set("cityCode", cityName)
	if currencyCode != "" {
		query.Set("currencyCode", strings.ToUpper(currencyCode))
	}
	query.Set("limit", strconv.Itoa(limit))
	query.Set("offset", "0")

	cacheKey := "products-random:" + query.Encode()
	var upstream *services.UpstreamResponse
	if entry, ok := headoutCacheGet(cacheKey); ok {
		upstream = &services.UpstreamResponse{StatusCode: entry.status, Body: entry.body}
	} else {
		var err error
		upstream, err = h.service.Get(c.Request.Context(), "/v2/products", query, true)
		if err != nil {
			logger.Errorf("Failed to fetch products for %s: %v", cityName, err)
			var nextOffsetVal *int
			if cityIndex+1 < len(productPopularCities) {
				val := offset + limit
				nextOffsetVal = &val
			}
			c.JSON(http.StatusOK, gin.H{"products": []json.RawMessage{}, "total": 0, "nextOffset": nextOffsetVal})
			return
		}
		if upstream.StatusCode >= 200 && upstream.StatusCode < 300 {
			headoutCacheSet(cacheKey, upstream.StatusCode, upstream.Body, 5*time.Minute)
		}
	}

	var body struct {
		Products []json.RawMessage `json:"products"`
	}
	if err := json.Unmarshal(upstream.Body, &body); err != nil {
		logger.Errorf("Failed to parse products for %s: %v", cityName, err)
		var nextOffsetVal *int
		if cityIndex+1 < len(productPopularCities) {
			val := offset + limit
			nextOffsetVal = &val
		}
		c.JSON(http.StatusOK, gin.H{"products": []json.RawMessage{}, "total": 0, "nextOffset": nextOffsetVal})
		return
	}

	allProducts := body.Products

	var nextOffsetVal *int
	if cityIndex+1 < len(productPopularCities) {
		val := offset + limit
		nextOffsetVal = &val
	}

	c.JSON(http.StatusOK, gin.H{
		"products":    allProducts,
		"total":       len(allProducts),
		"nextOffset":  nextOffsetVal,
		"nextUrl":     nil,
		"prevUrl":     nil,
	})
}

func (h *HeadoutHandler) ListCategoriesV2(c *gin.Context) {
	if !isFetchFresh() {
		if h.writeCachedResponse(c, "/v2/categories") {
			return
		}
		h.proxyAndCache(c, "/v2/categories", true)
		return
	}
	h.proxyGet(c, "/v2/categories", true)
}

func (h *HeadoutHandler) ListCollectionsV2(c *gin.Context) {
	if !isFetchFresh() {
		if h.writeCachedResponse(c, "/v2/collections") {
			return
		}
		h.proxyAndCache(c, "/v2/collections", true)
		return
	}
	h.proxyGet(c, "/v2/collections", true)
}

func (h *HeadoutHandler) GetProductByIDV2(c *gin.Context) {
	productID := strings.TrimSpace(c.Param("productId"))
	if productID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "productId is required"})
		return
	}

	if !isFetchFresh() {
		var product models.Product
		if err := h.db.Where("headout_id = ?", productID).First(&product).Error; err == nil {
			if len(product.RawHeadoutData) > 0 {
				// Patch listingPrice with the synced price_from so the PDP and listings agree
				var pData map[string]interface{}
				if json.Unmarshal(product.RawHeadoutData, &pData) == nil && product.PriceFrom > 0 {
					if lp, ok := pData["listingPrice"].(map[string]interface{}); ok {
						if mp, ok := lp["minimumPrice"].(map[string]interface{}); ok {
							mp["finalPrice"] = product.PriceFrom
						}
					}
					if patched, err := json.Marshal(pData); err == nil {
						h.writeRawJSON(c, patched)
						return
					}
				}
				h.writeRawJSON(c, product.RawHeadoutData)
			} else {
				h.writeProductFromDB(c, &product)
			}
			return
		}
		c.JSON(http.StatusNotFound, gin.H{"error": "product not found"})
		return
	}

	cacheKey := "product-v2:" + productID
	if entry, ok := headoutCacheGet(cacheKey); ok {
		c.Data(entry.status, "application/json", entry.body)
		return
	}

	path := fmt.Sprintf("/v2/products/%s/", url.PathEscape(productID))
	upstream, err := h.service.Get(c.Request.Context(), path, url.Values{}, true)
	if err != nil {
		h.handleProxyError(c, err)
		return
	}
	if upstream.StatusCode >= 200 && upstream.StatusCode < 300 {
		headoutCacheSet(cacheKey, upstream.StatusCode, upstream.Body, 10*time.Minute)
		var pData map[string]interface{}
		if json.Unmarshal(upstream.Body, &pData) == nil {
			go h.saveProductToDB(productID, pData)
		}
	}
	h.writeUpstreamResponse(c, upstream)
}

func (h *HeadoutHandler) ListNormalAvailabilities(c *gin.Context) {
	productID := strings.TrimSpace(c.Param("productId"))
	variantID := strings.TrimSpace(c.Param("variantId"))
	if productID == "" || variantID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "productId and variantId are required"})
		return
	}

	if !isFetchFresh() {
		h.listAvailabilitiesFromDB(c, productID, variantID)
		return
	}

	path := fmt.Sprintf("/v2/products/%s/variants/%s/availabilities/", url.PathEscape(productID), url.PathEscape(variantID))
	upstream, err := h.service.Get(c.Request.Context(), path, c.Request.URL.Query(), true)
	if err != nil {
		h.handleProxyError(c, err)
		return
	}

	// Sync availability records to DB in background
	go h.syncAvailabilitiesToDB(productID, variantID, upstream.Body)

	h.writeUpstreamResponse(c, upstream)
}

func (h *HeadoutHandler) ListNormalInventory(c *gin.Context) {
	q := c.Request.URL.Query()
	tourID := strings.TrimSpace(q.Get("tourId"))
	startDT := strings.TrimSpace(q.Get("startDateTime"))
	endDT := strings.TrimSpace(q.Get("endDateTime"))
	currencyCode := strings.TrimSpace(q.Get("currencyCode"))

	if tourID == "" || startDT == "" || endDT == "" || currencyCode == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "tourId, startDateTime, endDateTime, and currencyCode are required"})
		return
	}

	if !isFetchFresh() {
		h.listInventoryFromDB(c)
		return
	}

	h.proxyGet(c, "/v2/inventory/list-by/tour/", true)
}

// ListSeatmapAvailabilities proxies GET /v2/seatmap/products/{productId}/variants/{variantId}/availabilities/
// Returns date-level availability (with per-date time slots) for seatmap products.
// Responses are cached in-memory for 5 minutes to absorb repeated calls.
func (h *HeadoutHandler) ListSeatmapAvailabilities(c *gin.Context) {
	productID := strings.TrimSpace(c.Param("productId"))
	variantID := strings.TrimSpace(c.Param("variantId"))
	if productID == "" || variantID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "productId and variantId are required"})
		return
	}
	q := c.Request.URL.Query()
	path := fmt.Sprintf("/v2/seatmap/products/%s/variants/%s/availabilities/",
		url.PathEscape(productID), url.PathEscape(variantID))
	cacheKey := path + "?" + q.Encode()
	if entry, ok := headoutCacheGet(cacheKey); ok {
		c.Data(entry.status, "application/json", entry.body)
		return
	}
	upstream, err := h.service.Get(c.Request.Context(), path, q, true)
	if err != nil {
		h.handleProxyError(c, err)
		return
	}
	if upstream.StatusCode >= 200 && upstream.StatusCode < 300 {
		headoutCacheSet(cacheKey, upstream.StatusCode, upstream.Body, 5*time.Minute)
	}
	h.writeUpstreamResponse(c, upstream)
}

// ListSeatmapInventory proxies GET /v2/seatmap/products/{productId}/variants/{variantId}/inventories/
// Returns the inventoryId and all available seats (by section) for a specific show (date + startTime).
// Responses are cached in-memory for 2 minutes.
func (h *HeadoutHandler) ListSeatmapInventory(c *gin.Context) {
	productID := strings.TrimSpace(c.Param("productId"))
	variantID := strings.TrimSpace(c.Param("variantId"))
	if productID == "" || variantID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "productId and variantId are required"})
		return
	}
	q := c.Request.URL.Query()
	if q.Get("date") == "" || q.Get("startTime") == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "date and startTime are required"})
		return
	}
	path := fmt.Sprintf("/v2/seatmap/products/%s/variants/%s/inventories/",
		url.PathEscape(productID), url.PathEscape(variantID))
	cacheKey := path + "?" + q.Encode()
	if entry, ok := headoutCacheGet(cacheKey); ok {
		c.Data(entry.status, "application/json", entry.body)
		return
	}
	upstream, err := h.service.Get(c.Request.Context(), path, q, true)
	if err != nil {
		h.handleProxyError(c, err)
		return
	}
	if upstream.StatusCode >= 200 && upstream.StatusCode < 300 {
		headoutCacheSet(cacheKey, upstream.StatusCode, upstream.Body, 2*time.Minute)
	}
	h.writeUpstreamResponse(c, upstream)
}

func (h *HeadoutHandler) ListSubcategoriesV2(c *gin.Context) {
	if !isFetchFresh() {
		if h.writeCachedResponse(c, "/v2/subcategories") {
			return
		}
		h.proxyAndCache(c, "/v2/subcategories", true)
		return
	}
	h.proxyGet(c, "/v2/subcategories", true)
}

func (h *HeadoutHandler) writeRawJSON(c *gin.Context, data []byte) {
	c.Data(http.StatusOK, "application/json", data)
}

func (h *HeadoutHandler) writeProductFromDB(c *gin.Context, product *models.Product) {
	type productImage struct {
		URL string `json:"url"`
	}
	type productMedia struct {
		URL string `json:"url"`
	}
	type productCity struct {
		Code string `json:"code"`
		Name string `json:"name"`
	}
	type productCountry struct {
		Code string `json:"code"`
		Name string `json:"name"`
	}
	type productCurrency struct {
		Code string `json:"code"`
	}
	type listingPriceMin struct {
		FinalPrice float64 `json:"finalPrice"`
	}
	type listingPrice struct {
		MinimumPrice listingPriceMin `json:"minimumPrice"`
		CurrencyCode string          `json:"currencyCode"`
	}
	type reviewsSummary struct {
		AverageRating float64 `json:"averageRating"`
		RatingsCount  int     `json:"ratingsCount"`
	}
	type productResponse struct {
		ID             string          `json:"id"`
		Name           string          `json:"name"`
		Description    string          `json:"description"`
		City           productCity     `json:"city"`
		Category       string          `json:"category"`
		Media          []productMedia  `json:"media"`
		ListingPrice   listingPrice    `json:"listingPrice"`
		ReviewsSummary reviewsSummary  `json:"reviewsSummary"`
		Duration       string          `json:"duration"`
	}

	resp := productResponse{
		ID:          product.HeadoutID,
		Name:        product.Title,
		Description: product.Description,
		City: productCity{
			Code: product.CityCode,
			Name: product.CityName,
		},
		Category: product.Category,
		Media:    []productMedia{},
		ListingPrice: listingPrice{
			MinimumPrice: listingPriceMin{FinalPrice: product.PriceFrom},
			CurrencyCode: product.Currency,
		},
		ReviewsSummary: reviewsSummary{
			AverageRating: product.Rating,
			RatingsCount:  product.ReviewCount,
		},
		Duration: product.Duration,
	}
	if product.ImageURL != "" {
		resp.Media = append(resp.Media, productMedia{URL: product.ImageURL})
	}

	c.JSON(http.StatusOK, resp)
}

func (h *HeadoutHandler) syncProductToDB(c *gin.Context, productID string) {
	path := fmt.Sprintf("/v2/products/%s/", url.PathEscape(productID))
	upstream, err := h.service.Get(c.Request.Context(), path, url.Values{}, true)
	if err != nil {
		logger.Errorf("Failed to fetch product %s from Headout for lazy sync: %v", productID, err)
		h.handleProxyError(c, err)
		return
	}

	if upstream.StatusCode >= 400 {
		h.writeUpstreamResponse(c, upstream)
		return
	}

	var pData map[string]interface{}
	if err := json.Unmarshal(upstream.Body, &pData); err != nil {
		logger.Errorf("Failed to parse product %s from Headout: %v", productID, err)
		h.writeUpstreamResponse(c, upstream)
		return
	}

	h.writeUpstreamResponse(c, upstream)

	go func() {
		defer func() {
			if r := recover(); r != nil {
				logger.Errorf("Panic saving product %s to DB: %v", productID, r)
			}
		}()
		h.saveProductToDB(productID, pData)
	}()
}

func (h *HeadoutHandler) saveProductToDB(headoutID string, pData map[string]interface{}) {
	title := extractString(pData, "name")
	if title == "" {
		title = extractString(pData, "title")
	}
	description := extractString(pData, "description")
	cityName := extractNestedString(pData, "city.name", "cityName")
	category := extractNestedString(pData, "primaryCategory.name", "category")

	var imageURL string
	if media, ok := pData["media"].([]interface{}); ok && len(media) > 0 {
		if first, ok := media[0].(map[string]interface{}); ok {
			if url, ok := first["url"].(string); ok {
				imageURL = url
			}
		}
	}
	if imageURL == "" {
		imageURL = extractNestedString(pData, "imageUrl")
	}

	currency := extractNestedString(pData, "currency.code", "listingPrice.currencyCode", "pricing.currency")

	var priceFrom float64
	if lp, ok := pData["listingPrice"].(map[string]interface{}); ok {
		if mp, ok := lp["minimumPrice"].(map[string]interface{}); ok {
			switch v := mp["finalPrice"].(type) {
			case float64:
				priceFrom = v
			case json.Number:
				priceFrom, _ = v.Float64()
			}
		}
	}
	if priceFrom == 0 {
		if pricing, ok := pData["pricing"].(map[string]interface{}); ok {
			switch v := pricing["headoutSellingPrice"].(type) {
			case float64:
				priceFrom = v
			case json.Number:
				priceFrom, _ = v.Float64()
			}
		}
	}

	var rating float64
	if rs, ok := pData["reviewsSummary"].(map[string]interface{}); ok {
		switch v := rs["averageRating"].(type) {
		case float64:
			rating = v
		case json.Number:
			rating, _ = v.Float64()
		}
	}

	var reviewCount int
	if rs, ok := pData["reviewsSummary"].(map[string]interface{}); ok {
		switch v := rs["ratingsCount"].(type) {
		case float64:
			reviewCount = int(v)
		case json.Number:
			rc, _ := v.Int64()
			reviewCount = int(rc)
		}
	}

	duration := extractString(pData, "duration")
	rawCityCode := extractNestedString(pData, "cityCode", "city.code")

	rawJSON, _ := json.Marshal(pData)

	now := time.Now()

	var existing models.Product
	err := h.db.Where("headout_id = ?", headoutID).First(&existing).Error

	if err == gorm.ErrRecordNotFound {
		product := models.Product{
			HeadoutID:        headoutID,
			Title:            title,
			Description:      description,
			CityCode:         rawCityCode,
			CityName:         cityName,
			Category:         category,
			ImageURL:         imageURL,
			Currency:         currency,
			PriceFrom:        priceFrom,
			Rating:           rating,
			ReviewCount:      reviewCount,
			Duration:         duration,
			RawHeadoutData:   rawJSON,
			LastSyncedAt:     now,
			MetadataSyncedAt: &now,
		}
		if createErr := h.db.Create(&product).Error; createErr != nil {
			logger.Errorf("Failed to save product %s to DB: %v", headoutID, createErr)
		}
	} else if err == nil {
		existing.Title = title
		existing.Description = description
		existing.CityCode = rawCityCode
		existing.CityName = cityName
		existing.Category = category
		existing.ImageURL = imageURL
		existing.Currency = currency
		existing.PriceFrom = priceFrom
		existing.Rating = rating
		existing.ReviewCount = reviewCount
		existing.Duration = duration
		existing.RawHeadoutData = rawJSON
		existing.LastSyncedAt = now
		existing.MetadataSyncedAt = &now
		if saveErr := h.db.Save(&existing).Error; saveErr != nil {
			logger.Errorf("Failed to update product %s in DB: %v", headoutID, saveErr)
		}
	} else {
		logger.Errorf("DB error checking product %s: %v", headoutID, err)
	}
}

func (h *HeadoutHandler) writeCachedResponse(c *gin.Context, endpoint string) bool {
	var cache models.APICache
	if err := h.db.Where("endpoint = ?", endpoint).First(&cache).Error; err != nil {
		return false
	}
	if len(cache.Response) == 0 || string(cache.Response) == "{}" {
		return false
	}
	c.Data(http.StatusOK, "application/json", cache.Response)
	return true
}

func (h *HeadoutHandler) proxyAndCache(c *gin.Context, path string, requiresAuth bool) {
	upstream, err := h.service.Get(c.Request.Context(), path, c.Request.URL.Query(), requiresAuth)
	if err != nil {
		h.handleProxyError(c, err)
		return
	}

	if upstream.StatusCode >= 200 && upstream.StatusCode < 300 {
		func() {
			var existing models.APICache
			err := h.db.Where("endpoint = ?", path).First(&existing).Error
			if err == gorm.ErrRecordNotFound {
				h.db.Create(&models.APICache{
					Endpoint: path,
					Response: upstream.Body,
				})
			} else if err == nil {
				existing.Response = upstream.Body
				h.db.Save(&existing)
			}
		}()
	}

	h.writeUpstreamResponse(c, upstream)
}

func (h *HeadoutHandler) proxyGet(c *gin.Context, path string, requiresAuth bool) {
	h.proxyGetWithService(c, h.service, path, requiresAuth)
}

func (h *HeadoutHandler) proxyGetWithService(c *gin.Context, service *services.HeadoutProxyService, path string, requiresAuth bool) {
	upstream, err := service.Get(c.Request.Context(), path, c.Request.URL.Query(), requiresAuth)
	if err != nil {
		h.handleProxyError(c, err)
		return
	}

	h.writeUpstreamResponse(c, upstream)
}

func (h *HeadoutHandler) proxyBodyRequest(c *gin.Context, method string, path string, requiresAuth bool) {
	body, err := io.ReadAll(c.Request.Body)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body"})
		return
	}

	var upstream *services.UpstreamResponse
	switch method {
	case http.MethodPost:
		upstream, err = h.service.Post(c.Request.Context(), path, c.Request.URL.Query(), body, requiresAuth)
	case http.MethodPut:
		upstream, err = h.service.Put(c.Request.Context(), path, c.Request.URL.Query(), body, requiresAuth)
	default:
		err = fmt.Errorf("unsupported method: %s", method)
	}

	if err != nil {
		h.handleProxyError(c, err)
		return
	}

	h.writeUpstreamResponse(c, upstream)
}

func (h *HeadoutHandler) handleProxyError(c *gin.Context, err error) {
	if errors.Is(err, services.ErrMissingHeadoutAPIKey) {
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"error": "headout api key is missing",
		})
		return
	}

	logger.Errorf("Headout proxy request failed: %v", err)
	c.JSON(http.StatusBadGateway, gin.H{
		"error": "failed to fetch data from headout",
	})
}

func (h *HeadoutHandler) writeUpstreamResponse(c *gin.Context, upstream *services.UpstreamResponse) {
	contentType := upstream.Headers.Get("Content-Type")
	if contentType == "" {
		contentType = "application/json"
	}

	c.Data(upstream.StatusCode, contentType, upstream.Body)
}

func (h *HeadoutHandler) syncAvailabilitiesToDB(productID, variantID string, body []byte) {
	var product models.Product
	if err := h.db.Where("headout_id = ?", productID).First(&product).Error; err != nil {
		return
	}

	var variantTitle string
	var rawMap map[string]interface{}
	if err := json.Unmarshal(product.RawHeadoutData, &rawMap); err == nil {
		if vmap, ok := rawMap["variants"].([]interface{}); ok {
			for _, v := range vmap {
				if vm, ok := v.(map[string]interface{}); ok {
					if vid, _ := vm["id"].(string); vid == variantID {
						if t, ok := vm["title"].(string); ok {
							variantTitle = t
						} else if t, ok := vm["name"].(string); ok {
							variantTitle = t
						}
						break
					}
				}
			}
		}
	}

	var resp struct {
		Availabilities []map[string]interface{} `json:"availabilities"`
		Slots          []map[string]interface{} `json:"slots"`
		Items          []map[string]interface{} `json:"items"`
	}
	if err := json.Unmarshal(body, &resp); err != nil {
		return
	}

	slots := resp.Availabilities
	if len(slots) == 0 {
		slots = resp.Slots
	}
	if len(slots) == 0 {
		slots = resp.Items
	}

	startDate := time.Now().UTC().Format("2006-01-02")
	endDate := time.Now().UTC().AddDate(0, 0, 30).Format("2006-01-02")

	for _, slotData := range slots {
		slotDate := extractStringFromMap(slotData, "date")
		if slotDate == "" {
			startDT := extractStringFromMap(slotData, "startDateTime", "start_time")
			if len(startDT) >= 10 {
				slotDate = startDT[:10]
			}
		}
		if slotDate == "" || slotDate < startDate || slotDate > endDate {
			continue
		}

		startTime := extractStringFromMap(slotData, "startTime", "start_time")
		if startTime == "" {
			startDT := extractStringFromMap(slotData, "startDateTime")
			if len(startDT) >= 16 {
				startTime = startDT[11:16]
			}
		}
		endTime := extractStringFromMap(slotData, "endTime", "end_time")
		inventoryID := extractStringFromMap(slotData, "inventoryId", "inventory_id")
		inventoryType := extractStringFromMap(slotData, "inventoryType", "inventory_type")

		var priceAmount float64
		if pricing, ok := slotData["pricing"].(map[string]interface{}); ok {
			priceAmount = extractFloatFromMap(pricing, "amount", "price", "headoutSellingPrice")
		}

		slotCurrency := product.Currency
		if pricing, ok := slotData["pricing"].(map[string]interface{}); ok {
			if c := extractStringFromMap(pricing, "currency", "currencyCode"); c != "" {
				slotCurrency = c
			}
		}

		availableSlots := int(extractFloatFromMap(slotData, "availableSlots", "available_slots", "available", "remainingInventory", "remaining", "seatsAvailable"))
		if availableSlots == 0 {
			availStatus := extractStringFromMap(slotData, "availability", "status")
			switch availStatus {
			case "UNLIMITED":
				availableSlots = 999
			case "LIMITED":
				availableSlots = 1
			}
		}

		rawJSON, _ := json.Marshal(slotData)

		var existing models.ProductAvailability
		availErr := h.db.Where("product_id = ? AND variant_id = ? AND date = ? AND start_time = ?",
			product.ID, variantID, slotDate, startTime).First(&existing).Error

		if availErr == gorm.ErrRecordNotFound {
			avail := models.ProductAvailability{
				ProductID:        product.ID,
				HeadoutProductID: product.HeadoutID,
				VariantID:        variantID,
				VariantTitle:     variantTitle,
				Date:             slotDate,
				StartTime:        startTime,
				EndTime:          endTime,
				InventoryID:      inventoryID,
				InventoryType:    inventoryType,
				PriceAmount:      priceAmount,
				Currency:         slotCurrency,
				AvailableSlots:   availableSlots,
				RawHeadoutData:   rawJSON,
			}
			h.db.Create(&avail)
		} else if availErr == nil {
			existing.HeadoutProductID = product.HeadoutID
			existing.VariantTitle = variantTitle
			existing.EndTime = endTime
			existing.InventoryID = inventoryID
			existing.InventoryType = inventoryType
			existing.PriceAmount = priceAmount
			existing.Currency = slotCurrency
			existing.AvailableSlots = availableSlots
			existing.RawHeadoutData = rawJSON
			h.db.Save(&existing)
		}
	}

	now := time.Now()
	h.db.Model(&models.Product{}).Where("id = ?", product.ID).Updates(map[string]interface{}{
		"last_availability_sync_at": now,
	})
}

func (h *HeadoutHandler) listAvailabilitiesFromDB(c *gin.Context, productID, variantID string) {
	var product models.Product
	if err := h.db.Where("headout_id = ?", productID).First(&product).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "product not found"})
		return
	}

	startDate := c.Query("startDate")
	endDate := c.Query("endDate")

	if startDate == "" {
		startDate = time.Now().UTC().Format("2006-01-02")
	}
	if endDate == "" {
		endDate = time.Now().UTC().AddDate(0, 1, 0).Format("2006-01-02")
	}

	var records []models.ProductAvailability
	h.db.Where("product_id = ? AND variant_id = ? AND date >= ? AND date <= ? AND remaining_capacity > 0",
		product.ID, variantID, startDate, endDate).
		Order("date asc, start_time asc").
		Find(&records)

	type availEntry struct {
		Date         string
		Currency     string
		SellingPrice float64
		NetPrice     float64
		Remaining    int
		Availability string
	}

	dateMap := make(map[string]*availEntry)
	dateKeys := make([]string, 0)

	for _, r := range records {
		e, ok := dateMap[r.Date]
		if !ok {
			e = &availEntry{
				Date:         r.Date,
				Currency:     product.Currency,
				Availability: "CLOSED",
			}
			dateMap[r.Date] = e
			dateKeys = append(dateKeys, r.Date)
		}

		e.Remaining += r.AvailableSlots

		if e.SellingPrice == 0 || r.PriceAmount < e.SellingPrice {
			e.SellingPrice = r.PriceAmount
			e.NetPrice = r.PriceAmount
		}

		if r.AvailableSlots > 0 {
			var slotData map[string]interface{}
			if len(r.RawHeadoutData) > 0 && json.Unmarshal(r.RawHeadoutData, &slotData) == nil {
				status := extractStringFromMap(slotData, "availability", "status")
				switch status {
				case "UNLIMITED":
					e.Availability = "UNLIMITED"
				default:
					if e.Availability != "UNLIMITED" {
						e.Availability = "LIMITED"
					}
				}
			} else {
				if e.Availability != "UNLIMITED" {
					e.Availability = "LIMITED"
				}
			}
		}
	}

	availabilities := make([]map[string]interface{}, 0, len(dateKeys))
	for _, date := range dateKeys {
		e := dateMap[date]
		availabilities = append(availabilities, map[string]interface{}{
			"date": e.Date,
			"pricing": map[string]interface{}{
				"currency":            e.Currency,
				"profileType":         "PER_PERSON",
				"headoutSellingPrice": e.SellingPrice,
				"netPrice":            e.NetPrice,
			},
			"availability": e.Availability,
			"remaining":    e.Remaining,
		})
	}

	c.JSON(http.StatusOK, map[string]interface{}{
		"productId":     product.ID,
		"variantId":     variantID,
		"currencyCode":  product.Currency,
		"availabilities": availabilities,
	})
}

func (h *HeadoutHandler) listInventoryFromDB(c *gin.Context) {
	q := c.Request.URL.Query()
	tourID := strings.TrimSpace(q.Get("tourId"))
	startDT := strings.TrimSpace(q.Get("startDateTime"))
	endDT := strings.TrimSpace(q.Get("endDateTime"))

	if tourID == "" || startDT == "" || endDT == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "tourId, startDateTime, endDateTime are required"})
		return
	}

	startDate := startDT
	if len(startDT) >= 10 {
		startDate = startDT[:10]
	}
	endDate := endDT
	if len(endDT) >= 10 {
		endDate = endDT[:10]
	}

	var records []models.ProductAvailability
	h.db.Where("variant_id = ? AND date >= ? AND date <= ? AND remaining_capacity > 0",
		tourID, startDate, endDate).
		Order("date asc, start_time asc").
		Find(&records)

	items := make([]map[string]interface{}, 0, len(records))
	for _, r := range records {
		availability := "CLOSED"
		remaining := r.AvailableSlots
		if remaining > 0 {
			availability = "LIMITED"
		}

		var slotData map[string]interface{}
		_ = json.Unmarshal(r.RawHeadoutData, &slotData)

		var status string
		if slotData != nil {
			status = extractStringFromMap(slotData, "availability", "status")
		}
		if status == "UNLIMITED" {
			availability = "UNLIMITED"
		}

		pricing := map[string]interface{}{
			"persons": []map[string]interface{}{
				{
					"type":                "ADULT",
					"name":                "Adult",
					"description":         nil,
					"ageFrom":             0,
					"ageTo":               nil,
					"price":               r.PriceAmount,
					"originalPrice":       r.PriceAmount,
					"netPrice":            r.PriceAmount,
					"headoutSellingPrice": r.PriceAmount,
					"remaining":           remaining,
					"availability":        availability,
					"paxRange":            map[string]interface{}{"min": nil, "max": nil},
				},
			},
			"groups": []interface{}{},
		}

		slotID := r.InventoryID
		if slotID == "" && slotData != nil {
			slotID = extractStringFromMap(slotData, "inventoryId", "inventory_id", "id")
		}
		if slotID == "" {
			slotID = fmt.Sprintf("slot_%d", r.ID)
		}

		startDateTime := r.Date + "T" + r.StartTime
		endDateTime := r.Date + "T" + r.EndTime

		items = append(items, map[string]interface{}{
			"id":             slotID,
			"startDateTime":  startDateTime,
			"endDateTime":    endDateTime,
			"availability":   availability,
			"remaining":      remaining,
			"pricing":        pricing,
		})
	}

	c.JSON(http.StatusOK, map[string]interface{}{
		"items":       items,
		"total":       len(items),
		"nextUrl":     nil,
		"prevUrl":     nil,
		"nextOffset":  nil,
	})
}

func extractStringFromMap(data map[string]interface{}, keys ...string) string {
	for _, key := range keys {
		if v, ok := data[key]; ok {
			switch val := v.(type) {
			case string:
				return val
			case float64:
				return strconv.FormatFloat(val, 'f', -1, 64)
			}
		}
	}
	return ""
}

func extractFloatFromMap(data map[string]interface{}, keys ...string) float64 {
	for _, key := range keys {
		if v, ok := data[key]; ok {
			switch val := v.(type) {
			case float64:
				return val
			case json.Number:
				f, _ := val.Float64()
				return f
			case string:
				f, _ := strconv.ParseFloat(val, 64)
				return f
			}
		}
	}
	return 0
}
