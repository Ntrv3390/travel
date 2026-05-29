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
| **Cities Browser** | `frontend/app/cities/page.tsx` | **New.** Standalone page showing all discoverable cities as a grid of cards with a "Load More" button |

### Components

| Component | File | Responsibility |
|-----------|------|---------------|
| `CityBadge` | `frontend/components/common/CityBadge.tsx` | Displays the city name on experience cards |
| **`CityCard`** | `frontend/components/cities/CityCard.tsx` | **New.** Card displaying city image, name, country, and a link to the city's experiences page |
| **`CitiesGrid`** | `frontend/components/cities/CitiesGrid.tsx` | **New.** Client component that renders a grid of `CityCard`s and a "Load More" button |
| **`CitiesPage`** | `frontend/app/cities/page.tsx` | **New.** Server component that fetches the first page and passes it to `CitiesGrid` |

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
