# Google Things to Do (GTTD) — Complete Implementation Guide
## For Traviia Go/Gin Backend (AI Agent Reference)

> **Purpose:** This document is the single source of truth for implementing Google Things to Do integration in the Traviia Go + Gin backend. Every struct, route, worker, feed format, SFTP upload mechanism, and JSON-LD schema is defined here. The AI agent must follow this document exactly without deviation.

---

## Table of Contents

1. [Concept Summary](#1-concept-summary)
2. [How GTTD Works — Data Flow](#2-how-gttd-works--data-flow)
3. [Onboarding & Approval Process](#3-onboarding--approval-process)
4. [Feed Architecture](#4-feed-architecture)
5. [Go Directory Structure](#5-go-directory-structure)
6. [Database Schema](#6-database-schema)
7. [Go Structs — Feed Types](#7-go-structs--feed-types)
8. [Pricing Rules — Critical Consistency Requirement](#8-pricing-rules--critical-consistency-requirement)
9. [Feed Generator Service](#9-feed-generator-service)
10. [SFTP Upload Worker](#10-sftp-upload-worker)
11. [Gin API Routes](#11-gin-api-routes)
12. [JSON-LD Schema for Next.js PDPs](#12-json-ld-schema-for-nextjs-pdps)
13. [Action Center & Error Monitoring](#13-action-center--error-monitoring)
14. [Environment Variables](#14-environment-variables)
15. [Cron Schedule](#15-cron-schedule)
16. [Critical Rules — Do NOT Violate](#16-critical-rules--do-not-violate)
17. [Checklist Before Going Live](#17-checklist-before-going-live)

---

## 1. Concept Summary

Google Things to Do (GTTD) is a platform that displays travel experiences (tours, tickets, activities) on Google Search, Google Maps, and Google Travel. Traviia acts as an **OTA (Online Travel Agency)** that submits a product feed to Google via SFTP. Google then surfaces Traviia's listings when users search for "things to do in [city]" or similar queries.

**What Google shows:**
- Experience title, price, rating, image
- A deep link directly to the Traviia product detail page (PDP)
- An "Official Site" or "Tickets" badge

**What Traviia must provide:**
- A valid JSON product feed uploaded to Google's SFTP endpoint
- JSON-LD structured data on every Next.js PDP
- Price consistency: feed price = page price = checkout price

---

## 2. How GTTD Works — Data Flow

```
Headout API
    │
    ▼
Go Sync Worker (populates DB)
    │
    ▼
PostgreSQL: experiences + pricing_rules tables
    │
    ▼
Go Feed Generator (builds ProductFeed JSON)
    │
    ▼
SFTP Upload Worker ──────────────────────► Google SFTP Endpoint
                                                │
                                                ▼
                                        Google Action Center
                                        (processes & validates)
                                                │
                                                ▼
                                     Google Search / Maps / Travel
                                                │
                                                ▼
                                     User clicks → Traviia PDP
                                                │
                                                ▼
                              Next.js PDP with JSON-LD (price must match feed)
```

---

## 3. Onboarding & Approval Process

> **The AI agent does NOT handle this. This is a manual business step. Document it here for reference.**

### Step 1 — Submit Interest Form
- URL: https://developers.google.com/actions-center/verticals/things-to-do/overview
- Fill the partner interest form. Traviia qualifies as an OTA/marketplace for direct integration.

### Step 2 — Sign Content License Agreement
- Google will send a CLA after reviewing the interest form.
- Must be signed before any technical work begins.

### Step 3 — Designate Technical Contact
- Google assigns a Technical Account Manager (TAM).
- Provide the technical contact's email during the interest form submission.

### Step 4 — Generate SSH Key Pair & Send to Google
```bash
# Run this on the server or CI machine
ssh-keygen -t ed25519 -C "traviia-gttd-sftp" -f ~/.ssh/gttd_sftp_key

# Public key to send to Google:
cat ~/.ssh/gttd_sftp_key.pub

# Private key — store in secret manager, never commit to Git
cat ~/.ssh/gttd_sftp_key
```

### Step 5 — Receive SFTP Credentials
Google provisions two SFTP endpoints:
- `sftp-dev.things-to-do.google.com` — for testing
- `sftp-prod.things-to-do.google.com` — for production

Credentials will include:
- SFTP host
- SFTP port (usually 22)
- SFTP username
- Remote directory path

Store ALL of these in environment variables. See [Section 14](#14-environment-variables).

### Step 6 — Upload Test Feed to Dev Endpoint
- Use the feed generator to produce a valid JSON file
- Upload to dev SFTP
- Check Action Center for validation errors
- Fix all errors before moving to production

### Step 7 — Go Live
- Upload to production SFTP endpoint
- Confirm listings appear in Action Center with status `ACTIVE`

---

## 4. Feed Architecture

### Feed Format
- **File format:** JSON (`.json`)
- **Upload method:** SFTP using SSH key authentication
- **Update type:** FULL SNAPSHOT only — no incremental updates. Every upload replaces ALL previous data.
- **Upload frequency:** Daily recommended. Minimum once every 30 days (or all products are taken down).
- **Multiple files:** Allowed if feed is large. All files in one transfer = one logical feed via `shard_id` + `nonce`.

### Feed Object Hierarchy

```
ProductFeed
├── feed_metadata         (required)
│   ├── shard_id          int — 0-indexed shard number
│   ├── total_shards_count int — total number of shards in this upload
│   ├── nonce             int64 — same value across all shards of one transfer
│   └── processing_instruction string — always "PROCESS_AS_SNAPSHOT"
│
└── products[]            (array of Product objects)
    ├── id                string — your internal unique ID (alphanumeric, _, -)
    ├── title             LocalizedTextSet
    ├── description       LocalizedTextSet (HTML allowed: <p>, <ul>, <li>, <b>, <em>)
    ├── brand             Brand
    ├── rating            Rating (average_value, rating_count)
    ├── product_features[]  TextFeature (inclusions, exclusions, highlights)
    ├── product_categories[] Category
    ├── related_locations[] RelatedLocation (links to POI via Google Place ID)
    ├── operator          Operator
    └── options[]         (array of Option objects — required, min 1)
        ├── id            string — unique within the product
        ├── title         LocalizedTextSet
        ├── landing_page  DeepLink (URL to your Next.js PDP)
        ├── landing_page_list_view DeepLink (URL to search/listing page)
        ├── price_options[] PriceOption (required, min 1)
        │   ├── id        string
        │   ├── title     LocalizedTextSet (e.g., "Adult", "Child")
        │   ├── price     Price (value + currency_code)
        │   └── fees      Fee[] (optional — booking fees)
        ├── cancellation_policy CancellationPolicy
        ├── duration      Duration (min/max seconds)
        ├── languages[]   Language
        ├── fulfillment   Fulfillment (mobile, print_at_home, pickup)
        └── option_features[] TextFeature
```

### Supported Product Categories
Use these exact strings in the `category_type` field:

| Category String | Use For |
|---|---|
| `CATEGORY_TYPE_TOURS` | Guided tours |
| `CATEGORY_TYPE_ACTIVITIES` | Activities & experiences |
| `CATEGORY_TYPE_ADMISSION` | Entry tickets to attractions |
| `CATEGORY_TYPE_SIGHTSEEING` | Sightseeing tours |
| `CATEGORY_TYPE_FOOD_AND_DRINK` | Food tours, tastings |
| `CATEGORY_TYPE_OUTDOOR` | Outdoor adventures |
| `CATEGORY_TYPE_NIGHTLIFE` | Night tours, shows |
| `CATEGORY_TYPE_TRANSPORTATION` | Transfers, cruises |

---

## 5. Go Directory Structure

```
internal/
├── gttd/
│   ├── feed_generator.go       # Builds the ProductFeed JSON from DB
│   ├── feed_types.go           # All Go structs for the feed
│   ├── sftp_uploader.go        # SFTP upload logic
│   ├── jsonld_builder.go       # Builds JSON-LD for Next.js API
│   ├── poi_mapper.go           # Maps Headout location → Google Place ID
│   └── worker.go               # Cron worker that orchestrates the whole flow
│
internal/
├── pricing/
│   └── engine.go               # PricingEngine — SINGLE SOURCE OF TRUTH for prices
```

**Critical rule:** The `PricingEngine` in `pricing/engine.go` must be the ONLY place prices are calculated. Both the feed generator AND the JSON-LD builder AND the checkout handler must call this same function. Never hardcode or duplicate pricing logic.

---

## 6. Database Schema

### Table: `experiences`

```sql
CREATE TABLE experiences (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    headout_id      VARCHAR(255) UNIQUE NOT NULL,
    title           VARCHAR(500) NOT NULL,
    description     TEXT,
    city            VARCHAR(255),
    country         VARCHAR(255),
    latitude        DECIMAL(10, 8),
    longitude       DECIMAL(11, 8),
    poi_id          VARCHAR(500),          -- Google Maps Place ID (e.g., "ChIJN1t_tDeuEmsRUsoyG83frY4")
    poi_name        VARCHAR(500),          -- Human-readable POI name
    headout_rating  DECIMAL(3, 2),
    headout_review_count INT DEFAULT 0,
    images          JSONB,                 -- Array of {url, caption}
    operator_name   VARCHAR(255),
    operator_description TEXT,
    categories      TEXT[],                -- Array of CATEGORY_TYPE_* strings
    languages       TEXT[],                -- Array of language codes e.g., ["en", "hi"]
    duration_min_seconds INT,
    duration_max_seconds INT,
    cancellation_policy JSONB,
    raw_headout_data JSONB,
    is_active       BOOLEAN DEFAULT true,
    gttd_enabled    BOOLEAN DEFAULT false, -- Only true after POI is mapped & verified
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_experiences_headout_id ON experiences(headout_id);
CREATE INDEX idx_experiences_gttd_enabled ON experiences(gttd_enabled);
CREATE INDEX idx_experiences_city ON experiences(city);
```

### Table: `experience_options`

```sql
CREATE TABLE experience_options (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    experience_id   UUID REFERENCES experiences(id) ON DELETE CASCADE,
    headout_variant_id VARCHAR(255),
    title           VARCHAR(500) NOT NULL,
    description     TEXT,
    base_price_amount DECIMAL(12, 4) NOT NULL,   -- Raw price from Headout (before markup)
    base_price_currency VARCHAR(10) NOT NULL,
    fulfillment_mobile    BOOLEAN DEFAULT true,
    fulfillment_print     BOOLEAN DEFAULT false,
    fulfillment_pickup    BOOLEAN DEFAULT false,
    inclusions      TEXT[],
    exclusions      TEXT[],
    highlights      TEXT[],
    is_active       BOOLEAN DEFAULT true,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_experience_options_experience_id ON experience_options(experience_id);
```

### Table: `pricing_rules`

```sql
CREATE TABLE pricing_rules (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(255),
    applies_to      VARCHAR(50) DEFAULT 'ALL',    -- 'ALL', 'CITY', 'EXPERIENCE'
    target_id       UUID,                          -- experience_id if applies_to = 'EXPERIENCE'
    target_city     VARCHAR(255),                  -- city name if applies_to = 'CITY'
    markup_percentage DECIMAL(5, 2) DEFAULT 0,     -- e.g., 15.00 = 15%
    fixed_fee_amount  DECIMAL(10, 4) DEFAULT 0,    -- flat fee added after markup
    fixed_fee_currency VARCHAR(10) DEFAULT 'USD',
    is_active       BOOLEAN DEFAULT true,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

### Table: `google_feed_status`

```sql
CREATE TABLE google_feed_status (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    environment     VARCHAR(20) NOT NULL,           -- 'dev' or 'production'
    upload_started_at   TIMESTAMPTZ,
    upload_completed_at TIMESTAMPTZ,
    status          VARCHAR(50),                    -- 'PENDING', 'UPLOADING', 'SUCCESS', 'FAILED'
    product_count   INT DEFAULT 0,
    shard_count     INT DEFAULT 1,
    nonce           BIGINT,
    file_paths      TEXT[],                         -- local file paths of generated JSON
    error_message   TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_google_feed_status_env ON google_feed_status(environment);
```

### Table: `poi_mappings`

```sql
CREATE TABLE poi_mappings (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    headout_location_name VARCHAR(500),
    headout_city    VARCHAR(255),
    google_place_id VARCHAR(500) UNIQUE NOT NULL,   -- e.g., "ChIJN1t_tDeuEmsRUsoyG83frY4"
    google_place_name VARCHAR(500),
    latitude        DECIMAL(10, 8),
    longitude       DECIMAL(11, 8),
    is_verified     BOOLEAN DEFAULT false,           -- manually verified by team
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 7. Go Structs — Feed Types

**File: `internal/gttd/feed_types.go`**

```go
package gttd

// ─── Top-Level Feed ────────────────────────────────────────────────────────────

type ProductFeed struct {
    FeedMetadata FeedMetadata `json:"feed_metadata"`
    Products     []Product    `json:"products"`
}

type FeedMetadata struct {
    ShardID              int    `json:"shard_id"`
    TotalShardsCount     int    `json:"total_shards_count"`
    Nonce                int64  `json:"nonce"`
    ProcessingInstruction string `json:"processing_instruction"` // always "PROCESS_AS_SNAPSHOT"
}

// ─── Product ───────────────────────────────────────────────────────────────────

type Product struct {
    ID               string           `json:"id"`
    Title            LocalizedTextSet `json:"title"`
    Description      LocalizedTextSet `json:"description,omitempty"`
    Brand            *Brand           `json:"brand,omitempty"`
    Rating           *Rating          `json:"rating,omitempty"`
    ProductFeatures  []TextFeature    `json:"product_features,omitempty"`
    ProductCategories []Category      `json:"product_categories,omitempty"`
    RelatedLocations []RelatedLocation `json:"related_locations,omitempty"`
    Operator         *Operator        `json:"operator,omitempty"`
    Options          []Option         `json:"options"`                     // REQUIRED: min 1
    Media            []Media          `json:"media,omitempty"`
}

// ─── Option (sub-product / variant) ────────────────────────────────────────────

type Option struct {
    ID                  string           `json:"id"`
    Title               LocalizedTextSet `json:"title"`
    LandingPage         DeepLink         `json:"landing_page"`               // REQUIRED
    LandingPageListView *DeepLink        `json:"landing_page_list_view,omitempty"`
    PriceOptions        []PriceOption    `json:"price_options"`              // REQUIRED: min 1
    CancellationPolicy  *CancellationPolicy `json:"cancellation_policy,omitempty"`
    Duration            *Duration        `json:"duration,omitempty"`
    Languages           []Language       `json:"languages,omitempty"`
    Fulfillment         *Fulfillment     `json:"fulfillment,omitempty"`
    OptionFeatures      []TextFeature    `json:"option_features,omitempty"`
    OptionCategories    []Category       `json:"option_categories,omitempty"`
}

// ─── Shared Types ──────────────────────────────────────────────────────────────

type LocalizedTextSet struct {
    LocalizedTexts []LocalizedText `json:"localized_texts"`
}

type LocalizedText struct {
    LanguageCode string `json:"language_code"` // e.g., "en", "hi", "es"
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
    AverageValue float64 `json:"average_value"` // 1.0 to 5.0
    RatingCount  int     `json:"rating_count"`
}

// TextFeature.FeatureType valid values:
// "TEXT_FEATURE_INCLUSION" — what's included
// "TEXT_FEATURE_EXCLUSION" — what's NOT included
// "TEXT_FEATURE_HIGHLIGHT" — highlights
// "TEXT_FEATURE_MUST_KNOW"  — important notes
type TextFeature struct {
    FeatureType string           `json:"feature_type"`
    Value       LocalizedTextSet `json:"value"`
}

// Category.CategoryType: use CATEGORY_TYPE_* constants below
type Category struct {
    CategoryType string `json:"category_type"`
}

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

// RelatedLocation links a product to a Google Maps POI
// ALWAYS prefer place_id. Name+address is fallback. Lat/long is last resort.
type RelatedLocation struct {
    Location    GeoLocation                  `json:"location"`
    Relation    string                       `json:"relation"` // "RELATION_TYPE_ATTRACTION" or "RELATION_TYPE_DEPARTURE_POINT"
    LocationName *LocalizedTextSet           `json:"location_name,omitempty"`
}

type GeoLocation struct {
    // Only set ONE of these (in priority order):
    PlaceID string   `json:"place_id,omitempty"`       // Google Maps Place ID — PREFERRED
    Address *Address `json:"address,omitempty"`         // Fallback
    LatLng  *LatLng  `json:"lat_lng,omitempty"`         // Last resort
}

type Address struct {
    SingleLineAddress string `json:"single_line_address"` // e.g., "Colosseum, Piazza del Colosseo, 1, 00184 Roma RM, Italy"
}

type LatLng struct {
    Latitude  float64 `json:"latitude"`
    Longitude float64 `json:"longitude"`
}

type Operator struct {
    Name             LocalizedTextSet  `json:"name"`
    Description      *LocalizedTextSet `json:"description,omitempty"`
    PhoneNumber      string            `json:"phone_number,omitempty"`
    Website          *DeepLink         `json:"website,omitempty"`
}

type Media struct {
    URL      string `json:"url"`   // Direct image URL (HTTPS, min 800x600)
    Type     string `json:"type"`  // "PHOTO" or "VIDEO"
    Caption  *LocalizedTextSet `json:"caption,omitempty"`
}

type DeepLink struct {
    URL             string `json:"url"`              // Full URL including https://
    LocalizedURL    []LocalizedURL `json:"localized_url,omitempty"`
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
    Value        string `json:"value"`         // String format: "25.00" (NOT float)
    CurrencyCode string `json:"currency_code"` // ISO 4217: "USD", "EUR", "INR", etc.
}

type Fee struct {
    Title     LocalizedTextSet `json:"title"`
    Price     Price            `json:"price"`
    FeeType   string           `json:"fee_type"` // "FEE_TYPE_INCLUDED" or "FEE_TYPE_ADDITIONAL"
}

// ─── CancellationPolicy ────────────────────────────────────────────────────────

type CancellationPolicy struct {
    RefundConditions []RefundCondition `json:"refund_conditions"`
}

// Example: 100% refund if cancelled 24h before, 0% after
type RefundCondition struct {
    MinDurationBeforeStartTime Duration `json:"min_duration_before_start_time"`
    RefundPercent              int      `json:"refund_percent"` // 0–100
}

// ─── Duration ─────────────────────────────────────────────────────────────────

type Duration struct {
    MinDurationSeconds int `json:"min_duration_seconds,omitempty"`
    MaxDurationSeconds int `json:"max_duration_seconds,omitempty"`
}

// Helper constants for common durations
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
    LanguageCode string `json:"language_code"` // BCP 47: "en", "es", "fr", "hi", "zh-Hans"
}

// ─── Fulfillment ──────────────────────────────────────────────────────────────

type Fulfillment struct {
    Mobile      bool `json:"mobile,omitempty"`        // QR code on phone
    PrintAtHome bool `json:"print_at_home,omitempty"` // Printable PDF
    Pickup      bool `json:"pickup,omitempty"`         // Physical pickup at venue
    // At least one must be true
}
```

---

## 8. Pricing Rules — Critical Consistency Requirement

> **THIS IS THE MOST IMPORTANT SECTION. A price mismatch between the feed and the checkout page will get Traviia's products delisted by Google.**

### The Rule
```
feed_price == json_ld_price == checkout_price
```

All three must use the **exact same calculation** from the same source.

### PricingEngine (Single Source of Truth)

**File: `internal/pricing/engine.go`**

```go
package pricing

import (
    "fmt"
    "math"
)

type PriceResult struct {
    DisplayAmount   float64
    CurrencyCode    string
    FormattedAmount string // e.g., "25.00" — use this in feed, NOT float
}

type PricingEngine struct {
    db DB // interface to query pricing_rules
}

// CalculatePrice applies markup rules to a base price.
// This function MUST be called by:
//   1. feed_generator.go (building GTTD feed)
//   2. jsonld_builder.go (building JSON-LD for PDPs)
//   3. The checkout handler (validating payment amount)
//
// Never calculate prices anywhere else.
func (e *PricingEngine) CalculatePrice(
    baseAmount float64,
    baseCurrency string,
    experienceID string,
    city string,
) PriceResult {
    rule := e.db.GetApplicablePricingRule(experienceID, city)

    marked := baseAmount
    if rule != nil {
        // Apply percentage markup first
        if rule.MarkupPercentage > 0 {
            marked = baseAmount * (1 + rule.MarkupPercentage/100)
        }
        // Then add flat fee (convert currency if needed — assume same currency for now)
        if rule.FixedFeeAmount > 0 {
            marked += rule.FixedFeeAmount
        }
    }

    // Round to 2 decimal places
    rounded := math.Round(marked*100) / 100

    return PriceResult{
        DisplayAmount:   rounded,
        CurrencyCode:    baseCurrency,
        FormattedAmount: fmt.Sprintf("%.2f", rounded),
    }
}
```

---

## 9. Feed Generator Service

**File: `internal/gttd/feed_generator.go`**

```go
package gttd

import (
    "context"
    "encoding/json"
    "fmt"
    "os"
    "path/filepath"
    "time"

    "traviia/internal/pricing"
)

const (
    ProcessingInstruction = "PROCESS_AS_SNAPSHOT"
    MaxProductsPerShard   = 500    // Split into multiple shards if > 500 products
    FeedOutputDir         = "/tmp/gttd_feeds"
    BaseURL               = "https://traviia.com" // Change to env var in production
)

type FeedGenerator struct {
    db            DB
    pricingEngine *pricing.PricingEngine
}

// GenerateFeed builds the complete ProductFeed, writes JSON files to disk,
// and returns the list of file paths.
func (g *FeedGenerator) GenerateFeed(ctx context.Context) ([]string, error) {
    // 1. Fetch all GTTD-enabled experiences with their options
    experiences, err := g.db.GetGTTDEnabledExperiences(ctx)
    if err != nil {
        return nil, fmt.Errorf("fetch experiences: %w", err)
    }

    // 2. Convert to GTTD Product structs
    products := make([]Product, 0, len(experiences))
    for _, exp := range experiences {
        p, err := g.buildProduct(exp)
        if err != nil {
            // Log and skip, don't fail the whole feed
            // logger.Warn("skip product", zap.String("id", exp.ID), zap.Error(err))
            continue
        }
        products = append(products, p)
    }

    // 3. Shard if needed
    shards := shardProducts(products, MaxProductsPerShard)
    nonce := generateNonce()
    totalShards := len(shards)

    // 4. Ensure output directory exists
    if err := os.MkdirAll(FeedOutputDir, 0755); err != nil {
        return nil, fmt.Errorf("create output dir: %w", err)
    }

    // 5. Write each shard to a JSON file
    filePaths := make([]string, 0, totalShards)
    for i, shard := range shards {
        feed := ProductFeed{
            FeedMetadata: FeedMetadata{
                ShardID:               i,
                TotalShardsCount:      totalShards,
                Nonce:                 nonce,
                ProcessingInstruction: ProcessingInstruction,
            },
            Products: shard,
        }

        fileName := fmt.Sprintf("traviia_gttd_feed_shard_%d_%d.json", i, nonce)
        filePath := filepath.Join(FeedOutputDir, fileName)

        data, err := json.MarshalIndent(feed, "", "  ")
        if err != nil {
            return nil, fmt.Errorf("marshal feed shard %d: %w", i, err)
        }

        if err := os.WriteFile(filePath, data, 0644); err != nil {
            return nil, fmt.Errorf("write feed shard %d: %w", i, err)
        }

        filePaths = append(filePaths, filePath)
    }

    return filePaths, nil
}

// buildProduct converts a DB experience + its options into a GTTD Product struct.
func (g *FeedGenerator) buildProduct(exp DBExperience) (Product, error) {
    // Validate required fields
    if exp.POIID == "" {
        return Product{}, fmt.Errorf("experience %s has no POI ID — cannot include in feed", exp.ID)
    }
    if len(exp.Options) == 0 {
        return Product{}, fmt.Errorf("experience %s has no options", exp.ID)
    }

    // Build options
    options := make([]Option, 0, len(exp.Options))
    for _, opt := range exp.Options {
        o, err := g.buildOption(exp, opt)
        if err != nil {
            continue
        }
        options = append(options, o)
    }
    if len(options) == 0 {
        return Product{}, fmt.Errorf("experience %s has no valid options after filtering", exp.ID)
    }

    // Build product_features
    features := []TextFeature{}
    for _, inc := range opt.Inclusions {
        features = append(features, TextFeature{
            FeatureType: "TEXT_FEATURE_INCLUSION",
            Value:       NewEnglishText(inc),
        })
    }
    for _, exc := range opt.Exclusions {
        features = append(features, TextFeature{
            FeatureType: "TEXT_FEATURE_EXCLUSION",
            Value:       NewEnglishText(exc),
        })
    }
    for _, hl := range opt.Highlights {
        features = append(features, TextFeature{
            FeatureType: "TEXT_FEATURE_HIGHLIGHT",
            Value:       NewEnglishText(hl),
        })
    }

    // Build categories
    categories := []Category{}
    for _, cat := range exp.Categories {
        categories = append(categories, Category{CategoryType: cat})
    }

    // Build media
    media := []Media{}
    for _, img := range exp.Images {
        media = append(media, Media{
            URL:  img.URL,
            Type: "PHOTO",
        })
    }

    // Build related location (POI)
    relatedLocations := []RelatedLocation{
        {
            Location: GeoLocation{
                PlaceID: exp.POIID, // Always use Place ID — highest priority
            },
            Relation:     "RELATION_TYPE_ATTRACTION",
            LocationName: func() *LocalizedTextSet {
                t := NewEnglishText(exp.POIName)
                return &t
            }(),
        },
    }

    return Product{
        ID:               fmt.Sprintf("traviia-%s", exp.HeadoutID),
        Title:            NewEnglishText(exp.Title),
        Description:      NewEnglishText(exp.Description),
        Brand:            &Brand{Name: NewEnglishText("Traviia")},
        Rating: func() *Rating {
            if exp.HeadoutRating > 0 && exp.HeadoutReviewCount > 0 {
                return &Rating{
                    AverageValue: exp.HeadoutRating,
                    RatingCount:  exp.HeadoutReviewCount,
                }
            }
            return nil
        }(),
        ProductFeatures:   features,
        ProductCategories: categories,
        RelatedLocations:  relatedLocations,
        Operator: &Operator{
            Name: NewEnglishText(exp.OperatorName),
        },
        Options: options,
        Media:   media,
    }, nil
}

// buildOption converts a DB option into a GTTD Option struct.
// CRITICAL: Price is calculated by PricingEngine. Never use raw base price directly.
func (g *FeedGenerator) buildOption(exp DBExperience, opt DBOption) (Option, error) {
    // Calculate final price using PricingEngine
    priceResult := g.pricingEngine.CalculatePrice(
        opt.BasePriceAmount,
        opt.BasePriceCurrency,
        exp.ID,
        exp.City,
    )

    // Build the deep link URL
    // URL format: /[city-slug]/[experience-slug]?variant=[option_id]
    landingPageURL := fmt.Sprintf("%s/%s/%s?variant=%s",
        BaseURL,
        slugify(exp.City),
        slugify(exp.Title),
        opt.HeadoutVariantID,
    )
    listingPageURL := fmt.Sprintf("%s/%s", BaseURL, slugify(exp.City))

    // Build languages
    languages := []Language{}
    for _, lang := range exp.Languages {
        languages = append(languages, Language{LanguageCode: lang})
    }
    if len(languages) == 0 {
        languages = []Language{{LanguageCode: "en"}} // default to English
    }

    // Build cancellation policy
    var cancPolicy *CancellationPolicy
    if exp.CancellationPolicy != nil {
        cancPolicy = &CancellationPolicy{
            RefundConditions: []RefundCondition{
                {
                    MinDurationBeforeStartTime: Duration{
                        MinDurationSeconds: exp.CancellationPolicy.CutoffHours * 3600,
                    },
                    RefundPercent: exp.CancellationPolicy.RefundPercent,
                },
            },
        }
    }

    return Option{
        ID:    fmt.Sprintf("opt-%s", opt.HeadoutVariantID),
        Title: NewEnglishText(opt.Title),
        LandingPage: DeepLink{
            URL: landingPageURL,
        },
        LandingPageListView: &DeepLink{
            URL: listingPageURL,
        },
        PriceOptions: []PriceOption{
            {
                ID:    fmt.Sprintf("price-%s-adult", opt.HeadoutVariantID),
                Title: NewEnglishText("Adult"),
                Price: Price{
                    Value:        priceResult.FormattedAmount, // "25.00" not 25.0
                    CurrencyCode: priceResult.CurrencyCode,
                },
            },
        },
        CancellationPolicy: cancPolicy,
        Duration: func() *Duration {
            if exp.DurationMinSeconds > 0 {
                return &Duration{
                    MinDurationSeconds: exp.DurationMinSeconds,
                    MaxDurationSeconds: exp.DurationMaxSeconds,
                }
            }
            return nil
        }(),
        Languages: languages,
        Fulfillment: &Fulfillment{
            Mobile:      opt.FulfillmentMobile,
            PrintAtHome: opt.FulfillmentPrint,
            Pickup:      opt.FulfillmentPickup,
        },
    }, nil
}

// shardProducts splits a flat list of products into groups of maxPerShard
func shardProducts(products []Product, maxPerShard int) [][]Product {
    var shards [][]Product
    for i := 0; i < len(products); i += maxPerShard {
        end := i + maxPerShard
        if end > len(products) {
            end = len(products)
        }
        shards = append(shards, products[i:end])
    }
    if len(shards) == 0 {
        shards = [][]Product{{}} // empty feed is still valid
    }
    return shards
}

// generateNonce creates a unique int64 based on current timestamp
// Same nonce must be used across ALL shards of one upload batch
func generateNonce() int64 {
    return time.Now().UnixNano() / int64(time.Millisecond)
}

// slugify converts "New York" → "new-york"
func slugify(s string) string {
    // Implement: lowercase, replace spaces/special chars with hyphens
    // Use: github.com/gosimple/slug
    // import "github.com/gosimple/slug"
    // return slug.Make(s)
    return s // placeholder — implement with slug library
}
```

---

## 10. SFTP Upload Worker

**File: `internal/gttd/sftp_uploader.go`**

```go
package gttd

import (
    "fmt"
    "io"
    "net"
    "os"
    "path/filepath"
    "time"

    "github.com/pkg/sftp"
    "golang.org/x/crypto/ssh"
)

type SFTPConfig struct {
    Host       string // e.g., "sftp.things-to-do.google.com"
    Port       int    // usually 22
    Username   string
    PrivateKey []byte // PEM-encoded private key (load from env/secret)
    RemoteDir  string // remote directory path provided by Google
}

type SFTPUploader struct {
    config SFTPConfig
}

// Upload uploads all provided local file paths to the configured SFTP endpoint.
// All files MUST be from the same nonce (same generation batch).
// Returns error if any file fails — log and retry on failure.
func (u *SFTPUploader) Upload(localFilePaths []string) error {
    // Parse private key
    signer, err := ssh.ParsePrivateKey(u.config.PrivateKey)
    if err != nil {
        return fmt.Errorf("parse private key: %w", err)
    }

    // Configure SSH client
    sshConfig := &ssh.ClientConfig{
        User: u.config.Username,
        Auth: []ssh.AuthMethod{
            ssh.PublicKeys(signer),
        },
        HostKeyCallback: ssh.InsecureIgnoreHostKey(), // TODO: Replace with known_hosts check in production
        Timeout:         30 * time.Second,
    }

    addr := net.JoinHostPort(u.config.Host, fmt.Sprintf("%d", u.config.Port))
    sshClient, err := ssh.Dial("tcp", addr, sshConfig)
    if err != nil {
        return fmt.Errorf("ssh dial %s: %w", addr, err)
    }
    defer sshClient.Close()

    sftpClient, err := sftp.NewClient(sshClient)
    if err != nil {
        return fmt.Errorf("sftp client: %w", err)
    }
    defer sftpClient.Close()

    for _, localPath := range localFilePaths {
        if err := u.uploadFile(sftpClient, localPath); err != nil {
            return fmt.Errorf("upload %s: %w", localPath, err)
        }
    }

    return nil
}

func (u *SFTPUploader) uploadFile(client *sftp.Client, localPath string) error {
    localFile, err := os.Open(localPath)
    if err != nil {
        return fmt.Errorf("open local file: %w", err)
    }
    defer localFile.Close()

    remotePath := filepath.Join(u.config.RemoteDir, filepath.Base(localPath))

    remoteFile, err := client.Create(remotePath)
    if err != nil {
        return fmt.Errorf("create remote file %s: %w", remotePath, err)
    }
    defer remoteFile.Close()

    if _, err := io.Copy(remoteFile, localFile); err != nil {
        return fmt.Errorf("copy to remote: %w", err)
    }

    return nil
}
```

**Required Go dependencies** — add to `go.mod`:
```
require (
    github.com/pkg/sftp v1.13.6
    golang.org/x/crypto v0.21.0
    github.com/gosimple/slug v1.14.0
)
```

---

## 11. Gin API Routes

**File: `internal/gttd/worker.go`** — orchestrates the full GTTD flow.

```go
package gttd

import (
    "context"
    "fmt"
    "time"
)

type Worker struct {
    generator *FeedGenerator
    uploader  *SFTPUploader
    db        DB
    env       string // "dev" or "production"
}

// RunFeedUpload is the main job called by the cron scheduler.
// Steps: generate → upload → record status.
func (w *Worker) RunFeedUpload(ctx context.Context) error {
    runID := time.Now().UnixNano()

    // Record start
    statusID, err := w.db.CreateFeedStatus(ctx, w.env, runID)
    if err != nil {
        return fmt.Errorf("create status record: %w", err)
    }

    // Generate feed files
    filePaths, err := w.generator.GenerateFeed(ctx)
    if err != nil {
        _ = w.db.UpdateFeedStatus(ctx, statusID, "FAILED", 0, err.Error())
        return fmt.Errorf("generate feed: %w", err)
    }

    _ = w.db.UpdateFeedStatus(ctx, statusID, "UPLOADING", len(filePaths), "")

    // Upload to SFTP
    if err := w.uploader.Upload(filePaths); err != nil {
        _ = w.db.UpdateFeedStatus(ctx, statusID, "FAILED", len(filePaths), err.Error())
        return fmt.Errorf("sftp upload: %w", err)
    }

    _ = w.db.UpdateFeedStatus(ctx, statusID, "SUCCESS", len(filePaths), "")

    // Cleanup local files
    cleanupFiles(filePaths)

    return nil
}
```

**File: `api/routes/gttd.go`** — Gin HTTP routes for GTTD management.

```go
package routes

import (
    "net/http"

    "github.com/gin-gonic/gin"
    "traviia/internal/gttd"
)

func RegisterGTTDRoutes(r *gin.RouterGroup, worker *gttd.Worker, generator *gttd.FeedGenerator) {
    g := r.Group("/gttd")
    {
        // Manually trigger a feed upload (for testing/ops)
        // POST /api/v1/gttd/trigger-upload
        // Body: { "env": "dev" | "production" }
        g.POST("/trigger-upload", func(c *gin.Context) {
            var req struct {
                Env string `json:"env" binding:"required,oneof=dev production"`
            }
            if err := c.ShouldBindJSON(&req); err != nil {
                c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
                return
            }

            go func() {
                if err := worker.RunFeedUpload(c.Request.Context()); err != nil {
                    // log error
                }
            }()

            c.JSON(http.StatusAccepted, gin.H{"message": "Feed upload triggered", "env": req.Env})
        })

        // Get the latest feed upload status
        // GET /api/v1/gttd/status?env=production
        g.GET("/status", func(c *gin.Context) {
            env := c.DefaultQuery("env", "production")
            // status, err := db.GetLatestFeedStatus(env)
            c.JSON(http.StatusOK, gin.H{"env": env, "status": "placeholder"})
        })

        // Preview the feed as JSON (without uploading) — dev only
        // GET /api/v1/gttd/preview?limit=5
        g.GET("/preview", func(c *gin.Context) {
            // Return first N products from the generated feed for inspection
            c.JSON(http.StatusOK, gin.H{"preview": "placeholder"})
        })

        // Get JSON-LD for a specific experience (consumed by Next.js)
        // GET /api/v1/gttd/jsonld/:headout_id
        g.GET("/jsonld/:headout_id", func(c *gin.Context) {
            headoutID := c.Param("headout_id")
            // jsonLD, err := jsonldBuilder.Build(headoutID)
            c.JSON(http.StatusOK, gin.H{"headout_id": headoutID, "jsonld": "placeholder"})
        })
    }
}
```

---

## 12. JSON-LD Schema for Next.js PDPs

> JSON-LD is embedded in every product page's `<head>`. Google's crawler reads it to validate that page prices match the feed prices.

**File: `internal/gttd/jsonld_builder.go`**

```go
package gttd

import (
    "encoding/json"
    "fmt"
    "traviia/internal/pricing"
)

type JSONLDBuilder struct {
    db            DB
    pricingEngine *pricing.PricingEngine
}

// JSONLDProduct is the schema.org Product + Offer structured data
type JSONLDProduct struct {
    Context     string      `json:"@context"`  // "https://schema.org"
    Type        string      `json:"@type"`     // "Product"
    Name        string      `json:"name"`
    Description string      `json:"description"`
    Image       []string    `json:"image"`
    AggregateRating *JSONLDAggregateRating `json:"aggregateRating,omitempty"`
    Offers      []JSONLDOffer `json:"offers"`
}

type JSONLDAggregateRating struct {
    Type        string  `json:"@type"`       // "AggregateRating"
    RatingValue float64 `json:"ratingValue"`
    ReviewCount int     `json:"reviewCount"`
    BestRating  int     `json:"bestRating"`  // 5
    WorstRating int     `json:"worstRating"` // 1
}

type JSONLDOffer struct {
    Type          string `json:"@type"`        // "Offer"
    Name          string `json:"name"`
    Price         string `json:"price"`        // "25.00" — MUST match feed price exactly
    PriceCurrency string `json:"priceCurrency"`
    Availability  string `json:"availability"` // "https://schema.org/InStock"
    URL           string `json:"url"`           // Deep link to this option
    ValidFrom     string `json:"validFrom,omitempty"`
}

// Build generates the JSON-LD for a product page.
// CRITICAL: Prices are calculated using the same PricingEngine as the feed generator.
func (b *JSONLDBuilder) Build(headoutID string) (string, error) {
    exp, err := b.db.GetExperienceByHeadoutID(headoutID)
    if err != nil {
        return "", fmt.Errorf("get experience: %w", err)
    }

    offers := []JSONLDOffer{}
    for _, opt := range exp.Options {
        priceResult := b.pricingEngine.CalculatePrice(
            opt.BasePriceAmount,
            opt.BasePriceCurrency,
            exp.ID,
            exp.City,
        )

        landingURL := fmt.Sprintf("%s/%s/%s?variant=%s",
            BaseURL,
            slugify(exp.City),
            slugify(exp.Title),
            opt.HeadoutVariantID,
        )

        offers = append(offers, JSONLDOffer{
            Type:          "Offer",
            Name:          opt.Title,
            Price:         priceResult.FormattedAmount, // "25.00"
            PriceCurrency: priceResult.CurrencyCode,
            Availability:  "https://schema.org/InStock",
            URL:           landingURL,
        })
    }

    images := []string{}
    for _, img := range exp.Images {
        images = append(images, img.URL)
    }

    product := JSONLDProduct{
        Context:     "https://schema.org",
        Type:        "Product",
        Name:        exp.Title,
        Description: exp.Description,
        Image:       images,
        Offers:      offers,
    }

    if exp.HeadoutRating > 0 {
        product.AggregateRating = &JSONLDAggregateRating{
            Type:        "AggregateRating",
            RatingValue: exp.HeadoutRating,
            ReviewCount: exp.HeadoutReviewCount,
            BestRating:  5,
            WorstRating: 1,
        }
    }

    data, err := json.MarshalIndent(product, "", "  ")
    if err != nil {
        return "", fmt.Errorf("marshal json-ld: %w", err)
    }

    return string(data), nil
}
```

**Next.js PDP Usage** — consume the JSON-LD from the Go API:

```tsx
// app/[city]/[slug]/page.tsx
export default async function ProductPage({ params }) {
  const experience = await fetchExperience(params.slug)
  const jsonLD = await fetch(`${API_URL}/api/v1/gttd/jsonld/${experience.headoutId}`)
    .then(r => r.json())

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLD.jsonld) }}
      />
      {/* Page content */}
    </>
  )
}
```

---

## 13. Action Center & Error Monitoring

After each SFTP upload, Google processes the feed and results are visible in the **Google Things to Do Action Center**.

### Common Feed Errors & Fixes

| Error | Cause | Fix |
|---|---|---|
| `MISSING_REQUIRED_FIELD: options` | Product has no options array | Ensure every product has ≥1 option |
| `MISSING_REQUIRED_FIELD: landing_page` | Option has no landing_page URL | Set `landing_page.url` on every option |
| `INVALID_PLACE_ID` | POI place_id doesn't exist in Google Maps | Use correct Google Maps Place ID from Maps API |
| `PRICE_MISMATCH` | Feed price ≠ page JSON-LD price | Fix PricingEngine to produce same result in both places |
| `INVALID_CURRENCY_CODE` | Currency not ISO 4217 | Use "USD", "INR", "EUR", etc. |
| `PROCESSING_INCOMPLETE` | Not all shards uploaded | Ensure all shards share same nonce and are uploaded in same session |
| `STALE_FEED` | No upload in > 30 days | Fix cron job, upload immediately |
| `DUPLICATE_PRODUCT_ID` | Same `id` appears in two products | Make product IDs globally unique within feed |
| `INVALID_PROCESSING_INSTRUCTION` | Wrong value | Always use `"PROCESS_AS_SNAPSHOT"` exactly |

### Monitoring Checklist
- Check Action Center dashboard after every upload
- Set up alerts on `google_feed_status` table if status = `FAILED`
- Check that `product_count` in DB matches what Action Center shows as processed
- Re-upload immediately if Action Center shows errors

---

## 14. Environment Variables

Add these to `.env` and Docker Compose. **Never hardcode.**

```dotenv
# ─── GTTD Dev SFTP ─────────────────────────────────────────
GTTD_DEV_SFTP_HOST=sftp-dev.things-to-do.google.com
GTTD_DEV_SFTP_PORT=22
GTTD_DEV_SFTP_USERNAME=traviia-dev
GTTD_DEV_SFTP_REMOTE_DIR=/uploads/traviia
GTTD_DEV_SSH_PRIVATE_KEY_PATH=/run/secrets/gttd_dev_ssh_key

# ─── GTTD Production SFTP ──────────────────────────────────
GTTD_PROD_SFTP_HOST=sftp.things-to-do.google.com
GTTD_PROD_SFTP_PORT=22
GTTD_PROD_SFTP_USERNAME=traviia-prod
GTTD_PROD_SFTP_REMOTE_DIR=/uploads/traviia
GTTD_PROD_SSH_PRIVATE_KEY_PATH=/run/secrets/gttd_prod_ssh_key

# ─── Feed Generation ────────────────────────────────────────
GTTD_FEED_OUTPUT_DIR=/tmp/gttd_feeds
GTTD_MAX_PRODUCTS_PER_SHARD=500
GTTD_BASE_URL=https://traviia.com

# ─── Feed Upload Schedule ───────────────────────────────────
GTTD_CRON_SCHEDULE=0 2 * * *   # Every day at 2:00 AM UTC
GTTD_ENV=production             # "dev" or "production"
```

**Docker Compose secrets section:**
```yaml
secrets:
  gttd_dev_ssh_key:
    file: ./secrets/gttd_dev_ssh_key
  gttd_prod_ssh_key:
    file: ./secrets/gttd_prod_ssh_key
```

---

## 15. Cron Schedule

**File: `cmd/workers/main.go`** (or wherever cron jobs are registered)

```go
package main

import (
    "github.com/robfig/cron/v3"
    "traviia/internal/gttd"
)

func setupCronJobs(c *cron.Cron, gttdWorker *gttd.Worker) {
    // GTTD Feed Upload — every day at 2:00 AM UTC
    // Minimum required by Google: once every 30 days
    // Recommended: daily
    c.AddFunc("0 2 * * *", func() {
        ctx := context.Background()
        if err := gttdWorker.RunFeedUpload(ctx); err != nil {
            // logger.Error("gttd feed upload failed", zap.Error(err))
        }
    })
}
```

**Required Go dependency:**
```
require github.com/robfig/cron/v3 v3.0.1
```

---

## 16. Critical Rules — Do NOT Violate

These rules are absolute. The AI agent must follow every one of them exactly.

### R1 — Price Consistency
The price in the feed JSON (`price_options[].price.value`) MUST EXACTLY match the price shown in the Next.js JSON-LD (`offers[].price`) AND the price charged at checkout.

→ **Both feed_generator.go and jsonld_builder.go must call `PricingEngine.CalculatePrice()`.**

### R2 — Price Format
Prices MUST be strings, formatted to 2 decimal places (e.g., `"25.00"`, NOT `25`, NOT `25.0`).

### R3 — Full Snapshot Only
Never attempt incremental updates. Every SFTP upload must contain ALL active products. Google replaces everything on each upload.

### R4 — Same Nonce Across Shards
When the feed is split into multiple shard files, ALL shards of that upload MUST share the same `nonce` value. Generate nonce ONCE per upload run.

### R5 — POI Required
Never include a product in the feed if `poi_id` (Google Place ID) is empty. Products without a valid POI will be rejected or never served.

### R6 — Landing Page URL Must Be Stable & Live
The `landing_page.url` in every option must be a real, publicly accessible URL on Traviia. If the URL returns 404, Google will stop showing that product.

### R7 — Upload Minimum
Feed must be uploaded at least once every 30 days. If missed, Google will automatically take down ALL products. Set a secondary alert in monitoring.

### R8 — SSH HostKey Verification
The `InsecureIgnoreHostKey()` in the SFTP uploader is a placeholder for development. **Before production**, replace it with a proper `ssh.FixedHostKey()` or `knownhosts.New()` using Google's SFTP host fingerprint.

### R9 — No Personal/Dynamic Pricing
Do NOT vary the price shown to different users based on IP, cookie, or browser. GTTD prices must be static. Charging different prices to different users violates Google's policies.

### R10 — `gttd_enabled` Flag
Only set `gttd_enabled = true` on an experience once:
  1. It has a valid Google Maps Place ID in `poi_id`
  2. Its landing page URL is live
  3. Its price has been confirmed to match what the checkout shows

---

## 17. Checklist Before Going Live

Run through every item. Do not go to production until all are checked.

```
Pre-Upload (Development)
─────────────────────────────────────────────
[ ] SSH key pair generated and public key sent to Google
[ ] Dev SFTP credentials received and stored in env
[ ] At least 5 test products have valid Google Maps Place IDs in poi_mappings table
[ ] Feed generator produces valid JSON (validate against GTTD JSON schema)
[ ] Each product has at least 1 option with a non-zero price
[ ] Landing page URLs are live and publicly accessible
[ ] JSON-LD is present on every PDP and passes Google Rich Results Test
[ ] Price in feed == price in JSON-LD == price at checkout for all test products
[ ] Dev SFTP upload completes without error
[ ] Action Center shows 0 errors for dev feed

Pre-Production
─────────────────────────────────────────────
[ ] Content License Agreement signed
[ ] Production SFTP credentials received and stored in secrets manager
[ ] SSH HostKey verification replaced (not InsecureIgnoreHostKey)
[ ] `GTTD_ENV=production` set
[ ] Cron job tested and confirmed running at 2:00 AM UTC
[ ] Monitoring alert set for feed_status = FAILED
[ ] Monitoring alert set for "last successful upload > 25 days ago"
[ ] google_feed_status table logging confirmed working

Post-Go-Live
─────────────────────────────────────────────
[ ] Action Center shows products with status ACTIVE
[ ] Product count in Action Center matches product count in DB
[ ] Test Google Search for "things to do in [city]" — Traviia listings appear
[ ] Verify "Official Site" or "Tickets" badge visible on at least one listing
[ ] Confirm booking flow completes end-to-end from GTTD click → checkout
```

---

## References

- Google GTTD Developer Overview: https://developers.google.com/actions-center/verticals/things-to-do/overview
- Feed Specification: https://developers.google.com/actions-center/verticals/things-to-do/reference/feed-spec/product-feed
- JSON Schema Reference: https://developers.google.com/actions-center/verticals/things-to-do/reference/feed-spec/json_schema
- Sample Feed JSON: https://developers.google.com/travel/things-to-do/reference/feed-spec/sample
- Things to Do Center (Action Center): https://thingtodo.google.com (access granted post-onboarding)
- Partner Interest Form: https://developers.google.com/actions-center/verticals/things-to-do/overview
- Schema.org Product: https://schema.org/Product
- Schema.org Offer: https://schema.org/Offer
- Google Rich Results Test: https://search.google.com/test/rich-results