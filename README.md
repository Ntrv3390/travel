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
