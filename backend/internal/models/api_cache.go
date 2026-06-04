package models

import (
	"time"

	"gorm.io/datatypes"
)

type APICache struct {
	ID        uint           `gorm:"primaryKey" json:"id"`
	Endpoint  string         `gorm:"uniqueIndex;size:200;not null" json:"endpoint"`
	Response  datatypes.JSON `gorm:"type:jsonb;not null" json:"response"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
}
