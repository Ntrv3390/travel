# Code Review Feedback - Travel Marketplace

This document summarizes the technical feedback and architectural recommendations for the Travel Marketplace (Traviia Clone) project following the completion of Phase 1.

## 🏆 Strengths
- **Clean Architecture:** Excellent separation of concerns between `cmd`, `internal`, and `pkg` in the Go backend.
- **Modern Tech Stack:** Great use of Next.js 14 features (SSR/ISR) and Go's performance.
- **Infrastructure:** Docker Compose setup is robust, providing a consistent environment for all services (API, Web, DB, Cache).
- **Documentation:** The project is exceptionally well-documented for its size.

---

## 🛠️ Areas for Improvement

### 1. Backend (Go API)

#### 🔴 Critical: Brittle Feed Parsing
- **Location:** `backend/internal/gttd/worker.go`
- **Issue:** The `countProductsInJSON` function counts the raw string `"id"` to determine product counts.
- **Risk:** This will produce incorrect results if the string "id" appears in descriptions, URLs, or other metadata.
- **Recommendation:** Use `json.Unmarshal` or a dedicated JSON stream parser to accurately count and validate products.

#### 🟡 Scalability: Missing Pagination
- **Location:** `backend/internal/handlers/experience.go`
- **Issue:** `GetExperiences` and `SearchExperiences` return all records in a single response.
- **Risk:** As the database grows to thousands of experiences, these responses will become massive, causing slow load times, high memory usage, and potential client-side crashes.
- **Recommendation:** Implement **Limit/Offset** or **Cursor-based pagination**.

#### 🟡 Architecture: Service Layer Extraction
- **Location:** `backend/internal/handlers/`
- **Issue:** HTTP handlers contain direct GORM database logic.
- **Recommendation:** Move business logic into `internal/services/`. This allows you to unit test your logic (pricing, filtering) without needing a database connection.

#### ⚪ Security: CORS Configuration
- **Location:** `backend/cmd/api/main.go`
- **Issue:** `Access-Control-Allow-Origin` is set to `*`.
- **Recommendation:** In production, restrict this to your specific frontend domain.

---

### 2. Frontend (Next.js)

#### 🔴 Critical: API Route Mismatch
- **Issue:** The frontend `lib/api.ts` expects an endpoint like `/api/v1/experiences/${city}/${slug}`, but the backend only provides `/api/v1/experiences/:id`.
- **Result:** Product detail pages will currently return 404 errors.
- **Recommendation:** Update the backend router to support slug-based lookups or update the frontend to fetch by ID.

#### 🟡 Error Handling: Response Swallowing
- **Location:** `frontend/lib/api.ts`
- **Issue:** `handleResponse` catches errors and returns an empty fallback value.
- **Risk:** The user sees an "empty state" instead of an "error state," making it impossible to distinguish between "no results" and "server is down."
- **Recommendation:** Propagate errors to the UI or use a Result type that includes error details.

#### 🟡 Missing Implementation: Detail Pages
- **Location:** `frontend/app/experiences/[id]/page.tsx`
- **Issue:** The page currently only contains a placeholder redirect.
- **Recommendation:** Implement the ISR-based product detail page UI as planned in the documentation.

---

## 🚀 Recommended Next Steps (Phase 2)

1. **Fix the Route Mismatch:** Align the backend API and frontend client paths.
2. **Implement Pagination:** Add `page` and `limit` parameters to all listing endpoints.
3. **Robust GTTD Parsing:** Replace string counting with structural JSON validation.
4. **Service Layer Refactor:** Start moving pricing logic out of handlers and into services.

---
**Date:** May 11, 2026  
**Status:** Review Completed
