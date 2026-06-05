package services

import (
	"context"
	"encoding/json"
	"fmt"
	"net/url"
	"time"

	"github.com/travel/backend/internal/database"
	"github.com/travel/backend/internal/models"
	"github.com/travel/backend/pkg/config"
	"github.com/travel/backend/pkg/logger"
	"gorm.io/gorm"
)

type AvailabilitySyncService struct {
	headoutProxy *HeadoutProxyService
	db           *gorm.DB
}

func NewAvailabilitySyncService(cfg *config.Config) *AvailabilitySyncService {
	return &AvailabilitySyncService{
		headoutProxy: NewHeadoutProxyService(cfg),
		db:           database.GetDB(),
	}
}

type AvailabilitySyncResult struct {
	TotalProducts    int `json:"total_products"`
	Available        int `json:"available"`
	Unavailable      int `json:"unavailable"`
	Failed           int `json:"failed"`
	AvailabilitiesAdded int `json:"availabilities_added"`
}

// SyncAllProductAvailability runs through all products and checks if they have
// availability in the upcoming days. Marks products accordingly.
func (s *AvailabilitySyncService) SyncAllProductAvailability(ctx context.Context) (*AvailabilitySyncResult, error) {
	result := &AvailabilitySyncResult{}

	var products []models.Product
	if err := s.db.Find(&products).Error; err != nil {
		return nil, fmt.Errorf("fetch products: %w", err)
	}

	result.TotalProducts = len(products)
	logger.Infof("Starting availability sync for %d products", len(products))

	syncStart := time.Now()
	workWindow := 5 * time.Minute
	cooldownDuration := 1 * time.Minute
	interRequestDelay := 3 * time.Second

	for i, product := range products {
		// Rate limit: 3s between requests, 1min cooldown every 5min
		if i > 0 {
			time.Sleep(interRequestDelay)
		}
		if i > 0 && time.Since(syncStart) >= workWindow {
			logger.Infof("Availability sync cooldown: pausing for %v after %v of work", cooldownDuration, workWindow)
			time.Sleep(cooldownDuration)
			syncStart = time.Now()
		}

		available, err := s.syncProductAvailability(ctx, product)
		if err != nil {
			logger.Warnf("Failed to sync availability for product %s (%s): %v", product.Title, product.HeadoutID, err)
			result.Failed++
			continue
		}

		now := time.Now()
		if err := s.db.Model(&models.Product{}).Where("id = ?", product.ID).Updates(map[string]interface{}{
			"is_available":                available,
			"last_availability_sync_at": now,
		}).Error; err != nil {
			logger.Warnf("Failed to update availability for product %s: %v", product.HeadoutID, err)
			result.Failed++
			continue
		}

		if available {
			result.Available++
		} else {
			result.Unavailable++
		}
	}

	logger.Infof("Availability sync complete: %d available, %d unavailable, %d failed",
		result.Available, result.Unavailable, result.Failed)

	return result, nil
}

// SyncSingleProductAvailability syncs availability for a single product and returns whether it's available.
func (s *AvailabilitySyncService) SyncSingleProductAvailability(ctx context.Context, product models.Product) (bool, error) {
	return s.syncProductAvailability(ctx, product)
}

// syncProductAvailability fetches variants and their availabilities for a product
// and returns true if any availability exists in the upcoming days.
func (s *AvailabilitySyncService) syncProductAvailability(ctx context.Context, product models.Product) (bool, error) {
	// Fetch product detail to get variants
	path := fmt.Sprintf("/v2/products/%s/", url.PathEscape(product.HeadoutID))
	resp, err := s.headoutProxy.Get(ctx, path, nil, true)
	if err != nil {
		return false, fmt.Errorf("fetch product detail: %w", err)
	}

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return false, fmt.Errorf("headout returned %d for product %s", resp.StatusCode, product.HeadoutID)
	}

	var pData map[string]interface{}
	if err := json.Unmarshal(resp.Body, &pData); err != nil {
		return false, fmt.Errorf("parse product response: %w", err)
	}

	// Extract variants
	variants, _ := pData["variants"].([]interface{})
	if len(variants) == 0 {
		// No variants means no availability
		return false, nil
	}

	// Check each variant for upcoming availability
	startDate := time.Now().UTC().Format("2006-01-02")
	endDate := time.Now().UTC().AddDate(0, 0, 30).Format("2006-01-02") // Check next 30 days

	productAvailable := false

	for _, v := range variants {
		variant, ok := v.(map[string]interface{})
		if !ok {
			continue
		}

		variantID := extractStringFromMap(variant, "id")
		if variantID == "" {
			continue
		}

		variantTitle := extractStringFromMap(variant, "title")
		if variantTitle == "" {
			variantTitle = extractStringFromMap(variant, "name")
		}

		// Fetch availabilities for this variant
		availPath := fmt.Sprintf("/v2/products/%s/variants/%s/availabilities/", url.PathEscape(product.HeadoutID), url.PathEscape(variantID))
		availQuery := url.Values{}

		availResp, err := s.headoutProxy.Get(ctx, availPath, availQuery, true)
		if err != nil {
			logger.Warnf("Failed to fetch availabilities for variant %s: %v", variantID, err)
			continue
		}

		var availBody struct {
			Availabilities []json.RawMessage `json:"availabilities"`
			Data           *struct {
				Availabilities []json.RawMessage `json:"availabilities"`
			} `json:"data"`
		}
		if err := json.Unmarshal(availResp.Body, &availBody); err != nil {
			// Try alternate response format
			var altBody struct {
				Slots []json.RawMessage `json:"slots"`
				Items []json.RawMessage `json:"items"`
			}
			if err2 := json.Unmarshal(availResp.Body, &altBody); err2 != nil {
				logger.Warnf("Failed to parse availability response for variant %s: %v", variantID, err)
				continue
			}
			// Merge alternate formats
			if len(altBody.Slots) > 0 {
				availBody.Availabilities = append(availBody.Availabilities, altBody.Slots...)
			}
			if len(altBody.Items) > 0 {
				availBody.Availabilities = append(availBody.Availabilities, altBody.Items...)
			}
		}

		// Handle nested data wrapper
		if len(availBody.Availabilities) == 0 && availBody.Data != nil {
			availBody.Availabilities = availBody.Data.Availabilities
		}

		variantHasAvailability := false

		for _, rawSlot := range availBody.Availabilities {
			var slotData map[string]interface{}
			if err := json.Unmarshal(rawSlot, &slotData); err != nil {
				continue
			}

			// Check if this slot has availability in the upcoming period
			slotDate := extractStringFromMap(slotData, "date")
			if slotDate == "" {
				// Try extracting from startDateTime
				startDT := extractStringFromMap(slotData, "startDateTime", "start_time")
				if len(startDT) >= 10 {
					slotDate = startDT[:10]
				}
			}

			if slotDate == "" {
				continue
			}

			// Check if the date is in the future and within our window
			if slotDate >= startDate && slotDate <= endDate {
				// Check if there are available slots
				availableSlots := extractFloatFromMap(slotData, "availableSlots", "available_slots", "available", "remainingInventory", "remaining", "seatsAvailable", "availableCapacity")
				availabilityStatus := extractStringFromMap(slotData, "availability", "status")

				// Consider available if slots > 0 or status is not CLOSED/SOLD_OUT
				if availableSlots > 0 || (availabilityStatus != "CLOSED" && availabilityStatus != "SOLD_OUT" && availabilityStatus != "UNAVAILABLE") {
					variantHasAvailability = true

					// Sync all available slots locally (not just the first one)
					s.upsertAvailabilityRecord(ctx, product, variantID, variantTitle, slotData)
				}
			}
		}

		if variantHasAvailability {
			productAvailable = true
		}
	}

	return productAvailable, nil
}

// upsertAvailabilityRecord saves or updates a single availability record in the local DB
func (s *AvailabilitySyncService) upsertAvailabilityRecord(ctx context.Context, product models.Product, variantID, variantTitle string, slotData map[string]interface{}) {
	date := extractStringFromMap(slotData, "date")
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
		priceAmount = extractFloatFromMap(pricing, "amount", "price", "headoutSellingPrice", "netPrice")
	}

	slotCurrency := product.Currency
	if pricing, ok := slotData["pricing"].(map[string]interface{}); ok {
		if c := extractStringFromMap(pricing, "currency", "currencyCode"); c != "" {
			slotCurrency = c
		}
	}

	availableSlots := int(extractFloatFromMap(slotData, "availableSlots", "available_slots", "available", "remainingInventory", "remaining", "seatsAvailable"))

	// If no numeric slot count found, derive from availability status
	if availableSlots == 0 {
		availStatus := extractStringFromMap(slotData, "availability", "status")
		switch availStatus {
		case "UNLIMITED":
			availableSlots = 999
		case "LIMITED":
			availableSlots = 1
		}
	}

	availRawJSON, _ := json.Marshal(slotData)

	var existing models.ProductAvailability
	availErr := s.db.WithContext(ctx).Where("product_id = ? AND variant_id = ? AND date = ? AND start_time = ?",
		product.ID, variantID, date, startTime).First(&existing).Error

	if availErr == gorm.ErrRecordNotFound {
		avail := models.ProductAvailability{
			ProductID:        product.ID,
			HeadoutProductID: product.HeadoutID,
			VariantID:        variantID,
			VariantTitle:     variantTitle,
			Date:             date,
			StartTime:        startTime,
			EndTime:          endTime,
			InventoryID:      inventoryID,
			InventoryType:    inventoryType,
			PriceAmount:      priceAmount,
			Currency:         slotCurrency,
			AvailableSlots:   availableSlots,
			RawHeadoutData:   availRawJSON,
		}
		s.db.WithContext(ctx).Create(&avail)
	} else if availErr == nil {
		existing.HeadoutProductID = product.HeadoutID
		existing.VariantTitle = variantTitle
		existing.EndTime = endTime
		existing.InventoryID = inventoryID
		existing.InventoryType = inventoryType
		existing.PriceAmount = priceAmount
		existing.Currency = slotCurrency
		existing.AvailableSlots = availableSlots
		existing.RawHeadoutData = availRawJSON
		s.db.WithContext(ctx).Save(&existing)
	}
}

// extractStringFromMap extracts a string value from a map using multiple possible keys
func extractStringFromMap(data map[string]interface{}, keys ...string) string {
	for _, key := range keys {
		if val, ok := data[key]; ok {
			switch v := val.(type) {
			case string:
				return v
			case float64:
				return fmt.Sprintf("%.0f", v)
			case json.Number:
				return v.String()
			}
		}
	}
	return ""
}

// extractFloatFromMap extracts a float value from a map using multiple possible keys
func extractFloatFromMap(data map[string]interface{}, keys ...string) float64 {
	for _, key := range keys {
		if val, ok := data[key]; ok {
			switch v := val.(type) {
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
