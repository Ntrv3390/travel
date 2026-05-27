package models

import (
	"time"

	"gorm.io/gorm"
)

// Booking represents a booking record
type Booking struct {
	ID                uint            `gorm:"primaryKey" json:"id"`
	BookingID         string          `gorm:"uniqueIndex;not null" json:"booking_id"`
	UserID            string          `gorm:"not null" json:"user_id"`
	ExperienceID      uint            `gorm:"not null" json:"experience_id"`
	HeadoutReference  string          `json:"headout_reference"`
	Status            string          `gorm:"not null" json:"status"` // Pending, Confirmed, Cancelled
	Quantity          int             `gorm:"not null" json:"quantity"`
	TotalPrice        float64         `json:"total_price"`
	Currency          string          `json:"currency"`
	BookingDate       time.Time       `json:"booking_date"`
	ExperienceDate    time.Time       `json:"experience_date"`
	ExperienceTime    string          `json:"experience_time"`
	CustomerEmail     string          `json:"customer_email"`
	CustomerPhone     string          `json:"customer_phone"`
	SpecialRequests   string          `gorm:"type:text" json:"special_requests"`
	IdempotencyKey    string          `gorm:"uniqueIndex" json:"idempotency_key"`
	ConfirmationEmail string          `json:"confirmation_email"`
	CreatedAt         time.Time       `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt         time.Time       `gorm:"autoUpdateTime" json:"updated_at"`
	DeletedAt         gorm.DeletedAt  `gorm:"index" json:"-"`
}
