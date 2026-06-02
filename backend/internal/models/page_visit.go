package models

import (
	"time"

	"gorm.io/gorm"
)

type PageVisit struct {
	ID        uint           `gorm:"primaryKey" json:"id"`
	VisitorID uint           `gorm:"not null;index" json:"visitor_id"`
	Pathname  string         `gorm:"not null;index" json:"pathname"`
	VisitedAt time.Time      `gorm:"autoCreateTime" json:"visited_at"`
	CreatedAt time.Time      `gorm:"autoCreateTime" json:"created_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}
