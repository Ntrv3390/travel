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

// StartMetadataSync triggers an asynchronous metadata sync for all products
// whose metadata is older than 24 hours.
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
		"message": "Metadata sync started. Poll status with GET /api/v1/admin/sync/jobs/{job_id}",
	})
}

// StartAvailabilitySync triggers an asynchronous availability sync for all products
// whose availability is older than 1 hour.
// POST /api/v1/admin/sync/availability
func (h *SyncHandler) StartAvailabilitySync(c *gin.Context) {
	jobID, err := h.syncService.StartAvailabilitySync(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusAccepted, gin.H{
		"status":  "started",
		"job_id":  jobID,
		"message": "Availability sync started. Poll status with GET /api/v1/admin/sync/jobs/{job_id}",
	})
}

// StartFullSync triggers an asynchronous full sync (metadata + availability) for all products.
// POST /api/v1/admin/sync/full
func (h *SyncHandler) StartFullSync(c *gin.Context) {
	jobID, err := h.syncService.StartFullSync(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusAccepted, gin.H{
		"status":  "started",
		"job_id":  jobID,
		"message": "Full sync started. Poll status with GET /api/v1/admin/sync/jobs/{job_id}",
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

	c.JSON(http.StatusOK, gin.H{
		"status":  "cancelled",
		"job_id":  jobID,
		"message": "Sync job has been cancelled",
	})
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

	c.JSON(http.StatusOK, gin.H{
		"job_id":       jobID,
		"progress_pct": progress,
	})
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

	c.JSON(http.StatusOK, gin.H{
		"job_id":          jobID,
		"failed_products": failures,
		"total":           len(failures),
	})
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

	c.JSON(http.StatusOK, gin.H{
		"jobs":  jobs,
		"total": len(jobs),
	})
}
