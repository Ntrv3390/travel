# Frontend Implementation Plan — Traviia
> **Status:** Backend complete. This document is the single source of truth for building and wiring the Next.js 14 frontend to the Go backend.
> **Stack:** Next.js 14 (App Router) · TypeScript (strict) · Tailwind CSS 3.4 · shadcn/ui · SWR · React Hook Form · Zod · date-fns · lucide-react

---

## 0. What Already Exists in the Repo

| Item | State | Notes |
|---|---|---|
| `frontend/app/layout.tsx` | ✅ Basic shell | Has navbar + footer, needs redesign per spec |
| `frontend/app/page.tsx` | ✅ Basic homepage | Static/placeholder, no real API calls |
| `frontend/app/experiences/page.tsx` | ✅ Exists | Old URL structure — needs migration to `/[city]/` |
| `frontend/app/experiences/[id]/page.tsx` | ✅ Exists | Old URL, ISR 60s — needs migration + real data |
| `frontend/lib/api.ts` | ✅ Exists | Minimal, needs full typed rewrite |
| `SingleExperienceLandingDemo.tsx` | ✅ Root-level demo | **Full PDP UI already built with hardcoded data** — migrate into `app/[city]/[slug]/page.tsx` |
| `frontend_development.md` | ✅ Full spec | The canonical FE spec — follow exactly |
| All new BE endpoints | ✅ Live | Cart, booking-flow, availability calendar, multi-currency, search, popular, etc. |

---

## 1. Backend API Reference — What We're Connecting To

All endpoints are on `http://localhost:8080` (Docker internal: `http://api-gateway:8080`).

### Experiences
```
GET  /api/v1/experiences                          → list (params: city, category, q, sort, page, limit, currencyCode)
GET  /api/v1/experiences/popular                  → top experiences for homepage
GET  /api/v1/experiences/:id                      → single by ID
GET  /api/v1/experiences/:city/:slug              → single by city+slug (PDP canonical)
GET  /api/v1/experiences/search?q=&city=&...      → full-text + city search
GET  /api/v1/experiences/:id/calendar?months=     → availability calendar (date ranges)
GET  /api/v1/experiences-availability/:id?variantId=&date=  → single-date slot availability
```

### Currencies
```
GET  /api/v1/currencies                           → list of supported ISO codes
```

### Cart
```
GET    /api/v1/cart                               → get cart (header: X-Session-ID)
POST   /api/v1/cart                               → add item
DELETE /api/v1/cart/:itemId                       → remove item
DELETE /api/v1/cart                               → clear cart
POST   /api/v1/cart/checkout                      → bulk checkout all cart items
```

### Booking Flow
```
GET  /api/v1/booking-flow/calendar?experienceId=  → availability calendar (alternate)
GET  /api/v1/booking-flow/availability?...        → slot check
POST /api/v1/booking-flow/bookings                → create booking (Book Now)
PUT  /api/v1/booking-flow/bookings/:id/capture    → capture/confirm booking
GET  /api/v1/booking-flow/bookings/:id            → get booking details
```

### GTTD / SEO
```
GET  /api/v1/gttd/jsonld/:headoutId               → JSON-LD for experience (inject in PDP)
```

### Headout Proxy
```
GET  /api/v1/headout/cities                       → list of cities
GET  /api/v1/headout/categories                   → list of categories
```

---

## 2. Directory Structure to Build

```
frontend/
├── app/
│   ├── layout.tsx                    REWRITE — root layout with providers
│   ├── page.tsx                      REWRITE — homepage (SSR, popular experiences)
│   ├── not-found.tsx                 CREATE
│   ├── error.tsx                     CREATE
│   ├── loading.tsx                   CREATE
│   │
│   ├── [city]/
│   │   ├── page.tsx                  CREATE — city listing (SSR)
│   │   ├── loading.tsx               CREATE
│   │   └── [slug]/
│   │       ├── page.tsx              CREATE — PDP (ISR 3600s) — port SingleExperienceLandingDemo
│   │       ├── loading.tsx           CREATE
│   │       └── not-found.tsx         CREATE
│   │
│   ├── search/
│   │   └── page.tsx                  CREATE — search results (SSR)
│   │
│   ├── cart/
│   │   └── page.tsx                  CREATE — cart page (dynamic)
│   │
│   ├── checkout/
│   │   ├── layout.tsx                CREATE — minimal checkout layout
│   │   ├── page.tsx                  CREATE — checkout form (dynamic)
│   │   └── confirmation/
│   │       └── page.tsx              CREATE — booking confirmation
│   │
│   └── api/                          CREATE — thin Next.js proxy routes
│       ├── experiences/route.ts
│       ├── experiences/[id]/availability/route.ts
│       ├── experiences/[id]/calendar/route.ts
│       ├── search/route.ts
│       ├── currencies/route.ts
│       ├── cart/route.ts
│       ├── cart/checkout/route.ts
│       └── bookings/route.ts
│
├── components/
│   ├── ui/                           INSTALL via shadcn CLI (see Section 3)
│   │
│   ├── layout/
│   │   ├── Navbar.tsx                REWRITE — logo + search + currency picker + cart icon
│   │   ├── Footer.tsx                REWRITE
│   │   ├── MobileNav.tsx             CREATE
│   │   └── CheckoutNavbar.tsx        CREATE
│   │
│   ├── experience/
│   │   ├── ExperienceCard.tsx        CREATE — card component
│   │   ├── ExperienceCardSkeleton.tsx CREATE
│   │   ├── ExperienceGrid.tsx        CREATE
│   │   ├── ExperienceGallery.tsx     CREATE — port from SingleExperienceLandingDemo
│   │   ├── ExperienceHero.tsx        CREATE — port from demo
│   │   ├── ExperienceFeatures.tsx    CREATE — inclusions/exclusions
│   │   ├── ExperienceReviews.tsx     CREATE — port from demo
│   │   └── PricingBox.tsx            CREATE — port from demo, wire to real API
│   │
│   ├── search/
│   │   ├── SearchBar.tsx             CREATE — hero search bar
│   │   ├── SearchFilters.tsx         CREATE — category/sort/price filters
│   │   └── SearchResults.tsx         CREATE
│   │
│   ├── booking/
│   │   ├── DatePicker.tsx            CREATE — shadcn Calendar + Popover wrapper
│   │   ├── GuestSelector.tsx         CREATE — increment/decrement adults/children
│   │   ├── VariantSelector.tsx       CREATE — ticket type picker
│   │   ├── CheckoutForm.tsx          CREATE — step 2 guest info form
│   │   ├── OrderSummary.tsx          CREATE
│   │   └── CartItemCard.tsx          CREATE
│   │
│   └── common/
│       ├── StarRating.tsx            CREATE
│       ├── PriceDisplay.tsx          CREATE — Intl.NumberFormat, currency-aware
│       ├── CurrencyPicker.tsx        CREATE — dropdown, persists to localStorage + context
│       ├── CityBadge.tsx             CREATE
│       ├── CategoryBadge.tsx         CREATE
│       └── EmptyState.tsx            CREATE
│
├── lib/
│   ├── api.ts                        REWRITE — full typed fetch wrappers for all BE endpoints
│   ├── utils.ts                      CREATE/UPDATE — cn() helper
│   ├── validations.ts                CREATE — Zod schemas for all forms
│   ├── formatters.ts                 CREATE — price, date, duration formatters
│   └── constants.ts                  CREATE — currencies, categories, sort options
│
├── types/
│   ├── experience.ts                 CREATE — Experience, ExperienceOption, etc.
│   ├── booking.ts                    CREATE — BookingRequest, BookingResponse, CartItem
│   └── api.ts                        CREATE — APIResponse<T> envelope
│
├── hooks/
│   ├── useAvailability.ts            CREATE — SWR hook
│   ├── useCalendar.ts                CREATE — SWR hook for date range calendar
│   ├── useCart.ts                    CREATE — cart state + API calls
│   ├── useCurrency.ts                CREATE — global currency context
│   └── useSearch.ts                  CREATE — search with URL sync
│
├── context/
│   ├── CurrencyContext.tsx           CREATE — global currency provider
│   └── CartContext.tsx               CREATE — session cart provider
│
├── styles/
│   └── globals.css                   UPDATE — full design tokens from spec
│
├── tailwind.config.ts                UPDATE — brand colors, fonts, animations
├── components.json                   CREATE — shadcn config
├── next.config.ts                    UPDATE — image domains, rewrites
└── tsconfig.json                     UPDATE — strict: true
```

---

## 3. Setup Steps (Run Once)

```bash
cd frontend

# Install/upgrade Next.js and core deps
npm install next@14 react@18 react-dom@18 typescript@5

# Initialize shadcn/ui (answer: Default style, Neutral base, Yes to CSS vars)
npx shadcn@latest init

# Install ALL shadcn components upfront
npx shadcn@latest add button card input label select dialog sheet badge \
  skeleton toast calendar popover separator tabs avatar breadcrumb \
  dropdown-menu command checkbox radio-group slider switch textarea \
  alert progress scroll-area table accordion collapsible tooltip form

# Install additional packages
npm install swr zod react-hook-form @hookform/resolvers \
  date-fns clsx tailwind-merge lucide-react geist tailwindcss-animate
```

---

## 4. Environment Variables

`.env.local` (development):
```env
# Go backend — server-side only, never exposed to browser
API_URL=http://localhost:8080

# Public site URL
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Docker internal (used in docker-compose)
# API_URL=http://api-gateway:8080
```

`next.config.ts`:
```ts
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "cdn.headout.com", pathname: "/**" },
      { protocol: "https", hostname: "images.unsplash.com", pathname: "/**" },
    ],
    formats: ["image/avif", "image/webp"],
  },
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: `${process.env.API_URL}/api/v1/:path*`,
      },
    ]
  },
}
```

---

## 5. TypeScript Types

### `types/experience.ts`
```ts
export interface Experience {
  id: string
  headoutId: string
  title: string
  description: string          // may contain HTML — sanitize before rendering
  city: string
  citySlug: string
  slug: string
  country: string
  latitude: number
  longitude: number
  rating: number
  reviewCount: number
  images: ExperienceImage[]
  categories: string[]
  languages: string[]
  durationMinSeconds: number
  durationMaxSeconds: number
  cancellationPolicy: CancellationPolicy | null
  options: ExperienceOption[]
  gttdEnabled: boolean
  tags?: string[]
}

export interface ExperienceImage {
  url: string
  caption: string
}

export interface ExperienceOption {
  id: string
  headoutVariantId: string
  title: string
  description: string
  price: number           // ALWAYS from API — never compute client-side
  currency: string
  inclusions: string[]
  exclusions: string[]
  highlights: string[]
  fulfillmentMobile: boolean
  fulfillmentPrint: boolean
  fulfillmentPickup: boolean
}

export interface CancellationPolicy {
  cutoffHours: number
  refundPercent: number
  description: string
}

export interface AvailabilitySlot {
  time: string
  startDateTime: string
  endDateTime: string
  spotsLeft: number
  inventoryId: string
  variantId: string
  price: number
  currency: string
}

export interface CalendarDay {
  date: string           // ISO "2025-08-15"
  available: boolean
  minPrice: number
  currency: string
}
```

### `types/booking.ts`
```ts
export interface BookingRequest {
  experienceId: string
  variantId: string
  inventoryId: string
  date: string           // ISO "2025-08-15"
  time?: string
  adults: number
  children: number
  firstName: string
  lastName: string
  email: string
  phone: string
  specialRequests?: string
  currencyCode: string
  idempotencyKey: string  // UUID generated client-side to prevent double-booking
}

export interface BookingResponse {
  bookingId: string
  headoutReference: string
  status: "PENDING" | "CONFIRMED" | "CANCELLED"
  totalAmount: number
  currency: string
  voucherUrl?: string
  confirmationEmailSent: boolean
}

export interface CartItem {
  id: string
  experienceId: string
  experience: Experience
  variantId: string
  variantTitle: string
  inventoryId: string
  date: string
  time?: string
  adults: number
  children: number
  unitPrice: number
  totalPrice: number
  currency: string
}

export interface Cart {
  sessionId: string
  items: CartItem[]
  totalItems: number
  totalPrice: number
  currency: string
}
```

### `types/api.ts`
```ts
export interface APIResponse<T> {
  data: T
  error: string | null
  meta?: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

export interface CurrencyOption {
  code: string       // "USD", "INR", "EUR"
  symbol: string     // "$", "₹", "€"
  name: string       // "US Dollar"
}
```

---

## 6. Core Library — `lib/api.ts`

All fetch calls go through typed wrappers. Server components call these directly. Client components call Next.js API routes (which proxy here).

```ts
const API_BASE = process.env.API_URL ?? "http://localhost:8080"

// ── Experiences ──────────────────────────────────────────────

export async function getPopularExperiences(currency = "USD", limit = 12) {
  const res = await fetch(
    `${API_BASE}/api/v1/experiences/popular?currencyCode=${currency}&limit=${limit}`,
    { cache: "no-store" }
  )
  if (!res.ok) return []
  const json = await res.json()
  return (json.data ?? json) as Experience[]
}

export async function getCityExperiences(
  city: string,
  params: {
    category?: string
    sort?: string
    minPrice?: number
    maxPrice?: number
    page?: number
    limit?: number
    currencyCode?: string
  }
) {
  const url = new URL(`${API_BASE}/api/v1/experiences`)
  url.searchParams.set("city", city)
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== "") url.searchParams.set(k, String(v))
  })
  const res = await fetch(url.toString(), { cache: "no-store" })
  if (!res.ok) return { experiences: [], total: 0, page: 1, totalPages: 1 }
  return res.json()
}

export async function getExperienceByCitySlug(
  city: string,
  slug: string,
  currency = "USD"
) {
  const res = await fetch(
    `${API_BASE}/api/v1/experiences/${city}/${slug}?currencyCode=${currency}`,
    { next: { revalidate: 3600 } }
  )
  if (!res.ok) return null
  const json = await res.json()
  return (json.data ?? json) as Experience
}

export async function searchExperiences(params: {
  q?: string
  city?: string
  category?: string
  currencyCode?: string
  page?: number
  limit?: number
}) {
  const url = new URL(`${API_BASE}/api/v1/experiences/search`)
  Object.entries(params).forEach(([k, v]) => {
    if (v) url.searchParams.set(k, String(v))
  })
  const res = await fetch(url.toString(), { cache: "no-store" })
  if (!res.ok) return { experiences: [], total: 0 }
  return res.json()
}

export async function getExperienceCalendar(
  experienceId: string,
  months = 2,
  currency = "USD"
) {
  const res = await fetch(
    `${API_BASE}/api/v1/experiences/${experienceId}/calendar?months=${months}&currencyCode=${currency}`,
    { cache: "no-store" }
  )
  if (!res.ok) return []
  const json = await res.json()
  return (json.data ?? json) as CalendarDay[]
}

export async function getSlotAvailability(
  experienceId: string,
  variantId: string,
  date: string,
  currency = "USD"
) {
  const res = await fetch(
    `${API_BASE}/api/v1/experiences-availability/${experienceId}?variantId=${variantId}&date=${date}&currencyCode=${currency}`,
    { cache: "no-store" }
  )
  if (!res.ok) return []
  const json = await res.json()
  return (json.data ?? json) as AvailabilitySlot[]
}

// ── Currencies ───────────────────────────────────────────────

export async function getSupportedCurrencies() {
  const res = await fetch(`${API_BASE}/api/v1/currencies`, {
    next: { revalidate: 86400 },  // cache 24h — rarely changes
  })
  if (!res.ok) return []
  const json = await res.json()
  return (json.data ?? json) as CurrencyOption[]
}

// ── GTTD ─────────────────────────────────────────────────────

export async function getJSONLD(headoutId: string) {
  const res = await fetch(`${API_BASE}/api/v1/gttd/jsonld/${headoutId}`, {
    next: { revalidate: 3600 },
  })
  if (!res.ok) return null
  return res.json()
}

// ── Headout Proxy ─────────────────────────────────────────────

export async function getCities() {
  const res = await fetch(`${API_BASE}/api/v1/headout/cities`, {
    next: { revalidate: 86400 },
  })
  if (!res.ok) return []
  const json = await res.json()
  return json.data ?? json
}

export async function getCategories() {
  const res = await fetch(`${API_BASE}/api/v1/headout/categories`, {
    next: { revalidate: 86400 },
  })
  if (!res.ok) return []
  const json = await res.json()
  return json.data ?? json
}
```

---

## 7. Currency Context

Currency selection must be global (persists across pages) and included in every API call.

### `context/CurrencyContext.tsx`
```tsx
"use client"
import { createContext, useContext, useState, useEffect } from "react"

interface CurrencyContextValue {
  currency: string
  setCurrency: (code: string) => void
}

const CurrencyContext = createContext<CurrencyContextValue>({
  currency: "USD",
  setCurrency: () => {},
})

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrencyState] = useState("USD")

  useEffect(() => {
    const saved = localStorage.getItem("traviia_currency")
    if (saved) setCurrencyState(saved)
  }, [])

  const setCurrency = (code: string) => {
    setCurrencyState(code)
    localStorage.setItem("traviia_currency", code)
  }

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency }}>
      {children}
    </CurrencyContext.Provider>
  )
}

export const useCurrency = () => useContext(CurrencyContext)
```

### `hooks/useCurrency.ts`
```ts
// Re-export for convenience
export { useCurrency } from "@/context/CurrencyContext"
```

### `components/common/CurrencyPicker.tsx`
- Use shadcn `Select` component
- Fetch currencies from `GET /api/v1/currencies` on mount (SWR, 24h cache)
- On change: call `setCurrency()` from context
- Shown in Navbar (desktop: top-right dropdown; mobile: inside MobileNav sheet)

---

## 8. Cart Context & Session

Cart is keyed by `sessionId` stored in a cookie/localStorage. The Go backend stores cart in Redis.

### `context/CartContext.tsx`
```tsx
"use client"
// - Generate UUID session ID on first visit → store in localStorage as "traviia_session"
// - All cart API calls pass header: "X-Session-ID: {sessionId}"
// - Expose: cart, addItem, removeItem, clearCart, checkoutCart, isLoading
// - Use SWR to keep cart in sync: useSWR("/api/cart", fetcher)
// - On addItem: optimistic update + POST /api/cart
// - On removeItem: optimistic update + DELETE /api/cart/:itemId
```

### `hooks/useCart.ts`
```ts
import useSWR, { mutate } from "swr"
import { useSessionId } from "@/hooks/useSessionId"

export function useCart() {
  const sessionId = useSessionId()
  const { data: cart, isLoading, error } = useSWR(
    sessionId ? ["/api/cart", sessionId] : null,
    ([url, sid]) => fetch(url, { headers: { "X-Session-ID": sid } }).then(r => r.json())
  )

  async function addItem(item: Omit<CartItem, "id">) {
    await fetch("/api/cart", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Session-ID": sessionId },
      body: JSON.stringify(item),
    })
    mutate(["/api/cart", sessionId])
  }

  async function removeItem(itemId: string) {
    await fetch(`/api/cart/${itemId}`, {
      method: "DELETE",
      headers: { "X-Session-ID": sessionId },
    })
    mutate(["/api/cart", sessionId])
  }

  async function checkoutCart() {
    const res = await fetch("/api/cart/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Session-ID": sessionId },
    })
    if (res.ok) mutate(["/api/cart", sessionId])  // clears cart
    return res.json()
  }

  return { cart, addItem, removeItem, checkoutCart, isLoading, error }
}
```

---

## 9. Next.js API Routes (Thin Proxies)

These solve CORS and keep the Go backend URL server-side only.

### `app/api/cart/route.ts`
```ts
import { NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest) {
  const sessionId = req.headers.get("X-Session-ID") ?? ""
  const res = await fetch(`${process.env.API_URL}/api/v1/cart`, {
    headers: { "X-Session-ID": sessionId },
    cache: "no-store",
  })
  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}

export async function POST(req: NextRequest) {
  const sessionId = req.headers.get("X-Session-ID") ?? ""
  const body = await req.json()
  const res = await fetch(`${process.env.API_URL}/api/v1/cart`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Session-ID": sessionId },
    body: JSON.stringify(body),
  })
  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
```

Repeat the same pattern for:
- `app/api/cart/[itemId]/route.ts` → DELETE
- `app/api/cart/checkout/route.ts` → POST
- `app/api/bookings/route.ts` → POST (Book Now)
- `app/api/experiences/[id]/availability/route.ts` → GET
- `app/api/experiences/[id]/calendar/route.ts` → GET
- `app/api/search/route.ts` → GET
- `app/api/currencies/route.ts` → GET

---

## 10. Page Implementation

### 10.1 Homepage — `app/page.tsx`

**Rendering:** SSR (`cache: "no-store"`)

```
Sections:
1. Hero — full-width bg image, SearchBar overlay (destination input + date + guests + Search btn)
2. Featured Cities — 2/3/4 col grid, CityCard (image + city name + count badge)
   → data: GET /api/v1/headout/cities
3. Top Experiences — "Popular Destinations" section
   → data: GET /api/v1/experiences/popular?currencyCode={currency}&limit=12
   → ExperienceGrid with ExperienceCard components
4. Why Traviia — 3 value props (icons + text, no API)
5. Newsletter CTA — email input, no API for now
```

**Key wiring:**
- Currency comes from a cookie (read on server) or falls back to "USD"
- Popular experiences fetched server-side with `getPopularExperiences(currency)`
- Cities fetched server-side with `getCities()`
- SearchBar is a Client Component (needs router.push on submit)

---

### 10.2 City Page — `app/[city]/page.tsx`

**Rendering:** SSR

**Data:**
```ts
const { experiences, total, totalPages } = await getCityExperiences(params.city, {
  category: searchParams.category,
  sort: searchParams.sort,
  minPrice: searchParams.min_price,
  maxPrice: searchParams.max_price,
  page: searchParams.page ?? 1,
  currencyCode: cookie_currency ?? "USD",
})
```

**URL Params:** `?category=tours&sort=price_asc&min_price=0&max_price=200&page=1`

All filter state lives in URL params. Use `useSearchParams()` in client filter components and `router.push()` to update URL — this re-triggers the SSR page fetch.

**Layout:**
```
1. City Hero (page title + breadcrumb + count)
2. SearchFilters (sticky row: category tabs, sort select, price slider)
   → On mobile: all filters behind a "Filters" Sheet (bottom drawer)
3. ExperienceGrid (1/2/3 col)
4. Pagination (prev/next + page numbers)
```

---

### 10.3 PDP — `app/[city]/[slug]/page.tsx`

**Rendering:** ISR `revalidate: 3600`

This is the most complex page. The `SingleExperienceLandingDemo.tsx` in the root **is the complete UI design** — migrate it here with real data.

**Data fetching:**
```ts
export const revalidate = 3600

export async function generateStaticParams() {
  // Pre-build top 50 experiences at deploy time
  const popular = await getPopularExperiences("USD", 50)
  return popular.map(e => ({ city: e.citySlug, slug: e.slug }))
}

export default async function PDPPage({ params }) {
  const currency = getCookieCurrency() ?? "USD"  // read from Next.js cookies()

  const [experience, jsonLD] = await Promise.all([
    getExperienceByCitySlug(params.city, params.slug, currency),
    // jsonLD is fetched using experience.headoutId after experience resolves
  ])

  if (!experience) notFound()

  const jsonLDData = await getJSONLD(experience.headoutId)

  return (
    <>
      {jsonLDData && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLDData) }}
        />
      )}
      <PDPContent experience={experience} />
    </>
  )
}
```

**Layout (port from SingleExperienceLandingDemo):**
```
LEFT COLUMN (flex-1):
  1. ExperienceGallery (auto-cycling images, prev/next, thumbnails)  — ALREADY BUILT
  2. Breadcrumb                                                        — ALREADY BUILT
  3. Title block (H1, star rating, badges)                            — ALREADY BUILT
  4. Sticky section nav (Included, About, Reviews, Combinations...)   — ALREADY BUILT
  5. What's Included / Highlights                                     — ALREADY BUILT
  6. About (description — sanitize HTML before dangerouslySetInnerHTML)
  7. Reviews section (rating breakdown + review cards masonry grid)   — ALREADY BUILT
  8. Combinations / More Ways cards                                   — ALREADY BUILT
     → These sections: populate from experience.options or related experiences from API

RIGHT COLUMN (w-[380px] sticky):
  PricingBox component                                                 — NEEDS REAL API WIRING

MOBILE:
  Bottom sticky bar: "From ₹XX · Book Now" button → opens Sheet with PricingBox
```

**PricingBox wiring (critical):**
```
1. Display starting price from experience.options[0].price + currency
2. User selects a variant (VariantSelector) → updates displayed price
3. User selects a date (DatePicker with CalendarDay availability from API)
   → on date change: fetch GET /api/experiences/:id/availability?variantId=&date=
   → show available time slots as buttons
4. User selects a slot
5. User selects guests (GuestSelector: adults + children)
6. Calculate total = adults * price + children * childPrice  ← from slot API response
   (NEVER compute price independently — use API values)
7. "Check Availability" button → if not already fetched, re-fetches slots
8. "Book Now" → navigate to /checkout?experienceId=X&variantId=Y&inventoryId=Z&date=D&adults=A&children=C
9. "Add to Cart" → POST /api/cart with item details → show toast confirmation
```

---

### 10.4 Search Results — `app/search/page.tsx`

**Rendering:** SSR

```ts
const { experiences, total } = await searchExperiences({
  q: searchParams.q,
  city: searchParams.city,
  category: searchParams.category,
  currencyCode: cookie_currency ?? "USD",
  page: searchParams.page ?? 1,
})
```

**Layout:**
```
1. SearchBar (pre-filled from URL params)
2. "42 experiences found" result count
3. SearchFilters (same as city page)
4. ExperienceGrid or EmptyState
```

---

### 10.5 Cart Page — `app/cart/page.tsx`

**Rendering:** Dynamic (Client Component)

```
Layout:
  Left: CartItemCard list (each shows experience image, title, date, guests, price, remove button)
  Right: Order Summary card
    - Subtotal per item
    - Total
    - "Checkout All" button → POST /api/cart/checkout
      On success → navigate to /checkout/confirmation?multi=true&bookingIds=A,B,C
    - "Continue shopping" link

Empty state: EmptyState component with "Your cart is empty" + "Explore experiences" CTA
```

**CartItemCard:**
```
- next/image of experience
- Experience title (link to PDP)
- Date + time slot
- Adults/children count
- Price breakdown
- Remove button → DELETE /api/cart/:itemId
```

---

### 10.6 Checkout Page — `app/checkout/page.tsx`

**Rendering:** Dynamic

**URL:** `/checkout?experienceId=X&variantId=Y&inventoryId=Z&date=D&adults=2&children=0`

**Step 1 — Details (read-only summary from URL params):**
```
Show: Experience title, date, time, variant, guests, price
Confirm button → go to Step 2
```

**Step 2 — Guest Info:**
```tsx
// CheckoutForm component using React Hook Form + Zod + shadcn Form
const checkoutFormSchema = z.object({
  firstName: z.string().min(2),
  lastName:  z.string().min(2),
  email:     z.string().email(),
  phone:     z.string().min(10),
  specialRequests: z.string().max(500).optional(),
})
```

**Step 3 — Submit Booking:**
```ts
// On form submit:
const idempotencyKey = crypto.randomUUID()  // prevent duplicate bookings on retry
const res = await fetch("/api/bookings", {
  method: "POST",
  body: JSON.stringify({
    experienceId, variantId, inventoryId, date, adults, children,
    firstName, lastName, email, phone, specialRequests,
    currencyCode: currency,
    idempotencyKey,
  })
})
const { bookingId, status, totalAmount } = await res.json()
// On success → navigate to /checkout/confirmation?bookingId=X
// On error → show shadcn Alert with error message
```

**Layout:** CheckoutNavbar (logo + 3-step progress indicator only, no main nav)

---

### 10.7 Confirmation Page — `app/checkout/confirmation/page.tsx`

**Rendering:** Dynamic

**URL:** `/checkout/confirmation?bookingId=ABC123` or `?multi=true&bookingIds=A,B,C`

```
Layout:
  1. CheckCircle icon (green, large)
  2. "Booking Confirmed!" H1
  3. Booking reference card (monospace, shadcn Card)
  4. Experience summary: title, date, guests, price, currency
  5. "Check your email" notice (voucher sent by BE)
  6. If voucherUrl: "Download Voucher" button
  7. CTAs: "Explore More Experiences" → / | "View Booking Details" (future)
```

**Data:** Fetch `GET /api/v1/booking-flow/bookings/:id` to get full booking details.

---

## 11. Component Specs

### Navbar (`components/layout/Navbar.tsx`)

```
Desktop layout (lg+):
  [Logo "Traviia"] [SearchBar compact] [spacer] [CurrencyPicker] [Cart icon + count badge]

Mobile layout (<lg):
  [Logo] [spacer] [Cart icon] [Hamburger → MobileNav sheet]

MobileNav sheet (bottom):
  - Main nav links
  - CurrencyPicker
  - Search input
```

Cart count badge: uses `useCart()` hook, shows `cart.totalItems` as red badge on cart icon.

### SearchBar (`components/search/SearchBar.tsx`)

Two variants:
1. **Hero SearchBar** (homepage): Large, card-style, with destination text input + date picker + guests + Search button
2. **Compact SearchBar** (navbar, search page): Single input field, shows destination only, submits to `/search?q=...`

On search submit:
```ts
router.push(`/search?q=${encodeURIComponent(query)}&city=${city}`)
```

### DatePicker (`components/booking/DatePicker.tsx`)

Uses shadcn `Calendar` + `Popover`:
- Disable past dates
- Highlight available dates (green dot) from `CalendarDay[]` data
- Show min price on each available date (optional, from calendar API)
- On date select: trigger `useAvailability` hook to fetch slots

### GuestSelector (`components/booking/GuestSelector.tsx`)

Increment/decrement buttons for adults (min 1) and children (min 0).
```tsx
<div className="flex items-center gap-3">
  <Button variant="outline" size="icon" onClick={() => setAdults(a => Math.max(1, a-1))}>-</Button>
  <span>{adults} Adult{adults > 1 ? "s" : ""}</span>
  <Button variant="outline" size="icon" onClick={() => setAdults(a => a+1)}>+</Button>
</div>
```

### VariantSelector (`components/booking/VariantSelector.tsx`)

Display experience.options as selectable cards:
- Option title + price + description
- Selected state: border-brand-600 + blue bg
- On select: update parent state, re-calculate total shown

---

## 12. Hooks

### `hooks/useAvailability.ts`
```ts
import useSWR from "swr"

export function useAvailability(experienceId: string, variantId: string, date: string, currency: string) {
  return useSWR(
    experienceId && variantId && date
      ? `/api/experiences/${experienceId}/availability?variantId=${variantId}&date=${date}&currency=${currency}`
      : null,
    (url) => fetch(url).then(r => r.json()),
    { revalidateOnFocus: true, refreshInterval: 60_000 }
  )
}
```

### `hooks/useCalendar.ts`
```ts
import useSWR from "swr"

export function useCalendar(experienceId: string, months = 2, currency = "USD") {
  return useSWR(
    experienceId
      ? `/api/experiences/${experienceId}/calendar?months=${months}&currency=${currency}`
      : null,
    (url) => fetch(url).then(r => r.json())
  )
}
```

### `hooks/useSearch.ts`
```ts
"use client"
import { useRouter, useSearchParams } from "next/navigation"
import { useCallback } from "react"

export function useSearch() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const updateSearch = useCallback((newParams: Record<string, string | undefined>) => {
    const params = new URLSearchParams(searchParams.toString())
    Object.entries(newParams).forEach(([k, v]) => {
      if (v === undefined || v === "") params.delete(k)
      else params.set(k, v)
    })
    params.set("page", "1")  // reset page on filter change
    router.push(`?${params.toString()}`)
  }, [router, searchParams])

  return { updateSearch, searchParams }
}
```

---

## 13. Zod Validation Schemas — `lib/validations.ts`

```ts
import { z } from "zod"

export const checkoutFormSchema = z.object({
  firstName: z.string().min(2, "At least 2 characters"),
  lastName:  z.string().min(2, "At least 2 characters"),
  email:     z.string().email("Invalid email"),
  phone:     z.string().min(10, "Invalid phone number"),
  specialRequests: z.string().max(500).optional(),
})

export const bookingDetailsSchema = z.object({
  date:      z.string().min(1, "Select a date"),
  variantId: z.string().min(1, "Select a ticket type"),
  inventoryId: z.string().min(1, "Select a time slot"),
  adults:    z.number().min(1).max(20),
  children:  z.number().min(0).max(20).default(0),
})

export type CheckoutFormValues = z.infer<typeof checkoutFormSchema>
export type BookingDetailsValues = z.infer<typeof bookingDetailsSchema>
```

---

## 14. SEO & Metadata

### Per-Page Metadata
```ts
// app/[city]/[slug]/page.tsx
export async function generateMetadata({ params }): Promise<Metadata> {
  const experience = await getExperienceByCitySlug(params.city, params.slug)
  if (!experience) return {}

  return {
    title: `${experience.title} in ${experience.city}`,
    description: experience.description.replace(/<[^>]+>/g, "").substring(0, 160),
    openGraph: {
      title: experience.title,
      description: experience.description.replace(/<[^>]+>/g, "").substring(0, 160),
      images: [{ url: experience.images[0]?.url, width: 1200, height: 630 }],
    },
    alternates: {
      canonical: `${process.env.NEXT_PUBLIC_SITE_URL}/${params.city}/${params.slug}`,
    },
  }
}
```

### JSON-LD on PDP
Fetched from `GET /api/v1/gttd/jsonld/:headoutId` and injected as `<script type="application/ld+json">`.
Never build JSON-LD in the frontend — always use the BE endpoint.

---

## 15. Error & Loading States

### Every data page needs a `loading.tsx` sibling:
```tsx
// app/[city]/loading.tsx
export default function Loading() {
  return (
    <div className="container py-section">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {Array.from({ length: 8 }).map((_, i) => <ExperienceCardSkeleton key={i} />)}
      </div>
    </div>
  )
}
```

### API unavailable (PricingBox):
Show shadcn `Alert` with destructive variant: "Pricing temporarily unavailable. Please refresh."
Never show a stale price — either show live price or show the alert.

### Empty state (search/city page with no results):
Use `EmptyState` component with appropriate message and "Try different filters" or "Explore all" CTA.

---

## 16. Implementation Order

Build in this exact sequence — each phase is shippable and testable:

**Phase A — Foundation (1–2 days)**
1. Update `tailwind.config.ts` + `globals.css` with full design tokens
2. Set up shadcn/ui components
3. Create all TypeScript types
4. Rewrite `lib/api.ts` with all typed wrappers
5. Create `CurrencyContext` + `CartContext`
6. Create `lib/validations.ts`, `lib/formatters.ts`, `lib/constants.ts`
7. Update `app/layout.tsx` with providers + Toaster
8. Update `next.config.ts`

**Phase B — Homepage (0.5 days)**
9. Rewrite `app/page.tsx` with popular experiences + city grid
10. Build `SearchBar.tsx` (hero variant)
11. Build `ExperienceCard.tsx` + `ExperienceCardSkeleton.tsx`
12. Build `CurrencyPicker.tsx`
13. Update `Navbar.tsx` with currency picker + cart icon

**Phase C — PDP (1–2 days)**
14. Create `app/[city]/[slug]/page.tsx` (ISR shell)
15. Port `SingleExperienceLandingDemo.tsx` → `ExperienceGallery`, `ExperienceReviews`, etc.
16. Build `PricingBox.tsx` with real API wiring
17. Build `DatePicker.tsx`, `GuestSelector.tsx`, `VariantSelector.tsx`
18. Build `useAvailability.ts` + `useCalendar.ts` hooks
19. Wire JSON-LD injection

**Phase D — City & Search Pages (0.5 days)**
20. Create `app/[city]/page.tsx`
21. Build `SearchFilters.tsx` with URL sync
22. Create `app/search/page.tsx`

**Phase E — Cart (0.5 days)**
23. Create `app/api/cart/route.ts` + `app/api/cart/[itemId]/route.ts`
24. Build `useCart.ts` hook
25. Create `app/cart/page.tsx` + `CartItemCard.tsx`
26. Wire cart count badge in Navbar

**Phase F — Checkout & Confirmation (1 day)**
27. Create `app/api/bookings/route.ts`
28. Create `app/checkout/layout.tsx` + `CheckoutNavbar.tsx`
29. Create `app/checkout/page.tsx` with `CheckoutForm.tsx` + `OrderSummary.tsx`
30. Create `app/checkout/confirmation/page.tsx`

**Phase G — Polish (0.5 days)**
31. Add all `loading.tsx` skeleton files
32. Add `not-found.tsx` + `error.tsx` globally and per-route
33. Test all error states (API down, no results, sold out)
34. Mobile responsive pass — test all pages on 375px viewport

---

## 17. Critical Rules (Do Not Violate)

1. **Never compute prices client-side.** All amounts come from the API. Frontend only formats/displays.
2. **Never use raw `<img>` tags.** Always `next/image` with `sizes` prop.
3. **Never use `localStorage` for cart.** Use `X-Session-ID` header + Redis on BE. LocalStorage is for currency preference only.
4. **Every checkout form uses React Hook Form + Zod + shadcn Form components.** No uncontrolled inputs.
5. **`"use client"` only when needed.** Every component is a Server Component by default. Keep client boundary as far down the tree as possible.
6. **Slugs are immutable.** Never change a slug after creation — it breaks the GTTD `landing_page.url`. If title changes, add a redirect in `next.config.ts`.
7. **ISR revalidation stays at 3600s on PDP.** Never increase beyond 1 hour — prices change.
8. **All styling via Tailwind + `cn()`.** No inline `style={{}}`, no CSS modules.
9. **Never modify `components/ui/`.** Extend shadcn primitives via `className` prop only.
10. **Idempotency key on every booking POST.** Generate `crypto.randomUUID()` client-side to prevent duplicate bookings on network retry.

---

## 18. Testing Checklist (Before Ship)

- [ ] Homepage loads popular experiences with correct currency
- [ ] Currency picker changes prices across all pages (re-fetches with new currency param)
- [ ] City page filters update URL and re-fetch without full page reload
- [ ] PDP loads correct experience, shows real images, rating, price
- [ ] Date picker shows available dates (green) and unavailable (greyed out)
- [ ] Time slot selection updates displayed price
- [ ] Guest count changes total price correctly (from API values)
- [ ] "Add to Cart" adds item, shows toast, updates cart badge in Navbar
- [ ] Cart page shows all items, remove works, checkout all works
- [ ] "Book Now" navigates to checkout with correct query params
- [ ] Checkout form validates all fields before submit
- [ ] Successful booking → confirmation page shows booking reference
- [ ] Confirmation page shows correct experience details
- [ ] Mobile PDP bottom bar shows pricing + Book Now button
- [ ] All pages have loading skeleton states
- [ ] 404 page shows for invalid city/slug
- [ ] JSON-LD is present on every PDP (`<script type="application/ld+json">`)
- [ ] All images load with `next/image` (no raw `<img>`)
- [ ] No TypeScript errors (`tsc --noEmit` passes)
- [ ] ESLint passes (`npm run lint`)

---

*Total estimated effort: ~5–6 days of focused frontend development.*
*Last updated: May 2026*