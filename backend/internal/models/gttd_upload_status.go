package models

import (
	"time"

	"gorm.io/gorm"
)

// GTTDFeedUploadStatus tracks the status of a GTTD feed upload run
type GTTDFeedUploadStatus struct {
	ID           string         `gorm:"primaryKey;type:uuid;default:gen_random_uuid()" json:"id"`
	Environment  string         `gorm:"type:varchar(50);not null" json:"environment"`
	Status       string         `gorm:"type:varchar(50);default:'PENDING'" json:"status"`
	ProductCount int            `gorm:"default:0" json:"product_count"`
	ShardCount   int            `gorm:"default:0" json:"shard_count"`
	ErrorMessage string         `gorm:"type:text" json:"error_message"`
	CreatedAt    time.Time      `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt    time.Time      `gorm:"autoUpdateTime" json:"updated_at"`
	DeletedAt    gorm.DeletedAt `gorm:"index" json:"-"`
}

func (GTTDFeedUploadStatus) TableName() string {
	return "gttd_feed_upload_status"
}
