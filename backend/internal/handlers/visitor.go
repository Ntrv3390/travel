package handlers

import (
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/travel/backend/internal/models"
	"github.com/travel/backend/internal/services"
	"gorm.io/gorm"
)

type VisitorHandler struct {
	db *gorm.DB
}

func NewVisitorHandler(db *gorm.DB) *VisitorHandler {
	return &VisitorHandler{db: db}
}

func (h *VisitorHandler) TrackVisit(c *gin.Context) {
	var input struct {
		PageURL  string `json:"page_url"`
		Pathname string `json:"pathname"`
		Referrer string `json:"referrer"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	ip := c.GetHeader("X-Real-IP")
	if ip == "" {
		ip = c.GetHeader("X-Forwarded-For")
		if idx := strings.Index(ip, ","); idx != -1 {
			ip = strings.TrimSpace(ip[:idx])
		}
	}
	if ip == "" {
		ip = c.ClientIP()
	}
	userAgent := c.GetHeader("User-Agent")
	referrer := input.Referrer
	if referrer == "" {
		referrer = c.GetHeader("Referer")
	}

	var visitor models.Visitor
	now := time.Now()

	result := h.db.Where("ip = ?", ip).First(&visitor)
	if result.Error != nil {
		geo := services.LookupGeo(ip)

		visitor = models.Visitor{
			IP:         ip,
			UserAgent:  userAgent,
			Referrer:   referrer,
			PageURL:    input.PageURL,
			FirstVisit: now,
			LastVisit:  now,
			VisitCount: 1,
		}
		if geo != nil {
			visitor.Country = geo.Country
			visitor.City = geo.City
			visitor.Region = geo.Region
			visitor.ISP = geo.ISP
		}
		if err := h.db.Create(&visitor).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to record visit"})
			return
		}
	} else {
		h.db.Model(&visitor).Updates(map[string]interface{}{
			"last_visit":  now,
			"visit_count": visitor.VisitCount + 1,
			"user_agent":  userAgent,
			"page_url":    input.PageURL,
			"referrer":    referrer,
		})
	}

	// Record individual page visit for route analytics
	if input.Pathname != "" {
		pageVisit := models.PageVisit{
			VisitorID: visitor.ID,
			Pathname:  input.Pathname,
			VisitedAt: now,
		}
		h.db.Create(&pageVisit)
	}

	c.JSON(http.StatusOK, gin.H{"status": "ok"})
}

func (h *VisitorHandler) ListVisitors(c *gin.Context) {
	page, limit := parsePagination(c)
	search := strings.TrimSpace(c.Query("search"))

	query := h.db.Model(&models.Visitor{})

	if search != "" {
		pattern := "%" + search + "%"
		query = query.Where("ip ILIKE ? OR country ILIKE ? OR city ILIKE ? OR isp ILIKE ?", pattern, pattern, pattern, pattern)
	}

	var total int64
	query.Count(&total)

	visitors := []models.Visitor{}
	query.Order("last_visit desc").Offset((page - 1) * limit).Limit(limit).Find(&visitors)

	c.JSON(http.StatusOK, paginatedResponse{
		Items: visitors,
		Total: total,
		Page:  page,
		Limit: limit,
	})
}
