# Project Blueprint: High-Performance Travel Marketplace (Traviia Clone)

## 1. System Overview
A distributed travel experience platform that aggregates inventory from Headout (Supply), manages custom pricing logic, and distributes listings via Google "Things to Do" (GTTD).

**Tech Stack:**
- **Backend:** Go (Golang) with Gin Gonic Framework
- **Frontend:** Next.js (App Router, SSR/ISR)
- **Database:** PostgreSQL (Primary), Redis (Caching/Rate Limiting)
- **Infrastructure:** Docker & Docker Compose
- **Search/SEO:** Google Things to Do (JSON-LD & Data Feeds)

---

## 2. Infrastructure & Dockerization
The project is split into three core containers managed via `docker-compose.yml`.

### Services:
1.  **`api-gateway` (Golang):** Handles logic, API aggregation, and DB interactions.
2.  **`web-client` (Next.js):** Server-side rendered frontend.
3.  **`db-master` (Postgres):** Persistent storage.
4.  **`cache-layer` (Redis):** Caches API responses from Headout to reduce latency and API costs.

---

## 3. Backend Architecture (Go + Gin) - Stricktly Microservices Architecture
Directory Structure: `internal/`, `pkg/`, `cmd/`, `api/`.

### A. Database Schema (PostgreSQL)
- **`experiences`**: ID, Headout_ID, Title, Description, Location (Lat/Long), POI_ID (for Google).
- **`pricing_rules`**: Markup_percentage, Fixed_fee, Currency.
- **`bookings`**: Booking_ID, User_ID, Headout_Reference, Status (Pending, Confirmed, Cancelled).
- **`google_feed_status`**: Tracks last sync time for GTTD feeds.

### B. Headout API Integration
- **Endpoint 1: Discovery.** Periodically fetch all experiences using `GET /v1/experiences`.
- **Endpoint 2: Availability.** Real-time check at checkout via `GET /v1/experiences/{id}/availability`.
- **Endpoint 3: Booking.** Submit booking via `POST /v1/bookings`.
- **Caching Logic:** Store static experience data in Redis for 24h. Cache pricing for 1h.

---

## 4. Google "Things to Do" Integration
Google requires a structured feed to display "Official Site" or "Ticket" labels in search.

### A. Integration Protocols
1.  **Product Feed (SFTP/HTTPS):** Provide a JSON or XML feed containing:
    - `product_id`
    - `title`
    - `landing_page_url` (Deep link to Next.js product page)
    - `price_info` (Must match your site's checkout price)
2.  **Required Documentation:** [Google Things to Do Developer Docs](https://developers.google.com/hotels/things-to-do)
3.  **Metadata:** Implement **JSON-LD (Product & Offer)** on every Next.js product page to help Google's crawler index your custom pricing.

---

## 5. Frontend Architecture (Next.js)
### A. Rendering Strategy
- **SSR (Server-Side Rendering):** Use for Search Results pages to ensure the latest prices.
- **ISR (Incremental Static Regeneration):** Use for Product Detail Pages (PDP). Revalidate every 60 minutes to update from the DB/Headout.
- **Dynamic Routing:** `/[city]/[experience-slug]` structure for SEO.

### B. Booking Flow Flowchart
1. User selects date/time on Next.js.
2. Next.js calls Go Backend `/api/validate`.
3. Go Backend calls Headout API to lock availability.
4. User completes payment.
5. Go Backend confirms with Headout and sends confirmation email.

---

## 6. Implementation Milestones

### Phase 1: The Core (Week 1)
- Setup Docker Compose with Go and Postgres.
- Implement Headout API "Sync" worker in Go to populate the database.
- Create basic Gin routes for `GET /experiences`.

### Phase 2: Pricing & SEO (Week 2)
- Implement `PricingEngine` service in Go to apply markups.
- Build Next.js Product Detail Pages with metadata for SEO.
- Generate the first `google_ttd_feed.json`.

### Phase 3: Booking & Checkout (Week 3)
- Integrate a payment gateway (Stripe/PayPal).
- Implement the "Booking Bridge" logic (Your site -> Headout API).
- Add Redis for session and API response caching.

---

## 7. Operational Guidelines for AI Agent
- **Strict Typing:** All Go structs must map exactly to Headout JSON responses.
- **Error Handling:** If Headout API is down, the frontend must show "Temporary Unavailable" rather than old prices.
- **Logs:** Implement structured logging (Zap or Zerolog) to track booking failures.
