# 🚀 GTTD Integration - Quick Start

## What's Ready

✅ Complete Google Things To Do integration  
✅ All backend services implemented  
✅ API endpoints ready  
✅ Cron jobs configured  
✅ Database schema updated  
✅ Docker configuration complete  

**Status**: Ready to deploy with Google credentials  

---

## 30-Second Setup

### 1. Generate SSH Keys
```bash
cd secrets/
ssh-keygen -t ed25519 -C "traviia-gttd-sftp" -f gttd_dev_ssh_key -N ""
ssh-keygen -t ed25519 -C "traviia-gttd-sftp-prod" -f gttd_prod_ssh_key -N ""
chmod 600 gttd_*_ssh_key
```

### 2. Send Public Keys to Google
```bash
cat secrets/gttd_dev_ssh_key.pub
cat secrets/gttd_prod_ssh_key.pub
```

### 3. Wait for Google Credentials

### 4. Update .env
```env
GTTD_PROD_SFTP_HOST=<from-google>
GTTD_PROD_SFTP_USERNAME=<from-google>
GTTD_PROD_SFTP_REMOTE_DIR=<from-google>
```

### 5. Start Application
```bash
docker-compose up -d
```

### 6. Map Locations & Enable
```sql
-- Add POI mappings
INSERT INTO poi_mappings (headout_city, google_place_id, is_verified)
VALUES ('New York', 'ChIJOwg_06VPwokR4v4GfH-j67w', true);

-- Enable experiences
UPDATE experiences SET gttd_enabled = true WHERE poi_id IS NOT NULL;
```

### 7. Test Upload
```bash
curl -X POST http://localhost:8080/api/v1/gttd/trigger-upload \
  -H "Content-Type: application/json" \
  -d '{"env":"production"}'
```

---

## API Reference

### Trigger Upload
```bash
POST /api/v1/gttd/trigger-upload
Body: {"env":"dev"|"production"}
Response: 202 Accepted
```

### Get Status
```bash
GET /api/v1/gttd/status?env=production
Response: {env, status, product_count, ...}
```

### Get JSON-LD
```bash
GET /api/v1/gttd/jsonld/:headout_id
Response: Application/ld+json
```

### Health Check
```bash
GET /api/v1/gttd/health
Response: {status: "ok"}
```

---

## Files You Need to Know

| File | Purpose |
|------|---------|
| `backend/internal/gttd/feed_types.go` | GTTD JSON structures |
| `backend/internal/gttd/feed_generator.go` | Build feeds from DB |
| `backend/internal/pricing/engine.go` | Single pricing source |
| `backend/internal/models/gttd_feed.go` | Database models |
| `init-db.sql` | Database schema |
| `GTTD_SETUP.md` | Complete documentation |

---

## Database Schema

**New tables:**
- `experiences` — Updated with GTTD fields
- `experience_options` — Product variants
- `pricing_rules` — Markup configuration
- `google_feed_status` — Upload tracking
- `poi_mappings` — Location → Place ID mapping

**Key fields:**
- `experiences.gttd_enabled` — Boolean flag
- `experiences.poi_id` — Google Place ID
- `experiences.poi_name` — Location name
- `pricing_rules.markup_percentage` — Markup %

---

## Critical Concept: Pricing Engine

All prices calculated by **ONE** function in `internal/pricing/engine.go`:

```go
priceResult := pricingEngine.CalculatePrice(
    ctx,
    baseAmount,
    currency,
    experienceID,
    city,
)
// Returns: {DisplayAmount, CurrencyCode, FormattedAmount: "25.00"}
```

**Used by:**
1. Feed generator (GTTD JSON)
2. JSON-LD builder (Product schema)
3. Checkout handler (Payment amount)

**If prices don't match** → Google delists products

---

## Cron Job

**When**: Daily at 2 AM UTC (configurable)  
**What**: Generates feed, uploads to Google  
**Config**: `GTTD_CRON_SCHEDULE=0 2 * * *`  
**Requirement**: Google needs minimum once every 30 days

---

## Testing Checklist

- [ ] SSH keys generated
- [ ] Public keys sent to Google
- [ ] SFTP credentials received
- [ ] .env updated
- [ ] Docker compose up
- [ ] POST /api/v1/gttd/trigger-upload works
- [ ] GET /api/v1/gttd/status returns data
- [ ] Check Google Action Center
- [ ] Products show ACTIVE status

---

## Troubleshooting

### Feed Upload Fails
```bash
docker logs travel-api-gateway | grep -i gttd
```

### Check Generated Feed
```bash
docker exec travel-api-gateway ls /tmp/gttd_feeds/
docker exec travel-api-gateway cat /tmp/gttd_feeds/traviia_gttd_feed_shard_0_*.json
```

### No GTTD-enabled Products
```sql
SELECT COUNT(*) FROM experiences WHERE gttd_enabled = true;
```

### Price Mismatch
```
1. Check PricingEngine is called same way in feed_generator.go + jsonld_builder.go
2. Verify pricing_rules are correct
3. Compare output prices in both places
```

---

## Environment Variables

```env
# SFTP Credentials (from Google)
GTTD_DEV_SFTP_HOST=sftp-dev.things-to-do.google.com
GTTD_PROD_SFTP_HOST=sftp.things-to-do.google.com
GTTD_PROD_SFTP_USERNAME=<your-username>
GTTD_PROD_SFTP_REMOTE_DIR=<your-dir>

# Feed Configuration
GTTD_BASE_URL=https://traviia.com
GTTD_FEED_OUTPUT_DIR=/tmp/gttd_feeds
GTTD_CRON_SCHEDULE=0 2 * * *
GTTD_ENV=production
```

---

## Next: Full Setup

For complete setup instructions, see **`GTTD_SETUP.md`**

---

**Everything is ready. Just add Google credentials! 🎉**
