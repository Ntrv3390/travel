package models

import (
	"time"

	"gorm.io/datatypes"
)

type ProductAvailability struct {
	ID               uint           `gorm:"primaryKey" json:"id"`
	ProductID        uint           `gorm:"index;not null" json:"product_id"`
	HeadoutProductID string         `gorm:"size:100;index" json:"headout_product_id"`
	VariantID        string         `gorm:"size:100;index" json:"variant_id"`
	VariantTitle     string         `gorm:"size:500" json:"variant_title"`
	Date             string         `gorm:"size:20" json:"date"`
	StartTime        string         `gorm:"size:20" json:"start_time"`
	EndTime          string         `gorm:"size:20" json:"end_time"`
	InventoryID      string         `gorm:"size:100" json:"inventory_id"`
	InventoryType    string         `gorm:"size:50" json:"inventory_type"`
	// Base price (fallback when per-type pricing unavailable)
	PriceAmount      float64        `json:"price_amount"`
	// Per-type pricing extracted from Headout persons[] array
	PriceAdult       *float64       `gorm:"column:price_adult" json:"price_adult,omitempty"`
	PriceChild       *float64       `gorm:"column:price_child" json:"price_child,omitempty"`
	PriceYouth       *float64       `gorm:"column:price_youth" json:"price_youth,omitempty"`
	PriceInfant      *float64       `gorm:"column:price_infant" json:"price_infant,omitempty"`
	PriceSenior      *float64       `gorm:"column:price_senior" json:"price_senior,omitempty"`
	TaxesFees        *float64       `gorm:"column:taxes_fees" json:"taxes_fees,omitempty"`
	Currency         string         `gorm:"size:10" json:"currency"`
	// Capacity tracking: always 300 on import, decremented by real bookings
	TotalCapacity    int            `gorm:"default:300;not null" json:"total_capacity"`
	RemainingCapacity int           `gorm:"default:300;not null" json:"remaining_capacity"`
	AvailableSlots   int            `json:"available_slots"`
	MaxBookableQuantity int         `gorm:"default:0" json:"max_bookable_quantity"`
	MinBookableQuantity int         `gorm:"default:1" json:"min_bookable_quantity"`
	DurationMinutes  *int           `gorm:"column:duration_minutes" json:"duration_minutes,omitempty"`
	Languages        datatypes.JSON `gorm:"type:jsonb" json:"languages,omitempty"`
	CancellationType string         `gorm:"size:50" json:"cancellation_type,omitempty"`
	BookingCutoffHrs *int           `gorm:"column:booking_cutoff_hrs" json:"booking_cutoff_hrs,omitempty"`
	RawHeadoutData   datatypes.JSON `gorm:"type:jsonb" json:"raw_headout_data"`
	CreatedAt        time.Time      `json:"created_at"`
	UpdatedAt        time.Time      `json:"updated_at"`
}

func (ProductAvailability) TableName() string {
	return "product_availabilities"
}
