# Headout DB-First Mode — Implementation Plan

## Summary of Non-Negotiable Rules
- **Rule A**: When `fetch_fresh = false`, ZERO Headout booking/inventory API calls
- **Rule B**: Admin has ONE sync control only — "Sync Inventory" on Settings page; all other sync buttons removed
- **Rule C**: Full sync must complete within 5 minutes (40 Tier-2 + 80 Tier-3 workers)

---

## Status of Phases

| Phase | Description | Status |
|-------|-------------|--------|
| 1 | Three-tier streaming sync pipeline (cities → variants → availability) | ✅ DONE |
| 2 | DB-first reads: GetCalendar, GetAvailability | ✅ DONE |
| 3 | DB-first reads: GetProductByIDV2, ListNormalAvailabilities | ✅ DONE |
| 4 | Capacity model (SELECT FOR UPDATE decrement) | ✅ DONE |
| 5+6 | Local booking path (booking_flow_db.go) | ✅ DONE |
| 7 | Admin sync button cleanup (Rule B) | ✅ DONE |
| 8 | price_from fix: sync writes MIN(price_amount) to products | ✅ DONE |
| 9 | NULL escape hatch fix in listProductsFromDB | ✅ DONE |

---

## Root Cause Analysis: Sync Not Storing Slots (June 11)

### Bug 1 — Wrong inventory endpoint
- **Symptom**: `slots_stored: 0` after full sync
- **Root cause**: `fetchAndStoreAvailability` called `/v2/products/{id}/variants/{variantId}/availabilities/` — date-level data with no `inventoryId` field. The guard `if inventoryID == "" { return false }` in `storeAvailabilitySlot` silently rejected every row.
- **Fix**: Switch to `/v2/inventory/list-by/tour/?tourId={variantId}` which returns items with `id` (inventoryId), per-person pricing, and `startDateTime`/`endDateTime`.

### Bug 2 — Missing `date` field in inventory items
- **Symptom**: Rows not upserted even after endpoint fix
- **Root cause**: Inventory API items use `startDateTime`, not `date`. `ExtractString(slotData, "date")` returned `""`, causing the upsert to fail.
- **Fix**: Added fallback: `if date == "" { date = startDT[:10] }`

### Bug 3 — Counter semantics: processed_products > total_products
- **Symptom**: Sync job showed `processed_products: 5198` vs `total_products: 4033`
- **Root cause**: `processed.Add(1)` was in Tier-3 (variant level). A product with N variants added N to the counter, but `total_products` was counted at product level (Tier-1).
- **Fix**: Moved `processed.Add(1)` to Tier-2 (product level). Both counters now measure at the same granularity.

---

## Root Cause Analysis: Product Page Issues for Product 20206 (June 12)

### Finding 1 — Price discrepancy: "Starts at" shows 36.26, calendar shows 36.25

**Source divergence:**
| Field | Source API field | Value |
|-------|-----------------|-------|
| `products.price_from` | `listingPrice.minimumPrice.finalPrice` | 36.26 |
| `product_availabilities.price_amount` | `pricing.headoutSellingPrice` | 36.25 |

Two different Headout API fields with a 1-cent divergence. The product listing displays `price_from`, but the calendar/availability queries read `price_amount`.

**Fix**: After storing availability slots per product, update `products.price_from = MIN(price_amount) WHERE remaining_capacity > 0`. This ensures the "Starts at" price shown in listing always matches the cheapest real bookable slot.

**Implementation location**: `sync/service.go` — `fetchAndStoreAvailability`, at line ~603 where `is_available` is already written back.

---

### Finding 2 — GetProductByIDV2 bypasses fetch_fresh (DB path commented out)

**Location**: `handlers/headout.go:606-618`

When `fetch_fresh = false`, `GetProductByIDV2` should read from `products` table. The DB path was implemented but commented out. The live path calls `syncProductToDB` which unconditionally calls Headout.

**Additional problem**: Even if uncommented, `writeProductFromDB` uses `product.PriceFrom` (36.26 from `listingPrice`), not the corrected price derived from `product_availabilities`. After Finding 1's fix, `price_from` will be updated correctly during sync, so `product.PriceFrom` will reflect the correct price.

**Fix**: Uncomment lines 606-618. The DB path reads `products` by `headout_id`, then calls `writeProductFromDB` which now uses the corrected `price_from`.

---

### Finding 3 — ListNormalAvailabilities bypasses fetch_fresh (DB path commented out)

**Location**: `handlers/headout.go:631-634`

Same pattern as Finding 2. When `fetch_fresh = false`, should read from `product_availabilities`. The implementation `listAvailabilitiesFromDB` exists and is correct (lines 1139-1235) but is never called.

**Fix**: Uncomment lines 631-634.

---

### Finding 4 — NULL escape hatch in listProductsFromDB

**Location**: `handlers/headout.go:456`

```go
query = query.Where("is_available = ? OR is_available IS NULL", true)
```

Products that have never been availability-synced have `is_available = NULL`. This escape hatch was added to avoid hiding products before the first sync. Now that sync is complete (4033 products synced), this clause allows stale products with no inventory data to appear in user-facing listings.

**Fix**: Remove the `OR is_available IS NULL` clause. Change to `WHERE is_available = true` only. Products without a successful availability sync will have `is_available = false` after sync completes.

**Edge case**: First-run before sync completes — product list will be empty until sync runs once. This is acceptable: it prevents showing products with no availability data.

---

### Finding 5 — No package-level filtering for remaining_capacity > 0

**Current behavior**: `ListNormalInventory` already has the DB path active and uses `listInventoryFromDB`. However, if a slot has `remaining_capacity = 0`, it is returned with `availability = "CLOSED"`. The frontend calendar will show these dates as unavailable, but they still appear in the response payload.

The correct behavior (when `fetch_fresh = false`) is: only return slots where `remaining_capacity > 0`. Zero-capacity slots contribute nothing to the calendar and slow the query.

**Fix**: Add `AND remaining_capacity > 0` to the WHERE clause in `listInventoryFromDB` and `listAvailabilitiesFromDB`.

---

## Proposed Solutions (All gated on fetch_fresh = false)

### Fix 1 — Sync writes corrected price_from

In `sync/service.go`, `fetchAndStoreAvailability`, after the `is_available` update (line ~603):

```go
// Update price_from to reflect cheapest available slot price
s.db.WithContext(ctx).Exec(`
    UPDATE products SET price_from = (
        SELECT MIN(price_amount) FROM product_availabilities
        WHERE product_id = ? AND remaining_capacity > 0
    ) WHERE id = ? AND EXISTS (
        SELECT 1 FROM product_availabilities
        WHERE product_id = ? AND remaining_capacity > 0
    )`, product.ID, product.ID, product.ID)
```

The `EXISTS` guard prevents overwriting `price_from` with NULL when no slots exist.

### Fix 2 — Uncomment GetProductByIDV2 DB path

Remove comment markers from `headout.go:606-618`. No logic change needed beyond uncomment — `price_from` will be correct after Fix 1.

### Fix 3 — Uncomment ListNormalAvailabilities DB path

Remove comment markers from `headout.go:631-634`. `listAvailabilitiesFromDB` already exists and is correct.

### Fix 4 — Remove NULL escape hatch

Change `headout.go:456`:
```go
// Before
query = query.Where("is_available = ? OR is_available IS NULL", true)
// After
query = query.Where("is_available = ?", true)
```

### Fix 5 — Filter zero-capacity slots in DB reads

Add `AND remaining_capacity > 0` to both `listInventoryFromDB` and `listAvailabilitiesFromDB` WHERE clauses.

---

## Edge Cases

| Case | Behavior |
|------|----------|
| Product in DB, no availability slots | `GetProductByIDV2` returns product data, calendar returns all-UNAVAILABLE |
| Product NOT in DB, `fetch_fresh=false` | Returns 404 — correct, don't call Headout |
| All slots at capacity=0 | Product shows with no available dates — user must select a different date or product |
| Sync runs while users browse | Price can update mid-session; next page load reflects updated price |
| `price_adult` is NULL (no per-person pricing) | `effectivePrice` falls back to `price_amount` — already handled in booking_flow_db.go |
| Two variants have different min prices | `MIN(price_amount)` across all variants — shows global minimum, same as Headout's behavior |

---

## Rollout Plan

1. Apply Fix 1 (sync price_from update) — takes effect on next sync run
2. Apply Fix 4 (NULL escape hatch) — safe immediately post-sync
3. Apply Fix 2 + Fix 3 (uncomment DB paths) — eliminates Headout calls for product detail
4. Apply Fix 5 (zero-capacity filter) — performance improvement, no functional change visible to user
5. Run one full inventory sync to populate corrected `price_from` values for all 4033 products

---

## Testing Plan

| Test | Expected |
|------|----------|
| `fetch_fresh=false`, GET /api/products/{20206} | Returns from DB, price=36.25 (corrected) |
| `fetch_fresh=false`, GET calendar for product 20206 | Returns available dates from DB |
| `fetch_fresh=false`, GET availability for product 20206 + date | Returns slots from DB |
| `fetch_fresh=false`, GET /api/products listing | No products with is_available=NULL appear |
| `fetch_fresh=true`, all above | Passes through to Headout unchanged |
| Sync run after fixes | products.price_from updated to MIN(price_amount) |
| Book a slot at remaining_capacity=1 | capacity decrements to 0, second booking rejected |
