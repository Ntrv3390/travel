package models

import (
	"time"

	"gorm.io/datatypes"
	"gorm.io/gorm"
)

type Subcategory struct {
	ID             uint           `gorm:"primaryKey" json:"id"`
	SubcategoryID  string         `gorm:"uniqueIndex;size:100;not null" json:"subcategory_id"`
	Name           string         `gorm:"size:255;not null" json:"name"`
	RawHeadoutData datatypes.JSON `gorm:"type:jsonb" json:"raw_headout_data"`
	LastSyncedAt   time.Time      `json:"last_synced_at"`
	CreatedAt      time.Time      `json:"created_at"`
	UpdatedAt      time.Time      `json:"updated_at"`
	DeletedAt      gorm.DeletedAt `gorm:"index" json:"-"`
}
