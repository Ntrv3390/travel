# GTTD + Headout Inventory & Pricing — Complete Change Guide for AI Agent

This document is a precise, file-by-file instruction set for an AI agent to implement all required changes.
Read every section fully before making any edits. Do not invent new abstractions — only change what is described.

---

## Root Cause Summary (read this first)

There are **three connected problems** in this repo:

1. **GTTD feed only submits one `PriceOption` with a single currency (USD or whatever `BasePriceCurrency` is).**
   Google then auto-converts for users in other countries using its own exchange rate. This causes a mismatch
   with the live Headout price on the landing page (Headout uses its own rates), which can trigger Google's
   price-discrepancy policy and disable products from serving.

2. **The inventory sync (`syncAvailability`) fetches from Headout without a `currencyCode` param.**
   This means `HeadoutAvailability.CurrencyCode` is always whatever Headout defaults to (USD).
   The calendar and availability endpoints read from this DB table and return USD prices regardless
   of the user's currency. The user sees USD on the calendar, then potentially a different currency
   on the product page — broken UX, and a Google policy violation if prices mismatch.

3. **The frontend calendar/availability API routes do not forward the user's `currencyCode` to the backend.**
   `/app/api/single-experience/calendar/route.ts` and `/app/api/single-experience/availability/route.ts`
   never read or pass `currencyCode`. So even if the backend could handle it, the currency context
   never reaches it.

---

## PART 1 — BACKEND CHANGES

### 1.1 `backend/internal/gttd/feed_types.go`

**What to add:** A `GeoCriterion` struct and add it to `PriceOption`.

Append the following to the end of the file (before the closing of the package, after all existing types):

```go
// GeoCriterion restricts a PriceOption to users in specific countries.
// The last PriceOption in price_options must have NO geo_criteria (acts as default).
type GeoCriterion struct {
	CountryCode string `json:"country_code"`
	IsNegative  bool   `json:"is_negative,omitempty"`
}
```

Then **replace** the existing `PriceOption` struct:

```go
// BEFORE (replace this):
type PriceOption struct {
	ID    string           `json:"id"`
	Title LocalizedTextSet `json:"title"`
	Price Price            `json:"price"`
	Fees  []Fee            `json:"fees,omitempty"`
}

// AFTER (replace with this):
type PriceOption struct {
	ID           string           `json:"id"`
	Title        LocalizedTextSet `json:"title"`
	Price        Price            `json:"price"`
	Fees         []Fee            `json:"fees,omitempty"`
	GeoCriteria  []GeoCriterion   `json:"geo_criteria,omitempty"`
}
```

Also **replace** the `Price` struct so it uses `int64` units (matching Google's `google.type.Money`):

```go
// BEFORE:
type Price struct {
	Value        string `json:"value"`
	CurrencyCode string `json:"currency_code"`
}

// AFTER:
type Price struct {
	CurrencyCode string `json:"currency_code"`
	Units        int64  `json:"units"`
}
```

---

### 1.2 `backend/internal/models/gttd_feed.go`

**What to add:** A `FeedPriceEntry` struct and a new field `FeedPrices` on `ExperienceOption`
to store per-currency prices for the GTTD feed generation job.

Add the following new struct to the file:

```go
// FeedPriceEntry stores a pre-fetched price for a specific currency,
// used only for GTTD feed generation (not for serving live prices to users).
type FeedPriceEntry struct {
	CurrencyCode string  `json:"currency_code"`
	CountryCode  string  `json:"country_code"` // ISO 3166-1 alpha-2, empty = default fallback
	Units        int64   `json:"units"`        // whole currency units (e.g. 75 for $75, 6200 for ₹6200)
}
```

Then add `FeedPrices` to `ExperienceOption`. Find the struct and add one field after `BasePriceCurrency`:

```go
// Add this field to ExperienceOption, after BasePriceCurrency:
FeedPrices  datatypes.JSONSlice[FeedPriceEntry] `gorm:"type:jsonb" json:"feed_prices"`
```

---

### 1.3 `backend/internal/services/inventory_sync.go`

This is the most important backend change. Two things need to change:

**Change A — `syncAvailability` must accept and forward `currencyCode`.**

The current signature is:
```go
func (s *InventorySyncService) syncAvailability(ctx context.Context, result *SyncExecutionResult) error {
```

Change it to accept a currency code (used when called from the feed price job). For the regular
background sync we keep using USD as the default stored currency. Add a helper that can be called
with any currency:

```go
// Replace syncAvailability with this:
func (s *InventorySyncService) syncAvailability(ctx context.Context, result *SyncExecutionResult) error {
	return s.syncAvailabilityForCurrency(ctx, result, "USD")
}

// New helper — fetches availability+pricing for a specific currencyCode
func (s *InventorySyncService) syncAvailabilityForCurrency(ctx context.Context, result *SyncExecutionResult, currencyCode string) error {
	variantMap, err := s.buildVariantToProductMap(ctx)
	if err != nil {
		return err
	}
	if len(variantMap) == 0 {
		return errors.New("no variants found for availability sync")
	}

	days := s.cfg.InventorySyncForwardDays
	if days <= 0 {
		days = 30
	}
	startDate := time.Now().UTC().Format("2006-01-02")
	endDate := time.Now().UTC().AddDate(0, 0, days).Format("2006-01-02")
	now := time.Now().UTC()

	for _, variantID := range sortedKeys(variantMap) {
		query := url.Values{}
		query.Set("variantId", variantID)
		query.Set("startDateTime", startDate+"T00:00:00")
		query.Set("endDateTime", endDate+"T23:59:59")
		if currencyCode != "" {
			query.Set("currencyCode", currencyCode)
		}

		upstream, err := s.getWithRetry(ctx, "/v1/inventory/list-by/variant", query, true)
		if err != nil {
			logger.Warnf("availability fetch failed variant=%s currency=%s: %v", variantID, currencyCode, err)
			result.FailedRecords++
			continue
		}

		var payload map[string]interface{}
		if err := json.Unmarshal(upstream.Body, &payload); err != nil {
			result.FailedRecords++
			continue
		}

		for _, item := range toMapSlice(payload["items"]) {
			result.TotalRecords++
			inventoryID := firstNonEmpty(getString(item, "inventoryId", "id"), "unknown")
			startDT := getString(item, "startDateTime")
			date := ""
			timeSlot := ""
			if len(startDT) >= 10 {
				date = startDT[:10]
			}
			if len(startDT) >= 16 {
				timeSlot = startDT[11:16]
			}

			persons := toMapSlice(nestedValue(item, "pricing", "persons"))
			currency := currencyCode
			price := 0.0
			originalPrice := 0.0
			if len(persons) > 0 {
				if c := getString(persons[0], "currencyCode", "currency"); c != "" {
					currency = c
				}
				price = firstNonZero(getFloat(persons[0], "price", "netPrice", "headoutSellingPrice"), 0)
				originalPrice = getFloat(persons[0], "originalPrice")
			}

			record := &models.HeadoutAvailability{
				HeadoutAvailabilityID: getString(item, "id", "inventoryId"),
				HeadoutProductID:      variantMap[variantID],
				VariantID:             variantID,
				InventoryID:           inventoryID,
				Date:                  date,
				StartDateTime:         startDT,
				EndDateTime:           getString(item, "endDateTime"),
				TimeSlot:              timeSlot,
				AvailabilityStatus:    getString(item, "availability", "status"),
				Capacity:              int(getFloat(item, "capacity", "maxCapacity")),
				RemainingInventory:    int(firstNonZero(getFloat(item, "remainingInventory", "remaining", "seatsAvailable"), getFloat(item, "availableCapacity"))),
				CurrencyCode:          currency,
				PriceAmount:           price,
				OriginalPriceAmount:   originalPrice,
				GuestTypePricing:      jsonFromValue(persons),
				Metadata:              jsonFromValue(item["metadata"]),
				RawData:               jsonFromValue(item),
				LastSyncedAt:          &now,
			}

			created, err := s.upsertAvailability(ctx, record)
			if err != nil {
				result.FailedRecords++
				continue
			}
			if created {
				result.CreatedRecords++
			} else {
				result.UpdatedRecords++
			}
		}
	}

	return nil
}
```

**Change B — Add a new exported method `SyncFeedPricesForCurrencies`.**

This is called by the GTTD feed generation job (daily) to populate `FeedPrices` on each `ExperienceOption`.
Add this method to `inventory_sync.go`:

```go
// FEED_CURRENCIES is the list of currencies to pre-fetch for the GTTD feed.
// These match the currencies in CurrencyHandler.ListCurrencies plus any high-traffic ones.
var FEED_CURRENCIES = []struct {
	Code        string
	CountryCode string // ISO 3166-1 alpha-2 for geo_criteria (empty = default fallback)
}{
	{Code: "INR", CountryCode: "IN"},
	{Code: "AED", CountryCode: "AE"},
	{Code: "GBP", CountryCode: "GB"},
	{Code: "EUR", CountryCode: ""},  // multi-country, handle in feed generator
	{Code: "AUD", CountryCode: "AU"},
	{Code: "SGD", CountryCode: "SG"},
	{Code: "JPY", CountryCode: "JP"},
	{Code: "USD", CountryCode: ""},  // default, no geo_criteria
}

// SyncFeedPricesForCurrencies fetches the minimum price for each active variant
// in each supported currency and stores it on ExperienceOption.FeedPrices.
// This should be called once per day, after syncProducts, before GTTD feed generation.
func (s *InventorySyncService) SyncFeedPricesForCurrencies(ctx context.Context) error {
	variantMap, err := s.buildVariantToProductMap(ctx)
	if err != nil {
		return fmt.Errorf("build variant map: %w", err)
	}
	if len(variantMap) == 0 {
		return errors.New("no variants found for feed price sync")
	}

	// Map: variantID -> []FeedPriceEntry
	variantPrices := make(map[string][]models.FeedPriceEntry)

	today := time.Now().UTC().Format("2006-01-02")
	tomorrow := time.Now().UTC().AddDate(0, 0, 7).Format("2006-01-02")

	for _, fc := range FEED_CURRENCIES {
		for _, variantID := range sortedKeys(variantMap) {
			query := url.Values{}
			query.Set("variantId", variantID)
			query.Set("startDateTime", today+"T00:00:00")
			query.Set("endDateTime", tomorrow+"T23:59:59")
			query.Set("currencyCode", fc.Code)

			upstream, err := s.getWithRetry(ctx, "/v1/inventory/list-by/variant", query, true)
			if err != nil {
				logger.Warnf("feed price fetch failed variant=%s currency=%s: %v", variantID, fc.Code, err)
				continue
			}

			var payload map[string]interface{}
			if err := json.Unmarshal(upstream.Body, &payload); err != nil {
				continue
			}

			var minPrice float64
			for _, item := range toMapSlice(payload["items"]) {
				persons := toMapSlice(nestedValue(item, "pricing", "persons"))
				if len(persons) == 0 {
					continue
				}
				p := firstNonZero(getFloat(persons[0], "price", "netPrice", "headoutSellingPrice"), 0)
				if p > 0 && (minPrice == 0 || p < minPrice) {
					minPrice = p
				}
			}

			if minPrice <= 0 {
				continue
			}

			entry := models.FeedPriceEntry{
				CurrencyCode: fc.Code,
				CountryCode:  fc.CountryCode,
				Units:        int64(minPrice),
			}
			variantPrices[variantID] = append(variantPrices[variantID], entry)
		}
	}

	// Write FeedPrices back to ExperienceOption rows (matched by HeadoutVariantID)
	for variantID, prices := range variantPrices {
		pricesJSON, err := json.Marshal(prices)
		if err != nil {
			continue
		}
		if err := s.db.WithContext(ctx).
			Model(&models.ExperienceOption{}).
			Where("headout_variant_id = ?", variantID).
			Update("feed_prices", datatypes.JSON(pricesJSON)).Error; err != nil {
			logger.Warnf("feed price update failed variant=%s: %v", variantID, err)
		}
	}

	return nil
}
```

---

### 1.4 `backend/internal/gttd/feed_generator.go`

**What to change:** `buildOption` currently builds a single `PriceOption`. It must now build
a list of `PriceOption` entries — one per currency in `opt.FeedPrices`, with `GeoCriteria`
set per entry, and the last entry being USD with no `GeoCriteria` as the default fallback.

**Step 1 — Add `FeedPrices` to `DBOption`:**

```go
// In the DBOption struct, add this field after BasePriceCurrency:
FeedPrices []models.FeedPriceEntry
```

**Step 2 — Populate `FeedPrices` in `mapExperienceToDBExperience`:**

Inside the `for _, opt := range exp.Options` loop, change:
```go
// BEFORE:
options = append(options, DBOption{
    HeadoutVariantID:  opt.HeadoutVariantID,
    Title:             opt.Title,
    BasePriceAmount:   opt.BasePriceAmount,
    BasePriceCurrency: opt.BasePriceCurrency,
    // ...other fields...
})

// AFTER (add FeedPrices):
options = append(options, DBOption{
    HeadoutVariantID:  opt.HeadoutVariantID,
    Title:             opt.Title,
    BasePriceAmount:   opt.BasePriceAmount,
    BasePriceCurrency: opt.BasePriceCurrency,
    FeedPrices:        []models.FeedPriceEntry(opt.FeedPrices),
    // ...other fields unchanged...
})
```

**Step 3 — Replace the `buildOption` price section:**

Find this block in `buildOption`:
```go
PriceOptions: []PriceOption{
    {
        ID:    fmt.Sprintf("price-%s-adult", opt.HeadoutVariantID),
        Title: NewEnglishText("Adult"),
        Price: Price{
            Value:        priceResult.FormattedAmount,
            CurrencyCode: priceResult.CurrencyCode,
        },
    },
},
```

Replace it with:
```go
PriceOptions: buildPriceOptions(opt),
```

Then add this new function to `feed_generator.go`:

```go
// buildPriceOptions converts FeedPrices into GTTD price_options with geo_criteria.
// Rules (from Google spec):
//   - Each entry except the last must have geo_criteria set.
//   - The last entry must have NO geo_criteria — it is the default fallback for all other countries.
//   - EUR gets a full list of Eurozone country codes.
//   - If FeedPrices is empty, fall back to a single USD entry.
func buildPriceOptions(opt DBOption) []PriceOption {
	eurCountries := []GeoCriterion{
		{CountryCode: "AT"}, {CountryCode: "BE"}, {CountryCode: "CY"}, {CountryCode: "EE"},
		{CountryCode: "FI"}, {CountryCode: "FR"}, {CountryCode: "DE"}, {CountryCode: "GR"},
		{CountryCode: "IE"}, {CountryCode: "IT"}, {CountryCode: "LV"}, {CountryCode: "LT"},
		{CountryCode: "LU"}, {CountryCode: "MT"}, {CountryCode: "NL"}, {CountryCode: "PT"},
		{CountryCode: "SK"}, {CountryCode: "SI"}, {CountryCode: "ES"},
	}

	if len(opt.FeedPrices) == 0 {
		// Fallback: single USD entry, no geo_criteria
		units := int64(opt.BasePriceAmount)
		if units <= 0 {
			units = 1
		}
		return []PriceOption{{
			ID:    fmt.Sprintf("price-%s-usd-default", opt.HeadoutVariantID),
			Title: NewEnglishText("Adult"),
			Price: Price{CurrencyCode: "USD", Units: units},
		}}
	}

	// Separate USD (will become the default, last, no geo_criteria)
	var usdEntry *models.FeedPriceEntry
	var others []models.FeedPriceEntry
	for _, fp := range opt.FeedPrices {
		fp := fp
		if fp.CurrencyCode == "USD" {
			usdEntry = &fp
		} else {
			others = append(others, fp)
		}
	}

	priceOptions := make([]PriceOption, 0, len(opt.FeedPrices))

	for _, fp := range others {
		po := PriceOption{
			ID:    fmt.Sprintf("price-%s-%s", opt.HeadoutVariantID, strings.ToLower(fp.CurrencyCode)),
			Title: NewEnglishText("Adult"),
			Price: Price{CurrencyCode: fp.CurrencyCode, Units: fp.Units},
		}
		if fp.CurrencyCode == "EUR" {
			po.GeoCriteria = eurCountries
		} else if fp.CountryCode != "" {
			po.GeoCriteria = []GeoCriterion{{CountryCode: fp.CountryCode}}
		}
		priceOptions = append(priceOptions, po)
	}

	// USD last — no GeoCriteria = default fallback for everyone not matched above
	usdUnits := int64(opt.BasePriceAmount)
	if usdEntry != nil && usdEntry.Units > 0 {
		usdUnits = usdEntry.Units
	}
	if usdUnits <= 0 {
		usdUnits = 1
	}
	priceOptions = append(priceOptions, PriceOption{
		ID:    fmt.Sprintf("price-%s-usd-default", opt.HeadoutVariantID),
		Title: NewEnglishText("Adult"),
		Price: Price{CurrencyCode: "USD", Units: usdUnits},
	})

	return priceOptions
}
```

**Step 4 — Fix the `landingPageURL` to include `{currency}` substitution token:**

Find in `buildOption`:
```go
landingPageURL := fmt.Sprintf("%s/%s/%s?variant=%s",
    g.baseURL,
    slugify(exp.City),
    slugify(exp.Title),
    opt.HeadoutVariantID,
)
```

Replace with:
```go
landingPageURL := fmt.Sprintf("%s/%s/%s?variant=%s&currency={currency}&lang={lang}",
    g.baseURL,
    slugify(exp.City),
    slugify(exp.Title),
    opt.HeadoutVariantID,
)
listingPageURL := fmt.Sprintf("%s/%s?currency={currency}", g.baseURL, slugify(exp.City))
```

This tells Google to expand `{currency}` and `{lang}` dynamically when a user clicks, so the
landing page receives the user's currency in the URL query string.

---

### 1.5 `backend/internal/gttd/worker.go`

**What to change:** The daily worker that runs feed generation must call `SyncFeedPricesForCurrencies`
**before** `GenerateFeed`. Find the worker's run method and add this call.

Find the section that triggers feed generation (it will look something like a call to `g.GenerateFeed(ctx)`).
Before that call, add:

```go
// Sync multi-currency prices for feed before generating
syncSvc := services.NewInventorySyncService(cfg) // or use the existing service instance
if err := syncSvc.SyncFeedPricesForCurrencies(ctx); err != nil {
    logger.Warnf("feed price sync failed (continuing with existing prices): %v", err)
    // Non-fatal: we still generate the feed with whatever prices are stored
}
```

Make sure to import `services` package if not already imported.

---

### 1.6 `backend/internal/handlers/booking_flow.go` — Calendar handler

**What to change:** `GetCalendar` currently never reads `currencyCode` from query params and never
passes it to the inventory fetch. The calendar returns whatever USD prices are in the DB.

Find `GetCalendar` and add currency reading right after the existing param parsing:

```go
// After the existing param parsing at the top of GetCalendar, add:
currencyCode := strings.ToUpper(strings.TrimSpace(c.Query("currencyCode")))
if currencyCode == "" {
    currencyCode = "USD"
}
```

Then, `fetchInventoryByVariant` reads from the DB (`GetInventoryByVariantAndDate`).
The DB only stores one currency per slot (whatever was synced). For the calendar, we need
to either:
- Return the stored price (USD) and note the currency, OR
- Add a live Headout call when the requested currency differs

**Simple fix (correct approach):** When `currencyCode != "USD"` (or whatever the stored currency is),
fetch live from Headout for the calendar range instead of reading from DB.

Add this after the variant resolution loop in `GetCalendar`:

```go
// If user requests a non-default currency and we have a resolved variant,
// fetch a fresh live price for the first available date to show in the calendar.
// The DB-stored slots (for availability shape) stay, but we overwrite the price.
if currencyCode != "USD" && resolvedVariantID != "" {
    liveQuery := url.Values{}
    liveQuery.Set("variantId", resolvedVariantID)
    liveQuery.Set("startDateTime", toDateKey(startDate)+"T00:00:00")
    liveQuery.Set("endDateTime", toDateKey(dayEnd)+"T23:59:59")
    liveQuery.Set("currencyCode", currencyCode)

    if upstream, err := h.authService.Get(c.Request.Context(), "/v1/inventory/list-by/variant", liveQuery, true); err == nil {
        var livePay map[string]interface{}
        if json.Unmarshal(upstream.Body, &livePay) == nil {
            for _, rawItem := range toMapSlice(livePay["items"]) {
                startDT := getString(rawItem, "startDateTime")
                if len(startDT) < 10 {
                    continue
                }
                dateKey := startDT[:10]
                day, exists := dayMap[dateKey]
                if !exists {
                    continue
                }
                persons := toMapSlice(nestedValue(rawItem, "pricing", "persons"))
                if len(persons) == 0 {
                    continue
                }
                p := firstNonZero(getFloat(persons[0], "price", "netPrice", "headoutSellingPrice"), 0)
                if p > 0 {
                    if day.Price == nil || p < *day.Price {
                        day.Price = &p
                        day.Currency = currencyCode
                    }
                }
            }
        }
    }
}
```

Also add the `toMapSlice`, `nestedValue`, `getString`, `getFloat`, `firstNonZero` helpers — these already exist
in `inventory_sync.go` but not in `booking_flow.go`. Add a small inline helper or import them as
package-level functions. The cleanest approach: move those 5 helper functions to a shared
`backend/internal/handlers/helpers.go` file and import from both files. (See Section 1.7.)

---

### 1.7 `backend/internal/handlers/booking_flow.go` — Availability handler

**What to change:** `GetAvailability` reads slots from DB and returns them. It must forward
`currencyCode` and fetch live when the user requests a non-USD currency.

Add currency reading at the top of `GetAvailability`:

```go
currencyCode := strings.ToUpper(strings.TrimSpace(c.Query("currencyCode")))
if currencyCode == "" {
    currencyCode = "USD"
}
```

Then after the DB fetch of `items`, when `currencyCode != "USD"`, make a live Headout call
and overwrite `Price` and `Currency` on each slot. The same pattern as in the calendar handler above.

The key: **availability slots (inventoryId, startDateTime, seatsAvailable) always come from DB**.
Only **price and currency** get refreshed live. This keeps the booking flow fast and accurate.

---

### 1.8 `backend/internal/services/sync.go`

Add `SyncTypeFeedPrices` constant and handle it in the sync dispatcher:

```go
// Add to the constants block in inventory_sync.go:
SyncTypeFeedPrices = "feed_prices"

// Add to RunSync's switch:
case SyncTypeFeedPrices:
    err = s.SyncFeedPricesForCurrencies(ctx)
```

---

### 1.9 DB migration — add `feed_prices` column

Run this SQL (or add it to an auto-migration call):

```sql
ALTER TABLE experience_options
ADD COLUMN IF NOT EXISTS feed_prices jsonb DEFAULT '[]'::jsonb;
```

If using GORM AutoMigrate, it will pick up the new field automatically once `ExperienceOption`
has `FeedPrices datatypes.JSONSlice[FeedPriceEntry]`.

---

## PART 2 — FRONTEND CHANGES

### 2.1 `frontend/app/api/single-experience/calendar/route.ts`

**Problem:** This route never reads `currencyCode` from the request and passes a hardcoded `"USD"`.

**Current code:**
```ts
export async function GET(req: NextRequest) {
  const variantId = req.nextUrl.searchParams.get("variantId");
  const headoutId = req.nextUrl.searchParams.get("headoutId");
  const days = req.nextUrl.searchParams.get("days") ?? "42";
  const startDate = req.nextUrl.searchParams.get("startDate") ?? "";

  // ... builds upstream URL without currencyCode ...
```

**Replace the full file with:**
```ts
import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";

export async function GET(req: NextRequest) {
  const variantId = req.nextUrl.searchParams.get("variantId");
  const headoutId = req.nextUrl.searchParams.get("headoutId");
  const days = req.nextUrl.searchParams.get("days") ?? "42";
  const startDate = req.nextUrl.searchParams.get("startDate") ?? "";
  const currencyCode = req.nextUrl.searchParams.get("currencyCode") ?? "USD";

  if (!variantId && !headoutId) {
    return NextResponse.json({ error: "variantId or headoutId is required" }, { status: 400 });
  }

  try {
    const upstream = new URL(`${env.API_URL}/api/v1/booking-flow/calendar`);
    if (variantId) upstream.searchParams.set("variantId", variantId);
    if (headoutId) upstream.searchParams.set("headoutId", headoutId);
    if (startDate) upstream.searchParams.set("startDate", startDate);
    upstream.searchParams.set("days", days);
    upstream.searchParams.set("currencyCode", currencyCode);

    const response = await fetch(upstream.toString(), {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
    });

    const payload = await response.json().catch(() => ({}));
    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch calendar" },
      { status: 500 },
    );
  }
}
```

---

### 2.2 `frontend/app/api/single-experience/availability/route.ts`

**Problem:** This route never reads or forwards `currencyCode`.

**Replace the full file with:**
```ts
import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";

export async function GET(req: NextRequest) {
  const variantId = req.nextUrl.searchParams.get("variantId");
  const date = req.nextUrl.searchParams.get("date");
  const currencyCode = req.nextUrl.searchParams.get("currencyCode") ?? "USD";

  if (!variantId || !date) {
    return NextResponse.json({ error: "variantId and date are required" }, { status: 400 });
  }

  try {
    const upstream = new URL(`${env.API_URL}/api/v1/booking-flow/availability`);
    upstream.searchParams.set("variantId", variantId);
    upstream.searchParams.set("date", date);
    upstream.searchParams.set("currencyCode", currencyCode);

    const response = await fetch(upstream.toString(), {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
    });

    const payload = await response.json().catch(() => ({}));
    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch availability" },
      { status: 500 },
    );
  }
}
```

---

### 2.3 `frontend/app/api/experiences/[id]/calendar/route.ts`

**Problem:** Reads `currency` param but the variable name is inconsistent — internally it reads
`currency` but the upstream call sends `currencyCode`. Verify the full forwarding is consistent.

**Replace the full file with:**
```ts
import { NextRequest, NextResponse } from "next/server"
import { env } from "@/lib/env"

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { searchParams } = new URL(req.url)
  const months = searchParams.get("months") ?? "2"
  const currencyCode = searchParams.get("currencyCode") ?? searchParams.get("currency") ?? "USD"

  const res = await fetch(
    `${env.API_URL}/api/v1/experiences/${encodeURIComponent(params.id)}/calendar?months=${months}&currencyCode=${encodeURIComponent(currencyCode)}`,
    { cache: "no-store" },
  )
  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
```

---

### 2.4 `frontend/app/api/availability/route.ts`

**Problem:** Never reads or forwards `currencyCode`.

**Replace the full file with:**
```ts
import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const date = searchParams.get("date");
  const variantId = searchParams.get("variantId");
  const currencyCode = searchParams.get("currencyCode") ?? "USD";

  if (!id || !date) {
    return NextResponse.json({ error: "Missing params" }, { status: 400 });
  }

  const queryParams = new URLSearchParams({ date, currencyCode });
  if (variantId) queryParams.set("variantId", variantId);

  const response = await fetch(
    `${env.API_URL}/api/v1/experiences-availability/${id}?${queryParams.toString()}`,
    { cache: "no-store" },
  );

  const data = await response.json();
  return NextResponse.json(data, { status: response.status });
}
```

---

### 2.5 Frontend components that call calendar/availability — pass `currencyCode`

Any component that calls `/api/single-experience/calendar` or `/api/single-experience/availability`
must append the current `currencyCode` from `CurrencyContext`. 

Find all such `fetch` calls in:
- `frontend/components/booking/DatePicker.tsx`
- `frontend/components/booking/SlotSelector.tsx`
- Any other component that calls those routes

**Pattern to apply in each:**

```ts
// BEFORE (typical existing pattern):
const res = await fetch(`/api/single-experience/calendar?variantId=${variantId}&headoutId=${headoutId}&days=42`);

// AFTER — add currencyCode:
const res = await fetch(
  `/api/single-experience/calendar?variantId=${variantId}&headoutId=${headoutId}&days=42&currencyCode=${currency}`
);
```

Where `currency` comes from `useCurrencyContext()`:
```ts
import { useCurrencyContext } from "@/context/CurrencyContext";
// Inside the component:
const { currency } = useCurrencyContext();
```

Do the same for availability calls:
```ts
// BEFORE:
const res = await fetch(`/api/single-experience/availability?variantId=${variantId}&date=${date}`);

// AFTER:
const res = await fetch(
  `/api/single-experience/availability?variantId=${variantId}&date=${date}&currencyCode=${currency}`
);
```

---

### 2.6 `frontend/lib/api.ts` — `getExperienceCalendar` and `getSlotAvailability`

These server-side functions accept a `currency` param but it may not always be passed. Add a fallback.

**`getExperienceCalendar` — no change needed** (already accepts and passes `currency`).

**`getSlotAvailability`:**
```ts
// BEFORE:
export async function getSlotAvailability(experienceId: string, variantId: string, date: string, currency = "USD") {
  try {
    const res = await fetch(
      `${API_BASE}/api/v1/experiences-availability/${encodeURIComponent(experienceId)}?variantId=${encodeURIComponent(variantId)}&date=${encodeURIComponent(date)}&currencyCode=${currency}`,
      { cache: "no-store" }
    );
```

This is already correct — it passes `currencyCode`. Verify callers always pass currency.

---

## PART 3 — WHAT NOT TO CHANGE

These things are **correctly implemented** and must not be touched:

- `CurrencyContext.tsx` — currency persistence in localStorage and cookie is correct.
- `CurrencyPicker.tsx` — fully functional, no changes needed.
- `booking_flow.go` `CreateBooking` — already forwards `currencyCode` in the Headout payload.
- `PricingEngine.CalculatePrice` — the markup logic is correct; it applies on top of whatever
  price Headout returns. Do not remove or bypass it.
- `syncProducts` and `syncCities` — these sync content, not prices. No changes needed.
- The GTTD `worker.go` scheduling cadence — daily is correct per Google spec.

---

## PART 4 — CHANGE SUMMARY TABLE

| File | Type | What changes |
|------|------|-------------|
| `backend/internal/gttd/feed_types.go` | Backend | Add `GeoCriterion` struct; add `GeoCriteria` to `PriceOption`; fix `Price` to use `Units int64` |
| `backend/internal/models/gttd_feed.go` | Backend | Add `FeedPriceEntry` struct; add `FeedPrices` field to `ExperienceOption` |
| `backend/internal/services/inventory_sync.go` | Backend | Refactor `syncAvailability` to accept currencyCode; add `SyncFeedPricesForCurrencies` method; add `SyncTypeFeedPrices` constant |
| `backend/internal/gttd/feed_generator.go` | Backend | Add `FeedPrices` to `DBOption`; replace single `PriceOption` with multi-currency `buildPriceOptions`; add `{currency}` to deep link URL |
| `backend/internal/gttd/worker.go` | Backend | Call `SyncFeedPricesForCurrencies` before `GenerateFeed` |
| `backend/internal/handlers/booking_flow.go` | Backend | Read `currencyCode` in `GetCalendar` and `GetAvailability`; add live Headout price refresh for non-USD requests |
| DB migration | SQL | `ALTER TABLE experience_options ADD COLUMN feed_prices jsonb DEFAULT '[]'` |
| `frontend/app/api/single-experience/calendar/route.ts` | Frontend | Forward `currencyCode` param to backend |
| `frontend/app/api/single-experience/availability/route.ts` | Frontend | Forward `currencyCode` param to backend |
| `frontend/app/api/experiences/[id]/calendar/route.ts` | Frontend | Accept both `currencyCode` and `currency` param names |
| `frontend/app/api/availability/route.ts` | Frontend | Forward `currencyCode` param to backend |
| `frontend/components/booking/DatePicker.tsx` | Frontend | Append `currencyCode` from `useCurrencyContext` to calendar fetch URL |
| `frontend/components/booking/SlotSelector.tsx` | Frontend | Append `currencyCode` from `useCurrencyContext` to availability fetch URL |

---

## PART 5 — VERIFICATION CHECKLIST

After all changes, verify the following:

1. **Feed generation test:** Run `POST /api/v1/admin/gttd/trigger` and inspect the generated JSON file.
   Each `option.price_options` array should have multiple entries. The last entry must have no `geo_criteria`.
   The landing page URLs must contain `{currency}` and `{lang}` tokens.

2. **Calendar test:** `GET /api/v1/booking-flow/calendar?variantId=XXXX&currencyCode=INR`
   — response `currency` field should be `INR`, and `priceLabel` values should be INR amounts.

3. **Availability test:** `GET /api/v1/booking-flow/availability?variantId=XXXX&date=YYYY-MM-DD&currencyCode=INR`
   — slot `currency` should be `INR`.

4. **Booking test:** Create a booking with `currencyCode: "INR"` in the payload.
   The Headout booking request should include `"currencyCode": "INR"` in the price object.

5. **Feed price sync test:** Run `POST /api/v1/admin/sync` with `{"type": "feed_prices"}`.
   Check `experience_options` table — `feed_prices` column should have JSON arrays with multiple currencies.

6. **Price match test:** Click a GTTD link in test (Google sandbox) with `?currency=INR`.
   The landing page must show an INR price. The price must match (within 5%) the INR amount
   in the `price_options` that was submitted to the GTTD feed.