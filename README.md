# Cities Feature

## Backend

### API Endpoint

- **Path:** `GET /api/v1/headout/v1/city`
- **Method:** GET
- **Authentication:** Required via `Headout-Auth` header (proxied upstream to Headout's public API)

### Database Schema

Not required. Cities are fetched directly from the Headout API — no local database storage.

### External Headout APIs / Services

| API | Sandbox / Stage Base URL | Production Base URL | Endpoint | Auth |
|-----|--------------------------|---------------------|----------|------|
| Headout List Cities (v1) | `https://sandbox.api.dev-headout.com` | `https://www.headout.com` | `/api/public/v1/city` | None (public) |
| Headout List Cities (v2) | `https://sandbox.api.dev-headout.com` | `https://www.headout.com` | `/api/public/v2/cities/` | None (public) |

The backend uses `HeadoutProxyService` (`backend/internal/services/headout_proxy.go`) with the **public** service instance (no API key required) pointed at Headout's production base URL.

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
GET /api/v1/headout/v1/city?offset=0&limit=20
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

- **City listing page** (`/[city]/page.tsx`): Dynamic route that accepts a city name slug and fetches experiences for that city. City data is used contextually (not a standalone city list page).
- **Search page** (`/search/page.tsx`): Accepts a `city` query parameter for filtering search results by city.
- **Homepage** (`/page.tsx`): Displays top experiences, which contain city badge decorations.

### Components

| Component | File | Responsibility |
|-----------|------|---------------|
| `CityBadge` | `frontend/components/common/CityBadge.tsx` | Displays the city name on experience cards |

### State Management

No dedicated city state. City data flows through:
- **Server components:** `getCities()` is called directly via `fetch` (SSR).
- **Client components:** City selection is handled via URL params in search.

### API Integration

| Function | File | API Called | Description |
|----------|------|------------|-------------|
| `getCities()` | `frontend/lib/api.ts:196` | `GET /api/v1/headout/v1/city` | Fetches all discoverable cities from Headout via the backend proxy |

- **Loading states:** The function returns `{ data, error }` — empty array on failure, error message on network error. Callers handle loading UI (e.g., skeletons) at the component level.
- **Caching:** Uses `next: { revalidate: 86400 }` (24-hour ISR revalidation).

### UI/UX Notes

- Cities are used as filters/search parameters — not displayed as a standalone list.
- The `CityBadge` component provides visual context on experience cards.
- City selection in search is text-input based rather than a dropdown of all cities.
- No dedicated "browse all cities" page exists yet.
