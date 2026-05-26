package models

import (
	"time"

	"gorm.io/gorm"
)

// GoogleFeedStatus tracks the sync status with Google Things to Do
type GoogleFeedStatus struct {
	ID            uint           `gorm:"primaryKey" json:"id"`
	ExperienceID  uint           `gorm:"not null" json:"experience_id"`
	LastSyncTime  time.Time      `json:"last_sync_time"`
	Status        string         `gorm:"default:'pending'" json:"status"` // pending, synced, failed
	ErrorMessage  string         `gorm:"type:text" json:"error_message"`
	SyncAttempts  int            `json:"sync_attempts"`
	CreatedAt     time.Time      `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt     time.Time      `gorm:"autoUpdateTime" json:"updated_at"`
	DeletedAt     gorm.DeletedAt `gorm:"index" json:"-"`
}

// GoogleFeedProduct represents a product entry for Google Things to Do feed
type GoogleFeedProduct struct {
	ProductID     string  `json:"product_id"`
	Title         string  `json:"title"`
	LandingPageURL string `json:"landing_page_url"`
	Price         float64 `json:"price"`
	Currency      string  `json:"currency"`
	Description   string  `json:"description"`
	ImageURL      string  `json:"image_url"`
	Availability  string  `json:"availability"` // In stock, Out of stock
}
