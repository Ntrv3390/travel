package sync

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/travel/backend/internal/models"
	"github.com/travel/backend/pkg/logger"
	"gorm.io/gorm"
)

// JobService manages sync job lifecycle in the database.
type JobService struct {
	db *gorm.DB
}

// NewJobService creates a new job service.
func NewJobService(db *gorm.DB) *JobService {
	return &JobService{db: db}
}

// CreateJob creates a new sync job record and returns the job ID.
func (s *JobService) CreateJob(ctx context.Context, jobType models.SyncJobType, totalProducts, workerCount int) (string, error) {
	job := models.SyncJob{
		JobID:          uuid.New().String()[:8],
		Status:         models.SyncJobPending,
		Type:           jobType,
		TotalProducts:  totalProducts,
		WorkerCount:    workerCount,
		CreatedAt:      time.Now(),
		UpdatedAt:      time.Now(),
	}

	if err := s.db.WithContext(ctx).Create(&job).Error; err != nil {
		return "", fmt.Errorf("create sync job: %w", err)
	}

	logger.Infof("Created sync job %s (type=%s, total=%d, workers=%d)", job.JobID, jobType, totalProducts, workerCount)
	return job.JobID, nil
}

// StartJob marks a job as running and records the start time.
func (s *JobService) StartJob(ctx context.Context, jobID string) error {
	now := time.Now()
	return s.db.WithContext(ctx).Model(&models.SyncJob{}).
		Where("job_id = ?", jobID).
		Updates(map[string]interface{}{
			"status":    models.SyncJobRunning,
			"started_at": now,
			"updated_at": now,
		}).Error
}

// CompleteJob marks a job as completed with final counts.
func (s *JobService) CompleteJob(ctx context.Context, jobID string, result *PoolResult) error {
	now := time.Now()
	return s.db.WithContext(ctx).Model(&models.SyncJob{}).
		Where("job_id = ?", jobID).
		Updates(map[string]interface{}{
			"status":             models.SyncJobCompleted,
			"processed_products": result.Processed,
			"successful_products": result.Successful,
			"failed_products":    result.Failed,
			"completed_at":       now,
			"updated_at":         now,
		}).Error
}

// FailJob marks a job as failed with the error message.
func (s *JobService) FailJob(ctx context.Context, jobID string, errMsg string) error {
	now := time.Now()
	return s.db.WithContext(ctx).Model(&models.SyncJob{}).
		Where("job_id = ?", jobID).
		Updates(map[string]interface{}{
			"status":        models.SyncJobFailed,
			"error_message": errMsg,
			"completed_at":  now,
			"updated_at":    now,
		}).Error
}

// CancelJob marks a job as cancelled.
func (s *JobService) CancelJob(ctx context.Context, jobID string) error {
	now := time.Now()
	return s.db.WithContext(ctx).Model(&models.SyncJob{}).
		Where("job_id = ? AND status IN ?", jobID, []string{string(models.SyncJobPending), string(models.SyncJobRunning)}).
		Updates(map[string]interface{}{
			"status":      models.SyncJobCancelled,
			"completed_at": now,
			"updated_at":  now,
		}).Error
}

// UpdateProgress atomically updates the processed count and increments
// successful/failed counters. Called periodically by workers.
func (s *JobService) UpdateProgress(ctx context.Context, jobID string, processed, successful, failed int) error {
	return s.db.WithContext(ctx).Model(&models.SyncJob{}).
		Where("job_id = ?", jobID).
		Updates(map[string]interface{}{
			"processed_products":  processed,
			"successful_products": successful,
			"failed_products":     failed,
			"updated_at":          time.Now(),
		}).Error
}

// RecordFailedProducts saves the list of products that failed processing.
func (s *JobService) RecordFailedProducts(ctx context.Context, jobID string, failures []FailedProduct) error {
	if len(failures) == 0 {
		return nil
	}

	var job models.SyncJob
	if err := s.db.WithContext(ctx).Where("job_id = ?", jobID).First(&job).Error; err != nil {
		return fmt.Errorf("find sync job: %w", err)
	}

	failedRecords := make([]models.SyncJobFailedProduct, 0, len(failures))
	for _, f := range failures {
		failedRecords = append(failedRecords, models.SyncJobFailedProduct{
			SyncJobID:    job.ID,
			ProductID:    f.ProductID,
			HeadoutID:    f.HeadoutID,
			ProductName:  f.ProductName,
			ErrorMessage: f.Error,
			FailureType:  f.FailureType,
		})
	}

	return s.db.WithContext(ctx).CreateInBatches(&failedRecords, 100).Error
}

// GetJob retrieves a sync job by its job_id.
func (s *JobService) GetJob(ctx context.Context, jobID string) (*models.SyncJob, error) {
	var job models.SyncJob
	if err := s.db.WithContext(ctx).Where("job_id = ?", jobID).First(&job).Error; err != nil {
		return nil, err
	}
	return &job, nil
}

// GetFailedProducts retrieves all failed products for a given job.
func (s *JobService) GetFailedProducts(ctx context.Context, jobID string) ([]models.SyncJobFailedProduct, error) {
	var job models.SyncJob
	if err := s.db.WithContext(ctx).Where("job_id = ?", jobID).First(&job).Error; err != nil {
		return nil, err
	}

	var failures []models.SyncJobFailedProduct
	if err := s.db.WithContext(ctx).Where("sync_job_id = ?", job.ID).
		Order("created_at asc").Find(&failures).Error; err != nil {
		return nil, err
	}
	return failures, nil
}

// ListRecentJobs retrieves recent sync jobs.
func (s *JobService) ListRecentJobs(ctx context.Context, limit int) ([]models.SyncJob, error) {
	if limit <= 0 {
		limit = 20
	}
	var jobs []models.SyncJob
	if err := s.db.WithContext(ctx).
		Order("created_at desc").
		Limit(limit).
		Find(&jobs).Error; err != nil {
		return nil, err
	}
	return jobs, nil
}

// CleanupOldJobs removes completed/failed jobs older than the given duration.
func (s *JobService) CleanupOldJobs(ctx context.Context, olderThan time.Duration) (int64, error) {
	cutoff := time.Now().Add(-olderThan)
	result := s.db.WithContext(ctx).
		Where("status IN ? AND completed_at < ?",
			[]string{string(models.SyncJobCompleted), string(models.SyncJobFailed), string(models.SyncJobCancelled)},
			cutoff).
		Delete(&models.SyncJob{})
	return result.RowsAffected, result.Error
}
