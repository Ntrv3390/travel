package models

import (
	"time"

	"gorm.io/gorm"
)

// PricingRule represents dynamic pricing rules
type PricingRule struct {
	ID               uint           `gorm:"primaryKey" json:"id"`
	ExperienceID     uint           `gorm:"not null" json:"experience_id"`
	MarkupPercentage float64        `json:"markup_percentage"`
	FixedFee         float64        `json:"fixed_fee"`
	Currency         string         `json:"currency"`
	MinPrice         float64        `json:"min_price"`
	MaxPrice         float64        `json:"max_price"`
	Status           string         `gorm:"default:'active'" json:"status"`
	CreatedAt        time.Time      `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt        time.Time      `gorm:"autoUpdateTime" json:"updated_at"`
	DeletedAt        gorm.DeletedAt `gorm:"index" json:"-"`
}
