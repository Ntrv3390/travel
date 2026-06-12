package handlers

import (
	"context"
	"crypto/rand"
	"encoding/json"
	"fmt"
	"net/http"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/travel/backend/internal/database"
	"github.com/travel/backend/internal/models"
	"github.com/travel/backend/internal/services"
	"github.com/travel/backend/pkg/logger"
	"gorm.io/datatypes"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

var (
	ffCacheMu  sync.RWMutex
	ffCacheVal = true
	ffCacheExp time.Time
)

const ffCacheTTL = 5 * time.Second

// isFetchFresh returns the fetch_fresh setting, cached for 5 s to avoid a DB
// hit on every request. A setting change takes effect within one TTL window.
func isFetchFresh() bool {
	ffCacheMu.RLock()
	if time.Now().Before(ffCacheExp) {
		v := ffCacheVal
		ffCacheMu.RUnlock()
		return v
	}
	ffCacheMu.RUnlock()

	ffCacheMu.Lock()
	defer ffCacheMu.Unlock()
	// Double-check after acquiring write lock.
	if time.Now().Before(ffCacheExp) {
		return ffCacheVal
	}
	var s models.Setting
	val := true
	if err := database.GetDB().Where("key = ?", "fetch_fresh").First(&s).Error; err == nil {
		val = strings.ToLower(strings.TrimSpace(s.Value)) != "false"
	}
	ffCacheVal = val
	ffCacheExp = time.Now().Add(ffCacheTTL)
	return val
}

// effectivePrice returns the best display price for an availability row.
// Prefers the ADULT per-person price, falls back to the base price_amount.
func effectivePrice(avail models.ProductAvailability) float64 {
	if avail.PriceAdult != nil && *avail.PriceAdult > 0 {
		return *avail.PriceAdult
	}
	return avail.PriceAmount
}

// priceForType returns the per-person price for the given guest type from an availability row.
func priceForType(row models.ProductAvailability, pType string) float64 {
	switch strings.ToUpper(strings.TrimSpace(pType)) {
	case "ADULT":
		if row.PriceAdult != nil && *row.PriceAdult > 0 {
			return *row.PriceAdult
		}
	case "CHILD":
		if row.PriceChild != nil && *row.PriceChild > 0 {
			return *row.PriceChild
		}
		if row.PriceAdult != nil && *row.PriceAdult > 0 {
			return *row.PriceAdult
		}
	case "YOUTH":
		if row.PriceYouth != nil && *row.PriceYouth > 0 {
			return *row.PriceYouth
		}
		if row.PriceAdult != nil && *row.PriceAdult > 0 {
			return *row.PriceAdult
		}
	case "INFANT":
		if row.PriceInfant != nil && *row.PriceInfant > 0 {
			return *row.PriceInfant
		}
		return 0 // infants typically free
	case "SENIOR":
		if row.PriceSenior != nil && *row.PriceSenior > 0 {
			return *row.PriceSenior
		}
		if row.PriceAdult != nil && *row.PriceAdult > 0 {
			return *row.PriceAdult
		}
	}
	return row.PriceAmount
}

// resolveVariantIDsFromDB returns the variant IDs to query for a calendar/availability
// request. If variantID is given it is used directly; otherwise all distinct variant IDs
// stored under headoutID in product_availabilities are returned.
func (h *BookingFlowHandler) resolveVariantIDsFromDB(ctx context.Context, variantID, headoutID string) []string {
	ids := make([]string, 0, 4)
	seen := map[string]bool{}
	add := func(id string) {
		id = strings.TrimSpace(id)
		if id != "" && !seen[id] {
			seen[id] = true
			ids = append(ids, id)
		}
	}
	add(variantID)
	if headoutID != "" && variantID == "" {
		var vids []string
		database.GetDB().WithContext(ctx).
			Model(&models.ProductAvailability{}).
			Where("headout_product_id = ?", headoutID).
			Distinct("variant_id").
			Pluck("variant_id", &vids)
		for _, v := range vids {
			add(v)
		}
	}
	return ids
}

// getCalendarFromDB builds calendarDay entries from product_availabilities.
// Returns the ordered days and the resolved variant ID (first variant that has data).
func (h *BookingFlowHandler) getCalendarFromDB(
	ctx context.Context,
	variantIDs []string,
	startDate time.Time,
	days int,
) ([]calendarDay, string) {
	if len(variantIDs) == 0 {
		return buildEmptyCalendar(startDate, days), ""
	}

	today := startOfDay(time.Now())
	todayKey := toDateKey(today)
	endDate := startDate.AddDate(0, 0, days-1)

	var rows []models.ProductAvailability
	database.GetDB().WithContext(ctx).
		Where("variant_id IN ? AND date >= ? AND date <= ? AND remaining_capacity > 0",
			variantIDs, toDateKey(startDate), toDateKey(endDate)).
		Order("date asc, start_time asc").
		Find(&rows)

	// Pre-build empty day map
	dayMap := make(map[string]*calendarDay, days)
	for i := 0; i < days; i++ {
		d := startDate.AddDate(0, 0, i)
		key := toDateKey(d)
		dayMap[key] = &calendarDay{
			Date:         key,
			Label:        d.Format("Mon, Jan 2"),
			Currency:     "USD",
			Availability: "UNAVAILABLE",
			Slots:        []string{},
			IsAvailable:  false,
		}
	}

	resolvedVariantID := ""
	for _, row := range rows {
		if row.Date < todayKey {
			continue
		}
		day, ok := dayMap[row.Date]
		if !ok {
			continue
		}
		if resolvedVariantID == "" {
			resolvedVariantID = row.VariantID
		}

		price := effectivePrice(row)
		if price > 0 && (day.Price == nil || price < *day.Price) {
			p := price
			day.Price = &p
		}
		day.Availability = "LIMITED"
		day.IsAvailable = true
		if row.Currency != "" {
			day.Currency = row.Currency
		}
		// Collect distinct time slots; skip midnight (day-pass products have no specific time)
		if row.StartTime != "" && row.StartTime != "00:00" {
			if !contains(day.Slots, row.StartTime) {
				day.Slots = append(day.Slots, row.StartTime)
			}
		}
	}

	result := make([]calendarDay, 0, days)
	for i := 0; i < days; i++ {
		key := toDateKey(startDate.AddDate(0, 0, i))
		day := dayMap[key]
		sort.Strings(day.Slots)
		if day.Price != nil {
			label := formatMoney(*day.Price, day.Currency)
			day.PriceLabel = &label
		}
		result = append(result, *day)
	}
	return result, resolvedVariantID
}

func buildEmptyCalendar(startDate time.Time, days int) []calendarDay {
	result := make([]calendarDay, days)
	for i := range result {
		d := startDate.AddDate(0, 0, i)
		result[i] = calendarDay{
			Date:         toDateKey(d),
			Label:        d.Format("Mon, Jan 2"),
			Currency:     "USD",
			Availability: "UNAVAILABLE",
			Slots:        []string{},
			IsAvailable:  false,
		}
	}
	return result
}

// getAvailabilityFromDB returns all bookable slots for a variant on a given date from DB.
func (h *BookingFlowHandler) getAvailabilityFromDB(
	ctx context.Context,
	variantID, date string,
) ([]availabilitySlot, *int) {
	var rows []models.ProductAvailability
	database.GetDB().WithContext(ctx).
		Where("variant_id = ? AND date = ? AND remaining_capacity > 0", variantID, date).
		Order("start_time asc").
		Find(&rows)

	now := time.Now()
	todayKey := toDateKey(startOfDay(now))

	slots := make([]availabilitySlot, 0, len(rows))
	maxBookable := 0

	for _, row := range rows {
		// Filter out past time slots when date is today
		if row.Date == todayKey && row.StartTime != "" && row.StartTime != "00:00" {
			startDT := row.Date + "T" + row.StartTime + ":00"
			if isPastTimedInventorySlot(row.Date, startDT, now, todayKey) {
				continue
			}
		}

		price := effectivePrice(row)
		var pricePtr *float64
		if price > 0 {
			pricePtr = &price
		}

		startDT := row.Date + "T00:00:00"
		if row.StartTime != "" {
			startDT = row.Date + "T" + row.StartTime + ":00"
		}
		endDT := ""
		if row.EndTime != "" {
			endDT = row.Date + "T" + row.EndTime + ":00"
		}

		var slotPtr *string
		if row.StartTime != "" && row.StartTime != "00:00" {
			s := row.StartTime
			slotPtr = &s
		}

		cap := row.RemainingCapacity
		slots = append(slots, availabilitySlot{
			InventoryID:    row.InventoryID,
			StartDateTime:  startDT,
			EndDateTime:    endDT,
			Slot:           slotPtr,
			Availability:   "LIMITED",
			Price:          pricePtr,
			Currency:       firstNonEmptyString(row.Currency, "USD"),
			SeatsAvailable: &cap,
		})

		if row.RemainingCapacity > maxBookable {
			maxBookable = row.RemainingCapacity
		}
	}

	if maxBookable == 0 {
		return slots, nil
	}
	return slots, &maxBookable
}

// verifyPriceFromDB calculates the expected total from product_availabilities per-person
// pricing and sets req.PriceAmount / req.CurrencyCode.
func (h *BookingFlowHandler) verifyPriceFromDB(ctx context.Context, req *createBookingRequest) error {
	q := database.GetDB().WithContext(ctx).
		Where("variant_id = ? AND date = ?", req.VariantID, req.Date)
	if req.InventoryID != "" {
		q = q.Where("inventory_id = ?", req.InventoryID)
	}
	var row models.ProductAvailability
	if err := q.First(&row).Error; err != nil {
		return fmt.Errorf("slot not found in database for variant %s on %s", req.VariantID, req.Date)
	}

	counts := buildGuestCounts(req.GuestCounts, req.Adults, req.Children)
	total := 0.0
	for pType, count := range counts {
		if count <= 0 {
			continue
		}
		total += priceForType(row, pType) * float64(count)
	}
	if total <= 0 {
		total = row.PriceAmount
	}

	req.PriceAmount = total
	req.CurrencyCode = firstNonEmptyString(row.Currency, "USD")
	return nil
}

// createLocalBookingTx creates a booking in local_bookings using SELECT FOR UPDATE on
// the availability row to prevent oversell. Returns HTTP 409 details in the error message
// when capacity is insufficient.
func (h *BookingFlowHandler) createLocalBookingTx(
	ctx context.Context,
	req createBookingRequest,
	totalPax int,
) (*models.LocalBooking, error) {
	var localBooking models.LocalBooking

	err := database.GetDB().WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var avail models.ProductAvailability
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			Where("variant_id = ? AND date = ? AND inventory_id = ?", req.VariantID, req.Date, req.InventoryID).
			First(&avail).Error; err != nil {
			return fmt.Errorf("slot not found: %w", err)
		}

		if avail.RemainingCapacity < totalPax {
			return fmt.Errorf("insufficient capacity: %d available, %d requested",
				avail.RemainingCapacity, totalPax)
		}

		if err := tx.Model(&models.ProductAvailability{}).
			Where("id = ?", avail.ID).
			Update("remaining_capacity", gorm.Expr("remaining_capacity - ?", totalPax)).Error; err != nil {
			return fmt.Errorf("capacity update: %w", err)
		}

		startTime := avail.StartTime
		if req.StartDateTime != "" && strings.Contains(req.StartDateTime, "T") {
			parts := strings.SplitN(req.StartDateTime, "T", 2)
			if len(parts) == 2 && len(parts[1]) >= 5 {
				startTime = parts[1][:5]
			}
		}

		guestCountsJSON, _ := json.Marshal(req.GuestCounts)
		avID := avail.ID
		localBooking = models.LocalBooking{
			BookingRef:       generateBookingRef(),
			HeadoutProductID: req.ProductID,
			ProductName:      req.ProductName,
			VariantID:        req.VariantID,
			VariantName:      req.VariantName,
			AvailabilityID:   &avID,
			Date:             req.Date,
			StartTime:        startTime,
			TotalPax:         totalPax,
			GuestCounts:      datatypes.JSON(guestCountsJSON),
			FirstName:        req.FirstName,
			LastName:         req.LastName,
			Email:            req.Email,
			Phone:            req.Phone,
			SpecialRequests:  req.SpecialRequests,
			TotalAmount:      req.PriceAmount,
			CurrencyCode:     firstNonEmptyString(req.CurrencyCode, "USD"),
			Status:           "CONFIRMED",
			IdempotencyKey:   req.IdempotencyKey,
		}
		return tx.Create(&localBooking).Error
	})

	if err != nil {
		return nil, err
	}
	return &localBooking, nil
}

// handleDBBooking is the CreateBooking path when fetch_fresh=false.
// Zero Headout API calls are made.
func (h *BookingFlowHandler) handleDBBooking(c *gin.Context, req createBookingRequest) {
	// Normalise totalPax / guestCounts
	totalPax := 0
	if len(req.GuestCounts) > 0 {
		for _, count := range req.GuestCounts {
			totalPax += count
		}
	} else {
		totalPax = req.Adults + req.Children
	}
	if totalPax < 1 {
		totalPax = 1
	}
	if len(req.GuestCounts) == 0 {
		req.GuestCounts = map[string]int{"ADULT": max(1, req.Adults)}
		if req.Children > 0 {
			req.GuestCounts["CHILD"] = req.Children
		}
	}

	// Idempotency against local_bookings
	if req.IdempotencyKey != "" {
		var existing models.LocalBooking
		if err := database.GetDB().WithContext(c.Request.Context()).
			Where("idempotency_key = ?", req.IdempotencyKey).First(&existing).Error; err == nil {
			startDT := existing.Date + "T00:00:00"
			if existing.StartTime != "" && existing.StartTime != "00:00" {
				startDT = existing.Date + "T" + existing.StartTime + ":00"
			}
			c.JSON(http.StatusOK, bookingResponse{
				BookingID:             existing.BookingRef,
				PartnerReferenceID:    existing.BookingRef,
				Status:                existing.Status,
				StartDateTime:         startDT,
				TotalAmount:           existing.TotalAmount,
				Currency:              existing.CurrencyCode,
				ConfirmationEmailSent: existing.ConfirmationSent,
			})
			return
		}
	}

	// Price from DB (no Headout call)
	if err := h.verifyPriceFromDB(c.Request.Context(), &req); err != nil {
		logger.Warnf("DB price verify failed variant=%s date=%s: %v", req.VariantID, req.Date, err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "selected slot is no longer available"})
		return
	}

	// Transactional booking + capacity decrement
	localBooking, err := h.createLocalBookingTx(c.Request.Context(), req, totalPax)
	if err != nil {
		switch {
		case strings.Contains(err.Error(), "insufficient capacity"):
			c.JSON(http.StatusConflict, gin.H{"error": "no availability for selected slot"})
		case strings.Contains(err.Error(), "slot not found"):
			c.JSON(http.StatusBadRequest, gin.H{"error": "selected slot is no longer available"})
		default:
			logger.Errorf("Local booking creation failed: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "booking failed, please try again"})
		}
		return
	}

	// Async email — fire-and-forget
	go func() {
		if h.emailSvc == nil {
			return
		}
		_ = h.emailSvc.SendBookingConfirmation(services.BookingConfirmationData{
			BookingID:        localBooking.BookingRef,
			HeadoutReference: localBooking.BookingRef,
			CustomerName:     req.FirstName + " " + req.LastName,
			CustomerEmail:    req.Email,
			ExperienceName:   req.ProductName,
			ExperienceDate:   req.Date,
			TotalAmount:      localBooking.TotalAmount,
			Currency:         localBooking.CurrencyCode,
			Quantity:         totalPax,
		})
		_ = h.emailSvc.SendBookingAdminNotification(services.BookingAdminNotificationData{
			BookingID:        localBooking.BookingRef,
			HeadoutReference: localBooking.BookingRef,
			CustomerName:     req.FirstName + " " + req.LastName,
			CustomerEmail:    req.Email,
			ExperienceName:   req.ProductName,
			ExperienceDate:   req.Date,
			TotalAmount:      localBooking.TotalAmount,
			Currency:         localBooking.CurrencyCode,
			AdminURL: fmt.Sprintf("http://localhost:3000/admin/bookings?highlight=%s",
				localBooking.BookingRef),
		})
		database.GetDB().Model(&models.LocalBooking{}).
			Where("id = ?", localBooking.ID).
			Update("confirmation_sent", true)
	}()

	startDT := localBooking.Date + "T00:00:00"
	if localBooking.StartTime != "" && localBooking.StartTime != "00:00" {
		startDT = localBooking.Date + "T" + localBooking.StartTime + ":00"
	}

	c.JSON(http.StatusOK, bookingResponse{
		BookingID:             localBooking.BookingRef,
		PartnerReferenceID:    localBooking.BookingRef,
		Status:                "CONFIRMED",
		StartDateTime:         startDT,
		TotalAmount:           localBooking.TotalAmount,
		Currency:              localBooking.CurrencyCode,
		VoucherURL:            "",
		ConfirmationEmailSent: true,
	})
}

// generateBookingRef generates a unique local booking reference, e.g. "TZ-X7K9M2PQRS".
func generateBookingRef() string {
	const charset = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
	b := make([]byte, 10)
	if _, err := rand.Read(b); err != nil {
		return fmt.Sprintf("TZ-%d", time.Now().UnixNano())
	}
	result := make([]byte, 10)
	for i, v := range b {
		result[i] = charset[int(v)%len(charset)]
	}
	return "TZ-" + string(result)
}
