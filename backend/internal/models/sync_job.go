package models

import (
	"time"

	"gorm.io/gorm"
)

type SyncJobStatus string

const (
	SyncJobPending   SyncJobStatus = "pending"
	SyncJobRunning   SyncJobStatus = "running"
	SyncJobCompleted SyncJobStatus = "completed"
	SyncJobFailed    SyncJobStatus = "failed"
	SyncJobCancelled SyncJobStatus = "cancelled"
)

type SyncJobType string

const (
	SyncJobTypeMetadata     SyncJobType = "metadata"
	SyncJobTypeAvailability SyncJobType = "availability"
	SyncJobTypeFull         SyncJobType = "full"
)

type SyncJob struct {
	ID                uint           `gorm:"primaryKey" json:"id"`
	JobID             string         `gorm:"uniqueIndex;size:100;not null" json:"job_id"`
	Status            SyncJobStatus  `gorm:"size:20;not null;default:pending" json:"status"`
	Type              SyncJobType    `gorm:"size:20;not null" json:"type"`
	TotalProducts     int            `gorm:"default:0" json:"total_products"`
	ProcessedProducts int            `gorm:"default:0" json:"processed_products"`
	SuccessfulProducts int           `gorm:"default:0" json:"successful_products"`
	FailedProducts    int            `gorm:"default:0" json:"failed_products"`
	WorkerCount       int            `gorm:"default:20" json:"worker_count"`
	ErrorMessage      string         `gorm:"type:text" json:"error_message,omitempty"`
	StartedAt         *time.Time     `json:"started_at,omitempty"`
	CompletedAt       *time.Time     `json:"completed_at,omitempty"`
	CreatedAt         time.Time      `json:"created_at"`
	UpdatedAt         time.Time      `json:"updated_at"`
	DeletedAt         gorm.DeletedAt `gorm:"index" json:"-"`
}

func (SyncJob) TableName() string {
	return "sync_jobs"
}

type SyncJobFailedProduct struct {
	ID            uint   `gorm:"primaryKey" json:"id"`
	SyncJobID     uint   `gorm:"index;not null" json:"sync_job_id"`
	ProductID     uint   `gorm:"not null" json:"product_id"`
	HeadoutID     string `gorm:"size:100;not null" json:"headout_id"`
	ProductName   string `gorm:"size:500" json:"product_name"`
	ErrorMessage  string `gorm:"type:text" json:"error_message"`
	FailureType   string `gorm:"size:50" json:"failure_type"`
	CreatedAt     time.Time `json:"created_at"`
}

func (SyncJobFailedProduct) TableName() string {
	return "sync_job_failed_products"
}
