package models

import (
	"time"
)

type Testimonial struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	Name      string    `gorm:"size:100;not null" json:"name"`
	Location  string    `gorm:"size:100" json:"location"`
	Text      string    `gorm:"type:text;not null" json:"text"`
	Rating    int       `gorm:"default:5" json:"rating"`
	Avatar    string    `gorm:"size:10" json:"avatar"`
	Color     string    `gorm:"size:100" json:"color"`
	SortOrder int       `gorm:"default:0" json:"sort_order"`
	IsActive  bool      `gorm:"default:true" json:"is_active"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}
