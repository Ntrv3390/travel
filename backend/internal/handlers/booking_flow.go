package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"math"
	"net/http"
	"net/url"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/travel/backend/internal/database"
	"github.com/travel/backend/internal/models"
	"github.com/travel/backend/internal/services"
	"github.com/travel/backend/pkg/config"
	"github.com/travel/backend/pkg/logger"
)

const (
	defaultCalendarDays  = 42
	maxCalendarDays      = 60
	defaultInventoryFrom = "T00:00:00"
	defaultInventoryTo   = "T23:59:59"
)

type BookingFlowHandler struct {
	authService *services.HeadoutProxyService
}

type inventoryPersonPrice struct {
	Price              *float64 `json:"price"`
	OriginalPrice      *float64 `json:"originalPrice"`
	NetPrice           *float64 `json:"netPrice"`
	HeadoutSellingPrice *float64 `json:"headoutSellingPrice"`
	CurrencyCode       string   `json:"currencyCode"`
}

type inventoryPricing struct {
	Persons []inventoryPersonPrice `json:"persons"`
}

type inventoryItem struct {
	ID            string            `json:"id"`
	InventoryID   string            `json:"inventoryId"`
	VariantID     string            `json:"variantId"`
	Availability  string            `json:"availability"`
	StartDateTime string            `json:"startDateTime"`
	EndDateTime   string            `json:"endDateTime"`
	Pricing       inventoryPricing  `json:"pricing"`
	Raw           map[string]interface{} `json:"-"`
}

type inventoryResponse struct {
	Items []json.RawMessage `json:"items"`
}

type calendarDay struct {
	Date         string   `json:"date"`
	Label        string   `json:"label"`
	Price        *float64 `json:"price"`
	PriceLabel   *string  `json:"priceLabel"`
	Currency     string   `json:"currency"`
	Availability string   `json:"availability"`
	Slots        []string `json:"slots"`
	IsAvailable  bool     `json:"isAvailable"`
}

type availabilitySlot struct {
	InventoryID    string   `json:"inventoryId"`
	StartDateTime  string   `json:"startDateTime"`
	EndDateTime    string   `json:"endDateTime"`
	Slot           *string  `json:"slot"`
	Availability   string   `json:"availability"`
	Price          *float64 `json:"price"`
	Currency       string   `json:"currency"`
	SeatsAvailable *int     `json:"seatsAvailable"`
}

type createBookingRequest struct {
	ExperienceID    string `json:"experienceId"`
	VariantID       string `json:"variantId"`
	InventoryID     string `json:"inventoryId,omitempty"`
	Date            string `json:"date"`
	Adults          int    `json:"adults"`
	Children        int    `json:"children"`
	FirstName       string `json:"firstName"`
	LastName        string `json:"lastName"`
	Email           string `json:"email"`
	Phone           string `json:"phone"`
	SpecialRequests string `json:"specialRequests,omitempty"`
	CurrencyCode    string `json:"currencyCode,omitempty"`
	VariantInputFields []map[string]interface{} `json:"variantInputFields,omitempty"`
	IdempotencyKey  string `json:"-"`
}

type bookingResponse struct {
	BookingID             string  `json:"bookingId"`
	HeadoutReference      string  `json:"headoutReference"`
	Status                string  `json:"status"`
	TotalAmount           float64 `json:"totalAmount"`
	Currency              string  `json:"currency"`
	ConfirmationEmailSent bool    `json:"confirmationEmailSent"`
}

type headoutBookingResponse struct {
	BookingID        string
	HeadoutReference string
	TotalAmount      float64
	Currency         string
	Status           string
	TicketURL        string
	TicketData       []byte
}

func NewBookingFlowHandler(cfg *config.Config) *BookingFlowHandler {
	return &BookingFlowHandler{
		authService: services.NewHeadoutProxyService(cfg),
	}
}

func (h *BookingFlowHandler) GetCalendar(c *gin.Context) {
	variantID := strings.TrimSpace(c.Query("variantId"))
	headoutID := strings.TrimSpace(c.Query("headoutId"))

	if variantID == "" && headoutID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "variantId or headoutId is required"})
		return
	}

	days := parsePositiveIntWithBounds(c.Query("days"), defaultCalendarDays, 1, maxCalendarDays)
	startDate, err := parseStartDate(c.Query("startDate"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid startDate, expected YYYY-MM-DD"})
		return
	}

	dayEnd := startDate.AddDate(0, 0, days-1)
	candidates := h.resolveVariantCandidates(c, variantID, headoutID)

	resolvedVariantID := ""
	items := make([]inventoryItem, 0)
	now := time.Now()
	todayKey := toDateKey(startOfDay(now))
	maxBookableQuantity := (*int)(nil)
	for _, candidate := range candidates {
		inventoryItems, fetchErr := h.fetchInventoryByVariant(c, candidate, startDate, dayEnd)
		if fetchErr != nil {
			logger.Warnf("Calendar inventory fetch failed for candidate %s: %v", candidate, fetchErr)
			continue
		}

		if len(inventoryItems) > 0 {
			resolvedVariantID = candidate
			items = inventoryItems
			maxBookableQuantity = extractMaxBookableQuantityFromItems(inventoryItems)
			break
		}
	}

	dayMap := make(map[string]*calendarDay, days)
	dayHasTimedInventory := make(map[string]bool, days)
	for i := 0; i < days; i++ {
		current := startDate.AddDate(0, 0, i)
		dateKey := toDateKey(current)
		dayMap[dateKey] = &calendarDay{
			Date:         dateKey,
			Label:        current.Format("Mon, Jan 2"),
			Currency:     "USD",
			Availability: "UNAVAILABLE",
			Slots:        []string{},
			IsAvailable:  false,
		}
	}

	for _, item := range items {
		dateKey, slot := extractDateAndSlot(item.StartDateTime)
		if dateKey == "" {
			continue
		}
		if slot != "" {
			dayHasTimedInventory[dateKey] = true
		}
		if isPastTimedInventorySlot(dateKey, item.StartDateTime, now, todayKey) {
			continue
		}

		day, exists := dayMap[dateKey]
		if !exists {
			continue
		}

		price := pickItemPrice(item)
		currency := pickCurrency(item)
		if currency != "" {
			day.Currency = currency
		}
		if strings.TrimSpace(item.Availability) != "" {
			day.Availability = item.Availability
		}

		if price != nil {
			if day.Price == nil || *price < *day.Price {
				day.Price = price
			}
		}

		if slot != "" && !contains(day.Slots, slot) {
			day.Slots = append(day.Slots, slot)
		}
	}

	orderedDays := make([]calendarDay, 0, len(dayMap))
	for i := 0; i < days; i++ {
		dateKey := toDateKey(startDate.AddDate(0, 0, i))
		day := dayMap[dateKey]
		sort.Strings(day.Slots)
		if dayHasTimedInventory[dateKey] {
			day.IsAvailable = len(day.Slots) > 0
		} else {
			day.IsAvailable = len(day.Slots) > 0 || isAvailabilityOpen(day.Availability)
		}
		if day.Price != nil {
			label := formatMoney(*day.Price, day.Currency)
			day.PriceLabel = &label
		}
		orderedDays = append(orderedDays, *day)
	}

	resolvedCurrency := "USD"
	for _, day := range orderedDays {
		if strings.TrimSpace(day.Currency) != "" {
			resolvedCurrency = day.Currency
			break
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"days":             orderedDays,
		"rangeStart":       toDateKey(startDate),
		"rangeEnd":         toDateKey(dayEnd),
		"currency":         resolvedCurrency,
		"maxBookableQuantity": maxBookableQuantity,
		"resolvedVariantId": resolvedVariantID,
	})
}

func (h *BookingFlowHandler) GetAvailability(c *gin.Context) {
	variantID := strings.TrimSpace(c.Query("variantId"))
	dateParam := strings.TrimSpace(c.Query("date"))

	if variantID == "" || dateParam == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "variantId and date are required"})
		return
	}

	dateValue, err := time.Parse("2006-01-02", dateParam)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid date, expected YYYY-MM-DD"})
		return
	}

	today := startOfDay(time.Now())
	if startOfDay(dateValue).Before(today) {
		dateValue = today
		dateParam = toDateKey(today)
	}
	now := time.Now()
	todayKey := toDateKey(startOfDay(now))

	items, err := h.fetchInventoryByVariant(c, variantID, dateValue, dateValue)
	if err != nil {
		logger.Errorf("Availability fetch failed: %v", err)
		c.JSON(http.StatusBadGateway, gin.H{"error": "failed to fetch availability from headout"})
		return
	}

	slots := make([]availabilitySlot, 0, len(items))
	for _, item := range items {
		dateKey, slotValue := extractDateAndSlot(item.StartDateTime)
		if dateKey != dateParam {
			continue
		}
		if isPastTimedInventorySlot(dateKey, item.StartDateTime, now, todayKey) {
			continue
		}

		seats := extractSeatsAvailable(item.Raw)
		price := pickItemPrice(item)
		currency := pickCurrency(item)
		slot := slotValue
		if slot == "" {
			slot = ""
		}

		var slotPtr *string
		if slot != "" {
			slotPtr = &slot
		}

		slots = append(slots, availabilitySlot{
			InventoryID:    firstNonEmptyString(item.InventoryID, item.ID),
			StartDateTime:  item.StartDateTime,
			EndDateTime:    item.EndDateTime,
			Slot:           slotPtr,
			Availability:   item.Availability,
			Price:          price,
			Currency:       firstNonEmptyString(currency, "USD"),
			SeatsAvailable: seats,
		})
	}

	sort.Slice(slots, func(i, j int) bool {
		return firstNonEmptyString(valueOrEmpty(slots[i].Slot), slots[i].StartDateTime) < firstNonEmptyString(valueOrEmpty(slots[j].Slot), slots[j].StartDateTime)
	})

	c.JSON(http.StatusOK, gin.H{
		"variantId": variantID,
		"date":      dateParam,
		"count":     len(slots),
		"maxBookableQuantity": extractMaxBookableQuantityFromItems(items),
		"slots":     slots,
	})
}

func (h *BookingFlowHandler) CreateBooking(c *gin.Context) {
	idempotencyKey := strings.TrimSpace(c.GetHeader("Idempotency-Key"))

	var req createBookingRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid booking payload"})
		return
	}

	req.IdempotencyKey = idempotencyKey

	req.VariantID = strings.TrimSpace(req.VariantID)
	req.Email = strings.TrimSpace(req.Email)
	req.FirstName = strings.TrimSpace(req.FirstName)
	req.LastName = strings.TrimSpace(req.LastName)
	req.Date = strings.TrimSpace(req.Date)
	req.Phone = strings.TrimSpace(req.Phone)

	if req.VariantID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "variantId is required"})
		return
	}
	if req.Date == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "date is required"})
		return
	}
	if _, dateErr := time.Parse("2006-01-02", req.Date); dateErr != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid date format, expected YYYY-MM-DD"})
		return
	}
	if req.Email == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "email is required"})
		return
	}
	if !strings.Contains(req.Email, "@") || !strings.Contains(req.Email, ".") {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid email format"})
		return
	}
	if req.FirstName == "" || req.LastName == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "firstName and lastName are required"})
		return
	}
	if req.Adults < 0 || req.Children < 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "adults and children must be non-negative"})
		return
	}
	if req.Phone != "" && len(req.Phone) < 6 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid phone number"})
		return
	}

	if idempotencyKey != "" {
		var existing models.Booking
		err := database.GetDB().WithContext(c.Request.Context()).
			Where("idempotency_key = ?", idempotencyKey).First(&existing).Error
		if err == nil {
			c.JSON(http.StatusOK, bookingResponse{
				BookingID:             existing.BookingID,
				HeadoutReference:      existing.HeadoutReference,
				Status:                existing.Status,
				TotalAmount:           existing.TotalPrice,
				Currency:              existing.Currency,
				ConfirmationEmailSent: true,
			})
			return
		}
	}

	inventoryID := strings.TrimSpace(req.InventoryID)
	if inventoryID == "" {
		resolvedID, err := h.resolveInventoryID(c, req.VariantID, req.Date)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("could not find available inventory: %v", err)})
			return
		}
		inventoryID = resolvedID
	}

	totalPax := req.Adults + req.Children
	if totalPax < 1 {
		totalPax = 1
	}

	customers := make([]map[string]interface{}, 0, totalPax)
	for i := 0; i < max(1, req.Adults); i++ {
		customer := map[string]interface{}{
			"personType": "ADULT",
			"isPrimary":  i == 0,
			"inputFields": []map[string]interface{}{
				{"id": "FIRST_NAME", "value": req.FirstName},
				{"id": "LAST_NAME", "value": req.LastName},
				{"id": "EMAIL", "value": req.Email},
			},
		}
		if req.Phone != "" {
			customer["inputFields"] = append(customer["inputFields"].([]map[string]interface{}),
				map[string]interface{}{"id": "PHONE_NUMBER", "value": req.Phone})
		}
		customers = append(customers, customer)
	}
	for i := 0; i < req.Children; i++ {
		customers = append(customers, map[string]interface{}{
			"personType": "CHILD",
			"isPrimary":  false,
			"inputFields": []map[string]interface{}{
				{"id": "FIRST_NAME", "value": req.FirstName},
				{"id": "LAST_NAME", "value": req.LastName},
			},
		})
	}

	vif := req.VariantInputFields
	if vif == nil {
		vif = []map[string]interface{}{}
	}

	headoutPayload := map[string]interface{}{
		"variantId":   req.VariantID,
		"inventoryId": inventoryID,
		"customersDetails": map[string]interface{}{
			"count":     totalPax,
			"customers": customers,
		},
		"variantInputFields": vif,
	}

	bodyBytes, err := json.Marshal(headoutPayload)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to prepare booking"})
		return
	}

	upstream, err := retryHeadoutCall(func() (*services.UpstreamResponse, error) {
		return h.authService.Post(c.Request.Context(), "/v1/booking", url.Values{}, bodyBytes, true)
	})
	if err != nil {
		h.handleProxyError(c, err)
		return
	}

	if upstream.StatusCode < 200 || upstream.StatusCode >= 300 {
		preview := string(upstream.Body)
		if len(preview) > 200 {
			preview = preview[:200]
		}
		logger.Errorf("Headout booking rejected with status %d: %s", upstream.StatusCode, preview)
		c.Data(upstream.StatusCode, "application/json", upstream.Body)
		return
	}

	headoutResp := parseHeadoutBookingResponse(upstream.Body)

	go func() {
		saveCtx := c.Request.Context()
		if err := h.saveBookingToDB(saveCtx, req, headoutResp); err != nil {
			logger.Errorf("Booking created on Headout but local save failed: %v", err)
		}
	}()

	go func() {
		ticketText := ""
		if headoutResp.TicketURL != "" && headoutResp.TicketURL != "embedded" {
			ticketText = fmt.Sprintf("\nYour ticket is available at: %s", headoutResp.TicketURL)
		}
		services.SendBookingConfirmation(services.BookingConfirmationData{
			BookingID:        headoutResp.BookingID,
			HeadoutReference: headoutResp.HeadoutReference,
			CustomerName:     req.FirstName + " " + req.LastName,
			CustomerEmail:    req.Email,
			ExperienceName:   "",
			ExperienceDate:   req.Date,
			TotalAmount:      headoutResp.TotalAmount,
			Currency:         headoutResp.Currency,
			Quantity:         totalPax,
			TicketURL:        headoutResp.TicketURL,
			TicketData:       ticketText,
		})
		if len(headoutResp.TicketData) > 0 {
			services.SendBookingTicket(req.Email, req.FirstName+" "+req.LastName, headoutResp.BookingID, headoutResp.TicketData)
		}
	}()

	c.JSON(http.StatusOK, bookingResponse{
		BookingID:             headoutResp.BookingID,
		HeadoutReference:      headoutResp.HeadoutReference,
		Status:                "CONFIRMED",
		TotalAmount:           headoutResp.TotalAmount,
		Currency:              headoutResp.Currency,
		ConfirmationEmailSent: true,
	})
}

func (h *BookingFlowHandler) CaptureBooking(c *gin.Context) {
	bookingID := strings.TrimSpace(c.Param("id"))
	if bookingID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "booking id is required"})
		return
	}

	body := map[string]interface{}{"status": "CAPTURED"}
	bodyBytes, err := json.Marshal(body)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to encode capture payload"})
		return
	}

	path := fmt.Sprintf("/v1/booking/%s", url.PathEscape(bookingID))
	upstream, err := h.authService.Put(c.Request.Context(), path, url.Values{}, bodyBytes, true)
	if err != nil {
		h.handleProxyError(c, err)
		return
	}

	h.writeUpstreamResponse(c, upstream)
}

func (h *BookingFlowHandler) GetBooking(c *gin.Context) {
	bookingID := strings.TrimSpace(c.Param("id"))
	if bookingID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "booking id is required"})
		return
	}

	path := fmt.Sprintf("/v1/booking/%s", url.PathEscape(bookingID))
	upstream, err := h.authService.Get(c.Request.Context(), path, c.Request.URL.Query(), true)
	if err != nil {
		h.handleProxyError(c, err)
		return
	}

	h.writeUpstreamResponse(c, upstream)
}

func (h *BookingFlowHandler) handleProxyError(c *gin.Context, err error) {
	if err == services.ErrMissingHeadoutAPIKey {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "headout api key is missing"})
		return
	}

	logger.Errorf("Booking flow Headout request failed: %v", err)

	errMsg := "headout service is temporarily unavailable"
	if strings.Contains(err.Error(), "timeout") || strings.Contains(err.Error(), "deadline") {
		errMsg = "headout service request timed out"
	} else if strings.Contains(err.Error(), "connection refused") || strings.Contains(err.Error(), "no such host") {
		errMsg = "headout service is unreachable"
	}
	c.JSON(http.StatusBadGateway, gin.H{"error": errMsg})
}

func retryHeadoutCall(fn func() (*services.UpstreamResponse, error)) (*services.UpstreamResponse, error) {
	var lastErr error
	maxAttempts := 3
	for attempt := 0; attempt < maxAttempts; attempt++ {
		if attempt > 0 {
			time.Sleep(time.Duration(500*attempt) * time.Millisecond)
		}

		resp, err := fn()
		if err == nil && resp.StatusCode < 500 {
			return resp, nil
		}

		if err != nil {
			lastErr = err
			logger.Warnf("Headout call attempt %d/%d failed with error: %v", attempt+1, maxAttempts, err)
		} else {
			lastErr = fmt.Errorf("headout returned status %d", resp.StatusCode)
			logger.Warnf("Headout call attempt %d/%d returned status %d", attempt+1, maxAttempts, resp.StatusCode)
		}
	}
	return nil, fmt.Errorf("headout call failed after %d attempts: %w", maxAttempts, lastErr)
}

func (h *BookingFlowHandler) writeUpstreamResponse(c *gin.Context, upstream *services.UpstreamResponse) {
	contentType := upstream.Headers.Get("Content-Type")
	if contentType == "" {
		contentType = "application/json"
	}

	c.Data(upstream.StatusCode, contentType, upstream.Body)
}

func (h *BookingFlowHandler) resolveVariantCandidates(c *gin.Context, variantID string, headoutID string) []string {
	found := make([]string, 0, 6)
	seen := map[string]struct{}{}

	add := func(value string) {
		value = strings.TrimSpace(value)
		if value == "" {
			return
		}
		if _, exists := seen[value]; exists {
			return
		}
		seen[value] = struct{}{}
		found = append(found, value)
	}

	add(variantID)
	add(headoutID)

	if strings.TrimSpace(headoutID) == "" {
		return found
	}

	path := fmt.Sprintf("/v1/product/get/%s", url.PathEscape(headoutID))
	upstream, err := h.authService.Get(c.Request.Context(), path, url.Values{}, true)
	if err != nil {
		logger.Warnf("Failed to fetch product for variant discovery: %v", err)
		return found
	}

	if upstream.StatusCode < http.StatusOK || upstream.StatusCode >= http.StatusMultipleChoices {
		return found
	}

	var payload interface{}
	if err := json.Unmarshal(upstream.Body, &payload); err != nil {
		logger.Warnf("Failed to decode product payload for variant discovery: %v", err)
		return found
	}

	collectVariantIDs(payload, "", add)
	return found
}

func (h *BookingFlowHandler) fetchInventoryByVariant(
	c *gin.Context,
	variantID string,
	startDate time.Time,
	endDate time.Time,
) ([]inventoryItem, error) {
	query := url.Values{}
	query.Set("variantId", variantID)
	query.Set("startDateTime", toDateKey(startDate)+defaultInventoryFrom)
	query.Set("endDateTime", toDateKey(endDate)+defaultInventoryTo)

	upstream, err := h.authService.Get(c.Request.Context(), "/v1/inventory/list-by/variant", query, true)
	if err != nil {
		return nil, err
	}

	if upstream.StatusCode < http.StatusOK || upstream.StatusCode >= http.StatusMultipleChoices {
		preview := string(upstream.Body)
		if len(preview) > 220 {
			preview = preview[:220]
		}
		return nil, fmt.Errorf("headout inventory returned status %d: %s", upstream.StatusCode, preview)
	}

	var payload inventoryResponse
	if err := json.Unmarshal(upstream.Body, &payload); err != nil {
		return nil, fmt.Errorf("failed to decode inventory payload: %w", err)
	}

	items := make([]inventoryItem, 0, len(payload.Items))
	for _, rawItem := range payload.Items {
		var typed inventoryItem
		if err := json.Unmarshal(rawItem, &typed); err != nil {
			continue
		}

		var raw map[string]interface{}
		if err := json.Unmarshal(rawItem, &raw); err == nil {
			typed.Raw = raw
		}
		items = append(items, typed)
	}

	return items, nil
}

func collectVariantIDs(value interface{}, parentKey string, add func(string)) {
	switch typed := value.(type) {
	case []interface{}:
		for _, item := range typed {
			collectVariantIDs(item, parentKey, add)
		}
	case map[string]interface{}:
		for key, child := range typed {
			lowerKey := strings.ToLower(key)
			parentLower := strings.ToLower(parentKey)
			hasVariantHint := strings.Contains(lowerKey, "variant") || strings.Contains(parentLower, "variant")
			if hasVariantHint {
				switch v := child.(type) {
				case string:
					add(v)
				case float64:
					add(strconv.FormatInt(int64(v), 10))
				case int:
					add(strconv.Itoa(v))
				}
			}
			collectVariantIDs(child, lowerKey, add)
		}
	}
}

func extractDateAndSlot(startDateTime string) (string, string) {
	startDateTime = strings.TrimSpace(startDateTime)
	if startDateTime == "" {
		return "", ""
	}

	if len(startDateTime) >= 10 {
		dateKey := startDateTime[:10]
		slot := ""
		if len(startDateTime) >= 16 && strings.Contains(startDateTime, "T") {
			slot = startDateTime[11:16]
			if !isValidSlot(slot) {
				slot = ""
			}
		}
		return dateKey, slot
	}

	return "", ""
}

func isValidSlot(slot string) bool {
	if len(slot) != 5 {
		return false
	}
	if slot[2] != ':' {
		return false
	}
	_, hErr := strconv.Atoi(slot[:2])
	_, mErr := strconv.Atoi(slot[3:])
	return hErr == nil && mErr == nil
}

func pickItemPrice(item inventoryItem) *float64 {
	if len(item.Pricing.Persons) == 0 {
		return nil
	}

	p := item.Pricing.Persons[0]
	for _, value := range []*float64{p.Price, p.NetPrice, p.HeadoutSellingPrice, p.OriginalPrice} {
		if value != nil {
			copyVal := *value
			return &copyVal
		}
	}

	return nil
}

func pickCurrency(item inventoryItem) string {
	if len(item.Pricing.Persons) == 0 {
		return ""
	}
	return strings.TrimSpace(item.Pricing.Persons[0].CurrencyCode)
}

func parsePositiveIntWithBounds(value string, fallback int, minValue int, maxValue int) int {
	value = strings.TrimSpace(value)
	if value == "" {
		return fallback
	}

	parsed, err := strconv.Atoi(value)
	if err != nil {
		return fallback
	}

	if parsed < minValue {
		return minValue
	}
	if parsed > maxValue {
		return maxValue
	}
	return parsed
}

func parseStartDate(value string) (time.Time, error) {
	today := startOfDay(time.Now())
	value = strings.TrimSpace(value)
	if value == "" {
		return today, nil
	}

	parsed, err := time.Parse("2006-01-02", value)
	if err != nil {
		return time.Time{}, err
	}

	parsed = startOfDay(parsed)
	if parsed.Before(today) {
		return today, nil
	}

	return parsed, nil
}

func startOfDay(t time.Time) time.Time {
	return time.Date(t.Year(), t.Month(), t.Day(), 0, 0, 0, 0, t.Location())
}

func toDateKey(t time.Time) string {
	return t.Format("2006-01-02")
}

func contains(values []string, target string) bool {
	for _, value := range values {
		if value == target {
			return true
		}
	}
	return false
}

func formatMoney(value float64, currency string) string {
	currency = firstNonEmptyString(strings.TrimSpace(currency), "USD")
	rounded := int64(math.Round(value))
	return fmt.Sprintf("%s %d", currency, rounded)
}

func isAvailabilityOpen(value string) bool {
	upper := strings.ToUpper(strings.TrimSpace(value))
	if upper == "" {
		return false
	}
	return upper != "UNAVAILABLE" && upper != "SOLD_OUT"
}

func extractSeatsAvailable(raw map[string]interface{}) *int {
	if raw == nil {
		return nil
	}

	keys := map[string]struct{}{
		"availableSeats":    {},
		"availableSeatCount": {},
		"remainingSeats":    {},
		"remainingCount":    {},
		"seatsAvailable":    {},
		"availabilityCount": {},
		"capacityLeft":      {},
	}

	if value, found := findNumericByKnownKeys(raw, keys); found {
		intValue := int(math.Round(value))
		if intValue < 0 {
			intValue = 0
		}
		return &intValue
	}

	return nil
}

func findNumericByKnownKeys(value interface{}, keys map[string]struct{}) (float64, bool) {
	switch typed := value.(type) {
	case map[string]interface{}:
		for key, child := range typed {
			if _, exists := keys[key]; exists {
				if number, ok := toFloat64(child); ok {
					return number, true
				}
			}
			if number, ok := findNumericByKnownKeys(child, keys); ok {
				return number, true
			}
		}
	case []interface{}:
		for _, child := range typed {
			if number, ok := findNumericByKnownKeys(child, keys); ok {
				return number, true
			}
		}
	}

	return 0, false
}

func toFloat64(value interface{}) (float64, bool) {
	switch typed := value.(type) {
	case float64:
		return typed, true
	case float32:
		return float64(typed), true
	case int:
		return float64(typed), true
	case int64:
		return float64(typed), true
	case json.Number:
		parsed, err := typed.Float64()
		return parsed, err == nil
	case string:
		parsed, err := strconv.ParseFloat(strings.TrimSpace(typed), 64)
		return parsed, err == nil
	default:
		return 0, false
	}
}

func firstNonEmptyString(values ...string) string {
	for _, value := range values {
		if strings.TrimSpace(value) != "" {
			return value
		}
	}
	return ""
}

func valueOrEmpty(value *string) string {
	if value == nil {
		return ""
	}
	return *value
}

func max(a, b int) int {
	if a > b {
		return a
	}
	return b
}

func (h *BookingFlowHandler) resolveInventoryID(c *gin.Context, variantID string, dateStr string) (string, error) {
	parsedDate, err := time.Parse("2006-01-02", dateStr)
	if err != nil {
		return "", fmt.Errorf("invalid date: %w", err)
	}

	items, err := h.fetchInventoryByVariant(c, variantID, parsedDate, parsedDate)
	if err != nil {
		return "", fmt.Errorf("fetch inventory: %w", err)
	}

	now := time.Now()
	todayKey := toDateKey(startOfDay(now))
	for _, item := range items {
		dateKey, _ := extractDateAndSlot(item.StartDateTime)
		if dateKey != dateStr {
			continue
		}
		if isPastTimedInventorySlot(dateKey, item.StartDateTime, now, todayKey) {
			continue
		}
		avail := strings.ToUpper(strings.TrimSpace(item.Availability))
		if avail == "UNAVAILABLE" || avail == "SOLD_OUT" {
			continue
		}
		if item.InventoryID != "" {
			return item.InventoryID, nil
		}
		if item.ID != "" {
			return item.ID, nil
		}
	}

	return "", fmt.Errorf("no available inventory for variant %s on %s", variantID, dateStr)
}

func parseHeadoutBookingResponse(body []byte) headoutBookingResponse {
	var raw map[string]interface{}
	if err := json.Unmarshal(body, &raw); err != nil {
		logger.Warnf("failed to parse headout booking response: %v", err)
		return headoutBookingResponse{
			BookingID:   "unknown",
			Status:      "PENDING",
			Currency:    "USD",
		}
	}

	resp := headoutBookingResponse{
		BookingID:   getStringField(raw, "bookingId", "booking_id", "id"),
		Status:      getStringField(raw, "status", "bookingStatus"),
		Currency:    getStringField(raw, "currency", "currencyCode", "currency_code"),
		TicketURL:   getStringField(raw, "ticketUrl", "voucherUrl", "ticketURL", "voucherURL", "ticket_url", "voucher_url"),
	}

	if ref, ok := raw["referenceNumber"].(string); ok && ref != "" {
		resp.HeadoutReference = ref
	} else if ref, ok := raw["headoutReference"].(string); ok && ref != "" {
		resp.HeadoutReference = ref
	} else {
		resp.HeadoutReference = resp.BookingID
	}

	if price, ok := toFloat64FromRaw(raw, "price", "totalPrice", "total_price", "amount"); ok {
		resp.TotalAmount = price
	}

	if ticketData, ok := raw["ticket"].(string); ok && ticketData != "" {
		resp.TicketData = []byte(ticketData)
	} else if ticketData, ok := raw["voucher"].(string); ok && ticketData != "" {
		resp.TicketData = []byte(ticketData)
	} else {
		ticketJSON, _ := json.Marshal(raw)
		resp.TicketData = ticketJSON
	}

	if resp.TicketURL == "" && resp.TicketData != nil {
		resp.TicketURL = "embedded"
	}

	return resp
}

func getStringField(data map[string]interface{}, keys ...string) string {
	for _, key := range keys {
		if val, ok := data[key].(string); ok && strings.TrimSpace(val) != "" {
			return strings.TrimSpace(val)
		}
	}
	return ""
}

func toFloat64FromRaw(data map[string]interface{}, keys ...string) (float64, bool) {
	for _, key := range keys {
		if val, ok := data[key]; ok {
			switch v := val.(type) {
			case float64:
				return v, true
			case float32:
				return float64(v), true
			case int:
				return float64(v), true
			case int64:
				return float64(v), true
			case json.Number:
				if f, err := v.Float64(); err == nil {
					return f, true
				}
			case string:
				if f, err := strconv.ParseFloat(strings.TrimSpace(v), 64); err == nil {
					return f, true
				}
			}
		}
	}
	return 0, false
}

func (h *BookingFlowHandler) saveBookingToDB(ctx context.Context, req createBookingRequest, headoutResp headoutBookingResponse) error {
	db := database.GetDB()

	expDate, _ := time.Parse("2006-01-02", req.Date)

	booking := models.Booking{
		BookingID:       headoutResp.BookingID,
		UserID:          req.Email,
		HeadoutReference: headoutResp.HeadoutReference,
		Status:          "CONFIRMED",
		Quantity:        max(1, req.Adults+req.Children),
		TotalPrice:      headoutResp.TotalAmount,
		Currency:        firstNonEmptyString(headoutResp.Currency, "USD"),
		BookingDate:     time.Now(),
		ExperienceDate:  expDate,
		CustomerEmail:   req.Email,
		CustomerPhone:   req.Phone,
		SpecialRequests: req.SpecialRequests,
		IdempotencyKey:  req.IdempotencyKey,
	}

	if err := db.WithContext(ctx).Create(&booking).Error; err != nil {
		return fmt.Errorf("create booking record: %w", err)
	}

	logger.Infof("Booking saved locally: %s (Headout: %s)", headoutResp.BookingID, headoutResp.HeadoutReference)
	return nil
}

func isPastTimedInventorySlot(dateKey string, startDateTime string, now time.Time, todayKey string) bool {
	if dateKey != todayKey {
		return false
	}

	parsed, ok := parseInventoryDateTime(startDateTime)
	if !ok {
		return false
	}

	return parsed.Before(now)
}

func parseInventoryDateTime(value string) (time.Time, bool) {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return time.Time{}, false
	}

	layouts := []string{
		time.RFC3339,
		"2006-01-02T15:04:05",
		"2006-01-02T15:04",
	}

	for _, layout := range layouts {
		if parsed, err := time.Parse(layout, trimmed); err == nil {
			return parsed, true
		}
	}

	return time.Time{}, false
}

func extractMaxBookableQuantityFromItems(items []inventoryItem) *int {
	if len(items) == 0 {
		return nil
	}

	knownLimitKeys := map[string]struct{}{
		"maxQuantity":         {},
		"maxGuests":           {},
		"maxPax":              {},
		"bookingLimit":        {},
		"quantityLimit":       {},
		"maximumParticipants": {},
		"maxBookingQuantity":  {},
	}

	best := 0
	for _, item := range items {
		if item.Raw == nil {
			continue
		}

		if value, found := findNumericByKnownKeys(item.Raw, knownLimitKeys); found {
			candidate := int(math.Round(value))
			if candidate > 0 && (best == 0 || candidate < best) {
				best = candidate
			}
		}

		if personsRaw, ok := item.Raw["pricing"].(map[string]interface{}); ok {
			if people, ok := personsRaw["persons"].([]interface{}); ok {
				for _, person := range people {
					asMap, ok := person.(map[string]interface{})
					if !ok {
						continue
					}
					if paxRange, ok := asMap["paxRange"].(map[string]interface{}); ok {
						if maxRaw, exists := paxRange["max"]; exists {
							if maxValue, ok := toFloat64(maxRaw); ok {
								candidate := int(math.Round(maxValue))
								if candidate > 0 && (best == 0 || candidate < best) {
									best = candidate
								}
							}
						}
					}
				}
			}
		}
	}

	if best <= 0 {
		return nil
	}

	return &best
}