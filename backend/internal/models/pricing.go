package models

import (
	"time"

	"gorm.io/gorm"
)

type PricingRule struct {
	ID                uint           `gorm:"primaryKey" json:"id"`
	Name              string         `gorm:"type:varchar(255)" json:"name"`
	AppliesTo         string         `gorm:"type:varchar(50);default:'ALL';index" json:"applies_to"`
	TargetID          *string        `gorm:"type:uuid" json:"target_id,omitempty"`
	TargetCity        *string        `gorm:"type:varchar(255);index" json:"target_city,omitempty"`
	MarkupPercentage  float64        `gorm:"type:decimal(5,2);default:0" json:"markup_percentage"`
	FixedFeeAmount    float64        `gorm:"type:decimal(10,4);default:0" json:"fixed_fee_amount"`
	FixedFeeCurrency  string         `gorm:"type:varchar(10);default:'USD'" json:"fixed_fee_currency"`
	IsActive          bool           `gorm:"default:true" json:"is_active"`
	CreatedAt         time.Time      `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt         time.Time      `gorm:"autoUpdateTime" json:"updated_at"`
	DeletedAt         gorm.DeletedAt `gorm:"index" json:"-"`
}
