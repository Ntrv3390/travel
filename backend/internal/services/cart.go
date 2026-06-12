package services

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/travel/backend/internal/models"
	"github.com/travel/backend/pkg/logger"
	"gorm.io/gorm"
)

type CartItem struct {
	ID            string  `json:"id"`
	ExperienceID  string  `json:"experienceId"`
	ProductID     string  `json:"productId,omitempty"`
	VariantID     string  `json:"variantId"`
	InventoryID      string   `json:"inventoryId,omitempty"`
	InventoryType    string   `json:"inventoryType,omitempty"`
	InventorySeatIDs []string `json:"inventorySeatIds,omitempty"`
	Date          string  `json:"date"`
	StartDateTime string  `json:"startDateTime,omitempty"`
	EndDateTime   string  `json:"endDateTime,omitempty"`
	Adults        int     `json:"adults"`
	Children      int     `json:"children"`
	GuestCounts   map[string]int `json:"guestCounts,omitempty"`
	FirstName     string  `json:"firstName,omitempty"`
	LastName      string  `json:"lastName,omitempty"`
	Email         string  `json:"email,omitempty"`
	Phone         string  `json:"phone,omitempty"`
	PriceAmount   float64 `json:"priceAmount,omitempty"`
	Currency      string  `json:"currency,omitempty"`
	Title         string  `json:"title,omitempty"`
	ImageURL      string  `json:"imageUrl,omitempty"`
	InputFields   []map[string]interface{} `json:"inputFields,omitempty"`
	PaxMin        int     `json:"paxMin,omitempty"`
	PaxMax        int     `json:"paxMax,omitempty"`
	OriginalPriceAmount float64 `json:"originalPriceAmount,omitempty"`
	OriginalCurrency    string  `json:"originalCurrency,omitempty"`
	IdempotencyKey      string  `json:"-"`
	AddedAt       string  `json:"addedAt"`
}

type Cart struct {
	ID        string     `json:"id"`
	SessionID string     `json:"sessionId"`
	AuthType  string     `json:"authType"`
	ExpiresAt string     `json:"expiresAt"`
	Items     []CartItem `json:"items"`
	CreatedAt string     `json:"createdAt"`
	UpdatedAt string     `json:"updatedAt"`
}

type CartService struct {
	db *gorm.DB
}

func NewCartService(db *gorm.DB) *CartService {
	return &CartService{db: db}
}

func (s *CartService) GetOrCreateCart(sessionID string, authType ...string) *Cart {
	sessionID = sanitizeSessionID(sessionID)
	if sessionID == "" {
		sessionID = uuid.New().String()
	}

	var model models.Cart
	err := s.db.Where("session_id = ? AND expires_at > ?", sessionID, time.Now()).Preload("Items").First(&model).Error
	if err == nil {
		return s.modelToCart(&model)
	}

	now := time.Now()
	at := "anonymous"
	if len(authType) > 0 && authType[0] == "user" {
		at = "user"
	}
	expiresAt := now.Add(15 * 24 * time.Hour)
	if at == "user" {
		expiresAt = now.Add(60 * 24 * time.Hour)
	}

	// If a cart row exists for the session but has expired, revive it instead of failing due to unique session index.
	if err := s.db.Where("session_id = ?", sessionID).First(&model).Error; err == nil {
		model.ExpiresAt = expiresAt
		if model.AuthType == "" {
			model.AuthType = at
		}
		model.UpdatedAt = now
		if err := s.db.Save(&model).Error; err == nil {
			return s.modelToCart(&model)
		}
	}

	model = models.Cart{
		SessionID: sessionID,
		AuthType:  at,
		ExpiresAt: expiresAt,
		CreatedAt: now,
		UpdatedAt: now,
	}
	if err := s.db.Create(&model).Error; err != nil {
		logger.Errorf("Failed to create cart for session %s: %v", sessionID, err)
		return &Cart{
			ID:        uuid.New().String(),
			SessionID: sessionID,
			Items:     []CartItem{},
			CreatedAt: now.Format(time.RFC3339),
			UpdatedAt: now.Format(time.RFC3339),
		}
	}

	return s.modelToCart(&model)
}

func (s *CartService) AddItem(ctx context.Context, sessionID string, item CartItem) (*Cart, error) {
	sessionID = sanitizeSessionID(sessionID)

	if item.VariantID == "" {
		return nil, fmt.Errorf("variantId is required")
	}
	if item.Date == "" {
		return nil, fmt.Errorf("date is required")
	}

	var cart *Cart
	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var model models.Cart
		if err := tx.Where("session_id = ? AND expires_at > ?", sessionID, time.Now()).First(&model).Error; err != nil {
			return fmt.Errorf("cart not found for session: %s", sessionID)
		}

		itemID := uuid.New().String()
		cartItem := models.CartItem{
			CartID:           model.ID,
			UUID:             itemID,
			ExperienceID:     item.ExperienceID,
			ProductID:        item.ProductID,
			VariantID:        item.VariantID,
			InventoryID:      item.InventoryID,
			InventoryType:    item.InventoryType,
			InventorySeatIDs: encodeSeatIDs(item.InventorySeatIDs),
			Date:             item.Date,
			StartDateTime:    item.StartDateTime,
			EndDateTime:      item.EndDateTime,
			Adults:           item.Adults,
			Children:         item.Children,
			GuestCounts:      encodeGuestCounts(item.GuestCounts),
			FirstName:        item.FirstName,
			LastName:         item.LastName,
			Email:            item.Email,
			Phone:            item.Phone,
			PriceAmount:      item.PriceAmount,
			Currency:         item.Currency,
			Title:            item.Title,
			ImageURL:         item.ImageURL,
			InputFields:      encodeInputFields(item.InputFields),
			PaxMin:           item.PaxMin,
			PaxMax:           item.PaxMax,
			OriginalPriceAmount: item.OriginalPriceAmount,
			OriginalCurrency:    item.OriginalCurrency,
		}

		if err := tx.Create(&cartItem).Error; err != nil {
			return fmt.Errorf("failed to add item: %w", err)
		}

		if err := tx.Model(&model).Update("updated_at", time.Now()).Error; err != nil {
			return fmt.Errorf("failed to update cart timestamp: %w", err)
		}

		tx.Preload("Items").First(&model, model.ID)
		cart = s.modelToCart(&model)
		return nil
	})
	if err != nil {
		return nil, err
	}

	logger.Infof("Cart %s: added item %s (variant: %s, date: %s)", sessionID, cart.Items[0].ID, item.VariantID, item.Date)
	return cart, nil
}

func (s *CartService) UpdateItem(ctx context.Context, sessionID string, itemID string, updates map[string]interface{}) (*Cart, error) {
	sessionID = sanitizeSessionID(sessionID)

	updateMap := make(map[string]interface{})

	if gc, ok := updates["guestCounts"]; ok {
		switch v := gc.(type) {
		case map[string]interface{}:
			counts := make(map[string]int)
			for k, val := range v {
				if f, ok := val.(float64); ok {
					counts[k] = int(f)
				}
			}
			updateMap["guest_counts"] = encodeGuestCounts(counts)
		}
	}

	if adults, ok := updates["adults"]; ok {
		if v, ok := adults.(float64); ok {
			updateMap["adults"] = int(v)
		}
	}
	if children, ok := updates["children"]; ok {
		if v, ok := children.(float64); ok {
			updateMap["children"] = int(v)
		}
	}
	if price, ok := updates["priceAmount"]; ok {
		if v, ok := price.(float64); ok {
			updateMap["price_amount"] = v
		}
	}

	if len(updateMap) == 0 {
		return nil, fmt.Errorf("no valid fields to update")
	}

	var cart *Cart
	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var model models.Cart
		if err := tx.Where("session_id = ? AND expires_at > ?", sessionID, time.Now()).First(&model).Error; err != nil {
			return fmt.Errorf("cart not found for session: %s", sessionID)
		}

		var cartItem models.CartItem
		if err := tx.Where("cart_id = ? AND uuid = ?", model.ID, itemID).First(&cartItem).Error; err != nil {
			return fmt.Errorf("item %s not found in cart", itemID)
		}

		if err := tx.Model(&cartItem).Updates(updateMap).Error; err != nil {
			return fmt.Errorf("failed to update item: %w", err)
		}

		if err := tx.Model(&model).Update("updated_at", time.Now()).Error; err != nil {
			return fmt.Errorf("failed to update cart timestamp: %w", err)
		}

		tx.Preload("Items").First(&model, model.ID)
		cart = s.modelToCart(&model)
		return nil
	})
	if err != nil {
		return nil, err
	}
	return cart, nil
}

func (s *CartService) RemoveItem(ctx context.Context, sessionID string, itemID string) (*Cart, error) {
	sessionID = sanitizeSessionID(sessionID)

	var cart *Cart
	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var model models.Cart
		if err := tx.Where("session_id = ? AND expires_at > ?", sessionID, time.Now()).First(&model).Error; err != nil {
			return fmt.Errorf("cart not found for session: %s", sessionID)
		}

		result := tx.Where("cart_id = ? AND uuid = ?", model.ID, itemID).Delete(&models.CartItem{})
		if result.Error != nil {
			return fmt.Errorf("failed to remove item: %w", result.Error)
		}
		if result.RowsAffected == 0 {
			return fmt.Errorf("item %s not found in cart", itemID)
		}

		if err := tx.Model(&model).Update("updated_at", time.Now()).Error; err != nil {
			return fmt.Errorf("failed to update cart timestamp: %w", err)
		}

		tx.Preload("Items").First(&model, model.ID)
		cart = s.modelToCart(&model)
		return nil
	})
	if err != nil {
		return nil, err
	}

	logger.Infof("Cart %s: removed item %s", sessionID, itemID)
	return cart, nil
}

func (s *CartService) GetCart(ctx context.Context, sessionID string) (*Cart, error) {
	sessionID = sanitizeSessionID(sessionID)

	var model models.Cart
	if err := s.db.WithContext(ctx).Where("session_id = ? AND expires_at > ?", sessionID, time.Now()).Preload("Items").First(&model).Error; err != nil {
		return nil, fmt.Errorf("cart not found for session: %s", sessionID)
	}

	return s.modelToCart(&model), nil
}

func (s *CartService) RemoveExpiredCarts() {
	s.db.Where("expires_at <= ?", time.Now()).Delete(&models.Cart{})
}

func (s *CartService) GetCartItem(ctx context.Context, sessionID string, itemUUID string) (*CartItem, error) {
	sessionID = sanitizeSessionID(sessionID)

	var model models.Cart
	if err := s.db.WithContext(ctx).Where("session_id = ? AND expires_at > ?", sessionID, time.Now()).First(&model).Error; err != nil {
		return nil, fmt.Errorf("cart not found for session: %s", sessionID)
	}

	var cartItem models.CartItem
	if err := s.db.WithContext(ctx).Where("cart_id = ? AND uuid = ?", model.ID, itemUUID).First(&cartItem).Error; err != nil {
		return nil, fmt.Errorf("item %s not found in cart", itemUUID)
	}

	item := &CartItem{
		ID:               cartItem.UUID,
		ExperienceID:     cartItem.ExperienceID,
		ProductID:        cartItem.ProductID,
		VariantID:        cartItem.VariantID,
		InventoryID:      cartItem.InventoryID,
		InventoryType:    cartItem.InventoryType,
		InventorySeatIDs: parseSeatIDs(cartItem.InventorySeatIDs),
		Date:             cartItem.Date,
		StartDateTime: cartItem.StartDateTime,
		EndDateTime:   cartItem.EndDateTime,
		Adults:        cartItem.Adults,
		Children:      cartItem.Children,
		GuestCounts:   parseGuestCounts(cartItem.GuestCounts),
		FirstName:     cartItem.FirstName,
		LastName:      cartItem.LastName,
		Email:         cartItem.Email,
		Phone:         cartItem.Phone,
		PriceAmount:   cartItem.PriceAmount,
		Currency:      cartItem.Currency,
		Title:         cartItem.Title,
		ImageURL:      cartItem.ImageURL,
		InputFields:   parseInputFields(cartItem.InputFields),
		PaxMin:        cartItem.PaxMin,
		PaxMax:        cartItem.PaxMax,
		OriginalPriceAmount: cartItem.OriginalPriceAmount,
		OriginalCurrency:    cartItem.OriginalCurrency,
		AddedAt:       cartItem.CreatedAt.Format(time.RFC3339),
	}

	return item, nil
}

func (s *CartService) ClearCart(ctx context.Context, sessionID string) error {
	sessionID = sanitizeSessionID(sessionID)

	return s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var model models.Cart
		if err := tx.Where("session_id = ? AND expires_at > ?", sessionID, time.Now()).First(&model).Error; err != nil {
			return fmt.Errorf("cart not found for session: %s", sessionID)
		}

		if err := tx.Where("cart_id = ?", model.ID).Delete(&models.CartItem{}).Error; err != nil {
			return fmt.Errorf("failed to clear cart items: %w", err)
		}

		return tx.Model(&model).Update("updated_at", time.Now()).Error
	})
}

func (s *CartService) modelToCart(m *models.Cart) *Cart {
	cart := &Cart{
		ID:        fmt.Sprintf("%d", m.ID),
		SessionID: m.SessionID,
		AuthType:  m.AuthType,
		ExpiresAt: m.ExpiresAt.Format(time.RFC3339),
		Items:     make([]CartItem, 0, len(m.Items)),
		CreatedAt: m.CreatedAt.Format(time.RFC3339),
		UpdatedAt: m.UpdatedAt.Format(time.RFC3339),
	}
	for _, item := range m.Items {
		cart.Items = append(cart.Items, CartItem{
			ID:            item.UUID,
			ExperienceID:  item.ExperienceID,
			ProductID:     item.ProductID,
			VariantID:     item.VariantID,
			InventoryID:      item.InventoryID,
			InventoryType:    item.InventoryType,
			InventorySeatIDs: parseSeatIDs(item.InventorySeatIDs),
			Date:             item.Date,
			StartDateTime: item.StartDateTime,
			EndDateTime:   item.EndDateTime,
			Adults:        item.Adults,
			Children:      item.Children,
			GuestCounts:   parseGuestCounts(item.GuestCounts),
			FirstName:     item.FirstName,
			LastName:      item.LastName,
			Email:         item.Email,
			Phone:         item.Phone,
			PriceAmount:   item.PriceAmount,
			Currency:      item.Currency,
			Title:         item.Title,
			ImageURL:      item.ImageURL,
			InputFields:   parseInputFields(item.InputFields),
			PaxMin:        item.PaxMin,
			PaxMax:        item.PaxMax,
			OriginalPriceAmount: item.OriginalPriceAmount,
			OriginalCurrency:    item.OriginalCurrency,
			AddedAt:       item.CreatedAt.Format(time.RFC3339),
		})
	}
	return cart
}

func sanitizeSessionID(id string) string {
	id = strings.TrimSpace(id)
	if id == "" {
		return ""
	}
	if len(id) > 256 {
		id = id[:256]
	}
	return id
}

func encodeGuestCounts(counts map[string]int) string {
	if counts == nil {
		return "{}"
	}
	b, err := json.Marshal(counts)
	if err != nil {
		return "{}"
	}
	return string(b)
}

func parseGuestCounts(data string) map[string]int {
	counts := make(map[string]int)
	if data == "" {
		return counts
	}
	json.Unmarshal([]byte(data), &counts)
	return counts
}

func encodeInputFields(fields []map[string]interface{}) string {
	if fields == nil {
		return "[]"
	}
	b, err := json.Marshal(fields)
	if err != nil {
		return "[]"
	}
	return string(b)
}

func parseInputFields(data string) []map[string]interface{} {
	fields := make([]map[string]interface{}, 0)
	if data == "" {
		return fields
	}
	json.Unmarshal([]byte(data), &fields)
	return fields
}

func encodeSeatIDs(ids []string) string {
	if len(ids) == 0 {
		return "[]"
	}
	b, err := json.Marshal(ids)
	if err != nil {
		return "[]"
	}
	return string(b)
}

func parseSeatIDs(data string) []string {
	if data == "" || data == "[]" {
		return nil
	}
	var ids []string
	if err := json.Unmarshal([]byte(data), &ids); err != nil {
		return nil
	}
	if len(ids) == 0 {
		return nil
	}
	return ids
}
