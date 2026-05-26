# Travel Marketplace - Traviia Clone

A high-performance, distributed travel experience platform for discovering and booking travel activities worldwide.

## Architecture Overview

### Tech Stack
- **Backend:** Go (Golang) with Gin Gonic Framework
- **Frontend:** Next.js 14 (App Router, SSR/ISR)
- **Database:** PostgreSQL 15
- **Cache:** Redis 7
- **Containerization:** Docker & Docker Compose

### Project Structure

```
travel/
├── backend/                    # Go API Service
│   ├── cmd/api/               # Main application entry
│   ├── internal/
│   │   ├── models/            # Data models
│   │   ├── handlers/          # HTTP handlers
│   │   ├── services/          # Business logic
│   │   └── database/          # DB operations
│   ├── pkg/
│   │   ├── config/            # Configuration
│   │   └── logger/            # Structured logging
│   ├── Dockerfile
│   ├── go.mod
│   └── README.md
├── frontend/                   # Next.js Application
│   ├── app/                   # App Router pages
│   ├── components/            # React components
│   ├── lib/                   # API clients & utilities
│   ├── public/                # Static assets
│   ├── Dockerfile
│   ├── package.json
│   └── README.md
├── docker-compose.yml         # Container orchestration
├── init-db.sql               # Database schema
├── .env.example              # Environment variables template
└── project_overview.md       # Architecture documentation
```

## Services

1. **api-gateway** (Go + Gin) - Backend API on port 8080
2. **web-client** (Next.js) - Frontend on port 3000
3. **db-master** (PostgreSQL) - Database on port 5432
4. **cache-layer** (Redis) - Cache on port 6379

## Getting Started

### Prerequisites
- Docker & Docker Compose
- Node.js 20+ (for local development)
- Go 1.21+ (for local backend development)

### Quick Start with Docker

1. **Clone and setup environment:**
```bash
cd travel
cp .env.example .env
```

2. **Start all services:**
```bash
docker-compose up --build
```

3. **Access the application:**
- Frontend: http://localhost:3000
- API: http://localhost:8080
- Database: localhost:5432
- Cache: localhost:6379

### Local Development

#### Backend Setup
```bash
cd backend
go mod download
go run ./cmd/api/main.go
```

#### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

## Database Schema

### Tables
- **experiences** - Travel activities from Headout
- **bookings** - User bookings and reservations
- **pricing_rules** - Dynamic pricing engine configuration
- **google_feed_status** - Google Things to Do feed synchronization

## API Endpoints

### Health Check
- `GET /health` - Health status
- `GET /ready` - Readiness check

### Experiences (Phase 1)
- `GET /api/v1/experiences` - List all experiences (SSR)
- `GET /api/v1/experiences/:id` - Get experience details (ISR)
- `GET /api/v1/experiences/search?category=&location=` - Search experiences

### Bookings (Phase 2)
- `POST /api/v1/bookings` - Create booking
- `GET /api/v1/bookings/:id` - Get booking details

## Frontend Pages

- `/` - Home page
- `/experiences` - Browse all experiences (SSR)
- `/experiences/[id]` - Experience detail page (ISR, 60s revalidation)
- `/bookings` - User bookings (future)

## Key Features

### Phase 1: Core (Complete)
✅ Docker Compose setup  
✅ Go backend with Gin  
✅ PostgreSQL database  
✅ Redis caching layer  
✅ Next.js frontend with SSR/ISR  
✅ Experience listing and search  
✅ Database schema and migrations  

### Phase 2: Pricing & SEO (In Progress)
⏳ Pricing engine with markup/fees  
⏳ JSON-LD metadata implementation  
⏳ Google Things to Do feed generation  
⏳ Product detail page optimization  

### Phase 3: Booking & Checkout (Planned)
⏳ Headout API integration for bookings  
⏳ Payment gateway integration (Stripe/PayPal)  
⏳ User authentication  
⏳ Email notifications  

## Configuration

### Environment Variables

Copy `.env.example` to `.env` and configure:

```env
# Database
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=travel_db

# Redis
REDIS_HOST=cache-layer
REDIS_PORT=6379

# Headout API
HEADOUT_API_KEY=your_api_key
HEADOUT_URL=https://api.headout.com

# Environment
ENV=development
NEXT_PUBLIC_API_URL=http://localhost:8080
```

## Docker Commands

```bash
# Build all services
docker-compose build

# Start all services
docker-compose up

# Start in background
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down

# Remove volumes
docker-compose down -v
```

## Operational Guidelines

- **Strict Typing:** All Go structs map exactly to Headout JSON responses
- **Error Handling:** Graceful degradation when external APIs are unavailable
- **Logging:** Structured logging with Zap (Go) and built-in Next.js logging
- **Caching:** 24h for static experience data, 1h for pricing
- **Revalidation:** ISR revalidates product pages every 60 seconds

## Development Workflow

1. **Backend changes:**
   - Edit code in `backend/`
   - Docker will hot-reload in development mode
   - Build and run tests

2. **Frontend changes:**
   - Edit code in `frontend/`
   - Next.js dev server auto-reloads
   - Test SSR/ISR behavior

3. **Database schema changes:**
   - Edit `internal/database/database.go` (Go models)
   - Update `init-db.sql` if needed
   - Rebuild database: `docker-compose down -v && docker-compose up`

## Next Steps

1. Implement Headout API sync worker
2. Add pricing engine service
3. Create booking flow API
4. Integrate payment gateway
5. Build user authentication
6. Setup email notifications
7. Implement Google Things to Do feed

## Support & Documentation

- [Project Architecture](./project_overview.md)
- [Backend README](./backend/README.md)
- [Frontend README](./frontend/README.md)
