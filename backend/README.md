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
- `ENV` - Environment (development/production)

## API Endpoints

### Health

- `GET /health` - Health check
- `GET /ready` - Readiness check

### Experiences

- `GET /api/v1/experiences` - List all experiences
- `GET /api/v1/experiences/:id` - Get experience by ID
- `GET /api/v1/experiences/search?category=&location=` - Search experiences
