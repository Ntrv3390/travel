package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"sort"
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

const (
	searchCitiesCacheTTL    = 6 * time.Hour
	searchProductsCacheTTL  = 10 * time.Minute
	searchProductCityLimit  = 10
)

type SearchHandler struct {
	headoutProxySvc *services.HeadoutProxyService
	db              *gorm.DB
}

type cachedCitiesResult struct {
	cities     []SearchCity
	expiresAt  time.Time
}

type cachedProductsResult struct {
	products   []SearchProduct
	expiresAt  time.Time
}

var (
	searchCitiesCacheMu sync.RWMutex
	searchCitiesCache   cachedCitiesResult
	searchProductsCacheMu sync.RWMutex
	searchProductsCache = make(map[string]cachedProductsResult)
)

func NewSearchHandler(db *gorm.DB) *SearchHandler {
	cfg := config.Load()
	return &SearchHandler{
		headoutProxySvc: services.NewHeadoutProxyService(cfg),
		db:              db,
	}
}

func (h *SearchHandler) isFetchFresh() bool {
	if h.db == nil {
		return true
	}
	var setting models.Setting
	if err := h.db.Where("key = ?", "fetch_fresh").First(&setting).Error; err != nil {
		return true
	}
	return setting.Value != "false"
}

type SearchProduct struct {
	ID          string  `json:"id"`
	Name        string  `json:"name"`
	Slug        string  `json:"slug"`
	City        string  `json:"city"`
	CityCode    string  `json:"cityCode"`
	Category    string  `json:"category"`
	ImageURL    string  `json:"imageUrl"`
	Price       float64 `json:"price"`
	Currency    string  `json:"currency"`
	Rating      float32 `json:"rating"`
	ReviewCount int     `json:"reviewCount"`
	ProductType string  `json:"productType"`
	URL         string  `json:"url"`
}

type SearchCity struct {
	Code    string `json:"code"`
	Name    string `json:"name"`
	Country string `json:"country"`
	Image   string `json:"image"`
	Slug    string `json:"slug"`
	URL     string `json:"url"`
}

type SearchCategory struct {
	ID   string `json:"id"`
	Name string `json:"name"`
	Slug string `json:"slug"`
	URL  string `json:"url"`
}

type SearchSuggestion struct {
	Text  string `json:"text"`
	Type  string `json:"type"`
	URL   string `json:"url"`
	Score int    `json:"score"`
}

type SearchResponse struct {
	Query       string             `json:"query"`
	Products    []SearchProduct    `json:"products"`
	Total       int                `json:"total"`
	NextOffset  *int               `json:"nextOffset"`
	Cities      []SearchCity       `json:"cities"`
	Categories  []SearchCategory   `json:"categories"`
	Suggestions []SearchSuggestion `json:"suggestions"`
}

func (h *SearchHandler) Search(c *gin.Context) {
	q := strings.TrimSpace(c.Query("q"))
	currencyCode := strings.TrimSpace(c.Query("currencyCode"))
	offset := 0
	limit := 40
	if o, err := parseIntParam(c.Query("offset")); err == nil && o > 0 {
		offset = o
	}
	if l, err := parseIntParam(c.Query("limit")); err == nil && l > 0 && l <= 100 {
		limit = l
	}
	if q == "" {
		popularCities := h.fetchAllCities(c)
		if len(popularCities) > 8 {
			popularCities = popularCities[:8]
		}
		suggestions := make([]SearchSuggestion, 0, len(popularCities))
		for _, city := range popularCities {
			suggestions = append(suggestions, SearchSuggestion{
				Text: city.Name, Type: "popular",
				URL: city.URL, Score: 90,
			})
		}
		if popularCities == nil {
			popularCities = []SearchCity{}
		}
		c.JSON(http.StatusOK, SearchResponse{
			Query: q, Products: []SearchProduct{},
			Total: 0, NextOffset: nil,
			Cities: popularCities, Categories: []SearchCategory{},
			Suggestions: suggestions,
		})
		return
	}

	results := h.performSearch(c, q, currencyCode)

	// Apply pagination to products
	total := len(results.Products)
	var nextOffset *int
	end := offset + limit
	if end < total {
		nxt := end
		nextOffset = &nxt
		results.Products = results.Products[offset:end]
	} else if offset < total {
		results.Products = results.Products[offset:]
	} else {
		results.Products = []SearchProduct{}
	}
	results.Total = total
	results.NextOffset = nextOffset

	c.JSON(http.StatusOK, results)
}

func (h *SearchHandler) fetchProductsFromDB() []SearchProduct {
	var dbProducts []models.Product
	if err := h.db.Where("title != '' AND (is_available = ? OR is_available IS NULL)", true).Limit(2000).Find(&dbProducts).Error; err != nil {
		logger.Errorf("Failed to fetch products from DB for search: %v", err)
		return nil
	}

	seen := make(map[string]bool)
	products := make([]SearchProduct, 0, len(dbProducts))
	for _, p := range dbProducts {
		if seen[p.HeadoutID] {
			continue
		}
		seen[p.HeadoutID] = true
		slug := slugify(p.Title)
		products = append(products, SearchProduct{
			ID:          p.HeadoutID,
			Name:        p.Title,
			Slug:        slug,
			City:        p.CityName,
			CityCode:    p.CityCode,
			Category:    p.Category,
			ImageURL:    p.ImageURL,
			Price:       p.PriceFrom,
			Currency:    p.Currency,
			Rating:      float32(p.Rating),
			ReviewCount: p.ReviewCount,
			URL:         "/products/" + slug + "-" + p.HeadoutID,
		})
	}
	return products
}

func (h *SearchHandler) performSearch(c *gin.Context, q string, currencyCode string) *SearchResponse {
	lower := strings.ToLower(q)
	allCities := h.fetchAllCities(c)

	matchedCities := searchFilterAndRankCities(allCities, lower)

	var allProducts []SearchProduct
	if !h.isFetchFresh() && h.db != nil {
		allProducts = h.fetchProductsFromDB()
	} else {
		allProducts = h.fetchProductsLive(c.Request.Context(), currencyCode)
	}

	matchedProducts := searchFilterAndRankProducts(allProducts, lower)

	// Fallback: if no products matched, try harder
	if len(matchedProducts) == 0 {
		if h.db != nil {
			matchedProducts = h.searchProductsFallbackDB(lower)
		}
		if len(matchedProducts) == 0 && h.isFetchFresh() {
			matchedProducts = h.searchProductsFallbackHeadout(c.Request.Context(), lower, currencyCode)
		}
	}

	matchedCategories := searchExtractAndRankCategories(matchedProducts, lower)
	suggestions := searchBuildSuggestions(lower, matchedProducts, matchedCities, matchedCategories)
	if matchedProducts == nil {
		matchedProducts = []SearchProduct{}
	}
	if matchedCities == nil {
		matchedCities = []SearchCity{}
	}
	if matchedCategories == nil {
		matchedCategories = []SearchCategory{}
	}
	if suggestions == nil {
		suggestions = []SearchSuggestion{}
	}
	return &SearchResponse{
		Query: q, Products: matchedProducts,
		Cities: matchedCities, Categories: matchedCategories,
		Suggestions: suggestions,
	}
}

func (h *SearchHandler) searchProductsFallbackDB(query string) []SearchProduct {
	if h.db == nil {
		return nil
	}
	var dbProducts []models.Product
	if err := h.db.Where("LOWER(title) LIKE ? AND (is_available = ? OR is_available IS NULL)", "%"+query+"%", true).Limit(20).Find(&dbProducts).Error; err != nil {
		logger.Errorf("Fallback DB search failed: %v", err)
		return nil
	}
	seen := make(map[string]bool)
	products := make([]SearchProduct, 0, len(dbProducts))
	for _, p := range dbProducts {
		if seen[p.HeadoutID] {
			continue
		}
		seen[p.HeadoutID] = true
		slug := slugify(p.Title)
		products = append(products, SearchProduct{
			ID: p.HeadoutID, Name: p.Title, Slug: slug,
			City: p.CityName, CityCode: p.CityCode, Category: p.Category,
			ImageURL: p.ImageURL, Price: p.PriceFrom, Currency: p.Currency,
			Rating: float32(p.Rating), ReviewCount: p.ReviewCount,
			URL: "/products/" + slug + "-" + p.HeadoutID,
		})
	}
	return products
}

func (h *SearchHandler) searchProductsFallbackHeadout(ctx context.Context, q string, currencyCode string) []SearchProduct {
	allCities := productPopularCities
	maxCities := searchProductCityLimit * 2
	if len(allCities) > maxCities {
		allCities = allCities[:maxCities]
	}

	fetchCtx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()

	var mu sync.Mutex
	var wg sync.WaitGroup
	sem := make(chan struct{}, 6)
	results := make([][]SearchProduct, 0, len(allCities))

	for _, cityCode := range allCities {
		wg.Add(1)
		sem <- struct{}{}
		go func(code string) {
			defer wg.Done()
			defer func() { <-sem }()
			vals := url.Values{}
			vals.Set("cityCode", code)
			if currencyCode != "" {
				vals.Set("currencyCode", strings.ToUpper(currencyCode))
			} else {
				vals.Set("currencyCode", "USD")
			}
			vals.Set("languageCode", "EN")
			vals.Set("limit", "100")
			vals.Set("offset", "0")

			upstream, err := h.headoutProxySvc.Get(fetchCtx, "/v2/products/", vals, true)
			if err != nil || upstream.StatusCode < 200 || upstream.StatusCode >= 300 {
				return
			}

			var rawPayload interface{}
			if err := json.Unmarshal(upstream.Body, &rawPayload); err != nil {
				return
			}
			items := extractProductsArray(rawPayload)

			products := make([]SearchProduct, 0, len(items))
			for _, item := range items {
				id := extractID(item)
				if id == "" {
					continue
				}
				name := getString(item, "name", "title")
				if name == "" || !strings.Contains(strings.ToLower(name), q) {
					continue
				}
				var imageURL string
				if img, ok := item["image"].(map[string]interface{}); ok {
					imageURL = getString(img, "url")
				}
				if imageURL == "" {
					imageURL = getString(item, "image_url", "thumbnail", "hero_image")
				}
				if imageURL == "" {
					if media, ok := item["media"].([]interface{}); ok && len(media) > 0 {
						if first, ok := media[0].(map[string]interface{}); ok {
							imageURL = getString(first, "url")
						}
					}
				}
				cityName := getNestedString(item, "city", "name")
				if cityName == "" {
					cityName = getString(item, "location", "city_name")
				}
				if cityName == "" {
					cityName = code
				}
				categoryName := ""
				if pc, ok := item["primaryCategory"].(map[string]interface{}); ok {
					categoryName = getString(pc, "name")
				}
				if categoryName == "" {
					categoryName = getString(item, "category", "primary_category")
				}
				productType := getString(item, "productType")
				curr, price := searchExtractPriceInfo(item, currencyCode)
				rating := float32(getFloat(item, "rating", "average_rating"))
				reviewCount := int(getFloat(item, "review_count", "ratings_count"))
				if rating == 0 {
					if rs, ok := item["reviewsSummary"].(map[string]interface{}); ok {
						rating = float32(getFloat(rs, "averageRating"))
						reviewCount = int(getFloat(rs, "ratingsCount"))
					}
				}
				sl := slugify(name)
				products = append(products, SearchProduct{
					ID: id, Name: name, Slug: sl, City: cityName,
					CityCode: code, Category: categoryName,
					ImageURL: imageURL, Price: price, Currency: curr,
					Rating: rating, ReviewCount: reviewCount,
					ProductType: productType, URL: "/products/" + sl + "-" + id,
				})
			}

			mu.Lock()
			results = append(results, products)
			mu.Unlock()
		}(cityCode)
	}
	wg.Wait()

	allProducts := make([]SearchProduct, 0)
	seen := make(map[string]bool)
	for _, cityProducts := range results {
		for _, p := range cityProducts {
			if !seen[p.ID] {
				seen[p.ID] = true
				allProducts = append(allProducts, p)
			}
		}
	}

	return allProducts
}

func (h *SearchHandler) fetchAllCitiesFromDB(c *gin.Context) []SearchCity {
	var dbCities []models.City
	if err := h.db.Order("name asc").Limit(200).Find(&dbCities).Error; err != nil {
		logger.Errorf("Failed to fetch cities from DB for search: %v", err)
		return nil
	}

	cities := make([]SearchCity, 0, len(dbCities))
	for _, city := range dbCities {
		slug := slugify(city.Name)
		cities = append(cities, SearchCity{
			Code:    city.Code,
			Name:    city.Name,
			Country: city.CountryName,
			Image:   city.ImageURL,
			Slug:    slug,
			URL:     "/cities/" + slug,
		})
	}
	return cities
}

func (h *SearchHandler) fetchAllCities(c *gin.Context) []SearchCity {
	if !h.isFetchFresh() && h.db != nil {
		return h.fetchAllCitiesFromDB(c)
	}

	searchCitiesCacheMu.RLock()
	if time.Now().Before(searchCitiesCache.expiresAt) && len(searchCitiesCache.cities) > 0 {
		cached := append([]SearchCity(nil), searchCitiesCache.cities...)
		searchCitiesCacheMu.RUnlock()
		return cached
	}
	searchCitiesCacheMu.RUnlock()

	var cities []SearchCity
	limit := 200
	offset := 0

	for {
		query := url.Values{}
		query.Set("limit", fmt.Sprintf("%d", limit))
		query.Set("offset", fmt.Sprintf("%d", offset))

		upstream, err := h.headoutProxySvc.Get(c.Request.Context(), "/v2/cities/", query, true)
		if err != nil || upstream.StatusCode < 200 || upstream.StatusCode >= 300 {
			if len(cities) > 0 {
				return cities
			}
			logger.Warnf("Headout cities unavailable")
			return nil
		}

		var payload struct {
			Cities []struct {
				Code    string `json:"code"`
				Name    string `json:"name"`
				Image   *struct{ URL string `json:"url"` } `json:"image"`
				Country *struct{ Code string `json:"code"`; Name string `json:"name"` } `json:"country"`
			} `json:"cities"`
		}
		if err := json.Unmarshal(upstream.Body, &payload); err != nil || len(payload.Cities) == 0 {
			break
		}

		for _, city := range payload.Cities {
			imageURL := ""
			if city.Image != nil {
				imageURL = city.Image.URL
				if !strings.HasPrefix(imageURL, "http") {
					imageURL = "https:" + imageURL
				}
			}
			countryName := ""
			if city.Country != nil {
				countryName = city.Country.Name
			}
			slug := slugify(city.Name)
			cities = append(cities, SearchCity{
				Code: city.Code, Name: city.Name, Country: countryName,
				Image: imageURL, Slug: slug, URL: "/cities/" + slug,
			})
		}

		if len(payload.Cities) < limit {
			break
		}
		offset += limit
	}

	searchCitiesCacheMu.Lock()
	searchCitiesCache = cachedCitiesResult{
		cities: append([]SearchCity(nil), cities...),
		expiresAt: time.Now().Add(searchCitiesCacheTTL),
	}
	searchCitiesCacheMu.Unlock()

	return cities
}

func (h *SearchHandler) fetchProductsLive(ctx context.Context, currencyCode string) []SearchProduct {
	cacheKey := strings.ToUpper(strings.TrimSpace(currencyCode))
	if cacheKey == "" {
		cacheKey = "USD"
	}

	searchProductsCacheMu.RLock()
	if cached, ok := searchProductsCache[cacheKey]; ok && time.Now().Before(cached.expiresAt) {
		products := append([]SearchProduct(nil), cached.products...)
		searchProductsCacheMu.RUnlock()
		return products
	}
	searchProductsCacheMu.RUnlock()

	fetchCtx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()

	var mu sync.Mutex
	var wg sync.WaitGroup
	sem := make(chan struct{}, 6)
	results := make([][]SearchProduct, 0, searchProductCityLimit)

	cityCodes := productPopularCities
	if len(cityCodes) > searchProductCityLimit {
		cityCodes = cityCodes[:searchProductCityLimit]
	}

	for _, cityCode := range cityCodes {
		wg.Add(1)
		sem <- struct{}{}
		go func(code string) {
			defer wg.Done()
			defer func() { <-sem }()
			products := h.fetchProductsForCity(fetchCtx, code, currencyCode)
			mu.Lock()
			results = append(results, products)
			mu.Unlock()
		}(cityCode)
	}
	wg.Wait()

	allProducts := make([]SearchProduct, 0)
	seen := make(map[string]bool)
	for _, cityProducts := range results {
		for _, p := range cityProducts {
			if !seen[p.ID] {
				seen[p.ID] = true
				allProducts = append(allProducts, p)
			}
		}
	}

	searchProductsCacheMu.Lock()
	searchProductsCache[cacheKey] = cachedProductsResult{
		products: append([]SearchProduct(nil), allProducts...),
		expiresAt: time.Now().Add(searchProductsCacheTTL),
	}
	searchProductsCacheMu.Unlock()

	return allProducts
}

func (h *SearchHandler) fetchProductsForCity(ctx context.Context, cityCode string, currencyCode string) []SearchProduct {
	query := url.Values{}
	query.Set("cityCode", cityCode)
	if currencyCode != "" {
		query.Set("currencyCode", strings.ToUpper(currencyCode))
	} else {
		query.Set("currencyCode", "USD")
	}
	query.Set("languageCode", "EN")
	query.Set("limit", "100")
	query.Set("offset", "0")

	upstream, err := h.headoutProxySvc.Get(ctx, "/v2/products/", query, true)
	if err != nil {
		return nil
	}
	if upstream.StatusCode < 200 || upstream.StatusCode >= 300 {
		return nil
	}

	var payload interface{}
	if err := json.Unmarshal(upstream.Body, &payload); err != nil {
		return nil
	}
	items := extractProductsArray(payload)
	products := make([]SearchProduct, 0, len(items))
	for _, item := range items {
		id := extractID(item)
		if id == "" {
			continue
		}
		name := getString(item, "name", "title")
		if name == "" {
			continue
		}

		var imageURL string
		if img, ok := item["image"].(map[string]interface{}); ok {
			imageURL = getString(img, "url")
		}
		if imageURL == "" {
			imageURL = getString(item, "image_url", "thumbnail", "hero_image")
		}
		if imageURL == "" {
			if media, ok := item["media"].([]interface{}); ok && len(media) > 0 {
				if first, ok := media[0].(map[string]interface{}); ok {
					imageURL = getString(first, "url")
				}
			}
		}

		cityName := getNestedString(item, "city", "name")
		if cityName == "" {
			cityName = getString(item, "location", "city_name")
		}
		if cityName == "" {
			cityName = cityCode
		}

		categoryName := ""
		if pc, ok := item["primaryCategory"].(map[string]interface{}); ok {
			categoryName = getString(pc, "name")
		}
		if categoryName == "" {
			categoryName = getString(item, "category", "primary_category")
		}

		productType := getString(item, "productType")

		currency, price := searchExtractPriceInfo(item, currencyCode)

		rating := float32(getFloat(item, "rating", "average_rating"))
		reviewCount := int(getFloat(item, "review_count", "ratings_count"))
		if rating == 0 {
			if rs, ok := item["reviewsSummary"].(map[string]interface{}); ok {
				rating = float32(getFloat(rs, "averageRating"))
				reviewCount = int(getFloat(rs, "ratingsCount"))
			}
		}

		sl := slugify(name)
		products = append(products, SearchProduct{
			ID: id, Name: name, Slug: sl, City: cityName,
			CityCode: cityCode, Category: categoryName,
			ImageURL: imageURL, Price: price, Currency: currency,
			Rating: rating, ReviewCount: reviewCount,
			ProductType: productType, URL: "/products/" + sl + "-" + id,
		})
	}
	return products
}

func searchExtractPriceInfo(item map[string]interface{}, requestedCurrency string) (string, float64) {
	currency := strings.ToUpper(strings.TrimSpace(requestedCurrency))
	if currency == "" {
		currency = "USD"
	}

	price := 0.0
	if pricing, ok := item["pricing"].(map[string]interface{}); ok {
		if value := getString(pricing, "currency", "currencyCode"); value != "" {
			currency = value
		}
		price = getFloat(pricing, "headoutSellingPrice", "netPrice", "price", "amount")
	}

	if listingPrice, ok := item["listingPrice"].(map[string]interface{}); ok {
		if value := getString(listingPrice, "currencyCode", "currency"); value != "" {
			currency = value
		}
		if minPrice, ok := listingPrice["minimumPrice"].(map[string]interface{}); ok {
			if final := getFloat(minPrice, "finalPrice", "price", "amount"); final > 0 {
				price = final
			} else if original := getFloat(minPrice, "originalPrice"); original > 0 && price == 0 {
				price = original
			}
		}
	}

	if listingPrice, ok := item["listing_price"].(map[string]interface{}); ok {
		if value := getString(listingPrice, "currencyCode", "currency", "currency_code"); value != "" {
			currency = value
		}
		if minPrice, ok := listingPrice["minimumPrice"].(map[string]interface{}); ok {
			if final := getFloat(minPrice, "finalPrice", "price", "amount"); final > 0 {
				price = final
			}
		}
		if minPrice, ok := listingPrice["minimum_price"].(map[string]interface{}); ok {
			if final := getFloat(minPrice, "finalPrice", "price", "amount", "final_price"); final > 0 {
				price = final
			}
		}
	}

	if amount := getFloat(item, "price", "amount", "fromPrice", "from_price"); amount > 0 && price == 0 {
		price = amount
	}

	currency = strings.ToUpper(strings.TrimSpace(currency))
	if currency == "" {
		currency = "USD"
	}

	return currency, price
}

func searchFilterAndRankProducts(products []SearchProduct, query string) []SearchProduct {
	if len(products) == 0 || query == "" {
		return nil
	}
	type scored struct {
		product SearchProduct
		score   int
	}
	matched := make([]scored, 0)
	seen := make(map[string]bool)
	for _, p := range products {
		lower := strings.ToLower(p.Name)
		if seen[lower] {
			continue
		}
		seen[lower] = true
		score := searchScoreMatch(query, lower)
		if score == 0 {
			score = searchScoreFuzzy(query, lower)
		}
		if score == 0 {
			cityLower := strings.ToLower(p.City)
			catLower := strings.ToLower(p.Category)
			if strings.Contains(cityLower, query) || strings.Contains(catLower, query) {
				score = 60
			}
		}
		if score > 0 {
			matched = append(matched, scored{product: p, score: score})
		}
	}
	sort.Slice(matched, func(i, j int) bool {
		if matched[i].score != matched[j].score {
			return matched[i].score > matched[j].score
		}
		if matched[i].product.Rating != matched[j].product.Rating {
			return matched[i].product.Rating > matched[j].product.Rating
		}
		return matched[i].product.ReviewCount > matched[j].product.ReviewCount
	})
	if len(matched) > 200 {
		matched = matched[:200]
	}
	result := make([]SearchProduct, len(matched))
	for i, s := range matched {
		result[i] = s.product
	}
	return result
}

func searchFilterAndRankCities(cities []SearchCity, query string) []SearchCity {
	if len(cities) == 0 {
		return nil
	}
	type scored struct {
		city  SearchCity
		score int
	}
	matched := make([]scored, 0)
	seen := make(map[string]bool)
	for _, c := range cities {
		lower := strings.ToLower(c.Name)
		if seen[lower] {
			continue
		}
		seen[lower] = true
		score := searchScoreMatch(query, lower)
		if score == 0 {
			score = searchScoreFuzzy(query, lower)
		}
		if score > 0 {
			matched = append(matched, scored{city: c, score: score})
		}
	}
	sort.Slice(matched, func(i, j int) bool {
		return matched[i].score > matched[j].score
	})
	if len(matched) > 8 {
		matched = matched[:8]
	}
	result := make([]SearchCity, len(matched))
	for i, s := range matched {
		result[i] = s.city
	}
	return result
}

func searchExtractAndRankCategories(products []SearchProduct, query string) []SearchCategory {
	catMap := make(map[string]bool)
	cats := make([]SearchCategory, 0)
	for _, p := range products {
		if p.Category == "" || catMap[p.Category] {
			continue
		}
		catMap[p.Category] = true
		catLower := strings.ToLower(p.Category)
		if searchScoreMatch(query, catLower) > 0 || strings.Contains(catLower, query) {
			sl := slugify(p.Category)
			cats = append(cats, SearchCategory{
				ID: sl, Name: p.Category, Slug: sl, URL: "/categories/" + sl,
			})
		}
	}
	sort.Slice(cats, func(i, j int) bool {
		si := searchScoreMatch(query, strings.ToLower(cats[i].Name))
		sj := searchScoreMatch(query, strings.ToLower(cats[j].Name))
		if si != sj {
			return si > sj
		}
		return cats[i].Name < cats[j].Name
	})
	if len(cats) > 6 {
		cats = cats[:6]
	}
	return cats
}

func searchBuildSuggestions(query string, products []SearchProduct, cities []SearchCity, categories []SearchCategory) []SearchSuggestion {
	suggestions := make([]SearchSuggestion, 0)
	seen := make(map[string]bool)
	addSugg := func(text, typ, url string, score int) {
		key := text + typ
		if seen[key] {
			return
		}
		seen[key] = true
		suggestions = append(suggestions, SearchSuggestion{Text: text, Type: typ, URL: url, Score: score})
	}
	for _, p := range products {
		addSugg(p.Name, "product", p.URL, 100)
		if len(suggestions) >= 5 {
			break
		}
	}
	if len(cities) > 0 {
		addSugg(cities[0].Name+" Attractions", "popular", cities[0].URL, 90)
	}
	for _, cat := range categories {
		addSugg(cat.Name, "category", cat.URL, 80)
	}
	return suggestions
}

func searchScoreMatch(query, target string) int {
	if query == target {
		return 100
	}
	if strings.HasPrefix(target, query) {
		return 80
	}
	for _, word := range strings.Fields(target) {
		if strings.HasPrefix(word, query) {
			return 70
		}
	}
	if strings.Contains(target, query) {
		return 60
	}
	for _, word := range strings.Fields(target) {
		if strings.Contains(word, query) {
			return 50
		}
	}
	return 0
}

func searchScoreFuzzy(query, target string) int {
	query = strings.TrimSpace(query)
	target = strings.TrimSpace(target)
	if len(query) < 2 {
		return 0
	}

	// Full-name Levenshtein distance against entire target
	fullDist := searchLevenshtein(query, target)
	if fullDist >= 0 {
		var fullThreshold int
		switch {
		case len(query) <= 3:
			fullThreshold = 1
		case len(query) <= 5:
			fullThreshold = 2
		case len(query) <= 8:
			fullThreshold = 3
		default:
			fullThreshold = 4
		}
		if fullDist <= fullThreshold {
			score := 50 - fullDist*8
			if score < 20 {
				score = 20
			}
			return score
		}
	}

	// Word-level Levenshtein for short queries without trigrams
	if len(query) < 3 {
		targetWords := strings.Fields(target)
		queryWord := strings.Fields(query)[0]
		for _, tw := range targetWords {
			dist := searchLevenshtein(queryWord, tw)
			if len(queryWord) <= 3 && dist <= 1 {
				return 25
			}
			if len(queryWord) <= 5 && dist <= 2 {
				return 20
			}
		}
		return 0
	}

	// Trigram matching for len(query) >= 3
	queryTrigrams := searchBuildTrigrams(query)
	targetTrigrams := searchBuildTrigrams(target)
	if len(queryTrigrams) == 0 || len(targetTrigrams) == 0 {
		return 0
	}
	intersect := 0
	for t := range queryTrigrams {
		if targetTrigrams[t] {
			intersect++
		}
	}
	queryWord := strings.Fields(query)[0]
	targetWords := strings.Fields(target)
	hasCloseWord := false
	for _, tw := range targetWords {
		dist := searchLevenshtein(queryWord, tw)
		if len(tw) <= 4 && dist <= 1 {
			hasCloseWord = true
			break
		}
		if len(tw) <= 7 && dist <= 2 {
			hasCloseWord = true
			break
		}
	}
	similarity := float64(intersect) / float64(len(queryTrigrams))
	if hasCloseWord {
		if similarity >= 0.3 {
			return int(40*similarity) + 20
		}
		return 15
	}
	if similarity >= 0.5 {
		return int(30 * similarity)
	}
	return 0
}

func searchBuildTrigrams(s string) map[string]bool {
	trigrams := make(map[string]bool)
	if len(s) < 3 {
		return trigrams
	}
	for i := 0; i <= len(s)-3; i++ {
		trigrams[s[i:i+3]] = true
	}
	return trigrams
}

func searchLevenshtein(a, b string) int {
	la, lb := len(a), len(b)
	if la == 0 {
		return lb
	}
	if lb == 0 {
		return la
	}
	if la > 15 || lb > 15 {
		if la > lb {
			return la - lb
		}
		return lb - la
	}
	d := make([][]int, la+1)
	for i := range d {
		d[i] = make([]int, lb+1)
		d[i][0] = i
	}
	for j := 0; j <= lb; j++ {
		d[0][j] = j
	}
	for i := 1; i <= la; i++ {
		for j := 1; j <= lb; j++ {
			cost := 1
			if a[i-1] == b[j-1] {
				cost = 0
			}
			d[i][j] = searchMin3(
				d[i-1][j]+1,
				d[i][j-1]+1,
				d[i-1][j-1]+cost,
			)
		}
	}
	return d[la][lb]
}

func searchMin3(a, b, c int) int {
	if a < b {
		if a < c {
			return a
		}
		return c
	}
	if b < c {
		return b
	}
	return c
}

func (h *SearchHandler) GetCityBySlug(c *gin.Context) {
	slug := c.Param("slug")
	if slug == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "slug is required"})
		return
	}
	allCities := h.fetchAllCities(c)
	for _, city := range allCities {
		if strings.EqualFold(city.Slug, slug) {
			c.JSON(http.StatusOK, city)
			return
		}
	}
	c.JSON(http.StatusNotFound, gin.H{"error": "city not found"})
}

func (h *SearchHandler) GetCategoryBySlug(c *gin.Context) {
	slug := c.Param("slug")
	if slug == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "slug is required"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"slug": slug, "name": strings.ReplaceAll(slug, "-", " ")})
}

func parseIntParam(s string) (int, error) {
	if s == "" {
		return 0, fmt.Errorf("empty string")
	}
	var n int
	for _, c := range s {
		if c < '0' || c > '9' {
			return 0, fmt.Errorf("not a number: %s", s)
		}
		n = n*10 + int(c-'0')
	}
	return n, nil
}
