package models

import (
	"time"

	"gorm.io/datatypes"
	"gorm.io/gorm"
)

type Product struct {
	ID                      uint           `gorm:"primaryKey" json:"id"`
	HeadoutID               string         `gorm:"uniqueIndex;size:100;not null" json:"headout_id"`
	Title                   string         `gorm:"size:500;not null" json:"title"`
	Description             string         `gorm:"type:text" json:"description"`
	CityCode                string         `gorm:"size:100;index" json:"city_code"`
	CityName                string         `gorm:"size:255" json:"city_name"`
	Category                string         `gorm:"size:255" json:"category"`
	ImageURL                string         `gorm:"size:500" json:"image_url"`
	Currency                string         `gorm:"size:10" json:"currency"`
	PriceFrom               float64        `json:"price_from"`
	Rating                  float64        `json:"rating"`
	ReviewCount             int            `json:"review_count"`
	Duration                string         `gorm:"size:100" json:"duration"`
	IsAvailable             bool           `gorm:"default:true" json:"is_available"`
	LastAvailabilitySyncAt  *time.Time     `json:"last_availability_sync_at"`
	RawHeadoutData          datatypes.JSON `gorm:"type:jsonb" json:"raw_headout_data"`
	LastSyncedAt            time.Time      `json:"last_synced_at"`
	CreatedAt               time.Time      `json:"created_at"`
	UpdatedAt               time.Time      `json:"updated_at"`
	DeletedAt               gorm.DeletedAt `gorm:"index" json:"-"`
}
