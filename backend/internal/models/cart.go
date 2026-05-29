package models

import "time"

type Cart struct {
	ID        uint       `gorm:"primaryKey" json:"id"`
	SessionID string     `gorm:"uniqueIndex;not null" json:"session_id"`
	UserID    string     `json:"user_id"`
	CreatedAt time.Time  `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt time.Time  `gorm:"autoUpdateTime" json:"updated_at"`
	Items     []CartItem `gorm:"foreignKey:CartID" json:"items"`
}

type CartItem struct {
	ID            uint      `gorm:"primaryKey" json:"id"`
	CartID        uint      `gorm:"not null;index" json:"cart_id"`
	UUID          string    `gorm:"uniqueIndex;not null" json:"uuid"`
	ExperienceID  string    `json:"experience_id"`
	ProductID     string    `json:"product_id"`
	VariantID     string    `json:"variant_id"`
	InventoryID   string    `json:"inventory_id"`
	InventoryType string    `json:"inventory_type"`
	Date          string    `json:"date"`
	StartDateTime string    `json:"start_date_time"`
	EndDateTime   string    `json:"end_date_time"`
	Adults        int       `json:"adults"`
	Children      int       `json:"children"`
	GuestCounts   string    `gorm:"type:jsonb" json:"guest_counts"`
	FirstName     string    `json:"first_name"`
	LastName      string    `json:"last_name"`
	Email         string    `json:"email"`
	Phone         string    `json:"phone"`
	PriceAmount   float64   `json:"price_amount"`
	Currency      string    `json:"currency"`
	Title         string    `json:"title"`
	ImageURL      string    `json:"image_url"`
	CreatedAt     time.Time `gorm:"autoCreateTime" json:"created_at"`
}
