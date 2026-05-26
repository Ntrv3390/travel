# Travel Marketplace - Backend

Go backend service using Gin framework with PostgreSQL and Redis.

## Project Structure

- `cmd/api/` - Main application entry point
- `internal/models/` - Data models
- `internal/handlers/` - HTTP request handlers
- `internal/services/` - Business logic
- `internal/database/` - Database setup and migrations
- `pkg/config/` - Configuration management
- `pkg/logger/` - Logging setup

## Getting Started

### Local Development

```bash
# Install dependencies
go mod download

# Build
go build -o bin/api ./cmd/api

# Run
./bin/api
```

### Environment Variables

- `PORT` - API server port (default: 8080)
- `DB_HOST` - PostgreSQL host
- `DB_PORT` - PostgreSQL port
- `DB_USER` - PostgreSQL user
- `DB_PASSWORD` - PostgreSQL password
- `DB_NAME` - PostgreSQL database name
- `DB_SSLMODE` - PostgreSQL SSL mode
- `REDIS_HOST` - Redis host
- `REDIS_PORT` - Redis port
- `HEADOUT_API_KEY` - Headout API key
- `HEADOUT_ENV` - Headout target environment (`sandbox`, `stage`, `production`)
- `HEADOUT_URL` - Optional explicit Headout base URL override
- `HEADOUT_SANDBOX_BASE_URL` - Sandbox base URL (default: `https://sandbox.api.test-headout.com/api/public`)
- `HEADOUT_STAGE_BASE_URL` - Stage base URL (default: `https://sandbox.api.test-headout.com/api/public`)
- `HEADOUT_PROD_BASE_URL` - Production base URL (default: `https://www.headout.com/api/public`)
- `ENV` - Runtime environment (development/staging/production)

## API Endpoints

### Health

- `GET /health` - Health check
- `GET /ready` - Readiness check

### Experiences

- `GET /api/v1/experiences` - List all experiences
- `GET /api/v1/experiences/:id` - Get experience by ID
- `GET /api/v1/experiences/search?category=&location=` - Search experiences

### Headout Proxy (Internal)

- `GET /api/v1/headout/v1/product/get/:productId`
- `GET /api/v1/headout/v1/product/listing/list-by/city`
- `GET /api/v1/headout/v1/product/listing/list-by/category`
- `GET /api/v1/headout/v1/inventory/list-by/variant`
- `GET /api/v1/headout/v1/booking`
- `GET /api/v1/headout/v1/booking/:id`
- `POST /api/v1/headout/v1/booking`
- `PUT /api/v1/headout/v1/booking/:id`
- `GET /api/v1/headout/v1/city`
- `GET /api/v1/headout/v1/category/list-by/city`
- `GET /api/v1/headout/v2/products`
- `GET /api/v1/headout/v2/categories`
- `GET /api/v1/headout/v2/collections`
- `GET /api/v1/headout/v2/subcategories`

### Booking Compatibility Routes

- `GET /api/v1/bookings` (proxies to Headout `GET /v1/booking`)
- `GET /api/v1/bookings/:id` (proxies to Headout `GET /v1/booking/:id`)
- `POST /api/v1/bookings` (proxies to Headout `POST /v1/booking`)
- `PUT /api/v1/bookings/:id` (proxies to Headout `PUT /v1/booking/:id`)
