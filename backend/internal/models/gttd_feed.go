package models

import (
	"time"

	"gorm.io/datatypes"
	"gorm.io/gorm"
)

// ExperienceOption represents a variant of an experience
type ExperienceOption struct {
	ID                   string         `gorm:"primaryKey;type:uuid;default:gen_random_uuid()" json:"id"`
	ExperienceID         string         `gorm:"type:uuid;index" json:"experience_id"`
	HeadoutVariantID     string         `json:"headout_variant_id"`
	Title                string         `gorm:"not null" json:"title"`
	Description          string         `gorm:"type:text" json:"description"`
	BasePriceAmount      float64        `gorm:"type:numeric(12,4)" json:"base_price_amount"`
	BasePriceCurrency    string         `gorm:"type:varchar(10)" json:"base_price_currency"`
	FulfillmentMobile    bool           `gorm:"default:true" json:"fulfillment_mobile"`
	FulfillmentPrint     bool           `gorm:"default:false" json:"fulfillment_print"`
	FulfillmentPickup    bool           `gorm:"default:false" json:"fulfillment_pickup"`
	Inclusions           datatypes.JSONSlice `gorm:"type:text[]" json:"inclusions"`
	Exclusions           datatypes.JSONSlice `gorm:"type:text[]" json:"exclusions"`
	Highlights           datatypes.JSONSlice `gorm:"type:text[]" json:"highlights"`
	IsActive             bool           `gorm:"default:true" json:"is_active"`
	CreatedAt            time.Time      `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt            time.Time      `gorm:"autoUpdateTime" json:"updated_at"`

	// Relations
	Experience *Experience `gorm:"foreignKey:ExperienceID" json:"-"`
}

// TableName specifies the table name
func (ExperienceOption) TableName() string {
	return "experience_options"
}

// PricingRule defines markup and fees for pricing
type PricingRule struct {
	ID                 string    `gorm:"primaryKey;type:uuid;default:gen_random_uuid()" json:"id"`
	Name               string    `gorm:"type:varchar(255)" json:"name"`
	AppliesTo          string    `gorm:"type:varchar(50);default:'ALL'" json:"applies_to"` // ALL, CITY, EXPERIENCE
	TargetID           *string   `gorm:"type:uuid" json:"target_id"`                       // experience_id if applies_to = EXPERIENCE
	TargetCity         *string   `gorm:"type:varchar(255)" json:"target_city"`             // city name if applies_to = CITY
	MarkupPercentage   float64   `gorm:"type:numeric(5,2);default:0" json:"markup_percentage"`
	FixedFeeAmount     float64   `gorm:"type:numeric(10,4);default:0" json:"fixed_fee_amount"`
	FixedFeeCurrency   string    `gorm:"type:varchar(10);default:'USD'" json:"fixed_fee_currency"`
	IsActive           bool      `gorm:"default:true" json:"is_active"`
	CreatedAt          time.Time `gorm:"autoCreateTime" json:"created_at"`
}

// TableName specifies the table name
func (PricingRule) TableName() string {
	return "pricing_rules"
}

// GoogleFeedStatus tracks GTTD feed upload status
type GoogleFeedStatus struct {
	ID               string     `gorm:"primaryKey;type:uuid;default:gen_random_uuid()" json:"id"`
	Environment      string     `gorm:"type:varchar(20);index" json:"environment"` // dev or production
	UploadStartedAt  *time.Time `json:"upload_started_at"`
	UploadCompletedAt *time.Time `json:"upload_completed_at"`
	Status           string     `gorm:"type:varchar(50)" json:"status"` // PENDING, UPLOADING, SUCCESS, FAILED
	ProductCount     int        `gorm:"default:0" json:"product_count"`
	ShardCount       int        `gorm:"default:1" json:"shard_count"`
	Nonce            *int64     `json:"nonce"`
	FilePaths        datatypes.JSONSlice `gorm:"type:text[]" json:"file_paths"`
	ErrorMessage     *string    `gorm:"type:text" json:"error_message"`
	CreatedAt        time.Time  `gorm:"autoCreateTime" json:"created_at"`
}

// TableName specifies the table name
func (GoogleFeedStatus) TableName() string {
	return "google_feed_status"
}

// POIMapping maps Headout locations to Google Maps Place IDs
type POIMapping struct {
	ID                  string     `gorm:"primaryKey;type:uuid;default:gen_random_uuid()" json:"id"`
	HeadoutLocationName *string    `gorm:"type:varchar(500)" json:"headout_location_name"`
	HeadoutCity         *string    `gorm:"type:varchar(255);index" json:"headout_city"`
	GooglePlaceID       string     `gorm:"type:varchar(500);unique;index" json:"google_place_id"`
	GooglePlaceName     *string    `gorm:"type:varchar(500)" json:"google_place_name"`
	Latitude            *float64   `gorm:"type:numeric(10,8)" json:"latitude"`
	Longitude           *float64   `gorm:"type:numeric(11,8)" json:"longitude"`
	IsVerified          bool       `gorm:"default:false" json:"is_verified"`
	CreatedAt           time.Time  `gorm:"autoCreateTime" json:"created_at"`
}

// TableName specifies the table name
func (POIMapping) TableName() string {
	return "poi_mappings"
}

// UpdateExperience to include new GTTD fields
type ExperienceGTTD struct {
	ID                 string                 `gorm:"primaryKey;type:uuid" json:"id"`
	HeadoutID          string                 `gorm:"unique;index" json:"headout_id"`
	Title              string                 `json:"title"`
	Description        string                 `gorm:"type:text" json:"description"`
	City               string                 `json:"city"`
	Country            string                 `json:"country"`
	Latitude           float64                `json:"latitude"`
	Longitude          float64                `json:"longitude"`
	POIID              string                 `json:"poi_id"`
	POIName            string                 `json:"poi_name"`
	HeadoutRating      float64                `json:"headout_rating"`
	HeadoutReviewCount int                    `json:"headout_review_count"`
	Images             datatypes.JSONType     `gorm:"type:jsonb" json:"images"`
	OperatorName       string                 `json:"operator_name"`
	OperatorDescription string                `gorm:"type:text" json:"operator_description"`
	Categories         datatypes.JSONSlice   `gorm:"type:text[]" json:"categories"`
	Languages          datatypes.JSONSlice   `gorm:"type:text[]" json:"languages"`
	DurationMinSeconds int                    `json:"duration_min_seconds"`
	DurationMaxSeconds int                    `json:"duration_max_seconds"`
	CancellationPolicy datatypes.JSONType     `gorm:"type:jsonb" json:"cancellation_policy"`
	RawHeadoutData     datatypes.JSONType     `gorm:"type:jsonb" json:"raw_headout_data"`
	IsActive           bool                   `gorm:"default:true" json:"is_active"`
	GTTDEnabled        bool                   `gorm:"default:false;index" json:"gttd_enabled"`
	CreatedAt          time.Time              `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt          time.Time              `gorm:"autoUpdateTime" json:"updated_at"`
	DeletedAt          gorm.DeletedAt         `gorm:"index" json:"-"`

	// Relations
	Options []ExperienceOption `gorm:"foreignKey:ExperienceID" json:"options"`
}
