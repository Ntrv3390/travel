package handlers

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/travel/backend/internal/services"
)

type CartHandler struct {
	cartService *services.CartService
}

func NewCartHandler(cartService *services.CartService) *CartHandler {
	return &CartHandler{
		cartService: cartService,
	}
}

func (h *CartHandler) GetCart(c *gin.Context) {
	sessionID := resolveSessionID(c)
	cart, err := h.cartService.GetCart(c.Request.Context(), sessionID)
	if err != nil {
		cart = h.cartService.GetOrCreateCart(sessionID)
	}

	c.JSON(http.StatusOK, gin.H{
		"data": cart,
	})
}

func (h *CartHandler) AddItem(c *gin.Context) {
	sessionID := resolveSessionID(c)

	var item services.CartItem
	if err := c.ShouldBindJSON(&item); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid item payload"})
		return
	}

	h.cartService.GetOrCreateCart(sessionID)

	cart, err := h.cartService.AddItem(c.Request.Context(), sessionID, item)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data":    cart,
		"message": "Item added to cart",
	})
}

func (h *CartHandler) GetCartItem(c *gin.Context) {
	sessionID := resolveSessionID(c)
	itemUUID := strings.TrimSpace(c.Param("uuid"))

	if itemUUID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "item uuid is required"})
		return
	}

	item, err := h.cartService.GetCartItem(c.Request.Context(), sessionID, itemUUID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": item,
	})
}

func (h *CartHandler) UpdateItem(c *gin.Context) {
	sessionID := resolveSessionID(c)
	itemID := strings.TrimSpace(c.Param("id"))

	if itemID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "item id is required"})
		return
	}

	var updates map[string]interface{}
	if err := c.ShouldBindJSON(&updates); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid update payload"})
		return
	}

	cart, err := h.cartService.UpdateItem(c.Request.Context(), sessionID, itemID, updates)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data":    cart,
		"message": "Item updated",
	})
}

func (h *CartHandler) RemoveItem(c *gin.Context) {
	sessionID := resolveSessionID(c)
	itemID := strings.TrimSpace(c.Param("id"))

	if itemID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "item id is required"})
		return
	}

	cart, err := h.cartService.RemoveItem(c.Request.Context(), sessionID, itemID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data":    cart,
		"message": "Item removed from cart",
	})
}

func (h *CartHandler) ClearCart(c *gin.Context) {
	sessionID := resolveSessionID(c)

	if err := h.cartService.ClearCart(c.Request.Context(), sessionID); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Cart cleared",
	})
}

func resolveSessionID(c *gin.Context) string {
	sessionID := strings.TrimSpace(c.GetHeader("X-Session-ID"))
	if sessionID == "" {
		sessionID = strings.TrimSpace(c.Query("sessionId"))
	}
	if sessionID == "" {
		sessionID = strings.TrimSpace(c.PostForm("sessionId"))
	}
	if sessionID == "" {
		newID := uuid.New().String()
		c.Header("X-Session-ID", newID)
		return newID
	}
	return sessionID
}
