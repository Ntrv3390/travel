package models

import (
	"time"

	"gorm.io/datatypes"
)

type ProductAvailability struct {
	ID              uint           `gorm:"primaryKey" json:"id"`
	ProductID       uint           `gorm:"index;not null" json:"product_id"`
	HeadoutProductID string        `gorm:"size:100;index" json:"headout_product_id"`
	VariantID       string         `gorm:"size:100;index" json:"variant_id"`
	VariantTitle    string         `gorm:"size:500" json:"variant_title"`
	Date            string         `gorm:"size:20" json:"date"`
	StartTime       string         `gorm:"size:20" json:"start_time"`
	EndTime         string         `gorm:"size:20" json:"end_time"`
	InventoryID     string         `gorm:"size:100" json:"inventory_id"`
	InventoryType   string         `gorm:"size:50" json:"inventory_type"`
	PriceAmount     float64        `json:"price_amount"`
	Currency        string         `gorm:"size:10" json:"currency"`
	AvailableSlots  int            `json:"available_slots"`
	RawHeadoutData  datatypes.JSON `gorm:"type:jsonb" json:"raw_headout_data"`
	CreatedAt       time.Time      `json:"created_at"`
	UpdatedAt       time.Time      `json:"updated_at"`
}

func (ProductAvailability) TableName() string {
	return "product_availabilities"
}
