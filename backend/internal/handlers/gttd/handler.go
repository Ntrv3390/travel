package gttdhandlers

import (
	"net/http"

	"github.com/travel/backend/internal/gttd"

	"github.com/gin-gonic/gin"
)

type GttdHandler struct {
	worker        *gttd.Worker
	generator     *gttd.FeedGenerator
	jsonldBuilder *gttd.JSONLDBuilder
}

// NewGttdHandler creates a new GTTD handler
func NewGttdHandler(worker *gttd.Worker, generator *gttd.FeedGenerator, jsonldBuilder *gttd.JSONLDBuilder) *GttdHandler {
	return &GttdHandler{
		worker:        worker,
		generator:     generator,
		jsonldBuilder: jsonldBuilder,
	}
}

// TriggerUpload manually triggers a feed upload (for testing/ops)
// POST /api/v1/gttd/trigger-upload
func (h *GttdHandler) TriggerUpload(c *gin.Context) {
	var req struct {
		Env string `json:"env" binding:"required,oneof=dev production"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Run in background
	go func() {
		_ = h.worker.RunFeedUpload(c.Request.Context())
	}()

	c.JSON(http.StatusAccepted, gin.H{
		"message": "Feed upload triggered",
		"env":     req.Env,
	})
}

// GetStatus gets the latest feed upload status
// GET /api/v1/gttd/status?env=production
func (h *GttdHandler) GetStatus(c *gin.Context) {
	env := c.DefaultQuery("env", "production")

	// TODO: Fetch from DB
	c.JSON(http.StatusOK, gin.H{
		"env":    env,
		"status": "placeholder",
	})
}

// GetPreview previews the feed without uploading
// GET /api/v1/gttd/preview?limit=5
func (h *GttdHandler) GetPreview(c *gin.Context) {
	limit := c.DefaultQuery("limit", "5")

	// TODO: Generate preview feed
	c.JSON(http.StatusOK, gin.H{
		"preview": "placeholder",
		"limit":   limit,
	})
}

// GetJSONLD gets JSON-LD for a specific experience
// GET /api/v1/gttd/jsonld/:headout_id
func (h *GttdHandler) GetJSONLD(c *gin.Context) {
	headoutID := c.Param("headout_id")

	jsonld, err := h.jsonldBuilder.Build(c.Request.Context(), headoutID, "", "")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.Header("Content-Type", "application/ld+json")
	c.String(http.StatusOK, jsonld)
}

// Health check endpoint
// GET /api/v1/gttd/health
func (h *GttdHandler) Health(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"status": "ok",
		"module": "gttd",
	})
}
