package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/travel/backend/internal/models"
	"gorm.io/gorm"
)

type HomeHandler struct {
	db *gorm.DB
}

func NewHomeHandler(db *gorm.DB) *HomeHandler {
	return &HomeHandler{db: db}
}

func (h *HomeHandler) GetCategories(c *gin.Context) {
	var categories []models.HomeCategory
	h.db.Where("is_active = ?", true).Order("sort_order asc").Find(&categories)
	c.JSON(http.StatusOK, gin.H{"data": categories})
}

func (h *HomeHandler) GetCollections(c *gin.Context) {
	var collections []models.HomeCollection
	h.db.Where("is_active = ?", true).Order("sort_order asc").Find(&collections)
	c.JSON(http.StatusOK, gin.H{"data": collections})
}

func (h *HomeHandler) GetTestimonials(c *gin.Context) {
	var testimonials []models.Testimonial
	h.db.Where("is_active = ?", true).Order("sort_order desc").Find(&testimonials)
	c.JSON(http.StatusOK, gin.H{"data": testimonials})
}
