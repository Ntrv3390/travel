package services

import (
	"context"
	"encoding/json"
	"fmt"
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
	InventoryID   string  `json:"inventoryId,omitempty"`
	InventoryType string  `json:"inventoryType,omitempty"`
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
	AddedAt       string  `json:"addedAt"`
}

type Cart struct {
	ID        string     `json:"id"`
	SessionID string     `json:"sessionId"`
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

func (s *CartService) GetOrCreateCart(sessionID string) *Cart {
	sessionID = sanitizeSessionID(sessionID)
	if sessionID == "" {
		sessionID = uuid.New().String()
	}

	var model models.Cart
	err := s.db.Where("session_id = ?", sessionID).Preload("Items").First(&model).Error
	if err == nil {
		return s.modelToCart(&model)
	}

	now := time.Now()
	model = models.Cart{
		SessionID: sessionID,
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

	var model models.Cart
	if err := s.db.WithContext(ctx).Where("session_id = ?", sessionID).First(&model).Error; err != nil {
		return nil, fmt.Errorf("cart not found for session: %s", sessionID)
	}

	itemID := uuid.New().String()
	cartItem := models.CartItem{
		CartID:        model.ID,
		UUID:          itemID,
		ExperienceID:  item.ExperienceID,
		ProductID:     item.ProductID,
		VariantID:     item.VariantID,
		InventoryID:   item.InventoryID,
		InventoryType: item.InventoryType,
		Date:          item.Date,
		StartDateTime: item.StartDateTime,
		EndDateTime:   item.EndDateTime,
		Adults:        item.Adults,
		Children:      item.Children,
		GuestCounts:   encodeGuestCounts(item.GuestCounts),
		FirstName:     item.FirstName,
		LastName:      item.LastName,
		Email:         item.Email,
		Phone:         item.Phone,
		PriceAmount:   item.PriceAmount,
		Currency:      item.Currency,
		Title:         item.Title,
		ImageURL:      item.ImageURL,
	}

	if err := s.db.WithContext(ctx).Create(&cartItem).Error; err != nil {
		return nil, fmt.Errorf("failed to add item: %w", err)
	}

	s.db.Model(&model).Update("updated_at", time.Now())

	s.db.Preload("Items").First(&model, model.ID)
	cart := s.modelToCart(&model)

	logger.Infof("Cart %s: added item %s (variant: %s, date: %s)", sessionID, itemID, item.VariantID, item.Date)
	return cart, nil
}

func (s *CartService) RemoveItem(ctx context.Context, sessionID string, itemID string) (*Cart, error) {
	sessionID = sanitizeSessionID(sessionID)

	var model models.Cart
	if err := s.db.WithContext(ctx).Where("session_id = ?", sessionID).First(&model).Error; err != nil {
		return nil, fmt.Errorf("cart not found for session: %s", sessionID)
	}

	result := s.db.WithContext(ctx).Where("cart_id = ? AND uuid = ?", model.ID, itemID).Delete(&models.CartItem{})
	if result.Error != nil {
		return nil, fmt.Errorf("failed to remove item: %w", result.Error)
	}
	if result.RowsAffected == 0 {
		return nil, fmt.Errorf("item %s not found in cart", itemID)
	}

	s.db.Model(&model).Update("updated_at", time.Now())

	s.db.Preload("Items").First(&model, model.ID)
	cart := s.modelToCart(&model)

	logger.Infof("Cart %s: removed item %s", sessionID, itemID)
	return cart, nil
}

func (s *CartService) GetCart(ctx context.Context, sessionID string) (*Cart, error) {
	sessionID = sanitizeSessionID(sessionID)

	var model models.Cart
	if err := s.db.WithContext(ctx).Where("session_id = ?", sessionID).Preload("Items").First(&model).Error; err != nil {
		return nil, fmt.Errorf("cart not found for session: %s", sessionID)
	}

	return s.modelToCart(&model), nil
}

func (s *CartService) ClearCart(ctx context.Context, sessionID string) error {
	sessionID = sanitizeSessionID(sessionID)

	var model models.Cart
	if err := s.db.WithContext(ctx).Where("session_id = ?", sessionID).First(&model).Error; err != nil {
		return fmt.Errorf("cart not found for session: %s", sessionID)
	}

	if err := s.db.WithContext(ctx).Where("cart_id = ?", model.ID).Delete(&models.CartItem{}).Error; err != nil {
		return fmt.Errorf("failed to clear cart items: %w", err)
	}

	s.db.Model(&model).Update("updated_at", time.Now())
	return nil
}

func (s *CartService) modelToCart(m *models.Cart) *Cart {
	cart := &Cart{
		ID:        fmt.Sprintf("%d", m.ID),
		SessionID: m.SessionID,
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
			InventoryID:   item.InventoryID,
			InventoryType: item.InventoryType,
			Date:          item.Date,
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
			AddedAt:       item.CreatedAt.Format(time.RFC3339),
		})
	}
	return cart
}

func sanitizeSessionID(id string) string {
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
