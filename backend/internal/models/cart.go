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
	ID           uint      `gorm:"primaryKey" json:"id"`
	CartID       uint      `gorm:"not null;index" json:"cart_id"`
	UUID         string    `gorm:"uniqueIndex;not null" json:"uuid"`
	ExperienceID string    `json:"experience_id"`
	VariantID    string    `json:"variant_id"`
	InventoryID  string    `json:"inventory_id,omitempty"`
	Date         string    `json:"date"`
	Adults       int       `json:"adults"`
	Children     int       `json:"children"`
	FirstName    string    `json:"first_name,omitempty"`
	LastName     string    `json:"last_name,omitempty"`
	Email        string    `json:"email,omitempty"`
	Phone        string    `json:"phone,omitempty"`
	PriceAmount  float64   `json:"price_amount,omitempty"`
	Currency     string    `json:"currency,omitempty"`
	Title        string    `json:"title,omitempty"`
	ImageURL     string    `json:"image_url,omitempty"`
	CreatedAt    time.Time `gorm:"autoCreateTime" json:"created_at"`
}
