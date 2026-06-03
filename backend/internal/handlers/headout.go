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
	publicCfg := *cfg
	publicCfg.HeadoutURL = cfg.HeadoutURL

	return &HeadoutHandler{
		service:       services.NewHeadoutProxyService(cfg),
		publicService: services.NewHeadoutProxyService(&publicCfg),
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
func (h *HeadoutHandler) ListCitiesV2(c *gin.Context) {
	// Check fetch_fresh setting
	fetchFresh := true
	var setting models.Setting
	if err := h.db.Where("key = ?", "fetch_fresh").First(&setting).Error; err == nil {
		if setting.Value == "false" {
			fetchFresh = false
		}
	}

	if fetchFresh {
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
	q.Set("offset", strconv.Itoa(offset))

	limit := 20
	if v := q.Get("limit"); v != "" {
		parsed, err := strconv.Atoi(v)
		if err != nil || parsed < 0 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "limit must be a non-negative integer"})
			return
		}
		if parsed > 20 {
			limit = 20
		} else {
			limit = parsed
		}
	}
	q.Set("limit", strconv.Itoa(limit))

	c.Request.URL.RawQuery = q.Encode()

	h.proxyGetWithService(c, h.publicService, "/v2/cities/", true)
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
		if parsed > 20 {
			limit = 20
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
	// Check fetch_fresh setting
	fetchFresh := true
	var setting models.Setting
	if err := h.db.Where("key = ?", "fetch_fresh").First(&setting).Error; err == nil {
		if setting.Value == "false" {
			fetchFresh = false
		}
	}

	q := c.Request.URL.Query()

	if !fetchFresh {
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
	h.proxyGet(c, "/v2/categories", true)
}

func (h *HeadoutHandler) ListCollectionsV2(c *gin.Context) {
	h.proxyGet(c, "/v2/collections", true)
}

func (h *HeadoutHandler) GetProductByIDV2(c *gin.Context) {
	productID := strings.TrimSpace(c.Param("productId"))
	if productID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "productId is required"})
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
	h.proxyGet(c, "/v2/subcategories", true)
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
