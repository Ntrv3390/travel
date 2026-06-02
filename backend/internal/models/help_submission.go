package models

import (
	"time"

	"gorm.io/gorm"
)

type HelpSubmission struct {
	ID        uint           `gorm:"primaryKey" json:"id"`
	Name      string         `gorm:"not null" json:"name"`
	Email     string         `gorm:"not null" json:"email"`
	Subject   string         `gorm:"not null" json:"subject"`
	Message   string         `gorm:"type:text;not null" json:"message"`
	CreatedAt time.Time      `gorm:"autoCreateTime" json:"created_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}
