package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/travel/backend/internal/models"
	"github.com/travel/backend/internal/services"
	"gorm.io/gorm"
)

var (
	syncMu       sync.Mutex
	syncProgress = map[string]interface{}{}
)

const maxPageLimit = 50

type AdminHandler struct {
	db             *gorm.DB
	emailService   *services.EmailService
	headoutService *services.HeadoutProxyService
}

func NewAdminHandler(db *gorm.DB, emailService *services.EmailService, headoutService *services.HeadoutProxyService) *AdminHandler {
	return &AdminHandler{db: db, emailService: emailService, headoutService: headoutService}
}

type paginatedResponse struct {
	Items interface{} `json:"items"`
	Total int64       `json:"total"`
	Page  int         `json:"page"`
	Limit int         `json:"limit"`
}

func (h *AdminHandler) ListBookings(c *gin.Context) {
	page, limit := parsePagination(c)
	search := strings.TrimSpace(c.Query("search"))

	query := h.db.Model(&models.Booking{})

	if search != "" {
		pattern := "%" + search + "%"
		query = query.Where(
			"booking_id ILIKE ? OR email ILIKE ? OR first_name ILIKE ? OR last_name ILIKE ? OR (first_name || ' ' || last_name) ILIKE ?",
			pattern, pattern, pattern, pattern, pattern,
		)
	}

	var total int64
	query.Count(&total)

	bookings := []models.Booking{}
	query.Order("created_at desc").Offset((page - 1) * limit).Limit(limit).Find(&bookings)

	c.JSON(http.StatusOK, paginatedResponse{
		Items: bookings,
		Total: total,
		Page:  page,
		Limit: limit,
	})
}

func (h *AdminHandler) ListHelpSubmissions(c *gin.Context) {
	page, limit := parsePagination(c)
	search := strings.TrimSpace(c.Query("search"))

	query := h.db.Model(&models.HelpSubmission{})

	if search != "" {
		pattern := "%" + search + "%"
		query = query.Where("name ILIKE ? OR email ILIKE ? OR subject ILIKE ?", pattern, pattern, pattern)
	}

	var total int64
	query.Count(&total)

	submissions := []models.HelpSubmission{}
	query.Order("created_at desc").Offset((page - 1) * limit).Limit(limit).Find(&submissions)

	c.JSON(http.StatusOK, paginatedResponse{
		Items: submissions,
		Total: total,
		Page:  page,
		Limit: limit,
	})
}

func (h *AdminHandler) ListUsers(c *gin.Context) {
	role, _ := c.Get("role")
	page, limit := parsePagination(c)
	search := strings.TrimSpace(c.Query("search"))

	type userAdminResponse struct {
		ID        uint   `json:"id"`
		Email     string `json:"email"`
		Name      string `json:"name"`
		Role      string `json:"role"`
		CreatedAt string `json:"created_at"`
	}

	query := h.db.Model(&models.User{})

	if role == "admin" {
		query = query.Where("role != ?", "superadmin")
	}

	if search != "" {
		pattern := "%" + search + "%"
		query = query.Where("email ILIKE ? OR name ILIKE ?", pattern, pattern)
	}

	var total int64
	query.Count(&total)

	var users []models.User
	query.Order("created_at desc").Offset((page - 1) * limit).Limit(limit).Find(&users)

	data := []userAdminResponse{}
	for _, u := range users {
		data = append(data, userAdminResponse{
			ID:        u.ID,
			Email:     u.Email,
			Name:      u.Name,
			Role:      u.Role,
			CreatedAt: u.CreatedAt.Format("2006-01-02T15:04:05Z"),
		})
	}

	c.JSON(http.StatusOK, paginatedResponse{
		Items: data,
		Total: total,
		Page:  page,
		Limit: limit,
	})
}

func (h *AdminHandler) UpdateUser(c *gin.Context) {
	var input struct {
		Email string `json:"email" binding:"required,email"`
		Role  string `json:"role" binding:"required,oneof=admin user superadmin"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	callerRole, _ := c.Get("role")
	if callerRole == "admin" && input.Role == "superadmin" {
		c.JSON(http.StatusForbidden, gin.H{"error": "cannot set role to superadmin"})
		return
	}

	userID := c.Param("id")
	var user models.User
	if err := h.db.First(&user, userID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
		return
	}

	user.Email = input.Email
	user.Role = input.Role

	if err := h.db.Save(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update user"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": gin.H{
			"id":    user.ID,
			"email": user.Email,
			"name":  user.Name,
			"role":  user.Role,
		},
	})
}

func (h *AdminHandler) GetStats(c *gin.Context) {
	role, _ := c.Get("role")

	var totalBookings int64
	h.db.Model(&models.Booking{}).Count(&totalBookings)

	var totalHelpSubmissions int64
	h.db.Model(&models.HelpSubmission{}).Count(&totalHelpSubmissions)

	var totalUsers int64
	userQuery := h.db.Model(&models.User{})
	if role == "admin" {
		userQuery = userQuery.Where("role != ?", "superadmin")
	}
	userQuery.Count(&totalUsers)

	var totalVisitors int64
	h.db.Model(&models.Visitor{}).Count(&totalVisitors)

	var uniqueToday int64
	h.db.Model(&models.Visitor{}).Where("last_visit >= CURRENT_DATE").Count(&uniqueToday)

	type countryCount struct {
		Country string `json:"country"`
		Count   int64  `json:"count"`
	}
	var topCountries []countryCount
	h.db.Model(&models.Visitor{}).
		Select("country, count(*) as count").
		Where("country != ''").
		Group("country").
		Order("count desc").
		Limit(5).
		Scan(&topCountries)

	type pageCount struct {
		Pathname string `json:"pathname"`
		Count    int64  `json:"count"`
	}
	var topPages []pageCount
	h.db.Model(&models.PageVisit{}).
		Select("pathname, count(*) as count").
		Group("pathname").
		Order("count desc").
		Limit(10).
		Scan(&topPages)

	var bottomPages []pageCount
	h.db.Model(&models.PageVisit{}).
		Select("pathname, count(*) as count").
		Group("pathname").
		Order("count asc").
		Limit(5).
		Scan(&bottomPages)

	c.JSON(http.StatusOK, gin.H{
		"totalBookings":        totalBookings,
		"totalHelpSubmissions": totalHelpSubmissions,
		"totalUsers":           totalUsers,
		"totalVisitors":        totalVisitors,
		"uniqueVisitorsToday":  uniqueToday,
		"topCountries":         topCountries,
		"topPages":             topPages,
		"bottomPages":          bottomPages,
	})
}

func (h *AdminHandler) GetHeadoutBooking(c *gin.Context) {
	id := c.Param("id")

	var booking models.Booking
	if err := h.db.First(&booking, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "booking not found"})
		return
	}

	if booking.BookingID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "booking has no Headout booking ID"})
		return
	}

	path := fmt.Sprintf("/v2/bookings/%s/", booking.BookingID)
	resp, err := h.headoutService.Get(context.Background(), path, nil, true)
	if err != nil {
		c.JSON(http.StatusBadGateway, gin.H{"error": fmt.Sprintf("failed to fetch from Headout: %v", err)})
		return
	}

	if resp.StatusCode >= 400 {
		c.Data(resp.StatusCode, "application/json; charset=utf-8", resp.Body)
		return
	}

	c.Data(http.StatusOK, "application/json; charset=utf-8", resp.Body)
}

func (h *AdminHandler) ListCities(c *gin.Context) {
	page, limit := parsePagination(c)
	search := strings.TrimSpace(c.Query("search"))

	query := h.db.Model(&models.City{})

	if search != "" {
		pattern := "%" + search + "%"
		query = query.Where("name ILIKE ? OR code ILIKE ? OR country_name ILIKE ?", pattern, pattern, pattern)
	}

	var total int64
	query.Count(&total)

	var cities []models.City
	query.Order("name asc").Offset((page - 1) * limit).Limit(limit).Find(&cities)

	c.JSON(http.StatusOK, paginatedResponse{
		Items: cities,
		Total: total,
		Page:  page,
		Limit: limit,
	})
}

func (h *AdminHandler) SyncCities(c *gin.Context) {
	if h.headoutService == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "headout service not available"})
		return
	}

	type syncResult struct {
		Total   int `json:"total"`
		Added   int `json:"added"`
		Updated int `json:"updated"`
		Failed  int `json:"failed"`
	}

	result := syncResult{}

	offset := 0
	limit := 20
	maxPages := 100
	pageCount := 0

	for {
		query := url.Values{}
		query.Set("offset", strconv.Itoa(offset))
		query.Set("limit", strconv.Itoa(limit))

		resp, err := h.headoutService.Get(context.Background(), "/v2/cities/", query, true)
		if err != nil {
			c.JSON(http.StatusBadGateway, gin.H{"error": fmt.Sprintf("failed to fetch cities from Headout: %v", err)})
			return
		}

		var body struct {
			Cities     []json.RawMessage `json:"cities"`
			Data       *struct {
				Cities     []json.RawMessage `json:"cities"`
				NextOffset *int              `json:"nextOffset"`
			} `json:"data"`
			NextOffset *int `json:"nextOffset"`
		}
		if err := json.Unmarshal(resp.Body, &body); err != nil {
			c.JSON(http.StatusBadGateway, gin.H{"error": fmt.Sprintf("failed to parse Headout response: %v", err)})
			return
		}

		// Handle nested data wrapper
		if len(body.Cities) == 0 && body.Data != nil {
			body.Cities = body.Data.Cities
			if body.NextOffset == nil {
				body.NextOffset = body.Data.NextOffset
			}
		}

		for _, raw := range body.Cities {
			var cityData map[string]interface{}
			if err := json.Unmarshal(raw, &cityData); err != nil {
				result.Failed++
				continue
			}

			code := extractString(cityData, "code")
			if code == "" {
				code = extractString(cityData, "id")
			}
			if code == "" {
				code = extractString(cityData, "cityCode")
			}
			if code == "" {
				code = extractString(cityData, "city_code")
			}
			if code == "" {
				result.Failed++
				continue
			}

			name := extractString(cityData, "name")
			timezone := extractString(cityData, "timezone")

			var imageURL string
			if image, ok := cityData["image"].(map[string]interface{}); ok {
				imageURL = extractString(image, "url")
			}

			var countryCode, countryName string
			if country, ok := cityData["country"].(map[string]interface{}); ok {
				countryCode = extractString(country, "code")
				countryName = extractString(country, "name")
			}

			rawJSON, _ := json.Marshal(cityData)

			var existing models.City
			err := h.db.Where("code = ?", code).First(&existing).Error

			if err == gorm.ErrRecordNotFound {
				city := models.City{
					Code:           code,
					Name:           name,
					ImageURL:       imageURL,
					CountryCode:    countryCode,
					CountryName:    countryName,
					Timezone:       timezone,
					RawHeadoutData: rawJSON,
					LastSyncedAt:   time.Now(),
				}
				if createErr := h.db.Create(&city).Error; createErr != nil {
					result.Failed++
				} else {
					result.Added++
				}
			} else if err == nil {
				existing.Name = name
				existing.ImageURL = imageURL
				existing.CountryCode = countryCode
				existing.CountryName = countryName
				existing.Timezone = timezone
				existing.RawHeadoutData = rawJSON
				existing.LastSyncedAt = time.Now()
				if updateErr := h.db.Save(&existing).Error; updateErr != nil {
					result.Failed++
				} else {
					result.Updated++
				}
			} else {
				result.Failed++
			}

			result.Total++
		}

		pageCount++
		if body.NextOffset == nil || *body.NextOffset <= offset || pageCount >= maxPages {
			break
		}
		offset = *body.NextOffset
	}

	c.JSON(http.StatusOK, result)
}

func (h *AdminHandler) ListProducts(c *gin.Context) {
	page, limit := parsePagination(c)
	search := strings.TrimSpace(c.Query("search"))

	query := h.db.Model(&models.Product{})

	if search != "" {
		pattern := "%" + search + "%"
		query = query.Where("title ILIKE ? OR headout_id ILIKE ? OR city_name ILIKE ? OR category ILIKE ?", pattern, pattern, pattern, pattern)
	}

	var total int64
	query.Count(&total)

	var products []models.Product
	query.Order("title asc").Offset((page - 1) * limit).Limit(limit).Find(&products)

	c.JSON(http.StatusOK, paginatedResponse{
		Items: products,
		Total: total,
		Page:  page,
		Limit: limit,
	})
}

func (h *AdminHandler) runSyncProducts() map[string]interface{} {
	type syncResult struct {
		Total   int `json:"total"`
		Added   int `json:"added"`
		Updated int `json:"updated"`
		Failed  int `json:"failed"`
	}

	result := syncResult{}

	var cities []models.City
	if err := h.db.Where("code IS NOT NULL AND code != ''").Find(&cities).Error; err != nil {
		cities = nil
	}

	cityCodes := make([]string, 0, len(cities))
	for _, cty := range cities {
		if cty.Code != "" {
			cityCodes = append(cityCodes, cty.Code)
		}
	}
	if len(cityCodes) == 0 {
		cityCodes = productPopularCities
	}

	for _, cityCode := range cityCodes {
		offset := 0
		pageLimit := 100
		pageCount := 0

		for {
			query := url.Values{}
			query.Set("offset", strconv.Itoa(offset))
			query.Set("limit", strconv.Itoa(pageLimit))
			query.Set("cityCode", cityCode)

			resp, err := h.headoutService.Get(context.Background(), "/v2/products", query, true)
			if err != nil {
				break
			}

			var body struct {
				Products   []json.RawMessage `json:"products"`
				NextOffset *int              `json:"nextOffset"`
				Total      int               `json:"total"`
			}
			if err := json.Unmarshal(resp.Body, &body); err != nil {
				break
			}

			for _, raw := range body.Products {
				var pData map[string]interface{}
				if err := json.Unmarshal(raw, &pData); err != nil {
					result.Failed++
					continue
				}

				headoutID := extractString(pData, "id")
				if headoutID == "" {
					result.Failed++
					continue
				}

				title := extractNestedString(pData, "name", "title")
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

				description := extractString(pData, "description")

				rawJSON, _ := json.Marshal(pData)

				var existing models.Product
				err := h.db.Where("headout_id = ?", headoutID).First(&existing).Error

				if err == gorm.ErrRecordNotFound {
					product := models.Product{
						HeadoutID:      headoutID,
						Title:          title,
						Description:    description,
						CityCode:       cityCode,
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
						result.Failed++
					} else {
						result.Added++
					}
				} else if err == nil {
					existing.Title = title
					existing.Description = description
					existing.CityCode = cityCode
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
					if updateErr := h.db.Save(&existing).Error; updateErr != nil {
						result.Failed++
					} else {
						result.Updated++
					}
				} else {
					result.Failed++
				}

				result.Total++
			}

			pageCount++
			if body.NextOffset == nil || *body.NextOffset <= offset {
				break
			}
			offset = *body.NextOffset
		}
	}

	return map[string]interface{}{
		"status":  "completed",
		"total":   result.Total,
		"added":   result.Added,
		"updated": result.Updated,
		"failed":  result.Failed,
	}
}

func (h *AdminHandler) SyncProducts(c *gin.Context) {
	if h.headoutService == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "headout service not available"})
		return
	}

	syncID := fmt.Sprintf("list_%d", time.Now().UnixNano())

	syncMu.Lock()
	syncProgress[syncID] = map[string]interface{}{
		"status": "running",
		"type":   "sync_products",
	}
	syncMu.Unlock()

	go func(id string) {
		result := h.runSyncProducts()
		syncMu.Lock()
		syncProgress[id] = result
		syncMu.Unlock()
	}(syncID)

	c.JSON(http.StatusAccepted, gin.H{
		"status":  "started",
		"sync_id": syncID,
	})
}

func (h *AdminHandler) SyncSingleProduct(c *gin.Context) {
	if h.headoutService == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "headout service not available"})
		return
	}

	productID := strings.TrimSpace(c.Param("id"))
	if productID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "product id is required"})
		return
	}

	type syncResult struct {
		Product struct {
			Added   bool `json:"added"`
			Updated bool `json:"updated"`
		} `json:"product"`
		Availabilities struct {
			Added   int `json:"added"`
			Updated int `json:"updated"`
			Failed  int `json:"failed"`
		} `json:"availabilities"`
		Total int `json:"total"`
	}

	result := syncResult{}

	// Fetch product detail
	path := fmt.Sprintf("/v2/products/%s/", url.PathEscape(productID))
	resp, err := h.headoutService.Get(context.Background(), path, nil, true)
	if err != nil {
		c.JSON(http.StatusBadGateway, gin.H{"error": fmt.Sprintf("failed to fetch product from Headout: %v", err)})
		return
	}

	var pData map[string]interface{}
	if err := json.Unmarshal(resp.Body, &pData); err != nil {
		c.JSON(http.StatusBadGateway, gin.H{"error": "failed to parse product response"})
		return
	}

	headoutID := extractString(pData, "id")
	if headoutID == "" {
		c.JSON(http.StatusBadGateway, gin.H{"error": "product has no id"})
		return
	}

	title := extractNestedString(pData, "name", "title")
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
	rawJSON, _ := json.Marshal(pData)

	// Determine city code
	rawCityCode := extractNestedString(pData, "cityCode", "city.code")

	var product models.Product
	var dbProductID uint
	err = h.db.Where("headout_id = ?", headoutID).First(&product).Error

	if err == gorm.ErrRecordNotFound {
		product = models.Product{
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
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create product"})
			return
		}
		result.Product.Added = true
	} else if err == nil {
		product.Title = title
		product.Description = description
		product.CityCode = rawCityCode
		product.CityName = cityName
		product.Category = category
		product.ImageURL = imageURL
		product.Currency = currency
		product.PriceFrom = priceFrom
		product.Rating = rating
		product.ReviewCount = reviewCount
		product.Duration = duration
		product.RawHeadoutData = rawJSON
		product.LastSyncedAt = time.Now()
		if updateErr := h.db.Save(&product).Error; updateErr != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update product"})
			return
		}
		result.Product.Updated = true
	} else {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "database error"})
		return
	}
	dbProductID = product.ID
	result.Total++

	// Fetch variants from product detail and their availabilities
	var variants []interface{}
	if v, ok := pData["variants"].([]interface{}); ok {
		variants = v
	}

	for _, v := range variants {
		variant, ok := v.(map[string]interface{})
		if !ok {
			continue
		}

		variantID := extractString(variant, "id")
		if variantID == "" {
			continue
		}

		variantTitle := extractString(variant, "title")
		if variantTitle == "" {
			variantTitle = extractString(variant, "name")
		}

		availPath := fmt.Sprintf("/v2/products/%s/variants/%s/availabilities/", url.PathEscape(headoutID), url.PathEscape(variantID))
		availQuery := url.Values{}

		availResp, err := h.headoutService.Get(context.Background(), availPath, availQuery, true)
		if err != nil {
			result.Availabilities.Failed++
			continue
		}

		var availBody struct {
			Availabilities []json.RawMessage `json:"availabilities"`
		}
		if err := json.Unmarshal(availResp.Body, &availBody); err != nil {
			result.Availabilities.Failed++
			continue
		}

		for _, rawSlot := range availBody.Availabilities {
			var slotData map[string]interface{}
			if err := json.Unmarshal(rawSlot, &slotData); err != nil {
				result.Availabilities.Failed++
				continue
			}

			date := extractString(slotData, "date")
			startTime := extractString(slotData, "startTime")
			if startTime == "" {
				startTime = extractString(slotData, "start_time")
			}
			endTime := extractString(slotData, "endTime")
			if endTime == "" {
				endTime = extractString(slotData, "end_time")
			}
			inventoryID := extractString(slotData, "inventoryId")
			if inventoryID == "" {
				inventoryID = extractString(slotData, "inventory_id")
			}
			inventoryType := extractString(slotData, "inventoryType")
			if inventoryType == "" {
				inventoryType = extractString(slotData, "inventory_type")
			}

			var priceAmount float64
			if pricing, ok := slotData["pricing"].(map[string]interface{}); ok {
				switch v := pricing["amount"].(type) {
				case float64:
					priceAmount = v
				case json.Number:
					priceAmount, _ = v.Float64()
				}
			}

			slotCurrency := currency
			if pricing, ok := slotData["pricing"].(map[string]interface{}); ok {
				if c := extractString(pricing, "currency"); c != "" {
					slotCurrency = c
				}
			}

			availableSlots := 0
			if v, ok := slotData["availableSlots"].(float64); ok {
				availableSlots = int(v)
			} else if v, ok := slotData["available_slots"].(float64); ok {
				availableSlots = int(v)
			} else if v, ok := slotData["available"].(float64); ok {
				availableSlots = int(v)
			}

			availRawJSON, _ := json.Marshal(slotData)

			// Upsert availability (match on product_id + variant_id + date + start_time)
			var existingAvail models.ProductAvailability
			availErr := h.db.Where("product_id = ? AND variant_id = ? AND date = ? AND start_time = ?",
				dbProductID, variantID, date, startTime).First(&existingAvail).Error

			if availErr == gorm.ErrRecordNotFound {
				avail := models.ProductAvailability{
					ProductID:       dbProductID,
					HeadoutProductID: headoutID,
					VariantID:       variantID,
					VariantTitle:    variantTitle,
					Date:            date,
					StartTime:       startTime,
					EndTime:         endTime,
					InventoryID:     inventoryID,
					InventoryType:   inventoryType,
					PriceAmount:     priceAmount,
					Currency:        slotCurrency,
					AvailableSlots:  availableSlots,
					RawHeadoutData:  availRawJSON,
				}
				if createErr := h.db.Create(&avail).Error; createErr == nil {
					result.Availabilities.Added++
				} else {
					result.Availabilities.Failed++
				}
			} else if availErr == nil {
				existingAvail.HeadoutProductID = headoutID
				existingAvail.VariantTitle = variantTitle
				existingAvail.EndTime = endTime
				existingAvail.InventoryID = inventoryID
				existingAvail.InventoryType = inventoryType
				existingAvail.PriceAmount = priceAmount
				existingAvail.Currency = slotCurrency
				existingAvail.AvailableSlots = availableSlots
				existingAvail.RawHeadoutData = availRawJSON
				if updateErr := h.db.Save(&existingAvail).Error; updateErr == nil {
					result.Availabilities.Updated++
				} else {
					result.Availabilities.Failed++
				}
			} else {
				result.Availabilities.Failed++
			}
		}
	}

	c.JSON(http.StatusOK, result)
}

func (h *AdminHandler) runSyncAllIndividual() map[string]interface{} {
	type syncResult struct {
		Total          int `json:"total"`
		ProductAdded   int `json:"product_added"`
		ProductUpdated int `json:"product_updated"`
		ProductFailed  int `json:"product_failed"`
		AvailAdded     int `json:"avail_added"`
		AvailUpdated   int `json:"avail_updated"`
		AvailFailed    int `json:"avail_failed"`
	}

	result := syncResult{}

	var products []models.Product
	if err := h.db.Find(&products).Error; err != nil {
		return map[string]interface{}{"status": "failed", "error": err.Error()}
	}

	for _, prod := range products {
		path := fmt.Sprintf("/v2/products/%s/", url.PathEscape(prod.HeadoutID))
		resp, err := h.headoutService.Get(context.Background(), path, nil, true)
		if err != nil {
			result.ProductFailed++
			continue
		}

		var pData map[string]interface{}
		if err := json.Unmarshal(resp.Body, &pData); err != nil {
			result.ProductFailed++
			continue
		}

		headoutID := extractString(pData, "id")
		if headoutID == "" {
			result.ProductFailed++
			continue
		}

		title := extractNestedString(pData, "name", "title")
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
		rawJSON, _ := json.Marshal(pData)

		rawCityCode := extractNestedString(pData, "cityCode", "city.code")

		var existing models.Product
		err = h.db.Where("headout_id = ?", headoutID).First(&existing).Error

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
				result.ProductFailed++
			} else {
				result.ProductAdded++
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
			if updateErr := h.db.Save(&existing).Error; updateErr != nil {
				result.ProductFailed++
			} else {
				result.ProductUpdated++
			}
		} else {
			result.ProductFailed++
			continue
		}

		// Fetch variants and their availabilities
		var variants []interface{}
		if v, ok := pData["variants"].([]interface{}); ok {
			variants = v
		}

		for _, v := range variants {
			variant, ok := v.(map[string]interface{})
			if !ok {
				result.AvailFailed++
				continue
			}

			variantID := extractString(variant, "id")
			if variantID == "" {
				result.AvailFailed++
				continue
			}

			variantTitle := extractString(variant, "title")
			if variantTitle == "" {
				variantTitle = extractString(variant, "name")
			}

			availPath := fmt.Sprintf("/v2/products/%s/variants/%s/availabilities/", url.PathEscape(headoutID), url.PathEscape(variantID))
			availResp, err := h.headoutService.Get(context.Background(), availPath, nil, true)
			if err != nil {
				result.AvailFailed++
				continue
			}

			var availBody struct {
				Availabilities []json.RawMessage `json:"availabilities"`
			}
			if err := json.Unmarshal(availResp.Body, &availBody); err != nil {
				result.AvailFailed++
				continue
			}

			for _, rawSlot := range availBody.Availabilities {
				var slotData map[string]interface{}
				if err := json.Unmarshal(rawSlot, &slotData); err != nil {
					result.AvailFailed++
					continue
				}

				date := extractString(slotData, "date")
				startTime := extractString(slotData, "startTime")
				if startTime == "" {
					startTime = extractString(slotData, "start_time")
				}
				endTime := extractString(slotData, "endTime")
				if endTime == "" {
					endTime = extractString(slotData, "end_time")
				}
				inventoryID := extractString(slotData, "inventoryId")
				if inventoryID == "" {
					inventoryID = extractString(slotData, "inventory_id")
				}
				inventoryType := extractString(slotData, "inventoryType")
				if inventoryType == "" {
					inventoryType = extractString(slotData, "inventory_type")
				}

				var priceAmount float64
				if pricing, ok := slotData["pricing"].(map[string]interface{}); ok {
					switch v := pricing["amount"].(type) {
					case float64:
						priceAmount = v
					case json.Number:
						priceAmount, _ = v.Float64()
					}
				}

				slotCurrency := currency
				if pricing, ok := slotData["pricing"].(map[string]interface{}); ok {
					if c := extractString(pricing, "currency"); c != "" {
						slotCurrency = c
					}
				}

				availableSlots := 0
				if v, ok := slotData["availableSlots"].(float64); ok {
					availableSlots = int(v)
				} else if v, ok := slotData["available_slots"].(float64); ok {
					availableSlots = int(v)
				} else if v, ok := slotData["available"].(float64); ok {
					availableSlots = int(v)
				}

				availRawJSON, _ := json.Marshal(slotData)

				var existingAvail models.ProductAvailability
				availErr := h.db.Where("product_id = ? AND variant_id = ? AND date = ? AND start_time = ?",
					existing.ID, variantID, date, startTime).First(&existingAvail).Error

				if availErr == gorm.ErrRecordNotFound {
					avail := models.ProductAvailability{
						ProductID:       existing.ID,
						HeadoutProductID: headoutID,
						VariantID:       variantID,
						VariantTitle:    variantTitle,
						Date:            date,
						StartTime:       startTime,
						EndTime:         endTime,
						InventoryID:     inventoryID,
						InventoryType:   inventoryType,
						PriceAmount:     priceAmount,
						Currency:        slotCurrency,
						AvailableSlots:  availableSlots,
						RawHeadoutData:  availRawJSON,
					}
					if createErr := h.db.Create(&avail).Error; createErr == nil {
						result.AvailAdded++
					} else {
						result.AvailFailed++
					}
				} else if availErr == nil {
					existingAvail.HeadoutProductID = headoutID
					existingAvail.VariantTitle = variantTitle
					existingAvail.EndTime = endTime
					existingAvail.InventoryID = inventoryID
					existingAvail.InventoryType = inventoryType
					existingAvail.PriceAmount = priceAmount
					existingAvail.Currency = slotCurrency
					existingAvail.AvailableSlots = availableSlots
					existingAvail.RawHeadoutData = availRawJSON
					if updateErr := h.db.Save(&existingAvail).Error; updateErr == nil {
						result.AvailUpdated++
					} else {
						result.AvailFailed++
					}
				} else {
					result.AvailFailed++
				}
			}
		}

		result.Total++
	}

	return map[string]interface{}{
		"status":         "completed",
		"total":          result.Total,
		"product_added":   result.ProductAdded,
		"product_updated": result.ProductUpdated,
		"product_failed":  result.ProductFailed,
		"avail_added":     result.AvailAdded,
		"avail_updated":   result.AvailUpdated,
		"avail_failed":    result.AvailFailed,
	}
}

func (h *AdminHandler) SyncAllIndividualProducts(c *gin.Context) {
	if h.headoutService == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "headout service not available"})
		return
	}

	syncID := fmt.Sprintf("individual_%d", time.Now().UnixNano())

	syncMu.Lock()
	syncProgress[syncID] = map[string]interface{}{
		"status": "running",
		"type":   "sync_individual",
	}
	syncMu.Unlock()

	go func(id string) {
		result := h.runSyncAllIndividual()
		syncMu.Lock()
		syncProgress[id] = result
		syncMu.Unlock()
	}(syncID)

	c.JSON(http.StatusAccepted, gin.H{
		"status":  "started",
		"sync_id": syncID,
	})
}

func (h *AdminHandler) GetSyncStatus(c *gin.Context) {
	syncID := strings.TrimSpace(c.Query("sync_id"))
	if syncID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "sync_id query parameter is required"})
		return
	}

	syncMu.Lock()
	result, exists := syncProgress[syncID]
	syncMu.Unlock()

	if !exists {
		c.JSON(http.StatusNotFound, gin.H{"error": "sync_id not found"})
		return
	}

	c.JSON(http.StatusOK, result)
}

func (h *AdminHandler) GetProductAvailabilities(c *gin.Context) {
	productID := strings.TrimSpace(c.Param("id"))
	if productID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "product id is required"})
		return
	}

	var product models.Product
	if err := h.db.First(&product, productID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "product not found"})
		return
	}

	var availabilities []models.ProductAvailability
	h.db.Where("product_id = ?", product.ID).Order("date asc, start_time asc").Find(&availabilities)

	c.JSON(http.StatusOK, paginatedResponse{
		Items: availabilities,
		Total: int64(len(availabilities)),
		Page:  1,
		Limit: len(availabilities),
	})
}

func (h *AdminHandler) GetSetting(c *gin.Context) {
	key := c.Query("key")
	if key == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "key query parameter is required"})
		return
	}

	var setting models.Setting
	if err := h.db.Where("key = ?", key).First(&setting).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "setting not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch setting"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"key": setting.Key, "value": setting.Value})
}

func (h *AdminHandler) UpdateSetting(c *gin.Context) {
	var input struct {
		Key   string `json:"key" binding:"required"`
		Value string `json:"value" binding:"required"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var setting models.Setting
	if err := h.db.Where("key = ?", input.Key).First(&setting).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			setting = models.Setting{Key: input.Key, Value: input.Value}
			if createErr := h.db.Create(&setting).Error; createErr != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create setting"})
				return
			}
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch setting"})
			return
		}
	} else {
		setting.Value = input.Value
		if saveErr := h.db.Save(&setting).Error; saveErr != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update setting"})
			return
		}
	}

	c.JSON(http.StatusOK, gin.H{"key": setting.Key, "value": setting.Value})
}

var serverStartTime = time.Now()

func (h *AdminHandler) GetStatus(c *gin.Context) {
	dbOK := true
	dbErr := ""
	if sqlDB, err := h.db.DB(); err != nil {
		dbOK = false
		dbErr = err.Error()
	} else if err := sqlDB.Ping(); err != nil {
		dbOK = false
		dbErr = err.Error()
	}

	headoutOK := h.headoutService != nil

	uptime := time.Since(serverStartTime).String()

	c.JSON(http.StatusOK, gin.H{
		"server": gin.H{
			"status":  "healthy",
			"uptime":  uptime,
			"started": serverStartTime.Format(time.RFC3339),
		},
		"database": gin.H{
			"ok":      dbOK,
			"status":  map[bool]string{true: "connected", false: "error"}[dbOK],
			"error":   dbErr,
		},
		"headout": gin.H{
			"available": headoutOK,
		},
	})
}

func extractNestedString(data map[string]interface{}, keys ...string) string {
	for _, key := range keys {
		parts := strings.Split(key, ".")
		current := data
		found := true
		for i, part := range parts {
			if i == len(parts)-1 {
				if v, ok := current[part]; ok {
					switch val := v.(type) {
					case string:
						return val
					case float64:
						return fmt.Sprintf("%.0f", val)
					case json.Number:
						return val.String()
					case map[string]interface{}:
						if s, ok := val["code"].(string); ok {
							return s
						}
						if s, ok := val["name"].(string); ok {
							return s
						}
						return fmt.Sprintf("%v", val)
					default:
						return fmt.Sprintf("%v", val)
					}
				}
			} else {
				if next, ok := current[part].(map[string]interface{}); ok {
					current = next
				} else {
					found = false
					break
				}
			}
		}
		if found {
			return ""
		}
	}
	return ""
}

func extractString(data map[string]interface{}, key string) string {
	v, exists := data[key]
	if !exists {
		return ""
	}
	switch val := v.(type) {
	case string:
		return val
	case float64:
		return fmt.Sprintf("%.0f", val)
	case json.Number:
		return val.String()
	default:
		return fmt.Sprintf("%v", val)
	}
}

func parsePagination(c *gin.Context) (int, int) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit := maxPageLimit

	if page < 1 {
		page = 1
	}

	return page, limit
}
