package models

import (
	"time"

	"gorm.io/gorm"
)

type Booking struct {
	ID                 uint            `gorm:"primaryKey" json:"id"`
	BookingID          string          `gorm:"uniqueIndex;not null" json:"booking_id"`
	PartnerReferenceID string          `json:"partner_reference_id"`
	SessionID          string          `json:"session_id"`
	Status             string          `gorm:"not null;default:UNCAPTURED" json:"status"`

	ProductID   string `json:"product_id"`
	ProductName string `json:"product_name"`
	VariantID   string `json:"variant_id"`
	VariantName string `json:"variant_name"`
	InventoryType string `json:"inventory_type"`

	InventoryID       string    `json:"inventory_id"`
	StartDateTime     time.Time `json:"start_date_time"`
	EndDateTime       time.Time `json:"end_date_time"`
	InventorySeatIDs  string    `gorm:"type:jsonb" json:"inventory_seat_ids"`

	CustomerCount int    `gorm:"not null;default:1" json:"customer_count"`
	Adults        int    `gorm:"not null;default:1" json:"adults"`
	Children      int    `gorm:"not null;default:0" json:"children"`
	GuestCounts   string `gorm:"type:jsonb" json:"guest_counts"`
	FirstName     string `gorm:"not null" json:"first_name"`
	LastName      string `gorm:"not null" json:"last_name"`
	Email         string `gorm:"not null" json:"email"`
	Phone         string `json:"phone"`
	CustomerData  string `gorm:"type:jsonb" json:"customer_data"`
	VariantInputFields string `gorm:"type:jsonb" json:"variant_input_fields"`

	TotalAmount   float64 `json:"total_amount"`
	CurrencyCode  string  `gorm:"default:USD" json:"currency_code"`
	OriginalAmount float64 `json:"original_amount"`
	Discount      float64 `json:"discount"`

	HeadoutReference      string `json:"headout_reference"`
	VoucherURL            string `json:"voucher_url"`
	Tickets               string `gorm:"type:jsonb" json:"tickets"`

	IdempotencyKey         string `gorm:"uniqueIndex" json:"idempotency_key"`
	SpecialRequests        string `gorm:"type:text" json:"special_requests"`
	ConfirmationEmailSent  bool   `gorm:"default:false" json:"confirmation_email_sent"`

	BookingDate     time.Time      `gorm:"not null;default:now()" json:"booking_date"`
	ExperienceDate  time.Time      `json:"experience_date"`
	CreatedAt       time.Time      `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt       time.Time      `gorm:"autoUpdateTime" json:"updated_at"`
	DeletedAt       gorm.DeletedAt `gorm:"index" json:"-"`
}
