package models

import (
	"time"

	"gorm.io/datatypes"
	"gorm.io/gorm"
)

type CityImageJSON struct {
	URL string `json:"url"`
}

type CityCountryJSON struct {
	Code string `json:"code"`
	Name string `json:"name"`
}

type City struct {
	ID             uint           `gorm:"primaryKey" json:"id"`
	Code           string         `gorm:"uniqueIndex;size:100;not null" json:"code"`
	Name           string         `gorm:"size:255;not null" json:"name"`
	ImageURL       string         `gorm:"size:500" json:"image_url"`
	CountryCode    string         `gorm:"size:10" json:"country_code"`
	CountryName    string         `gorm:"size:255" json:"country_name"`
	Timezone       string         `gorm:"size:100" json:"timezone"`
	RawHeadoutData datatypes.JSON `gorm:"type:jsonb" json:"raw_headout_data"`
	LastSyncedAt   time.Time      `json:"last_synced_at"`
	CreatedAt      time.Time      `json:"created_at"`
	UpdatedAt      time.Time      `json:"updated_at"`
	DeletedAt      gorm.DeletedAt `gorm:"index" json:"-"`
}
