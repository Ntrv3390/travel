package models

import (
	"time"
)

type HomeCollection struct {
	ID              uint      `gorm:"primaryKey" json:"id"`
	Title           string    `gorm:"size:200;not null" json:"title"`
	Slug            string    `gorm:"size:100;uniqueIndex;not null" json:"slug"`
	Description     string    `gorm:"size:255" json:"description"`
	ImageURL        string    `gorm:"size:500" json:"image_url"`
	ExperienceCount int       `gorm:"default:0" json:"experience_count"`
	SortOrder       int       `gorm:"default:0" json:"sort_order"`
	IsActive        bool      `gorm:"default:true" json:"is_active"`
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at"`
}
