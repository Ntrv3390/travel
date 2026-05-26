package services

import (
	"context"
	"fmt"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/travel/backend/pkg/logger"
)

type CartItem struct {
	ID           string  `json:"id"`
	ExperienceID string  `json:"experienceId"`
	VariantID    string  `json:"variantId"`
	InventoryID  string  `json:"inventoryId,omitempty"`
	Date         string  `json:"date"`
	Adults       int     `json:"adults"`
	Children     int     `json:"children"`
	FirstName    string  `json:"firstName,omitempty"`
	LastName     string  `json:"lastName,omitempty"`
	Email        string  `json:"email,omitempty"`
	Phone        string  `json:"phone,omitempty"`
	PriceAmount  float64 `json:"priceAmount,omitempty"`
	Currency     string  `json:"currency,omitempty"`
	Title        string  `json:"title,omitempty"`
	ImageURL     string  `json:"imageUrl,omitempty"`
	AddedAt      string  `json:"addedAt"`
}

type Cart struct {
	ID        string     `json:"id"`
	SessionID string     `json:"sessionId"`
	Items     []CartItem `json:"items"`
	CreatedAt string     `json:"createdAt"`
	UpdatedAt string     `json:"updatedAt"`
}

type CartService struct {
	mu    sync.RWMutex
	carts map[string]*Cart
}

func NewCartService() *CartService {
	return &CartService{
		carts: make(map[string]*Cart),
	}
}

func (s *CartService) GetOrCreateCart(sessionID string) *Cart {
	s.mu.Lock()
	defer s.mu.Unlock()

	sessionID = sanitizeSessionID(sessionID)
	if sessionID == "" {
		sessionID = uuid.New().String()
	}

	if cart, exists := s.carts[sessionID]; exists {
		return cart
	}

	now := time.Now().UTC().Format(time.RFC3339)
	cart := &Cart{
		ID:        uuid.New().String(),
		SessionID: sessionID,
		Items:     make([]CartItem, 0),
		CreatedAt: now,
		UpdatedAt: now,
	}
	s.carts[sessionID] = cart
	return cart
}

func (s *CartService) AddItem(ctx context.Context, sessionID string, item CartItem) (*Cart, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	sessionID = sanitizeSessionID(sessionID)
	cart, exists := s.carts[sessionID]
	if !exists {
		return nil, fmt.Errorf("cart not found for session: %s", sessionID)
	}

	if item.VariantID == "" {
		return nil, fmt.Errorf("variantId is required")
	}
	if item.Date == "" {
		return nil, fmt.Errorf("date is required")
	}

	item.ID = uuid.New().String()
	item.AddedAt = time.Now().UTC().Format(time.RFC3339)

	cart.Items = append(cart.Items, item)
	cart.UpdatedAt = time.Now().UTC().Format(time.RFC3339)

	logger.Infof("Cart %s: added item %s (variant: %s, date: %s)", sessionID, item.ID, item.VariantID, item.Date)
	return cart, nil
}

func (s *CartService) RemoveItem(ctx context.Context, sessionID string, itemID string) (*Cart, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	sessionID = sanitizeSessionID(sessionID)
	cart, exists := s.carts[sessionID]
	if !exists {
		return nil, fmt.Errorf("cart not found for session: %s", sessionID)
	}

	found := false
	for i, item := range cart.Items {
		if item.ID == itemID {
			cart.Items = append(cart.Items[:i], cart.Items[i+1:]...)
			found = true
			break
		}
	}

	if !found {
		return nil, fmt.Errorf("item %s not found in cart", itemID)
	}

	cart.UpdatedAt = time.Now().UTC().Format(time.RFC3339)
	logger.Infof("Cart %s: removed item %s", sessionID, itemID)
	return cart, nil
}

func (s *CartService) GetCart(ctx context.Context, sessionID string) (*Cart, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	sessionID = sanitizeSessionID(sessionID)
	cart, exists := s.carts[sessionID]
	if !exists {
		return nil, fmt.Errorf("cart not found for session: %s", sessionID)
	}

	return cart, nil
}

func (s *CartService) ClearCart(ctx context.Context, sessionID string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	sessionID = sanitizeSessionID(sessionID)
	if _, exists := s.carts[sessionID]; !exists {
		return fmt.Errorf("cart not found for session: %s", sessionID)
	}

	s.carts[sessionID].Items = make([]CartItem, 0)
	s.carts[sessionID].UpdatedAt = time.Now().UTC().Format(time.RFC3339)
	return nil
}

func sanitizeSessionID(id string) string {
	if len(id) > 256 {
		id = id[:256]
	}
	return id
}
