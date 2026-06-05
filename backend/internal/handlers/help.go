package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/travel/backend/internal/models"
	"github.com/travel/backend/internal/services"
	"github.com/travel/backend/pkg/logger"
	"gorm.io/gorm"
)

type HelpHandler struct {
	db           *gorm.DB
	emailService *services.EmailService
}

func NewHelpHandler(db *gorm.DB, emailService *services.EmailService) *HelpHandler {
	return &HelpHandler{db: db, emailService: emailService}
}

func (h *HelpHandler) Submit(c *gin.Context) {
	var input struct {
		Name    string `json:"name" binding:"required"`
		Email   string `json:"email" binding:"required,email"`
		Subject string `json:"subject" binding:"required"`
		Message string `json:"message" binding:"required"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	submission := models.HelpSubmission{
		Name:    input.Name,
		Email:   input.Email,
		Subject: input.Subject,
		Message: input.Message,
	}

	if err := h.db.Create(&submission).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to save submission"})
		return
	}

	if h.emailService != nil {
		go func() {
			if err := h.emailService.SendHelpSubmissionNotification(services.HelpSubmissionData{
				Name:    submission.Name,
				Email:   submission.Email,
				Subject: submission.Subject,
				Message: submission.Message,
				ID:      submission.ID,
			}); err != nil {
				logger.Errorf("Failed to send help submission admin notification (id=%d): %v", submission.ID, err)
			}
		}()

		go func() {
			if err := h.emailService.SendHelpSubmissionAcknowledgment(services.HelpSubmissionData{
				Name:    submission.Name,
				Email:   submission.Email,
				Subject: submission.Subject,
				Message: submission.Message,
				ID:      submission.ID,
			}); err != nil {
				logger.Errorf("Failed to send help submission acknowledgment to %s: %v", submission.Email, err)
			}
		}()
	}

	c.JSON(http.StatusCreated, gin.H{"message": "help submission received", "id": submission.ID})
}
