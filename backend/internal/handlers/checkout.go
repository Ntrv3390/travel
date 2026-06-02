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
	emailSvc    *services.EmailService
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

func NewCheckoutHandler(cartService *services.CartService, authService *services.HeadoutProxyService, emailSvc *services.EmailService) *CheckoutHandler {
	return &CheckoutHandler{
		cartService: cartService,
		authService: authService,
		emailSvc:    emailSvc,
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
		result := h.processCartItem(c.Request.Context(), item, sessionID)
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

func (h *CheckoutHandler) processCartItem(ctx context.Context, item services.CartItem, sessionID string) checkoutItemResult {
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

	productID := item.ProductID
	if productID == "" {
		productID = item.ExperienceID
	}

	customers := make([]map[string]interface{}, 0, totalPax)
	for i := 0; i < max(1, item.Adults); i++ {
		inputFields := []map[string]interface{}{
			{"id": "NAME", "value": item.FirstName + " " + item.LastName},
			{"id": "EMAIL", "value": item.Email},
		}
		if item.Phone != "" {
			inputFields = append(inputFields, map[string]interface{}{"id": "PHONE", "value": item.Phone})
		}
		customers = append(customers, map[string]interface{}{
			"personType":  "ADULT",
			"isPrimary":   i == 0,
			"inputFields": inputFields,
		})
	}
	for i := 0; i < item.Children; i++ {
		customers = append(customers, map[string]interface{}{
			"personType": "CHILD",
			"isPrimary":  false,
			"inputFields": []map[string]interface{}{
				{"id": "NAME", "value": item.FirstName + " " + item.LastName},
			},
		})
	}

	totalAmount := item.PriceAmount
	if totalAmount <= 0 {
		totalAmount = 0
	}

	headoutPayload := map[string]interface{}{
		"productId":   productID,
		"variantId":   item.VariantID,
		"inventoryId": inventoryID,
		"customersDetails": map[string]interface{}{
			"count":     totalPax,
			"customers": customers,
		},
		"variantInputFields": []map[string]interface{}{},
		"price": map[string]interface{}{
			"amount":       totalAmount,
			"currencyCode": item.Currency,
		},
	}

	bodyBytes, err := json.Marshal(headoutPayload)
	if err != nil {
		result.Status = "FAILED"
		result.Error = "failed to prepare booking payload"
		return result
	}

	upstream, err := h.authService.Post(ctx, "/v2/bookings/", url.Values{}, bodyBytes, true)
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

	if err := saveCheckoutBooking(ctx, item, headoutResp, sessionID); err != nil {
		logger.Errorf("Checkout: booking created on Headout but local save failed: %v", err)
	}

	ticketText := ""
	if headoutResp.VoucherURL != "" && headoutResp.VoucherURL != "embedded" {
		ticketText = fmt.Sprintf("\nYour ticket is available at: %s", headoutResp.VoucherURL)
	}
	if h.emailSvc != nil {
		h.emailSvc.SendBookingConfirmation(services.BookingConfirmationData{
			BookingID:        headoutResp.BookingID,
			HeadoutReference: headoutResp.HeadoutReference,
			CustomerName:     item.FirstName + " " + item.LastName,
			CustomerEmail:    item.Email,
			ExperienceName:   item.Title,
			ExperienceDate:   item.Date,
			TotalAmount:      headoutResp.TotalAmount,
			Currency:         headoutResp.Currency,
			Quantity:         totalPax,
			TicketURL:        headoutResp.VoucherURL,
			TicketData:       ticketText,
		})
		h.emailSvc.SendBookingAdminNotification(services.BookingAdminNotificationData{
			BookingID:        headoutResp.BookingID,
			HeadoutReference: headoutResp.HeadoutReference,
			CustomerName:     item.FirstName + " " + item.LastName,
			CustomerEmail:    item.Email,
			ExperienceName:   item.Title,
			ExperienceDate:   item.Date,
			TotalAmount:      headoutResp.TotalAmount,
			Currency:         headoutResp.Currency,
			AdminURL:         fmt.Sprintf("http://localhost:3000/admin/bookings?highlight=%s", headoutResp.BookingID),
		})
		if len(headoutResp.TicketData) > 0 {
			h.emailSvc.SendBookingTicket(item.Email, item.FirstName+" "+item.LastName, headoutResp.BookingID, headoutResp.TicketData)
		}
	}

	result.Status = headoutResp.Status
	result.BookingID = headoutResp.BookingID
	result.HeadoutRef = headoutResp.HeadoutReference
	return result
}

func saveCheckoutBooking(ctx context.Context, item services.CartItem, headoutResp headoutBookingResponse, sessionID string) error {
	db := database.GetDB()

	expDate, _ := time.Parse("2006-01-02", item.Date)

	var startDT, endDT time.Time
	if item.StartDateTime != "" {
		startDT, _ = time.Parse("2006-01-02T15:04:05", item.StartDateTime)
	}
	if item.EndDateTime != "" {
		endDT, _ = time.Parse("2006-01-02T15:04:05", item.EndDateTime)
	}

	productID := item.ProductID
	if productID == "" {
		productID = item.ExperienceID
	}

	booking := models.Booking{
		BookingID:          headoutResp.BookingID,
		PartnerReferenceID: headoutResp.PartnerReferenceID,
		SessionID:          sessionID,
		Status:             headoutResp.Status,

		ProductID:   productID,
		ProductName: item.Title,
		VariantID:   item.VariantID,
		VariantName: item.Title,
		InventoryType: item.InventoryType,

		InventoryID:   item.InventoryID,
		StartDateTime: startDT,
		EndDateTime:   endDT,

		CustomerCount: max(1, item.Adults+item.Children),
		Adults:        max(0, item.Adults),
		Children:      max(0, item.Children),
		FirstName:     item.FirstName,
		LastName:      item.LastName,
		Email:         item.Email,
		Phone:         item.Phone,
		CustomerData:  buildCustomerDataJSON(convertItemToReq(item)),
		VariantInputFields: "[]",

		TotalAmount:   headoutResp.TotalAmount,
		CurrencyCode:  firstNonEmptyString(headoutResp.Currency, item.Currency, "USD"),

		HeadoutReference:      headoutResp.HeadoutReference,
		VoucherURL:            headoutResp.VoucherURL,
		Tickets:               "[]",

		ConfirmationEmailSent: true,

		BookingDate:    time.Now(),
		ExperienceDate: expDate,
	}

	if err := db.WithContext(ctx).Create(&booking).Error; err != nil {
		return fmt.Errorf("create booking record: %w", err)
	}

	logger.Infof("Checkout: booking saved locally: %s (Headout: %s)", headoutResp.BookingID, headoutResp.HeadoutReference)
	return nil
}

func convertItemToReq(item services.CartItem) createBookingRequest {
	return createBookingRequest{
		ProductID:   item.ProductID,
		ProductName: item.Title,
		VariantID:   item.VariantID,
		VariantName: item.Title,
		InventoryID: item.InventoryID,
		Date:        item.Date,
		StartDateTime: item.StartDateTime,
		EndDateTime:   item.EndDateTime,
		Adults:      item.Adults,
		Children:    item.Children,
		FirstName:   item.FirstName,
		LastName:    item.LastName,
		Email:       item.Email,
		Phone:       item.Phone,
		CurrencyCode: item.Currency,
		PriceAmount: item.PriceAmount,
	}
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
