# Products Feature (List all products)

## Backend

### API Endpoint

- **Path:** `GET /api/v1/headout/v2/products`
- **Method:** GET
- **Authentication:** Requires `Headout-Auth` header (proxied upstream to Headout's authenticated API via backend's configured API key)

### Database Schema

Not required. Products are fetched directly from the Headout API — no local database storage.

### External Headout APIs / Services

| API | Sandbox / Stage Base URL | Production Base URL | Endpoint | Auth |
|-----|--------------------------|---------------------|----------|------|
| Headout List Products (v2) | `https://sandbox.api.dev-headout.com` | `https://www.headout.com` | `/api/public/v2/products/` | API Key (`apiKeyAuth`) |

The backend uses `HeadoutProxyService` (`backend/internal/services/headout_proxy.go`) with the **authenticated** service instance (requires configured API key) pointed at Headout's production base URL. The handler validates `cityCode` (required), `offset` (default 0, rejects negative), and `limit` (default 20, max 100) before forwarding to Headout.

### API Details

- **Purpose:** Returns a list of bookable experiences (tickets, tours, activities) for a specific city, optionally filtered by collection, category, or subcategory.
- **Business logic:** Pure proxy — no transformation or filtering. The backend validates required parameters, clamps pagination, and forwards the query to Headout's v2 products endpoint.
- **Validation rules:**
  - `cityCode` — **required.** Must be a non-empty string. Returns `400 Bad Request` if missing.
  - `offset` — optional, defaults to 0, must be non-negative.
  - `limit` — optional, defaults to 20, max 100.
  - All other parameters (`collectionId`, `categoryId`, `subCategoryId`, `languageCode`, `currencyCode`, `campaignName`) are passed through as-is.
- **Error handling:**
  - Missing `cityCode` → `400 Bad Request`
  - Headout API unreachable → `502 Bad Gateway`
  - Missing API key (for authenticated endpoints) → `503 Service Unavailable`

### Request

```
GET /api/v1/headout/v2/products?cityCode=NEW_YORK&collectionId=4012&languageCode=EN&currencyCode=USD&limit=20&offset=0
```

No request body.

### Response

```json
{
  "products": [
    {
      "id": "19513",
      "name": "Edge Observation Deck Tickets",
      "canonicalUrl": "https://www.headout.com/edge-observation-deck-tickets/tickets-to-edge-observation-deck-e-19513/",
      "content": {
        "highlights": "• Gaze down from the outdoor sky deck on the 100th floor",
        "shortSummary": "Visit the highest outdoor sky deck in the Western Hemisphere at Hudson Yards.",
        "inclusions": "• Access to the 100th-floor outdoor sky deck",
        "exclusions": "• Food and beverages"
      },
      "city": {
        "code": "NEW_YORK",
        "name": "New York"
      },
      "media": [
        { "url": "https://cdn-imgix.headout.com/...", "type": "IMAGE" }
      ],
      "startLocation": {
        "latitude": 40.7541,
        "longitude": -74.001,
        "address": "30 Hudson Yards",
        "city": "New York",
        "postalCode": "10001",
        "country": "United States"
      },
      "productType": "ATTRACTION",
      "reviewsSummary": {
        "ratingsCount": 2763,
        "averageRating": 4.03
      },
      "pricing": {
        "currency": "USD",
        "profileType": "PER_PERSON",
        "headoutSellingPrice": 41.0,
        "netPrice": 33.62
      },
      "hasInstantConfirmation": true,
      "hasMobileTicket": true,
      "primaryCategory": { "id": "1", "name": "Tickets" },
      "primarySubCategory": { "id": "1007", "name": "Landmarks", "categoryId": "1" },
      "primaryCollection": { "id": "4012", "name": "Edge NYC", "cityCode": "NEW_YORK" },
      "variants": [ ... ],
      "cancellationPolicy": { "cancellable": false, "cancellableUpToInMinutes": null },
      "reschedulePolicy": { "reschedulable": false, "reschedulableUpToInMinutes": null }
    }
  ],
  "nextUrl": "/api/public/v2/products?cityCode=NEW_YORK&offset=1&limit=20",
  "prevUrl": null,
  "total": 69,
  "nextOffset": 1
}
```

---

## Frontend

### Pages

| Page | File | Responsibility |
|------|------|---------------|
| Products Browser | `frontend/app/products/page.tsx` | Standalone page that fetches products by city using the v2 endpoint |

### Components

| Component | File | Responsibility |
|-----------|------|---------------|
| `ProductCard` | `frontend/components/products/ProductCard.tsx` | Card displaying product image, name, price, rating, badges (discount, cancellable, reschedulable, instant confirmation, mobile ticket) |
| `ProductsGrid` | `frontend/components/products/ProductsGrid.tsx` | Client component with `useReducer` state management, renders grid of `ProductCard`s with Load More pagination |
| `ProductsFilters` | `frontend/components/products/ProductsFilters.tsx` | City code input with search action |

### State Management

No global state for products. State is managed locally within product listing components:
- `products` — accumulated list of products across loaded pages
- `nextOffset` — offset for the next page fetch (from API response)
- `hasMore` — whether more pages exist (`nextOffset !== null`)
- `loading` — loading state for the ongoing fetch
- `filters` — active filter state (collectionId, categoryId, subCategoryId)

### API Integration

| Function | File | API Called | Description |
|----------|------|------------|-------------|
| `getProducts()` | `frontend/lib/api.ts` | `GET /api/v1/headout/v2/products` | Fetches products by city (paginated) via Headout v2 endpoint. Accepts `cityCode`, `collectionId`, `categoryId`, `subCategoryId`, `languageCode`, `currencyCode`, `offset`, `limit`. |

- **Initial load:** Client component calls `getProducts({ cityCode, offset: 0, limit: 20 })` and renders the first 20 products.
- **Load More:** Client component calls `getProducts({ cityCode, offset: nextOffset, limit: 20 })` on button click and appends new products to the existing list.
- **Loading state:** Skeleton cards shown during fetch.
- **Error state:** Error message displayed inline; user can retry.
- **Empty state:** "No products available for this city" when total is 0.
- **Filter change:** Resets offset to 0 and replaces the product list with fresh results.

### Query Parameters

| Parameter | Required | Type | Default | Description |
|-----------|----------|------|---------|-------------|
| `cityCode` | Yes | string | — | Uppercase city identifier (e.g., `NEW_YORK`, `DUBAI`) |
| `collectionId` | No | string | — | Filter by themed collection |
| `categoryId` | No | string | — | Filter by top-level category |
| `subCategoryId` | No | string | — | Filter by subcategory |
| `languageCode` | No | string | `EN` | Localization language |
| `currencyCode` | No | string | — | Price display currency |
| `campaignName` | No | string | — | Partner campaign tracking |
| `offset` | No | integer | `0` | Pagination offset |
| `limit` | No | integer | `20` | Page size (max 100) |

### UI/UX Notes

- **City selector:** Required dropdown at the top — products cannot be fetched without a city.
- **Product cards:** Each card shows the first product image, name, product type badge, starting price, rating, and cancellation policy indicator.
- **Grid layout:** Responsive — 1 column on mobile, 2 on sm, 3 on md, 4 on lg.
- **Load More:** Centered button below the grid. Hidden when `nextOffset` is null.
- **Filters:** Optional dropdown filters for collection, category, and subcategory — shown only after a city is selected.
- **Currency/language:** Respects the global currency and language preferences from their respective contexts.

---

# Product Detail Feature (Get product by ID)

## Backend

### API Endpoint

- **Path:** `GET /api/v1/headout/v2/products/:productId`
- **Method:** GET
- **Authentication:** Requires `Headout-Auth` header (proxied upstream to Headout's authenticated API via backend's configured API key)

### Database Schema

Not required. Product details are fetched directly from the Headout API — no local database storage.

### External Headout APIs / Services

| API | Sandbox / Stage Base URL | Production Base URL | Endpoint | Auth |
|-----|--------------------------|---------------------|----------|------|
| Headout Get Product by ID (v2) | `https://sandbox.api.dev-headout.com` | `https://www.headout.com` | `/api/public/v2/products/{productId}/` | API Key (`apiKeyAuth`) |

The backend uses `HeadoutProxyService` (`backend/internal/services/headout_proxy.go`) with the **authenticated** service instance. The handler validates the `productId` path parameter is non-empty and forwards query parameters (`languageCode`, `currencyCode`, `campaignName`) as-is.

### API Details

- **Purpose:** Returns full details for a single Headout product by its ID, including all variants with variant-level pricing, content, media, POI operating schedules, and booking input fields.
- **Business logic:** Pure proxy — no transformation or filtering. The backend validates the product ID exists and proxies to Headout's v2 product detail endpoint.
- **Validation rules:**
  - `productId` — **required** path parameter. Returns `400 Bad Request` if empty.
  - `languageCode` — optional query param (default `EN`), passed to Headout.
  - `currencyCode` — optional query param, passed to Headout.
  - `campaignName` — optional query param, passed to Headout.
- **Error handling:**
  - Empty `productId` → `400 Bad Request`
  - Headout API unreachable → `502 Bad Gateway`
  - Missing API key → `503 Service Unavailable`
  - Product not found → `404 Not Found` (from Headout, passed through)

### Request

```
GET /api/v1/headout/v2/products/19513?languageCode=EN&currencyCode=USD
```

No request body.

### Response

```json
{
  "id": "19513",
  "name": "Edge Observation Deck Tickets",
  "canonicalUrl": "https://www.headout.com/edge-observation-deck-tickets/tickets-to-edge-observation-deck-e-19513/",
  "content": {
    "highlights": "• Gaze down from the outdoor sky deck on the 100th floor",
    "shortSummary": "Visit the highest outdoor sky deck in the Western Hemisphere at Hudson Yards.",
    "inclusions": "• Access to the 100th-floor outdoor sky deck\n• Access to the 101st-floor indoor viewing area",
    "exclusions": "• Food and beverages\n• Guided tour"
  },
  "city": { "code": "NEW_YORK", "name": "New York" },
  "media": [{ "url": "https://cdn-imgix.headout.com/...", "type": "IMAGE" }],
  "productType": "ATTRACTION",
  "reviewsSummary": { "ratingsCount": 5743, "averageRating": 4.4 },
  "pricing": { "currency": "USD", "profileType": "PER_PERSON", "headoutSellingPrice": 39.2, "netPrice": 32.14 },
  "hasInstantConfirmation": true,
  "hasMobileTicket": true,
  "primaryCategory": { "id": "1", "name": "Tickets" },
  "primarySubCategory": { "id": "1007", "name": "Landmarks", "categoryId": "1" },
  "primaryCollection": { "id": "4012", "name": "Edge NYC", "cityCode": "NEW_YORK" },
  "variants": [
    {
      "id": "38164",
      "name": "General Admission: Timed Entry",
      "description": "Entry to Edge Observatory Deck at the time slot selected",
      "duration": 60000,
      "inventoryType": "FIXED_START_FLEXIBLE_DURATION",
      "pax": { "min": 1, "max": 10 },
      "cashback": { "value": 0, "type": "ABSOLUTE" },
      "inputFields": [{ "id": "NAME", "name": "Full Name", "dataType": "STRING", "level": "PRIMARY_CUSTOMER" }],
      "pricing": { "currency": "USD", "profileType": "PER_PERSON", "headoutSellingPrice": 39.2, "netPrice": 32.14 }
    }
  ],
  "cancellationPolicy": { "cancellable": false, "cancellableUpToInMinutes": null },
  "reschedulePolicy": { "reschedulable": false, "reschedulableUpToInMinutes": null },
  "address": { "latitude": 40.7534, "longitude": -74.0011, "address": "30 Hudson Yards", "city": "New York", "postalCode": "10001", "country": "United States" },
  "pois": [
    {
      "name": "Edge Observation Deck",
      "operatingSchedules": [
        {
          "startDate": "2025-01-01",
          "endDate": "2025-12-31",
          "scheduleName": "Regular Hours",
          "operatingDaySchedules": [
            { "dayOfWeek": "MONDAY", "openingTime": "10:00", "closingTime": "22:00", "lastEntryTime": "21:00", "closed": false }
          ]
        }
      ]
    }
  ],
  "cutoffTimeInMinutes": 60
}
```

---

## Frontend

### Pages

| Page | File | Responsibility |
|------|------|---------------|
| Product Detail | `frontend/app/products/[id]/page.tsx` | Fetches single product by ID and renders full product detail page |

### Components

| Component | File | Responsibility |
|-----------|------|---------------|
| `ProductDetailHero` | `frontend/components/products/ProductDetailHero.tsx` | Hero section with main product image gallery, name, rating, badges, city, product type |
| `ProductDetailContent` | `frontend/components/products/ProductDetailContent.tsx` | Highlights, short summary, inclusions, exclusions, faq sections |
| `ProductDetailPricing` | `frontend/components/products/ProductDetailPricing.tsx` | Pricing info, variant selector with per-variant pricing, cancellation/reschedule policy badges |
| `ProductDetailPOI` | `frontend/components/products/ProductDetailPOI.tsx` | Points of interest with operating schedules |
| `ProductDetailVariantCard` | `frontend/components/products/ProductDetailVariantCard.tsx` | Individual variant card showing name, description, duration, pricing, cashback, cancellation policy, input fields |

### State Management

No global state for product detail. State is managed locally:
- `product` — the full product object from the API
- `loading` — loading state
- `error` — error state
- `selectedVariant` — currently selected variant for booking

### API Integration

| Function | File | API Called | Description |
|----------|------|------------|-------------|
| `getProductById()` | `frontend/lib/api.ts` | `GET /api/v1/headout/v2/products/:id` | Fetches full product detail by Headout product ID. Accepts optional `languageCode` and `currencyCode`. |

- **Loading state:** Full-page skeleton with image placeholder and text lines.
- **Error state:** Error message with retry button.
- **Not found state:** "Product not found" message.

### UI/UX Notes

- **Hero section:** Large product image with gallery thumbnails below. Product name, rating stars, review count, city, and product type badge overlay.
- **Content section:** Tabbed or collapsible sections for highlights, summary, inclusions, exclusions, FAQ.
- **Variant cards:** Each variant shown as a card with pricing, duration badge, pax limits, input fields summary, cashback info, and cancellation policy.
- **POI section:** Cards for each point of interest with operating schedule tables (day of week × opening/closing times).
- **Policy badges:** Clear visual badges for cancellable, reschedulable, instant confirmation, mobile ticket.
- **Price display:** Shows `headoutSellingPrice` prominently, with `netPrice` shown as reference.
- **Currency:** Respects the global currency preference.

### Availability Calendar

For products with `inventorySelectionType: NORMAL`, an availability calendar is shown below the variant cards. It displays per-date availability and pricing for the selected variant in a monthly grid.

#### API Integration

| Function | File | API Called | Description |
|----------|------|------------|-------------|
| `getVariantAvailabilities()` | `frontend/lib/api.ts` | `GET /api/v1/headout/v2/products/:id/variants/:variantId/availabilities` | Fetches date-level availability with lowest-slot pricing for a variant within a date range. |

- **Backend handler:** `headout.go` → `ListNormalAvailabilities` — validates `productId` and `variantId`, forwards query params (`currencyCode`, `startDate`, `endDate`) to Headout.
- **Frontend component:** `AvailabilityCalendar` — fetches availability for the selected variant, displays a monthly calendar grid. Only renders when `product.inventorySelectionType === "NORMAL"`.
- **Variant selection:** User clicks a variant card to select it; the calendar fetches availability for that variant. First variant is selected by default.
- **Currency:** Calendar auto-refetches when global currency changes (via `useCurrency` context).
- **Date range:** Fetches 60 days from today. User can click "Next Month" / "Previous Month" to navigate.
- **Loading state:** Skeleton grid shown while fetching.
- **Error state:** Retry button with error message.
- **Empty state:** "No availability found" message when API returns empty.
- **UI:** Each calendar day shows the price (or "Closed") with availability color coding — green for available, red for closed/limited.

### Slot Inventory

When a user clicks an available date on the calendar, the calendar fetches real‑time slot‑level inventory for that day. This data is **never cached** — a fresh request is made on every date click.

#### Backend

**API Endpoint**

- **Path:** `GET /api/v1/headout/v2/inventory`
- **Method:** GET
- **Authentication:** Requires `Headout-Auth` header (proxied upstream)

**External Headout API**

| API | Base URL | Endpoint | Auth |
|-----|----------|----------|------|
| Headout List Inventory — Normal | `https://www.headout.com` | `/api/public/v2/inventory/list-by/tour/` | API Key |

The backend validates required params (`tourId`, `startDateTime`, `endDateTime`, `currencyCode`) and forwards the request. All other params (`offset`, `limit`) are passed through.

**API Details**

- **Purpose:** Returns bookable time slots for a specific variant on a given date. Each slot includes available person types (Adult, Child, Senior, Student, etc.) with per‑person pricing, age ranges, and remaining capacity.
- **Business logic:** Pure proxy. No transformation.
- **Validation rules:**
  - `tourId` — required (variant ID)
  - `startDateTime` — required (ISO‑8601, e.g. `2026-06-15T00:00`)
  - `endDateTime` — required (ISO‑8601)
  - `currencyCode` — required
- **Error handling:**
  - Missing required params → `400 Bad Request`
  - Headout API unreachable → `502 Bad Gateway`

**Request**

```
GET /api/v1/headout/v2/inventory?tourId=39035&startDateTime=2026-06-15T00:00&endDateTime=2026-06-15T23:59&currencyCode=USD
```

**Response**

```json
{
  "items": [
    {
      "id": "520436588",
      "startDateTime": "2026-06-15T10:00:00",
      "endDateTime": "2026-06-15T19:00:00",
      "availability": "LIMITED",
      "remaining": 14,
      "pricing": {
        "persons": [
          {
            "type": "ADULT",
            "name": "Adult",
            "ageFrom": 13,
            "ageTo": 64,
            "price": 48.99,
            "originalPrice": 48.99,
            "netPrice": 48.99,
            "headoutSellingPrice": 48.99,
            "remaining": 14,
            "availability": "LIMITED",
            "paxRange": { "min": null, "max": null }
          }
        ],
        "groups": []
      }
    }
  ],
  "total": 2,
  "nextOffset": 1
}
```

#### Frontend

**Modified Component**

| Component | File | Responsibility |
|-----------|------|---------------|
| `AvailabilityCalendar` | `frontend/components/products/AvailabilityCalendar.tsx` | Calendar days become clickable; clicking a date triggers slot fetch |

**New Component**

| Component | File | Responsibility |
|-----------|------|---------------|
| `SlotPanel` | `frontend/components/products/SlotPanel.tsx` | Displays time slots for a selected date. Each slot card shows time range, availability badge, remaining count, and a pricing table per person type (Adult, Child, etc.). |

**State Management**

State is local to `AvailabilityCalendar`:
- `selectedDate` — the date string the user clicked (`null` when none)
- `slots` — inventory items returned from the API
- `slotsLoading` / `slotsError` — loading/error states for the slot fetch

**API Integration**

| Function | File | API Called | Description |
|----------|------|------------|-------------|
| `getSlotInventory()` | `frontend/lib/api.ts` | `GET /api/v1/headout/v2/inventory` | Fetches slots for a variant + date range. Never cached. |

- **Trigger:** User clicks a calendar day that has availability (`!== CLOSED` and not in past).
- **Parameters:** `tourId` = variant ID, `startDateTime` = `{date}T00:00`, `endDateTime` = `{date}T23:59`, `currencyCode` from context.
- **No cache:** Every click dispatches a fresh fetch (`cache: "no-store"`).

**UI/UX Notes**

- Clicking an available date highlights it (e.g. different border/ring) and loads slots below the calendar.
- Each slot is displayed as a compact card with:
  - Time range (start → end)
  - Availability badge (Limited / Unlimited / Closed)
  - Remaining count badge if low (< 20)
  - A simple pricing table rows: Person Type | Age Range | Price | Availability
- If no slots are returned for the date, show "No slots available for this date."
- If the user clicks a different date, the previous slot results are cleared and a new fetch begins.
- Clicking a past date or a CLOSED date does nothing (no visual change).

---

# Cities Feature

## Backend

### API Endpoint

- **Path:** `GET /api/v1/headout/v2/cities`
- **Method:** GET
- **Authentication:** Required via `Headout-Auth` header (proxied upstream to Headout's public API)

### Database Schema

Not required. Cities are fetched directly from the Headout API — no local database storage.

### External Headout APIs / Services

| API | Sandbox / Stage Base URL | Production Base URL | Endpoint | Auth |
|-----|--------------------------|---------------------|----------|------|
| Headout List Cities (v1) | `https://sandbox.api.dev-headout.com` | `https://www.headout.com` | `/api/public/v1/city` | None (public) |
| Headout List Cities (v2) | `https://sandbox.api.dev-headout.com` | `https://www.headout.com` | `/api/public/v2/cities/` | None (public) |

The backend uses `HeadoutProxyService` (`backend/internal/services/headout_proxy.go`) with the **public** service instance (no API key required) pointed at Headout's production base URL. The backend validates `offset` (default 0, rejects negative) and `limit` (default 20, max 20) query parameters before forwarding.

### API Details

- **Purpose:** Returns a list of discoverable cities from Headout. Each city includes a code, display name, image, country, and timezone.
- **Business logic:** Pure proxy — no transformation or filtering. The backend forwards the query as-is to Headout's public city endpoint and returns the raw response.
- **Validation rules:** Supports optional `offset` and `limit` query parameters. `limit` defaults to 20, max 20. `offset` defaults to 0, must not be negative.
- **Error handling:**
  - Headout API unreachable → `502 Bad Gateway`
  - Missing API key (for authenticated endpoints) → `503 Service Unavailable`
  - Bad request (negative offset) → `400 Bad Request` (from Headout)

### Request

```
GET /api/v1/headout/v2/cities?offset=0&limit=20
```

No request body.

### Response

```json
{
  "cities": [
    {
      "code": "AMSTERDAM",
      "name": "Amsterdam",
      "image": {
        "url": "//cdn-imgix.headout.com/media/images/ee075882083344be170ed38c8c76b4a1-amsterdam.jpeg"
      },
      "country": {
        "code": "NL",
        "name": "Netherlands"
      },
      "timezone": "Europe/Amsterdam"
    }
  ],
  "nextUrl": "/api/public/v1/city/?offset=20&limit=20",
  "prevUrl": null,
  "total": 142,
  "nextOffset": 20
}
```

---

## Frontend

### Pages

| Page | File | Responsibility |
|------|------|---------------|
| Homepage | `frontend/app/page.tsx` | Displays top experiences, which contain city badge decorations |
| City Experiences | `frontend/app/[city]/page.tsx` | Dynamic route that accepts a city name slug and fetches experiences for that city |
| Search | `frontend/app/search/page.tsx` | Accepts a `city` query parameter for filtering search results by city |
| Cities Browser | `frontend/app/cities/page.tsx` | Standalone page showing all discoverable cities as a grid of cards with a "Load More" button |

### Components

| Component | File | Responsibility |
|-----------|------|---------------|
| `CityBadge` | `frontend/components/common/CityBadge.tsx` | Displays the city name on experience cards |
| `CityCard` | `frontend/components/cities/CityCard.tsx` | Card displaying city image, name, country, and a link to the city's experiences page |
| `CitiesGrid` | `frontend/components/cities/CitiesGrid.tsx` | Client component that renders a grid of `CityCard`s and a "Load More" button |
| `CitiesPage` | `frontend/app/cities/page.tsx` | Server component that fetches the first page and passes it to `CitiesGrid` |

### State Management

No global state for cities. State is managed locally within `CitiesGrid`:
- `cities` — accumulated list of cities across loaded pages
- `nextOffset` — offset for the next page fetch (from API response)
- `hasMore` — whether more pages exist (`nextOffset !== null`)
- `loading` — loading state for the ongoing fetch

### API Integration

| Function | File | API Called | Description |
|----------|------|------------|-------------|
| `getCities()` | `frontend/lib/api.ts:196` | `GET /api/v1/headout/v2/cities` | Fetches cities (paginated) via Headout v2 endpoint. |

- **Initial load:** Server component calls `getCities(0, 20)` and renders the first 20 cities.
- **Load More:** Client component calls `getCities(nextOffset, 20)` on button click and appends new cities to the existing list.
- **Loading state:** Skeleton cards (matching the grid layout) shown alongside existing cards during fetch.
- **Error state:** Error message displayed inline; user can retry.
- **Edge case — all loaded:** "Load More" button is hidden when `nextOffset` is `null` (no more pages).
- **Edge case — empty:** "No cities available" empty state when total is 0.

### UI/UX Notes

- **City cards:** Each card shows the city image (from Headout CDN), city name prominently, and country below. Cards link to `/[city]` page.
- **Grid layout:** Responsive — 1 column on mobile, 2 on sm, 3 on md, 4 on lg.
- **Load More:** Centered button below the grid. Shows a spinner while loading.
- **Navigation:** A "Cities" link is added to the Navbar and MobileNav for discoverability.
- **Pagination approach:** Append-based (infinite scroll pattern via explicit button) rather than page-based navigation, keeping previously loaded data visible.

---

# Currency Feature

## Backend

### API Endpoint

- **Path:** `GET /api/v1/currencies`
- **Method:** GET
- **Authentication:** None (public)

### Database Schema

Not required. Currencies are served from a hardcoded list in the backend handler.

### API Details

- **Purpose:** Returns a list of supported currencies with their ISO code, symbol, and display name.
- **Business logic:** Returns a static list of 16 commonly used currencies. No database or external service dependency.
- **Error handling:** Always returns `200 OK` with the full list.

### Response

```json
{
  "data": [
    { "code": "USD", "symbol": "$", "name": "US Dollar" },
    { "code": "EUR", "symbol": "€", "name": "Euro" }
  ]
}
```

---

## Frontend

### Pages

| Page | File | Impact |
|------|------|--------|
| All pages | All | Currency is read from context and passed to all product/experience API calls |
| Homepage | `frontend/app/page.tsx` | Reads currency from cookie for server-side rendering |

### Components

| Component | File | Responsibility |
|-----------|------|---------------|
| `CurrencyProvider` | `frontend/context/CurrencyContext.tsx` | Global state — stores selected currency, fetches supported currencies from backend, provides `currency`, `setCurrency()`, `supportedCurrencies`, `formatPrice()` |
| `CurrencyPicker` | `frontend/components/common/CurrencyPicker.tsx` | Dropdown in navbar showing supported currencies from context; selecting one calls `setCurrency()` which persists to localStorage + cookie |
| `PriceDisplay` | `frontend/components/common/PriceDisplay.tsx` | Accepts `amount` and optional `currency` prop; falls back to context currency if no prop given |
| `useCurrency` | `frontend/hooks/useCurrency.ts` | Re-exports `useCurrencyContext` for convenience |

### State Management

- **CurrencyContext** wraps the entire app in `layout.tsx`.
- **State:**
  - `currency` — the currently selected currency code (e.g. "USD")
  - `supportedCurrencies` — array of `{ code, symbol, name }` fetched from `/api/v1/currencies`
  - `formatPrice(amount)` — formats a number using `Intl.NumberFormat` with the current currency
- **Persistence:**
  - On change: saved to `localStorage` (key `traviia_currency`) and `document.cookie` (for server access)
  - On mount: restored from localStorage
- **Reactivity:** When `setCurrency()` is called, all consuming components re-render instantly via React context. Data-fetching components (ProductsGrid, product detail page, etc.) automatically re-fetch with the new currency code.

### API Integration

| Function | File | API Called | Behaviour |
|----------|------|------------|-----------|
| `getSupportedCurrencies()` | `frontend/lib/api.ts` | `GET /api/v1/currencies` | Fetches the list of available currencies |
| `getProducts()` | `frontend/lib/api.ts` | `GET /api/v1/headout/v2/products` | Passes `currencyCode` from context |
| `getProductById()` | `frontend/lib/api.ts` | `GET /api/v1/headout/v2/products/:id` | Passes `currencyCode` from context |

- **CurrencyPicker:** Reads `supportedCurrencies` from context (fetched once on mount via the CurrencyProvider). No fallback needed — backend always returns the list.
- **ProductsGrid:** Reads `currency` from context, passes it as `currencyCode` in every API call. Re-fetches when currency changes.
- **Product detail page:** Reads `currency` from context, passes it as `currencyCode` in `getProductById()`. Re-fetches when currency changes.

### UI/UX Notes

- **CurrencyPicker** is rendered in the Navbar as a dropdown button showing the current currency's symbol + code.
- **Price display** across all product cards and detail pages uses the currency returned by the API (which reflects the requested `currencyCode`). The `PriceDisplay` component auto-formats with `Intl.NumberFormat`.
- **Instant update:** When the user selects a different currency, the dropdown closes, the new currency is persisted, and all visible data re-fetches automatically with the new currency code. No page reload needed.
- **Server-side rendering:** The homepage reads the currency from cookies to fetch experiences in the correct currency on first load.

---

# Booking Feature (Create a new booking)

## Backend

### API Endpoint

- **Path:** `POST /api/v1/bookings`
- **Method:** POST
- **Authentication:** Requires `Headout-Auth` header (proxied upstream to Headout's authenticated v2 booking API)

### Database Schema

#### `bookings` Table

```sql
CREATE TABLE bookings (
    id                      BIGSERIAL PRIMARY KEY,
    booking_id              VARCHAR(255) NOT NULL UNIQUE,          -- Headout's unique booking ID
    partner_reference_id    VARCHAR(255),                           -- Partner's own reference ID
    session_id              VARCHAR(255),                           -- Cart session ID (links back to cart)
    status                  VARCHAR(50) NOT NULL DEFAULT 'UNCAPTURED',
                                                                   -- UNCAPTURED, PENDING, COMPLETED, CANCELLED, FAILED, CAPTURE_TIMEDOUT

    -- Product Info
    product_id              VARCHAR(255),                           -- Headout product ID
    product_name            TEXT,                                   -- Product display name
    variant_id              VARCHAR(255),                           -- Headout variant ID
    variant_name            TEXT,                                   -- Variant display name
    inventory_type          VARCHAR(50),                            -- NORMAL or SEATMAP

    -- Slot Info
    inventory_id            VARCHAR(255),                           -- Headout inventory slot ID
    start_date_time         TIMESTAMP,                              -- Scheduled start date/time
    end_date_time           TIMESTAMP,                              -- Scheduled end date/time
    inventory_seat_ids      JSONB,                                  -- Seat IDs for seatmap products (null for NORMAL)

    -- Customer Details (primary customer / summary)
    customer_count          INTEGER NOT NULL DEFAULT 1,             -- Total number of customers
    adults                  INTEGER NOT NULL DEFAULT 1,
    children                INTEGER NOT NULL DEFAULT 0,
    first_name              VARCHAR(255) NOT NULL,                  -- Primary customer's first name
    last_name               VARCHAR(255) NOT NULL,                  -- Primary customer's last name
    email                   VARCHAR(255) NOT NULL,                  -- Primary customer's email
    phone                   VARCHAR(50),                            -- Primary customer's phone
    customer_data           JSONB,                                  -- Detailed per-person customer data (personType, isPrimary, inputFields)
    variant_input_fields    JSONB,                                  -- Booking-level input fields

    -- Pricing
    total_amount            DECIMAL(12, 2),                         -- Total price paid
    currency_code           VARCHAR(10) DEFAULT 'USD',              -- Currency code
    original_amount         DECIMAL(12, 2),                         -- Original price before discount
    discount                DECIMAL(5, 2),                          -- Discount percentage

    -- Headout Response
    headout_reference       VARCHAR(255),                           -- Headout reference number
    voucher_url             TEXT,                                   -- Voucher PDF URL
    tickets                 JSONB,                                  -- Ticket data (array of ticket objects)

    -- Metadata
    idempotency_key         VARCHAR(255) UNIQUE,                    -- Idempotency key for safe retry
    special_requests        TEXT,                                   -- Special requests from customer
    confirmation_email_sent BOOLEAN DEFAULT FALSE,                  -- Whether confirmation email was sent

    -- Timestamps
    booking_date            TIMESTAMP NOT NULL DEFAULT NOW(),       -- When booking was created
    experience_date         DATE,                                   -- The date of the experience
    created_at              TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at              TIMESTAMP                               -- Soft delete
);

-- Indexes
CREATE INDEX idx_bookings_session_id ON bookings(session_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_email ON bookings(email);
CREATE INDEX idx_bookings_experience_date ON bookings(experience_date);
```

#### Relationships

- `session_id` links a booking back to the cart session that created it
- `booking_id` is the primary external identifier from Headout (unique)
- `customer_data` stores the full per-person customer payload as JSONB for audit trail

### External Headout APIs / Services

| API | Base URL | Endpoint | Auth |
|-----|----------|----------|------|
| Headout Create Booking (v2) | Same as configured `HEADOUT_URL` | `/api/public/v2/bookings/` | API Key (`Headout-Auth`) |

### API Details

- **Purpose:** Creates a booking in `UNCAPTURED` state. The booking is two-step: `CreateBooking` reserves the slot and returns a `bookingId`, then `CaptureBooking` captures it. Bookings not captured within 1 hour auto-expire to `CAPTURE_TIMEDOUT`.
- **Business logic:** Receives a booking request from the frontend (productId, variantId, inventoryId, date, adults/children, customer info, price), transforms it to Headout's v2 booking format (customersDetails + price), forwards it to Headout, saves a reference record locally, and returns the booking response.
- **Validation rules:**
  - `variantId` — required
  - `inventoryId` — required
  - `productId` — required
  - `date` — required, must be `YYYY-MM-DD` format
  - `email` — required, must contain `@` and `.`
  - `firstName`, `lastName` — required
  - `adults` / `children` — must be non-negative, at least 1 total
- **Booking flow (direct / single-item):**
  - Frontend calls `POST /api/v1/bookings` with customer details and selected slot
  - Backend transforms flat payload → Headout format (`customersDetails`, `price`), posts to `POST /v2/bookings/`, saves local reference, returns `bookingId`
- **Booking flow (cart / multi-item):**
  - Items are added to cart via `POST /api/v1/cart/items`
  - Checkout via `POST /api/v1/cart/checkout` iterates all items and creates bookings
  - Each item is booked individually via the same Headout v2 API

### Request (to Backend)

```json
{
  "productId": "18969",
  "productName": "Bali Swing Experience",
  "variantId": "25525",
  "variantName": "Standard Entry",
  "inventoryId": "501183605",
  "inventoryType": "NORMAL",
  "date": "2025-04-12",
  "startDateTime": "2025-04-12T19:30:00",
  "endDateTime": "2025-04-12T20:15:00",
  "adults": 1,
  "children": 0,
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "phone": "+14155551234",
  "currencyCode": "USD",
  "priceAmount": 77.08,
  "specialRequests": "Window seat preferred",
  "variantInputFields": [
    { "id": "PICKUP_LOCATION", "value": "Hotel Lobby" }
  ]
}
```

### Response

```json
{
  "bookingId": "126890",
  "partnerReferenceId": null,
  "status": "UNCAPTURED",
  "startDateTime": "2025-04-12T19:30:00",
  "totalAmount": 77.08,
  "currency": "USD",
  "voucherUrl": "https://www.headout.com/voucher/126890?...",
  "confirmationEmailSent": true
}
```

### Headout-facing Payload (transformed by backend)

```json
{
  "productId": "18969",
  "variantId": "25525",
  "inventoryId": "501183605",
  "inventorySeatIds": null,
  "customersDetails": {
    "count": 1,
    "customers": [
      {
        "personType": "ADULT",
        "isPrimary": true,
        "inputFields": [
          { "id": "NAME", "value": "John Doe" },
          { "id": "EMAIL", "value": "john@example.com" },
          { "id": "PHONE", "value": "+14155551234" }
        ]
      }
    ]
  },
  "variantInputFields": [
    { "id": "PICKUP_LOCATION", "value": "Hotel Lobby" }
  ],
  "price": {
    "amount": 77.08,
    "currencyCode": "USD"
  }
}
```

---

## Frontend

### Pages

| Page | Path | Purpose |
|------|------|---------|
| Product Detail | `/[city]/[slug]` | Contains AvailabilityCalendar + SlotPanel with "Book Now" / "Add to Cart" |
| Cart | `/cart` | Lists cart items, remove items, "Checkout All" |
| Checkout | `/checkout` | Customer details form + order summary, submits booking(s) |
| Confirmation | `/checkout/confirmation` | Shows booking confirmation with reference number |

### Components

#### SlotPanel (modified)
- **Current:** Shows time slots with pricing tables
- **Changes:** Add quantity selectors (adults, children) per slot, "Book Now" button (direct to checkout), "Add to Cart" button (adds to cart)
- **Loading state:** Skeleton/pulse while slots load
- **Error state:** Error message with retry button
- **Empty state:** "No slots available" message

#### AvailabilityCalendar (modified)
- Track selected slot ID alongside selected date
- Pass productId, variantId, selected date, and selected slot info down to SlotPanel
- No changes to calendar grid structure

#### CartItemCard (existing — works for products too)
- Shows product image, title, date, time, guest count, price
- Remove button

#### CheckoutForm (existing — minor updates)
- Handles both single-item (Book Now) and multi-item (cart) checkout
- For multi-item: submits all items sequentially via checkout endpoint
- For single: submits via createBooking endpoint

#### OrderSummary (existing — minor updates)
- Shows title, guests, total price

### State Management

**CartContext** (existing):
- SWR-based cart with session ID from localStorage
- `addItem`, `removeItem`, `clearCart` functions
- Auto-revalidates every 30s

**Selected Slot State** (local to SlotPanel / AvailabilityCalendar):
- `selectedSlotId` — string | null (tracks which slot the user selected)
- `adultCount`, `childCount` — number (per slot quantity selectors)

### API Integration

| Function | File | API Called | Behaviour |
|----------|------|------------|-----------|
| `addCartItem()` | `frontend/lib/api.ts` | `POST /api/v1/cart/items` | Adds a slot to the cart |
| `removeCartItem()` | `frontend/lib/api.ts` | `DELETE /api/v1/cart/items/:id` | Removes an item from cart |
| `createBooking()` | `frontend/lib/api.ts` | `POST /api/v1/bookings` | Direct booking (single item) |
| Cart checkout | `POST /api/v1/cart/checkout` | `POST /api/v1/cart/checkout` | Checkout all cart items |

### UI/UX Notes

- **"Book Now"** navigates to `/checkout?experienceId=...&variantId=...&inventoryId=...&date=...&time=...&adults=...&children=...&price=...&currency=...&title=...`
- **"Add to Cart"** calls `addCartItem()` with slot details, shows a brief toast confirmation, cart badge updates
- **Cart page** has a sticky bottom bar with total and "Checkout All" button
- **Checkout page** shows a single-column form on mobile, two columns on desktop (form + summary)
- **Confirmation page** shows reference number and "Explore more" CTA
- **Edge cases:**
  - Slot becomes unavailable between viewing and booking → handle error gracefully with "Slot no longer available" message
   - Cart is empty → disabled checkout button, show empty state
   - Network error during booking → show error with retry option

---

# Cart Page Refactor

## Current Problem

### 1. No Guest Count Display
Each `CartItem` stores `adults` and `children` as separate fields, but the cart UI only shows them as text (`"2 adults, 1 child"`). There is no per-item guest counter, and users cannot modify guest counts from the cart page.

### 2. No Guest Counter
The cart is read-only — users cannot increase/decrease guest quantities. To change a guest count, they must remove the item and re-add it, which is poor UX.

### 3. Duplicate Cart Items
When a user adds the same activity (same `experienceId` + `variantId` + `date`) to the cart multiple times, the backend creates separate `CartItem` rows. The cart page renders each as a distinct card:

```
Cart
──────────────────────────
Activity A - Jun 09 - 1 Guest      [Book now]
Activity A - Jun 09 - 1 Guest      [Book now]
Activity A - Jun 09 - 1 Guest      [Book now]
```

There is no merging — no deduplication logic exists on frontend or backend.

### 4. Flat Item List
Cart items are stored as a flat `CartItem[]` array with no grouping. Items for the same experience on different dates appear as completely separate cards with duplicate headers, images, and action buttons.

### 5. No Date Grouping
Activities with time slots (e.g., multiple time slots on the same day, or the same activity across multiple days) cannot be managed under a single activity card.

### 6. Single-Item Checkout
The "Book now" button on each cart item navigates to checkout with URL params for a single item. "Checkout All" sends all item IDs comma-separated. Neither approach groups by activity.

---

## Proposed Cart Structure

### Data Model

```ts
// Normalized cart data (stored in CartContext)
interface CartData {
  sessionId: string;
  items: CartItem[];           // Raw items from API (unchanged at API level)
  totalItems: number;
  totalPrice: number;
  currency: string;
}

// Grouped cart data (computed for rendering)
interface GroupedCart {
  activities: ActivityGroup[];
  cartTotal: number;
  currency: string;
}

interface ActivityGroup {
  activityId: string;          // experienceId
  activityName: string;
  imageUrl: string;
  variantId: string;
  pricePerGuest: number;
  currency: string;
  bookings: BookingRow[];      // Grouped by date+time
}

interface BookingRow {
  cartItemId: string;          // Original CartItem.id (for remove/checkout)
  date: string;                // "2026-06-09"
  time: string;                // "09:00 AM"
  startDateTime: string;
  endDateTime: string;
  guests: number;              // Combined guest count
  subtotal: number;            // guests * pricePerGuest
}
```

### Grouping Logic

```
Raw CartItem[]                           Grouped (for display)
─────────────────────                    ─────────────────────
Item A - Jun 09 - 1 guest                Activity X (price: $462)
Item B (different exp) - Jun 10 - 2      ├─ Jun 09, 09:00 AM | 3 guests | $1,386
Item A - Jun 09 - 1 guest                ├─ Jun 10, 09:00 AM | 1 guest  | $462
Item A - Jun 10 - 1 guest                └─ Activity total: $1,848
                                         Activity Y (price: $300)
                                         └─ Jun 10, 10:00 AM | 2 guests | $600
                                         ─────────────────────────────
                                         Cart total: $2,448
```

---

## State Shape

```ts
// CartContext provides:
interface CartContextValue {
  // Raw data from API
  cart: Cart | undefined;
  isLoading: boolean;
  error: Error | undefined;

  // Mutations
  addItem: (item: Omit<CartItem, "id">) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  clearCart: () => Promise<void>;

  // Derived / convenience
  itemCount: number;

  // NEW: Grouped cart for rendering
  groupedCart: GroupedCart | null;

  // NEW: Update guest count
  updateGuestCount: (cartItemId: string, newGuests: number) => Promise<void>;
}
```

### Computed State (derived via `useMemo`)

```ts
function groupCartItems(items: CartItem[]): GroupedCart {
  // 1. Group by experienceId
  // 2. Within each group, group by date+startDateTime
  // 3. Merge duplicates (same exp + same date+time → sum guest count)
  // 4. Compute per-booking subtotal and per-activity totals
  // 5. Compute cart-wide total
}
```

### Grouping Key

```
groupKey = `${item.experienceId}::${item.date}::${item.startDateTime}`
```

Items with the same `groupKey` are merged — their guest counts are summed and their `cartItemId` list is tracked for removal of individual bookings.

---

## UI Wireframe

### Desktop

```
┌─────────────────────────────────────────────────────────┐
│  Your Cart                           [Clear cart]       │
├─────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Kangaroo Island ATV Quad Guided Bike Tour           │ │
│ │                                                     │ │
│ │  ┌────────────────────────────────────────────────┐ │ │
│ │  │ Booking Dates                     [Delete Act.]│ │ │
│ │  ├────────────────────────────────────────────────┤ │ │
│ │  │ Jun 09, 2026  |  09:00 AM                     │ │ │
│ │  │ Guests:  [-]  2  [+]           Subtotal: $924 │ │ │
│ │  │                                      [Remove]  │ │ │
│ │  ├────────────────────────────────────────────────┤ │ │
│ │  │ Jun 10, 2026  |  09:00 AM                     │ │ │
│ │  │ Guests:  [-]  1  [+]           Subtotal: $462 │ │ │
│ │  │                                      [Remove]  │ │ │
│ │  └────────────────────────────────────────────────┘ │ │
│ │  Activity Total: $1,386                              │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Sydney Harbour Bridge Climb                         │ │
│ │  ┌────────────────────────────────────────────────┐ │ │
│ │  │ Booking Dates                     [Delete Act.]│ │ │
│ │  ├────────────────────────────────────────────────┤ │ │
│ │  │ Jun 11, 2026  |  14:00 PM                      │ │ │
│ │  │ Guests:  [-]  2  [+]           Subtotal: $500 │ │ │
│ │  │                                      [Remove]  │ │ │
│ │  └────────────────────────────────────────────────┘ │ │
│ │  Activity Total: $500                                │ │
│ └─────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────┤
│  Cart Total: $1,886                         [Checkout]  │
└─────────────────────────────────────────────────────────┘
```

### Mobile

```
┌─────────────────────────┐
│ Your Cart   [Clear]     │
├─────────────────────────┤
│ Kangaroo Island ATV     │
│ Quad Guided Bike Tour   │
│                         │
│ ── Booking Dates ────   │
│                         │
│ Jun 09, 2026           │
│ 09:00 AM               │
│ [-] 2 [+]  Sub: $924   │
│              [Remove]   │
│                         │
│ Jun 10, 2026           │
│ 09:00 AM               │
│ [-] 1 [+]  Sub: $462   │
│              [Remove]   │
│                         │
│ Activity Total: $1,386  │
│               [Delete]  │
├─────────────────────────┤
│ Cart Total: $1,886      │
│              [Checkout]  │
└─────────────────────────┘
```

---

## Edge Cases

| # | Case | Expected Behavior |
|---|------|------------------|
| 1 | User adds same experience + date + time twice | Merge into one booking row, sum guest counts |
| 2 | User adds same experience, different date | Separate booking rows under same activity |
| 3 | User adds same experience, same date, different time | Separate booking rows (different time slots) |
| 4 | Guest count reaches 1, user clicks "-" | Button disabled at 1 — cannot go below minimum |
| 5 | Guest count reaches capacity limit | "+" button disabled, show "Max reached" tooltip |
| 6 | User removes the last booking row in an activity | Activity card disappears from cart |
| 7 | Network error during guest count update | Show toast error, revert count to previous value |
| 8 | Two users share the same browser (same session) | SWR revalidation picks up external changes within 30s |
| 9 | Activity has no imageUrl | Show placeholder "No image" box |
| 10 | Cart is empty | Show EmptyState component with "Browse experiences" CTA |
| 11 | Loading cart data | Show skeleton cards |
| 12 | API returns error | Show error state with retry |
| 13 | User clears cart | Remove all items, show empty state, toast confirmation |
| 14 | Rapid +/- clicks on guest counter | Debounce API calls — wait for current PATCH to complete before next |
| 15 | Different currencies in cart | Use the currency of the first item; show all prices in that currency |

---

## API Impact Analysis

### Current API

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/cart` | Get cart by session |
| `POST` | `/api/v1/cart/items` | Add item to cart |
| `DELETE` | `/api/v1/cart/items/:id` | Remove item from cart |
| `DELETE` | `/api/v1/cart` | Clear entire cart |

### New Endpoint Required

The current API has no way to **update** an existing cart item's guest count. The remove-and-re-add approach is racy and loses the original `id`. A new PATCH endpoint is needed:

| Method | Endpoint | Description | Request Body |
|--------|----------|-------------|--------------|
| `PATCH` | `/api/v1/cart/items/:id` | Update cart item guests | `{ "adults": 3, "children": 0 }` or `{ "guestCounts": { "ADULT": 3 } }` |

**Backend changes required:**
- Add `PATCH /api/v1/cart/items/:id` route to the Go Gin router
- Add `UpdateItem` handler in `internal/handlers/cart.go`
- Add `UpdateItem` service method in `internal/services/cart.go`
- The handler reads the item ID from the URL param and the updated fields from the JSON body
- The service finds the existing `CartItem` by UUID, updates guest counts, recalculates totals, and saves

**Frontend changes required:**
- Add `PATCH` fetch to `app/api/cart/[id]/route.ts` in the Next.js API proxy
- Add `updateCartItem()` function in `frontend/lib/api.ts`
- Add `updateGuestCount` method to CartContext
- Compute `groupedCart` via `useMemo` in CartContext
- Refactor `CartItemCard` to show guest counter
- Refactor `CartPage` to render grouped layout

### No Backward Compatibility Issues

- The raw `CartItem[]` structure from the API stays the same
- The `GET /api/v1/cart` response is unchanged (no migration needed)
- The new PATCH endpoint is additive — existing clients are unaffected
- The grouping logic is purely a frontend transformation in `useMemo`; the backend is unchanged for reads

### Checkout Flow Compatibility

- Single-item checkout: uses the `cartItemId` from the booking row → same as current flow
- Multi-item checkout: "Checkout All" sends all `cartItemId`s → same as current flow
- No changes needed to `CheckoutForm.tsx`, `OrderSummary.tsx`, or the backend booking handlers

---

# Search System (Global Search)

## Audit Findings (Pre-Implementation)

### Frontend Issues Found

| Issue | File | Status |
|---|---|---|
| `SearchFilters.tsx` is a stub returning `null` | `frontend/components/search/SearchFilters.tsx` | Broken |
| `useSearch.ts` hook is orphaned (never imported) | `frontend/hooks/useSearch.ts` | Orphaned |
| No autocomplete/suggestions on any search input | All search components | Missing |
| No debounce on search input | `hero.tsx`, `SearchBar.tsx` | Missing |
| Search bar does not pre-populate from URL params | `SearchBar.tsx` | Bug |
| `getTopExperiences` and `getPopularExperiences` are duplicates | `frontend/lib/api.ts` | Duplicate |
| Two separate search ecosystems (experiences vs Headout products) | `SearchBar` vs `ProductsFilters` | Not integrated |

### Backend Issues Found

| Issue | File | Status |
|---|---|---|
| No dedicated search endpoint — search is interleaved with experience listing | `experience.go` | Architectural |
| No fuzzy matching or typo tolerance | All handlers | Missing |
| `ExperienceCatalogService` (GORM search) is never wired into router | `services/experience_catalog.go` | Unused |
| No Elasticsearch/Meilisearch/Algolia — pure string containment | Entire backend | Missing |
| Search only returns flat `Experience[]`, no typed sections | `experience.go:210` | Missing |

### What Works

- Basic search flow: query → `/api/v1/experiences/search` → string-contains filter → results
- Pagination on search results page preserves URL params
- City-specific search via `/cities/[city]` works
- Empty/error states handled in `SearchResults`

---

## Backend

### API Endpoint

- **Path:** `GET /api/v1/search`
- **Method:** GET
- **Authentication:** Requires `Headout-Auth` header (proxied upstream)

### External Headout APIs Used

| API | Endpoint | Purpose |
|---|---|---|
| Headout List Cities (v2) | `/api/public/v2/cities/` | Fetch all discoverable cities for city matching |
| Headout List Products (v2) | `/api/public/v2/products` | Fetch products per city for product matching |

### API Details

- **Purpose:** Unified search that returns typed results — products, cities, categories, and suggestions — from a single endpoint
- **Business logic:**
  1. Accepts query string `q`
  2. Fetches all cities from Headout's v2 cities endpoint
  3. Fetches products from 30 popular cities concurrently (5 at a time via semaphore)
  4. Filters and ranks results client-side using score-based matching
  5. Caches results in-memory for 5 minutes
  6. Returns a `SearchResponse` with four typed arrays
- **Matching algorithm:**
  - Exact match → 100 points
  - Starts with query → 80 points
  - Word starts with query → 70 points
  - Contains query → 60 points
  - Word contains query → 50 points
  - Trigram similarity + Levenshtein (fuzzy/typo tolerance) → 20-60 points
  - City/category attribute match → 60 points
- **Validation rules:**
  - `q` — optional, empty returns empty results
- **Error handling:**
  - Headout API failures → log and return empty results for that section
  - Cache hit → immediate response

### Request

```
GET /api/v1/search?q=dubai
```

### Response

```json
{
  "query": "dubai",
  "products": [
    {
      "id": "19513",
      "name": "Dubai Desert Safari",
      "slug": "dubai-desert-safari",
      "city": "Dubai",
      "cityCode": "DUBAI",
      "category": "Tours",
      "imageUrl": "https://cdn-imgix.headout.com/...",
      "price": 41.0,
      "currency": "USD",
      "rating": 4.3,
      "reviewCount": 1247,
      "productType": "ATTRACTION",
      "url": "/products/dubai-desert-safari-19513"
    }
  ],
  "cities": [
    {
      "code": "DUBAI",
      "name": "Dubai",
      "country": "United Arab Emirates",
      "image": "//cdn-imgix.headout.com/...",
      "slug": "dubai",
      "url": "/cities/dubai"
    }
  ],
  "categories": [
    {
      "id": "desert-safari",
      "name": "Desert Safari",
      "slug": "desert-safari",
      "url": "/categories/desert-safari"
    }
  ],
  "suggestions": [
    {
      "text": "Dubai Desert Safari",
      "type": "product",
      "url": "/products/dubai-desert-safari-19513",
      "score": 100
    }
  ]
}
```

### Caching

- In-memory map with 5-minute TTL
- Key is normalized query (lowercase, trimmed)
- Cache is evicted on a per-key basis
- Max 100 entries with LRU-style eviction

---

## Frontend

### Pages Using Search

| Page | File | Search Integration |
|---|---|---|
| Homepage | `frontend/app/page.tsx` | Hero search with autocomplete overlay |
| Search | `frontend/app/search/page.tsx` | Full search with filters, results page |
| City | `frontend/app/cities/[city]/page.tsx` | City-specific search with autocomplete |
| Category | `frontend/app/categories/[slug]/page.tsx` | Category browsing with search |
| Product Detail | `frontend/app/products/[slug]/page.tsx` | Uses `<SearchBar />` component |
| All pages | `frontend/app/layout.tsx` | Global `SearchModal` for mobile |

### Components

| Component | File | Responsibility |
|---|---|---|
| `SearchBar` | `frontend/components/search/SearchBar.tsx` | Main search input with autocomplete dropdown; supports `compact` prop for navbar |
| `SearchOverlay` | `frontend/components/search/SearchOverlay.tsx` | Desktop mega dropdown — categorized results in sections |
| `SearchModal` | `frontend/components/search/SearchModal.tsx` | Mobile fullscreen search modal with body scroll lock |
| `GlobalSearchModal` | `frontend/components/search/GlobalSearchModal.tsx` | Wires mobile modal into layout via custom event |
| `SearchResults` | `frontend/components/search/SearchResults.tsx` | Renders `ExperienceGrid` or enhanced empty state with suggestions |
| `SearchFilters` | `frontend/components/search/SearchFilters.tsx` | Sort filter bar (Recommended, Price asc/desc, Rating) |

### Types

| Type | File | Purpose |
|---|---|---|
| `SearchProduct` | `frontend/types/search.ts` | Product result (id, name, city, category, image, price, etc.) |
| `SearchCity` | `frontend/types/search.ts` | City result (code, name, country, image, slug) |
| `SearchCategory` | `frontend/types/search.ts` | Category result (id, name, slug) |
| `SearchSuggestion` | `frontend/types/search.ts` | Suggestion (text, type, url, score) |
| `SearchAllResponse` | `frontend/types/search.ts` | Full API response shape |
| `SearchGrouped` | `frontend/types/search.ts` | Grouped results for rendering |

### Hooks

| Hook | File | Responsibility |
|---|---|---|
| `useSearchAutocomplete` | `frontend/hooks/useSearchAutocomplete.ts` | Core search hook managing query state, debounce (250ms), API calls, result caching, keyboard navigation, click-outside |

### API Integration

| Function | File | API Called |
|---|---|---|
| `searchAll(q, signal?)` | `frontend/lib/api.ts:1` | `GET /api/v1/search?q=...` |
| `searchExperiences(params)` | `frontend/lib/api.ts:315` | `GET /api/v1/experiences/search` (for search results page) |

### State Management

- No global search state — each `useSearchAutocomplete` instance manages its own state
- Result cache is module-level via `Map<string, { data, ts }>` with 5-minute TTL
- `SearchModal` is triggered globally via `CustomEvent("open-search")` dispatched from Navbar/MobileNav

### UI/UX Design

**Desktop Dropdown:**
- Full-width dropdown below the search input
- Grouped sections: Attractions, Cities, Categories, Popular Searches
- Each result type has distinct iconography:
  - Products: thumbnail image, name, city, category, price
  - Cities: city image, name, country
  - Categories: category icon, name
  - Suggestions: trending icon, text
- Keyboard navigable with arrow keys, Enter selects, Escape closes

**Mobile Modal:**
- Fullscreen overlay with slide-down animation
- Search input auto-focused on open
- Body scroll locked while open
- Same grouped results as desktop
- Touch-optimized targets (48px+ tap areas)
- Cancel button and back arrow to close

**Empty State (dropdown):**
- Shows popular destination chips when search is empty/focused
- Shows "No results found" with suggestions when no matches

**Empty State (search page):**
- Shows query in "No results for ..." message
- Links to popular destinations
- "Go home" fallback link

### Keyboard Support

| Key | Behavior |
|---|---|
| `ArrowDown` | Navigate to next result (wraps to first) |
| `ArrowUp` | Navigate to previous result (wraps to last) |
| `Enter` | Select highlighted result and navigate |
| `Escape` | Close dropdown, blur input |
| `Tab` | Natural tab flow close |

### Accessibility

- `role="combobox"` and `role="listbox"` on search input and dropdown
- `aria-expanded` and `aria-selected` attributes
- `aria-label` on all interactive elements
- Click-outside detection to close dropdown
- Focus trapping on mobile modal (natural DOM order + Escape handler)

---

## Performance

| Metric | Implementation |
|---|---|
| Debounce | 250ms before API call |
| Request cancellation | `AbortController` aborts pending request on new input |
| Result caching | Module-level `Map` with 5-minute TTL, max 100 entries |
| Memoization | `useMemo` for grouped results |
| Rerender prevention | Stable callback refs, state batching |
| Target | <100ms UI response on cache hit |

---

## Edge Cases Handled

| Case | Behavior |
|---|---|
| Fast typing ("b", "bu", "bur", "burj") | Each keystroke debounces and aborts previous request |
| Slow network | Dropdown stays stable, no flickering |
| Empty API response | Returns empty arrays gracefully |
| API failure | Returns `null`, dropdown shows initial/popular state |
| Duplicate products across cities | Deduplicated by `id` |
| Missing product images | Shows placeholder icon |
| Special characters in query | Normalized by browser `encodeURIComponent` |
| Spaces ("burj  khalifa") | Normalized to single spaces |
| Case sensitivity ("BURJ", "burj", "BuRj") | All lowered for matching |
| Mobile keyboard opening | No layout shift, body scroll locked on modal |
| Deep linking (`/search?q=burj`) | Search bar pre-populates from URL on mount |
| Offline | `searchAll` returns null, gracefully degrades |

---

## Analytics Events

| Event | Trigger | Data |
|---|---|---|
| `search_query` | User types 2+ characters (debounced) | `{ query }` |
| `search_result_click` | User clicks a search result | `{ query, type, id, url }` |
| `search_no_results` | Query returns zero results | `{ query }` |
| `search_submit` | User presses Enter or clicks Search | `{ query }` |

Analytics events are emitted via `window.dispatchEvent(new CustomEvent("analytics", { detail }))`. Implement the listener in your analytics provider.

---

## Routing

| Pattern | Page | Example |
|---|---|---|
| `/products/{slug}-{id}` | Product Detail | `/products/burj-khalifa-at-the-top-123` |
| `/cities/{slug}` | City Experiences | `/cities/dubai` |
| `/categories/{slug}` | Category | `/categories/theme-parks` |
| `/search?q={query}` | Search Results | `/search?q=burj` |

---

# Home Page (Triipzy Landing)

## Frontend

### Pages

- `app/page.tsx` — main landing page, rewrites the existing homepage

### Components (all under `components/home/`)

| Component | Responsibility |
|---|---|
| `hero.tsx` | Full-viewport hero with background, search card, floating stats, CTA |
| `trust-section.tsx` | 4 glass stat cards (experiences, destinations, travelers, rating) |
| `trending-experiences.tsx` | Horizontal carousel of trending experience cards |
| `destinations.tsx` | Responsive grid of destination cards |
| `categories.tsx` | Icon-based category cards (Adventure, Food, etc.) |
| `why-triipzy.tsx` | Split section with stats + feature cards + CountUp animation |
| `collections.tsx` | Large feature cards with gradient overlay |
| `testimonials.tsx` | Auto-scroll carousel of testimonial glass cards |
| `partners.tsx` | Grid of partner logos |
| `inspiration.tsx` | Blog-style travel inspiration cards |
| `newsletter.tsx` | Glass card with email signup |

### State Management

- No global state needed — each section is self-contained
- Cart context is already provided by the root layout

### Libraries Used

- **framer-motion** — entrance animations (fade-up, stagger, scale), hover effects
- **countup.js** — animated stats counters in trust section and why-triipzy
- **lucide-react** — all icons
- **next/link** — navigation
- **next/image** — optimized images

### UI/UX Notes

- Full-viewport hero with responsive typography
- Glassmorphism cards throughout (backdrop-blur, translucent bg)
- Smooth scroll-based entrance animations via framer-motion `useInView`
- Mobile-responsive layouts: single-column → grid
- Auto-scrolling testimonial carousel with pause on hover
- Horizontal swipe for trending experiences on mobile
- Newsletter with form validation (basic email check)
- All sections use consistent `container py-section` spacing
