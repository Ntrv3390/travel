package models

import (
	"time"

	"gorm.io/gorm"
)

type Visitor struct {
	ID         uint           `gorm:"primaryKey" json:"id"`
	IP         string         `gorm:"uniqueIndex:idx_visitor_ip;not null" json:"ip"`
	Country    string         `json:"country"`
	City       string         `json:"city"`
	Region     string         `json:"region"`
	ISP        string         `json:"isp"`
	UserAgent  string         `gorm:"type:text" json:"user_agent"`
	Referrer   string         `gorm:"type:text" json:"referrer"`
	PageURL    string         `gorm:"type:text" json:"page_url"`
	FirstVisit time.Time      `gorm:"autoCreateTime" json:"first_visit"`
	LastVisit  time.Time      `json:"last_visit"`
	VisitCount int            `gorm:"default:1" json:"visit_count"`
	CreatedAt  time.Time      `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt  time.Time      `gorm:"autoUpdateTime" json:"updated_at"`
	DeletedAt  gorm.DeletedAt `gorm:"index" json:"-"`
}
