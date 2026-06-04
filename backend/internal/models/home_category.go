package models

import (
	"time"
)

type HomeCategory struct {
	ID          uint      `gorm:"primaryKey" json:"id"`
	Name        string    `gorm:"size:100;not null" json:"name"`
	Slug        string    `gorm:"size:100;uniqueIndex;not null" json:"slug"`
	Description string    `gorm:"size:255" json:"description"`
	ImageURL    string    `gorm:"size:500" json:"image_url"`
	IconName    string    `gorm:"size:50" json:"icon_name"`
	SortOrder   int       `gorm:"default:0" json:"sort_order"`
	IsActive    bool      `gorm:"default:true" json:"is_active"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}
