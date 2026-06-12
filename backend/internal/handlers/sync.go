package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	synclib "github.com/travel/backend/internal/sync"
)

// SyncHandler handles admin sync API endpoints.
type SyncHandler struct {
	syncService *synclib.Service
}

// NewSyncHandler creates a new sync handler.
func NewSyncHandler(syncService *synclib.Service) *SyncHandler {
	return &SyncHandler{syncService: syncService}
}

// StartMetadataSync triggers a metadata-only sync (cities → products → variant stubs).
// No availability is fetched from Headout; safe to call while fetch_fresh = false.
// POST /api/v1/admin/sync/metadata
func (h *SyncHandler) StartMetadataSync(c *gin.Context) {
	jobID, err := h.syncService.StartMetadataSync(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusAccepted, gin.H{
		"status":  "started",
		"job_id":  jobID,
		"message": "Metadata sync started. Poll GET /api/v1/admin/sync/jobs/{job_id} for progress.",
	})
}

// StartInventorySync triggers a full discovery + availability import.
// POST /api/v1/admin/sync/inventory
func (h *SyncHandler) StartInventorySync(c *gin.Context) {
	jobID, err := h.syncService.StartInventorySync(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusAccepted, gin.H{
		"status":  "started",
		"job_id":  jobID,
		"message": "Inventory sync started. Poll GET /api/v1/admin/sync/jobs/{job_id} for progress.",
	})
}

// CancelJob cancels a running sync job.
// POST /api/v1/admin/sync/jobs/:job_id/cancel
func (h *SyncHandler) CancelJob(c *gin.Context) {
	jobID := c.Param("job_id")
	if jobID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "job_id is required"})
		return
	}

	if err := h.syncService.CancelJob(jobID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "cancelled", "job_id": jobID})
}

// GetJobStatus returns the current status of a sync job.
// GET /api/v1/admin/sync/jobs/:job_id
func (h *SyncHandler) GetJobStatus(c *gin.Context) {
	jobID := c.Param("job_id")
	if jobID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "job_id is required"})
		return
	}

	job, err := h.syncService.GetJobStatus(c.Request.Context(), jobID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "sync job not found"})
		return
	}

	c.JSON(http.StatusOK, job)
}

// GetSyncProgress returns the sync progress percentage for a job.
// GET /api/v1/admin/sync/jobs/:job_id/progress
func (h *SyncHandler) GetSyncProgress(c *gin.Context) {
	jobID := c.Param("job_id")
	if jobID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "job_id is required"})
		return
	}

	progress, err := h.syncService.GetSyncProgress(c.Request.Context(), jobID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "sync job not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"job_id": jobID, "progress_pct": progress})
}

// GetFailedProducts returns products that failed during a sync job.
// GET /api/v1/admin/sync/jobs/:job_id/failed
func (h *SyncHandler) GetFailedProducts(c *gin.Context) {
	jobID := c.Param("job_id")
	if jobID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "job_id is required"})
		return
	}

	failures, err := h.syncService.GetFailedProducts(c.Request.Context(), jobID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "sync job not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"job_id": jobID, "failed_products": failures, "total": len(failures)})
}

// GetMetrics returns aggregate processing metrics for a job.
// GET /api/v1/admin/sync/jobs/:job_id/metrics
func (h *SyncHandler) GetMetrics(c *gin.Context) {
	jobID := c.Param("job_id")
	if jobID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "job_id is required"})
		return
	}

	metrics, err := h.syncService.GetMetrics(c.Request.Context(), jobID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "sync job not found"})
		return
	}

	c.JSON(http.StatusOK, metrics)
}

// ListJobs returns recent sync jobs.
// GET /api/v1/admin/sync/jobs
func (h *SyncHandler) ListJobs(c *gin.Context) {
	limit := 20
	if l := c.Query("limit"); l != "" {
		if parsed, err := strconv.Atoi(l); err == nil && parsed > 0 {
			limit = parsed
		}
	}

	jobs, err := h.syncService.ListRecentJobs(c.Request.Context(), limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"jobs": jobs, "total": len(jobs)})
}

// GetInventoryStats returns aggregate inventory stats for the settings page.
// GET /api/v1/admin/sync/inventory/stats
func (h *SyncHandler) GetInventoryStats(c *gin.Context) {
	stats, err := h.syncService.GetInventoryStats(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, stats)
}
