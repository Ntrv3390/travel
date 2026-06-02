package handlers

import (
	"fmt"
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/travel/backend/internal/models"
	"github.com/travel/backend/internal/services"
	"gorm.io/gorm"
)

const maxPageLimit = 50

type AdminHandler struct {
	db             *gorm.DB
	emailService   *services.EmailService
	headoutService *services.HeadoutProxyService
}

func NewAdminHandler(db *gorm.DB, emailService *services.EmailService, headoutService *services.HeadoutProxyService) *AdminHandler {
	return &AdminHandler{db: db, emailService: emailService, headoutService: headoutService}
}

type paginatedResponse struct {
	Items interface{} `json:"items"`
	Total int64       `json:"total"`
	Page  int         `json:"page"`
	Limit int         `json:"limit"`
}

func (h *AdminHandler) ListBookings(c *gin.Context) {
	page, limit := parsePagination(c)
	search := strings.TrimSpace(c.Query("search"))

	query := h.db.Model(&models.Booking{})

	if search != "" {
		pattern := "%" + search + "%"
		query = query.Where(
			"booking_id ILIKE ? OR email ILIKE ? OR first_name ILIKE ? OR last_name ILIKE ? OR (first_name || ' ' || last_name) ILIKE ?",
			pattern, pattern, pattern, pattern, pattern,
		)
	}

	var total int64
	query.Count(&total)

	bookings := []models.Booking{}
	query.Order("created_at desc").Offset((page - 1) * limit).Limit(limit).Find(&bookings)

	c.JSON(http.StatusOK, paginatedResponse{
		Items: bookings,
		Total: total,
		Page:  page,
		Limit: limit,
	})
}

func (h *AdminHandler) ListHelpSubmissions(c *gin.Context) {
	page, limit := parsePagination(c)
	search := strings.TrimSpace(c.Query("search"))

	query := h.db.Model(&models.HelpSubmission{})

	if search != "" {
		pattern := "%" + search + "%"
		query = query.Where("name ILIKE ? OR email ILIKE ? OR subject ILIKE ?", pattern, pattern, pattern)
	}

	var total int64
	query.Count(&total)

	submissions := []models.HelpSubmission{}
	query.Order("created_at desc").Offset((page - 1) * limit).Limit(limit).Find(&submissions)

	c.JSON(http.StatusOK, paginatedResponse{
		Items: submissions,
		Total: total,
		Page:  page,
		Limit: limit,
	})
}

func (h *AdminHandler) ListUsers(c *gin.Context) {
	role, _ := c.Get("role")
	page, limit := parsePagination(c)
	search := strings.TrimSpace(c.Query("search"))

	type userAdminResponse struct {
		ID        uint   `json:"id"`
		Email     string `json:"email"`
		Name      string `json:"name"`
		Role      string `json:"role"`
		CreatedAt string `json:"created_at"`
	}

	query := h.db.Model(&models.User{})

	if role == "admin" {
		query = query.Where("role != ?", "superadmin")
	}

	if search != "" {
		pattern := "%" + search + "%"
		query = query.Where("email ILIKE ? OR name ILIKE ?", pattern, pattern)
	}

	var total int64
	query.Count(&total)

	var users []models.User
	query.Order("created_at desc").Offset((page - 1) * limit).Limit(limit).Find(&users)

	data := []userAdminResponse{}
	for _, u := range users {
		data = append(data, userAdminResponse{
			ID:        u.ID,
			Email:     u.Email,
			Name:      u.Name,
			Role:      u.Role,
			CreatedAt: u.CreatedAt.Format("2006-01-02T15:04:05Z"),
		})
	}

	c.JSON(http.StatusOK, paginatedResponse{
		Items: data,
		Total: total,
		Page:  page,
		Limit: limit,
	})
}

func (h *AdminHandler) UpdateUser(c *gin.Context) {
	var input struct {
		Email string `json:"email" binding:"required,email"`
		Role  string `json:"role" binding:"required,oneof=admin user superadmin"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	callerRole, _ := c.Get("role")
	if callerRole == "admin" && input.Role == "superadmin" {
		c.JSON(http.StatusForbidden, gin.H{"error": "cannot set role to superadmin"})
		return
	}

	userID := c.Param("id")
	var user models.User
	if err := h.db.First(&user, userID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
		return
	}

	user.Email = input.Email
	user.Role = input.Role

	if err := h.db.Save(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update user"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": gin.H{
			"id":    user.ID,
			"email": user.Email,
			"name":  user.Name,
			"role":  user.Role,
		},
	})
}

func (h *AdminHandler) GetStats(c *gin.Context) {
	role, _ := c.Get("role")

	var totalBookings int64
	h.db.Model(&models.Booking{}).Count(&totalBookings)

	var totalHelpSubmissions int64
	h.db.Model(&models.HelpSubmission{}).Count(&totalHelpSubmissions)

	var totalUsers int64
	userQuery := h.db.Model(&models.User{})
	if role == "admin" {
		userQuery = userQuery.Where("role != ?", "superadmin")
	}
	userQuery.Count(&totalUsers)

	var totalVisitors int64
	h.db.Model(&models.Visitor{}).Count(&totalVisitors)

	var uniqueToday int64
	h.db.Model(&models.Visitor{}).Where("last_visit >= CURRENT_DATE").Count(&uniqueToday)

	type countryCount struct {
		Country string `json:"country"`
		Count   int64  `json:"count"`
	}
	var topCountries []countryCount
	h.db.Model(&models.Visitor{}).
		Select("country, count(*) as count").
		Where("country != ''").
		Group("country").
		Order("count desc").
		Limit(5).
		Scan(&topCountries)

	type pageCount struct {
		Pathname string `json:"pathname"`
		Count    int64  `json:"count"`
	}
	var topPages []pageCount
	h.db.Model(&models.PageVisit{}).
		Select("pathname, count(*) as count").
		Group("pathname").
		Order("count desc").
		Limit(10).
		Scan(&topPages)

	var bottomPages []pageCount
	h.db.Model(&models.PageVisit{}).
		Select("pathname, count(*) as count").
		Group("pathname").
		Order("count asc").
		Limit(5).
		Scan(&bottomPages)

	c.JSON(http.StatusOK, gin.H{
		"totalBookings":        totalBookings,
		"totalHelpSubmissions": totalHelpSubmissions,
		"totalUsers":           totalUsers,
		"totalVisitors":        totalVisitors,
		"uniqueVisitorsToday":  uniqueToday,
		"topCountries":         topCountries,
		"topPages":             topPages,
		"bottomPages":          bottomPages,
	})
}

func (h *AdminHandler) GetHeadoutBooking(c *gin.Context) {
	id := c.Param("id")

	var booking models.Booking
	if err := h.db.First(&booking, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "booking not found"})
		return
	}

	if booking.BookingID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "booking has no Headout booking ID"})
		return
	}

	path := fmt.Sprintf("/v2/bookings/%s/", booking.BookingID)
	resp, err := h.headoutService.Get(c.Request.Context(), path, nil, true)
	if err != nil {
		c.JSON(http.StatusBadGateway, gin.H{"error": fmt.Sprintf("failed to fetch from Headout: %v", err)})
		return
	}

	if resp.StatusCode >= 400 {
		c.Data(resp.StatusCode, "application/json; charset=utf-8", resp.Body)
		return
	}

	c.Data(http.StatusOK, "application/json; charset=utf-8", resp.Body)
}

func parsePagination(c *gin.Context) (int, int) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit := maxPageLimit

	if page < 1 {
		page = 1
	}

	return page, limit
}
