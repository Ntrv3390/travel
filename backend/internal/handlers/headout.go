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
	"time"

	"github.com/gin-gonic/gin"
	"github.com/travel/backend/internal/models"
	"github.com/travel/backend/internal/services"
	"github.com/travel/backend/pkg/config"
	"github.com/travel/backend/pkg/logger"
	"gorm.io/gorm"
)

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
	h.proxyGetWithService(c, h.publicService, "/v1/product/listing/list-by/city", false)
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
	path := fmt.Sprintf("/v1/booking/%s", url.PathEscape(c.Param("id")))
	h.proxyGet(c, path, true)
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

func (h *HeadoutHandler) isFetchFresh() bool {
	var setting models.Setting
	if err := h.db.Where("key = ?", "fetch_fresh").First(&setting).Error; err != nil {
		return true
	}
	return setting.Value != "false"
}

func (h *HeadoutHandler) ListCitiesV2(c *gin.Context) {
	if h.isFetchFresh() {
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

	if !h.isFetchFresh() {
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
		c.Request.URL.RawQuery = q.Encode()
		h.proxyGet(c, "/v2/products", true)
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
	query = query.Where("is_available = ? OR is_available IS NULL", true)

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

	upstream, err := h.service.Get(c.Request.Context(), "/v2/products", query, true)
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
	if !h.isFetchFresh() {
		if h.writeCachedResponse(c, "/v2/categories") {
			return
		}
		h.proxyAndCache(c, "/v2/categories", true)
		return
	}
	h.proxyGet(c, "/v2/categories", true)
}

func (h *HeadoutHandler) ListCollectionsV2(c *gin.Context) {
	if !h.isFetchFresh() {
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

	if !h.isFetchFresh() {
		var product models.Product
		err := h.db.Where("headout_id = ?", productID).First(&product).Error
		if err == nil {
			if len(product.RawHeadoutData) > 0 && string(product.RawHeadoutData) != "{}" {
				h.writeRawJSON(c, product.RawHeadoutData)
				return
			}
			h.writeProductFromDB(c, &product)
			return
		}

		if err != gorm.ErrRecordNotFound {
			logger.Errorf("DB error fetching product %s: %v", productID, err)
		}

		h.syncProductToDB(c, productID)
		return
	}

	path := fmt.Sprintf("/v2/products/%s/", url.PathEscape(productID))
	h.proxyGet(c, path, true)
}

func (h *HeadoutHandler) ListNormalAvailabilities(c *gin.Context) {
	productID := strings.TrimSpace(c.Param("productId"))
	variantID := strings.TrimSpace(c.Param("variantId"))
	if productID == "" || variantID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "productId and variantId are required"})
		return
	}
	path := fmt.Sprintf("/v2/products/%s/variants/%s/availabilities/", url.PathEscape(productID), url.PathEscape(variantID))
	h.proxyGet(c, path, true)
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

	h.proxyGet(c, "/v2/inventory/list-by/tour/", true)
}

func (h *HeadoutHandler) ListSubcategoriesV2(c *gin.Context) {
	if !h.isFetchFresh() {
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

	h.saveProductToDB(productID, pData)

	h.writeUpstreamResponse(c, upstream)
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

	var existing models.Product
	err := h.db.Where("headout_id = ?", headoutID).First(&existing).Error

	if err == gorm.ErrRecordNotFound {
		product := models.Product{
			HeadoutID:      headoutID,
			Title:          title,
			Description:    description,
			CityCode:       rawCityCode,
			CityName:       cityName,
			Category:       category,
			ImageURL:       imageURL,
			Currency:       currency,
			PriceFrom:      priceFrom,
			Rating:         rating,
			ReviewCount:    reviewCount,
			Duration:       duration,
			RawHeadoutData: rawJSON,
			LastSyncedAt:   time.Now(),
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
		existing.LastSyncedAt = time.Now()
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
