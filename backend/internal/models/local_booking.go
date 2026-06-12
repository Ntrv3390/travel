package models

import (
	"time"

	"gorm.io/datatypes"
)

type LocalBooking struct {
	ID               uint           `gorm:"primaryKey" json:"id"`
	BookingRef       string         `gorm:"size:50;uniqueIndex;not null" json:"booking_ref"`
	HeadoutProductID string         `gorm:"size:100;not null" json:"headout_product_id"`
	ProductName      string         `gorm:"size:500" json:"product_name"`
	VariantID        string         `gorm:"size:100" json:"variant_id"`
	VariantName      string         `gorm:"size:500" json:"variant_name"`
	AvailabilityID   *uint          `gorm:"index" json:"availability_id,omitempty"`
	Date             string         `gorm:"size:20;not null" json:"date"`
	StartTime        string         `gorm:"size:20" json:"start_time"`
	TotalPax         int            `gorm:"not null" json:"total_pax"`
	GuestCounts      datatypes.JSON `gorm:"type:jsonb" json:"guest_counts"`
	FirstName        string         `gorm:"size:128" json:"first_name"`
	LastName         string         `gorm:"size:128" json:"last_name"`
	Email            string         `gorm:"size:320;index;not null" json:"email"`
	Phone            string         `gorm:"size:50" json:"phone"`
	SpecialRequests  string         `gorm:"type:text" json:"special_requests"`
	TotalAmount      float64        `json:"total_amount"`
	CurrencyCode     string         `gorm:"size:10" json:"currency_code"`
	Status           string         `gorm:"size:30;not null;default:CONFIRMED" json:"status"`
	IdempotencyKey   string         `gorm:"size:255" json:"idempotency_key,omitempty"`
	ConfirmationSent bool           `gorm:"default:false" json:"confirmation_sent"`
	CreatedAt        time.Time      `json:"created_at"`
	UpdatedAt        time.Time      `json:"updated_at"`
}

func (LocalBooking) TableName() string {
	return "local_bookings"
}
