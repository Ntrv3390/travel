package models

import (
	"time"

	"gorm.io/gorm"
)

type RecentlyViewed struct {
	ID         uint           `gorm:"primaryKey" json:"id"`
	UserID     uint           `gorm:"index;not null" json:"user_id"`
	HeadoutID  string         `gorm:"size:100;not null" json:"headout_id"`
	Title      string         `gorm:"size:500" json:"title"`
	ImageURL   string         `gorm:"size:500" json:"image_url"`
	Price      float64        `json:"price"`
	Currency   string         `gorm:"size:10" json:"currency"`
	Rating     float64        `json:"rating"`
	ReviewCount int           `json:"review_count"`
	City       string         `gorm:"size:255" json:"city"`
	Category   string         `gorm:"size:255" json:"category"`
	Slug       string         `gorm:"size:500" json:"slug"`
	Duration   string         `gorm:"size:100" json:"duration"`
	ViewedAt   time.Time      `json:"viewed_at"`
	CreatedAt  time.Time      `json:"created_at"`
	UpdatedAt  time.Time      `json:"updated_at"`
	DeletedAt  gorm.DeletedAt `gorm:"index" json:"-"`
}
