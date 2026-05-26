package gttd

// ─── Top-Level Feed ────────────────────────────────────────────────────────────

type ProductFeed struct {
	FeedMetadata FeedMetadata `json:"feed_metadata"`
	Products     []Product    `json:"products"`
}

type FeedMetadata struct {
	ShardID               int    `json:"shard_id"`
	TotalShardsCount      int    `json:"total_shards_count"`
	Nonce                 int64  `json:"nonce"`
	ProcessingInstruction string `json:"processing_instruction"` // always "PROCESS_AS_SNAPSHOT"
}

// ─── Product ───────────────────────────────────────────────────────────────────

type Product struct {
	ID                string           `json:"id"`
	Title             LocalizedTextSet `json:"title"`
	Description       LocalizedTextSet `json:"description,omitempty"`
	Brand             *Brand           `json:"brand,omitempty"`
	Rating            *Rating          `json:"rating,omitempty"`
	ProductFeatures   []TextFeature    `json:"product_features,omitempty"`
	ProductCategories []Category       `json:"product_categories,omitempty"`
	RelatedLocations  []RelatedLocation `json:"related_locations,omitempty"`
	Operator          *Operator        `json:"operator,omitempty"`
	Options           []Option         `json:"options"`
	Media             []Media          `json:"media,omitempty"`
}

// ─── Option (sub-product / variant) ────────────────────────────────────────────

type Option struct {
	ID                  string            `json:"id"`
	Title               LocalizedTextSet  `json:"title"`
	LandingPage         DeepLink          `json:"landing_page"`
	LandingPageListView *DeepLink         `json:"landing_page_list_view,omitempty"`
	PriceOptions        []PriceOption     `json:"price_options"`
	CancellationPolicy  *CancellationPolicy `json:"cancellation_policy,omitempty"`
	Duration            *Duration         `json:"duration,omitempty"`
	Languages           []Language        `json:"languages,omitempty"`
	Fulfillment         *Fulfillment      `json:"fulfillment,omitempty"`
	OptionFeatures      []TextFeature     `json:"option_features,omitempty"`
	OptionCategories    []Category        `json:"option_categories,omitempty"`
}

// ─── Shared Types ──────────────────────────────────────────────────────────────

type LocalizedTextSet struct {
	LocalizedTexts []LocalizedText `json:"localized_texts"`
}

type LocalizedText struct {
	LanguageCode string `json:"language_code"`
	Text         string `json:"text"`
}

// Helper: builds a LocalizedTextSet with a single English text
func NewEnglishText(text string) LocalizedTextSet {
	return LocalizedTextSet{
		LocalizedTexts: []LocalizedText{
			{LanguageCode: "en", Text: text},
		},
	}
}

type Brand struct {
	Name LocalizedTextSet `json:"name"`
}

type Rating struct {
	AverageValue float64 `json:"average_value"`
	RatingCount  int     `json:"rating_count"`
}

type TextFeature struct {
	FeatureType string           `json:"feature_type"`
	Value       LocalizedTextSet `json:"value"`
}

type Category struct {
	CategoryType string `json:"category_type"`
}

// Category type constants
const (
	CategoryTours          = "CATEGORY_TYPE_TOURS"
	CategoryActivities     = "CATEGORY_TYPE_ACTIVITIES"
	CategoryAdmission      = "CATEGORY_TYPE_ADMISSION"
	CategorySightseeing    = "CATEGORY_TYPE_SIGHTSEEING"
	CategoryFoodAndDrink   = "CATEGORY_TYPE_FOOD_AND_DRINK"
	CategoryOutdoor        = "CATEGORY_TYPE_OUTDOOR"
	CategoryNightlife      = "CATEGORY_TYPE_NIGHTLIFE"
	CategoryTransportation = "CATEGORY_TYPE_TRANSPORTATION"
)

// Text feature type constants
const (
	FeatureInclusion = "TEXT_FEATURE_INCLUSION"
	FeatureExclusion = "TEXT_FEATURE_EXCLUSION"
	FeatureHighlight = "TEXT_FEATURE_HIGHLIGHT"
	FeatureMustKnow  = "TEXT_FEATURE_MUST_KNOW"
)

type RelatedLocation struct {
	Location     GeoLocation       `json:"location"`
	Relation     string            `json:"relation"`
	LocationName *LocalizedTextSet `json:"location_name,omitempty"`
}

type GeoLocation struct {
	PlaceID string   `json:"place_id,omitempty"`
	Address *Address `json:"address,omitempty"`
	LatLng  *LatLng  `json:"lat_lng,omitempty"`
}

type Address struct {
	SingleLineAddress string `json:"single_line_address"`
}

type LatLng struct {
	Latitude  float64 `json:"latitude"`
	Longitude float64 `json:"longitude"`
}

type Operator struct {
	Name        LocalizedTextSet  `json:"name"`
	Description *LocalizedTextSet `json:"description,omitempty"`
	PhoneNumber string            `json:"phone_number,omitempty"`
	Website     *DeepLink         `json:"website,omitempty"`
}

type Media struct {
	URL     string            `json:"url"`
	Type    string            `json:"type"`
	Caption *LocalizedTextSet  `json:"caption,omitempty"`
}

type DeepLink struct {
	URL          string        `json:"url"`
	LocalizedURL []LocalizedURL `json:"localized_url,omitempty"`
}

type LocalizedURL struct {
	LanguageCode string `json:"language_code"`
	URL          string `json:"url"`
}

// ─── PriceOption ───────────────────────────────────────────────────────────────

type PriceOption struct {
	ID    string           `json:"id"`
	Title LocalizedTextSet `json:"title"`
	Price Price            `json:"price"`
	Fees  []Fee            `json:"fees,omitempty"`
}

type Price struct {
	Value        string `json:"value"`
	CurrencyCode string `json:"currency_code"`
}

type Fee struct {
	Title   LocalizedTextSet `json:"title"`
	Price   Price            `json:"price"`
	FeeType string           `json:"fee_type"`
}

// ─── CancellationPolicy ────────────────────────────────────────────────────────

type CancellationPolicy struct {
	RefundConditions []RefundCondition `json:"refund_conditions"`
}

type RefundCondition struct {
	MinDurationBeforeStartTime Duration `json:"min_duration_before_start_time"`
	RefundPercent              int      `json:"refund_percent"`
}

// ─── Duration ─────────────────────────────────────────────────────────────────

type Duration struct {
	MinDurationSeconds int `json:"min_duration_seconds,omitempty"`
	MaxDurationSeconds int `json:"max_duration_seconds,omitempty"`
}

// Duration constants
const (
	Duration1Hour    = 3600
	Duration2Hours   = 7200
	Duration3Hours   = 10800
	Duration4Hours   = 14400
	Duration6Hours   = 21600
	Duration8Hours   = 28800
	Duration12Hours  = 43200
	Duration24Hours  = 86400
)

// ─── Language ─────────────────────────────────────────────────────────────────

type Language struct {
	LanguageCode string `json:"language_code"`
}

// ─── Fulfillment ──────────────────────────────────────────────────────────────

type Fulfillment struct {
	Mobile      bool `json:"mobile,omitempty"`
	PrintAtHome bool `json:"print_at_home,omitempty"`
	Pickup      bool `json:"pickup,omitempty"`
}

// ─── Relation types ───────────────────────────────────────────────────────────

const (
	RelationAttraction      = "RELATION_TYPE_ATTRACTION"
	RelationDeparturePoint  = "RELATION_TYPE_DEPARTURE_POINT"
)

// ─── Fee types ─────────────────────────────────────────────────────────────────

const (
	FeeIncluded    = "FEE_TYPE_INCLUDED"
	FeeAdditional  = "FEE_TYPE_ADDITIONAL"
)

// ─── Processing instruction ────────────────────────────────────────────────────

const (
	ProcessingInstruction = "PROCESS_AS_SNAPSHOT"
)

// ─── Feed status constants ─────────────────────────────────────────────────────

const (
	StatusPending    = "PENDING"
	StatusUploading  = "UPLOADING"
	StatusSuccess    = "SUCCESS"
	StatusFailed     = "FAILED"
)

// ─── Environment constants ────────────────────────────────────────────────────

const (
	EnvDev        = "dev"
	EnvProduction = "production"
)
