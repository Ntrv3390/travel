package handlers

import (
	"strconv"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/travel/backend/internal/database"
	"github.com/travel/backend/internal/services"
	"github.com/travel/backend/pkg/logger"
)

type ExperienceHandler struct {
	service *services.ExperienceCatalogService
}

func NewExperienceHandler() *ExperienceHandler {
	return &ExperienceHandler{service: services.NewExperienceCatalogService(database.GetDB())}
}

// GetExperiences returns paginated experiences
func (h *ExperienceHandler) GetExperiences(c *gin.Context) {
	category := c.Query("category")
	location := c.Query("location")
	page := parseIntQuery(c, "page", 1)
	limit := parseIntQuery(c, "limit", 12)

	result, err := h.service.ListExperiences(c.Request.Context(), category, location, page, limit)
	if err != nil {
		logger.Errorf("Failed to fetch experiences: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to fetch experiences",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data":        result.Experiences,
		"count":       result.Count,
		"page":        result.Page,
		"limit":       result.Limit,
		"total_pages": result.TotalPages,
	})
}

// GetExperienceByID returns a single experience by ID
func (h *ExperienceHandler) GetExperienceByID(c *gin.Context) {
	id := c.Param("id")
	experience, err := h.service.GetExperienceByID(c.Request.Context(), id)
	if err != nil {
		logger.Errorf("Failed to fetch experience: %v", err)
		c.JSON(http.StatusNotFound, gin.H{
			"error": "Experience not found",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": experience,
	})
}

// GetExperienceByCityAndSlug returns a single experience by city and slug
func (h *ExperienceHandler) GetExperienceByCityAndSlug(c *gin.Context) {
	city := c.Param("city")
	slug := c.Param("slug")

	experience, err := h.service.GetExperienceByCityAndSlug(c.Request.Context(), city, slug)
	if err != nil {
		logger.Errorf("Failed to fetch experience by slug: %v", err)
		c.JSON(http.StatusNotFound, gin.H{"error": "Experience not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": experience})
}

// SearchExperiences searches for experiences by category/location with pagination
func (h *ExperienceHandler) SearchExperiences(c *gin.Context) {
	category := c.Query("category")
	location := c.Query("location")
	page := parseIntQuery(c, "page", 1)
	limit := parseIntQuery(c, "limit", 12)

	result, err := h.service.SearchExperiences(c.Request.Context(), category, location, page, limit)
	if err != nil {
		logger.Errorf("Failed to search experiences: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to search experiences",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data":        result.Experiences,
		"count":       result.Count,
		"page":        result.Page,
		"limit":       result.Limit,
		"total_pages": result.TotalPages,
	})
}

func parseIntQuery(c *gin.Context, key string, fallback int) int {
	if value := c.Query(key); value != "" {
		if parsed, err := strconv.Atoi(value); err == nil && parsed > 0 {
			return parsed
		}
	}
	return fallback
}
