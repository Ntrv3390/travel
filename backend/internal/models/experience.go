package models

import (
	"time"

	"gorm.io/gorm"
)

// Experience represents a travel experience from Headout
type Experience struct {
	ID               uint            `gorm:"primaryKey" json:"id"`
	HeadoutID        string          `gorm:"uniqueIndex;not null" json:"headout_id"`
	Title            string          `gorm:"not null" json:"title"`
	Description      string          `gorm:"type:text" json:"description"`
	Category         string          `json:"category"`
	Location         string          `json:"location"`
	Latitude         float64         `json:"latitude"`
	Longitude        float64         `json:"longitude"`
	POI_ID           string          `json:"poi_id"` // For Google Things to Do
	Duration         string          `json:"duration"`
	MinGroupSize     int             `json:"min_group_size"`
	MaxGroupSize     int             `json:"max_group_size"`
	Price            float64         `json:"price"`
	Currency         string          `json:"currency"`
	Rating           float32         `json:"rating"`
	ReviewCount      int             `json:"review_count"`
	ImageURL         string          `json:"image_url"`
	Tags             string          `gorm:"type:text" json:"tags"` // JSON array as string
	Availability     string          `gorm:"type:text" json:"availability"`
	Status           string          `gorm:"default:'active'" json:"status"` // active, inactive
	LastSyncedAt     *time.Time      `json:"last_synced_at"`
	CreatedAt        time.Time       `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt        time.Time       `gorm:"autoUpdateTime" json:"updated_at"`
	DeletedAt        gorm.DeletedAt  `gorm:"index" json:"-"`
}

type ExperienceResponse struct {
	ID              uint    `json:"id"`
	HeadoutID       string  `json:"headout_id"`
	Title           string  `json:"title"`
	Description     string  `json:"description"`
	Category        string  `json:"category"`
	Location        string  `json:"location"`
	Latitude        float64 `json:"latitude"`
	Longitude       float64 `json:"longitude"`
	Duration        string  `json:"duration"`
	Price           float64 `json:"price"`
	Currency        string  `json:"currency"`
	Rating          float32 `json:"rating"`
	ReviewCount     int     `json:"review_count"`
	ImageURL        string  `json:"image_url"`
	DiscountedPrice float64 `json:"discounted_price"`
}
