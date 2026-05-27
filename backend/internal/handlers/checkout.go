package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/travel/backend/internal/database"
	"github.com/travel/backend/internal/models"
	"github.com/travel/backend/internal/services"
	"github.com/travel/backend/pkg/logger"
)

type CheckoutHandler struct {
	cartService *services.CartService
	authService *services.HeadoutProxyService
}

type checkoutItemResult struct {
	ItemID     string `json:"itemId"`
	Title      string `json:"title"`
	BookingID  string `json:"bookingId,omitempty"`
	HeadoutRef string `json:"headoutReference,omitempty"`
	Status     string `json:"status"`
	Error      string `json:"error,omitempty"`
}

type checkoutResponse struct {
	Success bool                `json:"success"`
	Results []checkoutItemResult `json:"results"`
}

func NewCheckoutHandler(cartService *services.CartService, authService *services.HeadoutProxyService) *CheckoutHandler {
	return &CheckoutHandler{
		cartService: cartService,
		authService: authService,
	}
}

func (h *CheckoutHandler) Checkout(c *gin.Context) {
	sessionID := resolveSessionID(c)

	cart, err := h.cartService.GetCart(c.Request.Context(), sessionID)
	if err != nil {
		cart = h.cartService.GetOrCreateCart(sessionID)
	}

	if len(cart.Items) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "cart is empty"})
		return
	}

	results := make([]checkoutItemResult, 0, len(cart.Items))
	allSucceeded := true

	for _, item := range cart.Items {
		result := h.processCartItem(c.Request.Context(), item)
		if result.Error != "" {
			allSucceeded = false
		}
		results = append(results, result)
	}

	if allSucceeded && len(results) > 0 {
		if err := h.cartService.ClearCart(c.Request.Context(), sessionID); err != nil {
			logger.Warnf("Checkout: failed to clear cart for session %s: %v", sessionID, err)
		}
	}

	c.JSON(http.StatusOK, checkoutResponse{
		Success: allSucceeded,
		Results: results,
	})
}

func (h *CheckoutHandler) processCartItem(ctx context.Context, item services.CartItem) checkoutItemResult {
	result := checkoutItemResult{
		ItemID: item.ID,
		Title:  item.Title,
	}

	inventoryID := strings.TrimSpace(item.InventoryID)
	if inventoryID == "" {
		resolvedID, err := h.resolveInventoryID(ctx, item.VariantID, item.Date)
		if err != nil {
			result.Status = "FAILED"
			result.Error = fmt.Sprintf("inventory not available: %v", err)
			return result
		}
		inventoryID = resolvedID
	}

	totalPax := item.Adults + item.Children
	if totalPax < 1 {
		totalPax = 1
	}

	customers := make([]map[string]interface{}, 0, totalPax)
	for i := 0; i < max(1, item.Adults); i++ {
		customer := map[string]interface{}{
			"personType": "ADULT",
			"isPrimary":  i == 0,
			"inputFields": []map[string]interface{}{
				{"id": "FIRST_NAME", "value": item.FirstName},
				{"id": "LAST_NAME", "value": item.LastName},
				{"id": "EMAIL", "value": item.Email},
			},
		}
		if item.Phone != "" {
			customer["inputFields"] = append(customer["inputFields"].([]map[string]interface{}),
				map[string]interface{}{"id": "PHONE_NUMBER", "value": item.Phone})
		}
		customers = append(customers, customer)
	}
	for i := 0; i < item.Children; i++ {
		customers = append(customers, map[string]interface{}{
			"personType": "CHILD",
			"isPrimary":  false,
			"inputFields": []map[string]interface{}{
				{"id": "FIRST_NAME", "value": item.FirstName},
				{"id": "LAST_NAME", "value": item.LastName},
			},
		})
	}

	headoutPayload := map[string]interface{}{
		"variantId":   item.VariantID,
		"inventoryId": inventoryID,
		"customersDetails": map[string]interface{}{
			"count":     totalPax,
			"customers": customers,
		},
		"variantInputFields": []map[string]interface{}{},
	}

	bodyBytes, err := json.Marshal(headoutPayload)
	if err != nil {
		result.Status = "FAILED"
		result.Error = "failed to prepare booking payload"
		return result
	}

	upstream, err := h.authService.Post(ctx, "/v1/booking", url.Values{}, bodyBytes, true)
	if err != nil {
		result.Status = "FAILED"
		result.Error = err.Error()
		return result
	}

	if upstream.StatusCode < 200 || upstream.StatusCode >= 300 {
		result.Status = "FAILED"
		result.Error = fmt.Sprintf("headout returned status %d", upstream.StatusCode)
		return result
	}

	headoutResp := parseHeadoutBookingResponse(upstream.Body)

	if err := saveCheckoutBooking(ctx, item, headoutResp); err != nil {
		logger.Errorf("Checkout: booking created on Headout but local save failed: %v", err)
	}

	ticketText := ""
	if headoutResp.TicketURL != "" && headoutResp.TicketURL != "embedded" {
		ticketText = fmt.Sprintf("\nYour ticket is available at: %s", headoutResp.TicketURL)
	}
	services.SendBookingConfirmation(services.BookingConfirmationData{
		BookingID:        headoutResp.BookingID,
		HeadoutReference: headoutResp.HeadoutReference,
		CustomerName:     item.FirstName + " " + item.LastName,
		CustomerEmail:    item.Email,
		ExperienceName:   item.Title,
		ExperienceDate:   item.Date,
		TotalAmount:      headoutResp.TotalAmount,
		Currency:         headoutResp.Currency,
		Quantity:         totalPax,
		TicketURL:        headoutResp.TicketURL,
		TicketData:       ticketText,
	})
	if len(headoutResp.TicketData) > 0 {
		services.SendBookingTicket(item.Email, item.FirstName+" "+item.LastName, headoutResp.BookingID, headoutResp.TicketData)
	}

	result.Status = "CONFIRMED"
	result.BookingID = headoutResp.BookingID
	result.HeadoutRef = headoutResp.HeadoutReference
	return result
}

func (h *CheckoutHandler) resolveInventoryID(ctx context.Context, variantID string, dateStr string) (string, error) {
	parsedDate, err := time.Parse("2006-01-02", dateStr)
	if err != nil {
		return "", fmt.Errorf("invalid date: %w", err)
	}

	items, err := h.fetchInventoryByVariant(ctx, variantID, parsedDate, parsedDate)
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

func (h *CheckoutHandler) fetchInventoryByVariant(ctx context.Context, variantID string, startDate time.Time, endDate time.Time) ([]inventoryItem, error) {
	query := url.Values{}
	query.Set("variantId", variantID)
	query.Set("startDateTime", toDateKey(startDate)+defaultInventoryFrom)
	query.Set("endDateTime", toDateKey(endDate)+defaultInventoryTo)

	upstream, err := h.authService.Get(ctx, "/v1/inventory/list-by/variant", query, true)
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

func saveCheckoutBooking(ctx context.Context, item services.CartItem, headoutResp headoutBookingResponse) error {
	db := database.GetDB()

	expDate, _ := time.Parse("2006-01-02", item.Date)

	booking := models.Booking{
		BookingID:       headoutResp.BookingID,
		UserID:          item.Email,
		HeadoutReference: headoutResp.HeadoutReference,
		Status:          "CONFIRMED",
		Quantity:        max(1, item.Adults+item.Children),
		TotalPrice:      headoutResp.TotalAmount,
		Currency:        firstNonEmptyString(headoutResp.Currency, "USD"),
		BookingDate:     time.Now(),
		ExperienceDate:  expDate,
		CustomerEmail:   item.Email,
		CustomerPhone:   item.Phone,
	}

	if err := db.WithContext(ctx).Create(&booking).Error; err != nil {
		return fmt.Errorf("create booking record: %w", err)
	}

	logger.Infof("Checkout: booking saved locally: %s (Headout: %s)", headoutResp.BookingID, headoutResp.HeadoutReference)
	return nil
}
