# Implementation Left — Remaining Gaps & Status

> **Last updated:** Implementation session complete.
> **Status:** Items 1, 3, 4, 5, 7, 9, 10 are **DONE**. Items 2 (GTTD DB), 6 (Auth), 8 (JSON-LD), 11 (SFTP), 12 (Redis) remain.

---

## ✅ DONE: Booking Payload Mismatch (Frontend ↔ Backend)

**Completed:**
- `POST /api/v1/bookings` now routes to `bookingFlowHandler.CreateBooking`
- `createBookingRequest` accepts frontend format (`experienceId`, `variantId`, `date`, `adults`, `children`, `firstName`, `lastName`, `email`, `phone`, `specialRequests`)
- `resolveInventoryID()` resolves `(variantId + date)` to an `inventoryId` by fetching from Headout inventory
- Transforms frontend request to Headout's expected format (`customersDetails`, `variantInputFields`, etc.)
- Parses Headout's response into normalized `bookingResponse` format
- Saves booking to local `bookings` table
- Sends confirmation email notification (simulated via logger)

**Files changed:**
- `internal/handlers/booking_flow.go` — Rewrote `CreateBooking`, `createBookingRequest`, added `resolveInventoryID`, `parseHeadoutBookingResponse`, `saveBookingToDB`
- `cmd/api/main.go` — Changed route from `headoutHandler.CreateBooking` to `bookingFlowHandler.CreateBooking`
- `internal/services/email.go` — New file for email service (currently logs to console)

---

## 🔴 ITEM 2: No GTTD DB Interface Implementation (All GTTD Disabled)

**Status: NOT STARTED** — Excluded per instruction.

---

## ✅ DONE: GTTD Models Missing from Auto-Migration

**Completed:**
- Added `ExperienceGTTD{}`, `ExperienceOption{}`, `POIMapping{}` to `database.Migrate()`

**File changed:**
- `internal/database/database.go`

---

## ✅ DONE: No Experience Sync Mechanism

**Completed:**
- Created `internal/services/sync.go` with `SyncService`:
  - `SyncExperiences(ctx, cityCodes)` — Batch sync from Headout product listing
  - `SyncSingleExperience(ctx, headoutID)` — Sync single product from Headout
  - Populates both `Experience` and `ExperienceGTTD` models
  - Handles updates (upsert) and supports multiple cities
- Added admin sync endpoints:
  - `POST /api/v1/admin/sync` — Trigger sync for all or specified cities
  - `POST /api/v1/admin/sync/:id` — Sync a single experience by Headout ID
- Added live fallback to experience detail endpoints:
  - `GET /api/v1/experiences/by-id/:id` — Falls back to Headout product get
  - `GET /api/v1/experiences/:city/:slug` — Falls back to Headout city listing

**Files changed/created:**
- `internal/services/sync.go` — New sync service
- `internal/handlers/experience.go` — Added `SyncExperiences`, `SyncExperienceByID`, `fetchLiveExperienceByID`, `fetchLiveExperienceByCityAndSlug`, live fallback in detail endpoints
- `cmd/api/main.go` — Added sync routes

---

## ✅ DONE: No Local Booking Persistence

**Completed:**
- After successful Headout booking call, `saveBookingToDB()` creates a `Booking` record locally
- Captures: booking ID, Headout reference, status, quantity, price, currency, dates, customer email/phone

**File changed:**
- `internal/handlers/booking_flow.go` — Added `saveBookingToDB()` method

---

## 🟠 ITEM 6: No Auth Middleware on Protected Endpoints

**Status: NOT STARTED** — Needs Gin middleware implementation.

---

## ✅ DONE: GTTD Handler Placeholders

**Completed:**
- `GetStatus` now returns meaningful status with generator/jsonld builder availability
- `GetPreview` attempts to generate feed and returns file paths or meaningful error

**File changed:**
- `internal/handlers/gttd/handler.go`

---

## 🟡 ITEM 8: JSONLDBuilder `Build()` Returns Hardcoded Data

**Status: PARTIALLY DONE** — `BuildForExperience()` works but `Build()` still calls it with empty DB. Full fix requires DB interface implementation (Item 2).

---

## ✅ DONE: PricingRule Model Mismatch

**Completed:**
- Aligned Go `PricingRule` model with `init-db.sql` schema
- Updated fields: `Name`, `AppliesTo`, `TargetID`, `TargetCity`, `MarkupPercentage`, `FixedFeeAmount`, `FixedFeeCurrency`, `IsActive`
- Updated `PricingEngine` to use new field names
- Updated dead `ApplyPricingRule` code in `services/experience.go`

**Files changed:**
- `internal/models/pricing.go` — Rewrote model
- `internal/pricing/engine.go` — Updated field references
- `internal/services/experience.go` — Updated unused `ApplyPricingRule`

---

## ✅ DONE: Experience ↔ ExperienceGTTD Model Duality

**Completed:**
- Sync service now populates BOTH `Experience` and `ExperienceGTTD` tables
- `Experience` is used by the public API (search, listing, detail)
- `ExperienceGTTD` is used by GTTD feed generation
- Live fallback maps Headout products to `Experience` format on-the-fly

**Files changed:**
- `internal/services/sync.go` — Populates both models during sync

---

## 🟢 ITEM 11: GTTD SFTP Uploader Uses Insecure Host Key Check

**Status: NOT STARTED** — Low priority.

---

## 🟢 ITEM 12: Missing Redis Integration

**Status: NOT STARTED** — Low priority.

---

## 🟢 ITEM 13: Cron for GTTD Feed Upload Never Starts

**Status: AUTO-FIXED** when Item 2 is resolved.

---

## Summary

| Priority | Area | Status |
|----------|------|--------|
| 🔴 CRITICAL | Booking payload format mismatch | ✅ **DONE** |
| 🔴 CRITICAL | GTTD DB interface implementations | ⏸️ **DEFERRED** (per instructions) |
| 🟠 HIGH | GTTD model migration | ✅ **DONE** |
| 🟠 HIGH | Experience sync from Headout | ✅ **DONE** |
| 🟠 HIGH | Local booking persistence | ✅ **DONE** |
| 🟠 HIGH | Auth middleware | ❌ **TODO** |
| 🟡 MODERATE | GTTD handler placeholders | ✅ **DONE** |
| 🟡 MODERATE | JSONLDBuilder hardcoded data | 🟡 **PARTIAL** (needs Item 2) |
| 🟡 MODERATE | PricingRule model alignment | ✅ **DONE** |
| 🟡 MODERATE | Experience model duality | ✅ **DONE** |
| 🟢 LOW | SFTP insecure host key | ❌ **TODO** |
| 🟢 LOW | Redis caching | ❌ **TODO** |
| 🟢 LOW | Cron starts after GTTD fix | ⏸️ **DEFERRED** |

---

## What IS Already Implemented ✅

- All 14 Headout API endpoints are proxied (both v1 and v2) via `internal/handlers/headout.go`
- Headout proxy service with GET/POST/PUT + auth header support (`internal/services/headout_proxy.go`)
- Experience CRUD handlers with DB+live fallback (`internal/handlers/experience.go`)
- Booking flow calendar + availability endpoints (`internal/handlers/booking_flow.go`)
- Booking creation with frontend payload transformation + local persistence + email notification (`internal/handlers/booking_flow.go`)
- Experience sync service with admin endpoints (`internal/services/sync.go`)
- Email service (`internal/services/email.go`)
- GTTD feed types and generator logic (struct definitions, JSON serialization, sharding)
- GTTD JSON-LD builder structure (needs DB integration)
- POI mapper logic (needs DB integration)
- SFTP uploader logic (needs config)
- Pricing engine logic (needs DB integration)
- Database connection + full auto-migration (`internal/database/database.go`)
- Config loading with env-based URL resolution (`pkg/config/config.go`)
- Logger setup with zap (`pkg/logger/logger.go`)
- CORS middleware (`cmd/api/main.go`)
- Health/ready endpoints (`internal/handlers/health.go`)
- Graceful shutdown (`cmd/api/main.go`)
