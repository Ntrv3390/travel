package models

import (
	"time"

	"gorm.io/datatypes"
	"gorm.io/gorm"
)

type Category struct {
	ID             uint           `gorm:"primaryKey" json:"id"`
	CategoryID     string         `gorm:"uniqueIndex;size:100;not null" json:"category_id"`
	Name           string         `gorm:"size:255;not null" json:"name"`
	ImageURL       string         `gorm:"size:500" json:"image_url"`
	RawHeadoutData datatypes.JSON `gorm:"type:jsonb" json:"raw_headout_data"`
	LastSyncedAt   time.Time      `json:"last_synced_at"`
	CreatedAt      time.Time      `json:"created_at"`
	UpdatedAt      time.Time      `json:"updated_at"`
	DeletedAt      gorm.DeletedAt `gorm:"index" json:"-"`
}
