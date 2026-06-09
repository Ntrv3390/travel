package handlers

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/travel/backend/internal/models"
	"github.com/travel/backend/pkg/logger"
	"gorm.io/gorm"
)

type removeInput struct {
	HeadoutID string `json:"headout_id" binding:"required"`
}

type RecentlyViewedHandler struct {
	db *gorm.DB
}

func NewRecentlyViewedHandler(db *gorm.DB) *RecentlyViewedHandler {
	return &RecentlyViewedHandler{db: db}
}

func (h *RecentlyViewedHandler) TrackView(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	var input struct {
		HeadoutID  string  `json:"headout_id" binding:"required"`
		Title      string  `json:"title"`
		ImageURL   string  `json:"image_url"`
		Price      float64 `json:"price"`
		Currency   string  `json:"currency"`
		Rating     float64 `json:"rating"`
		ReviewCount int    `json:"review_count"`
		City       string  `json:"city"`
		Category   string  `json:"category"`
		Slug       string  `json:"slug"`
		Duration   string  `json:"duration"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	now := time.Now()

	var existing models.RecentlyViewed
	result := h.db.Where("user_id = ? AND headout_id = ?", userID, input.HeadoutID).First(&existing)
	if result.Error != nil {
		rv := models.RecentlyViewed{
			UserID:     uint(userID.(float64)),
			HeadoutID:  input.HeadoutID,
			Title:      input.Title,
			ImageURL:   input.ImageURL,
			Price:      input.Price,
			Currency:   input.Currency,
			Rating:     input.Rating,
			ReviewCount: input.ReviewCount,
			City:       input.City,
			Category:   input.Category,
			Slug:       input.Slug,
			Duration:   input.Duration,
			ViewedAt:   now,
		}
		if err := h.db.Create(&rv).Error; err != nil {
			logger.Errorf("Failed to store recently viewed: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to store view"})
			return
		}
	} else {
		h.db.Model(&existing).Updates(map[string]interface{}{
			"title":        input.Title,
			"image_url":    input.ImageURL,
			"price":        input.Price,
			"currency":     input.Currency,
			"rating":       input.Rating,
			"review_count": input.ReviewCount,
			"city":         input.City,
			"category":     input.Category,
			"slug":         input.Slug,
			"duration":     input.Duration,
			"viewed_at":    now,
		})
	}

	c.JSON(http.StatusOK, gin.H{"status": "ok"})
}

func (h *RecentlyViewedHandler) GetRecentlyViewed(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	var rows []models.RecentlyViewed
	if err := h.db.Where("user_id = ?", userID).
		Order("viewed_at desc").
		Limit(20).
		Find(&rows).Error; err != nil {
		logger.Errorf("Failed to fetch recently viewed: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch"})
		return
	}

	experiences := make([]models.Experience, 0, len(rows))
	for _, r := range rows {
		experiences = append(experiences, models.Experience{
			ID:          r.ID,
			HeadoutID:   r.HeadoutID,
			Title:       r.Title,
			Location:    r.City,
			Category:    r.Category,
			Duration:    r.Duration,
			Price:       r.Price,
			Currency:    r.Currency,
			Rating:      float32(r.Rating),
			ReviewCount: r.ReviewCount,
			ImageURL:    r.ImageURL,
			Status:      "active",
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"data":          experiences,
		"count":         len(experiences),
		"currency_code": "USD",
	})
}

func (h *RecentlyViewedHandler) RemoveView(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	var input removeInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	result := h.db.Where("user_id = ? AND headout_id = ?", userID, input.HeadoutID).Delete(&models.RecentlyViewed{})
	if result.Error != nil {
		logger.Errorf("Failed to remove recently viewed: %v", result.Error)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to remove"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "ok"})
}

func (h *RecentlyViewedHandler) BatchLookup(c *gin.Context) {
	var input struct {
		HeadoutIDs []string `json:"headout_ids" binding:"required"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if len(input.HeadoutIDs) == 0 {
		c.JSON(http.StatusOK, gin.H{"data": []models.Experience{}, "count": 0})
		return
	}

	var products []models.Product
	if err := h.db.Where("headout_id IN ?", input.HeadoutIDs).
		Order("title asc").
		Find(&products).Error; err != nil {
		logger.Errorf("Failed to batch lookup products: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "lookup failed"})
		return
	}

	experiences := make([]models.Experience, 0, len(products))
	for _, p := range products {
		experiences = append(experiences, models.Experience{
			HeadoutID:   p.HeadoutID,
			Title:       p.Title,
			Description: p.Description,
			Category:    p.Category,
			Location:    p.CityName,
			Duration:    p.Duration,
			Price:       p.PriceFrom,
			Currency:    p.Currency,
			Rating:      float32(p.Rating),
			ReviewCount: p.ReviewCount,
			ImageURL:    p.ImageURL,
			Status:      "active",
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"data":          experiences,
		"count":         len(experiences),
		"currency_code": "USD",
	})
}


