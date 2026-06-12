package sync

import (
	"context"
	"encoding/json"
	"fmt"
	"math"
	"math/rand"
	"net/url"
	stdsync "sync"
	"sync/atomic"
	"time"

	"github.com/travel/backend/internal/models"
	"github.com/travel/backend/internal/services"
	"github.com/travel/backend/pkg/config"
	"github.com/travel/backend/pkg/logger"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

const (
	MetadataSyncThreshold     = 24 * time.Hour
	AvailabilitySyncThreshold = 1 * time.Hour
	SyncJobTimeout            = 4 * time.Hour  // raised from 10 min — large catalogs take time
	availWindowDays           = 30
	maxCalendarDays           = 365
	sevenDays                 = 7 * 24 * time.Hour
	snapshotDays              = 180  // ~6 months of synthetic availability
	snapshotPriceVariance     = 0.05 // ±5% price variation per slot
	snapshotWorkers           = 100  // worker pool size for snapshot restore and metadata sync
)

// Service orchestrates the three-tier inventory sync pipeline.
type Service struct {
	db               *gorm.DB
	headoutProxy     *services.HeadoutProxyService
	rateLimiter      *RateLimiter
	discoveryWorkers int // Tier-2: variant resolver
	availWorkers     int // Tier-3: availability fetcher
	workerCount      int // legacy field kept for PoolResult reporting
	jobService       *JobService

	activeJobs   map[string]context.CancelFunc
	activeJobsMu stdsync.RWMutex
}

func NewService(cfg *config.Config, db *gorm.DB, headoutProxy *services.HeadoutProxyService) *Service {
	rl := NewRateLimiter(cfg.SyncRateLimitPerSec, cfg.SyncRateBurst)
	return &Service{
		db:               db,
		headoutProxy:     headoutProxy,
		rateLimiter:      rl,
		discoveryWorkers: cfg.SyncDiscoveryWorkers,
		availWorkers:     cfg.SyncAvailWorkers,
		workerCount:      cfg.SyncWorkerCount,
		jobService:       NewJobService(db),
		activeJobs:       make(map[string]context.CancelFunc),
	}
}

// StartMetadataSync triggers a metadata-only sync: discovers cities → products → variant stubs.
// No availability windows are fetched from Headout. Safe to run with fetch_fresh = false.
// After this completes, run StartInventorySync (with fetch_fresh = false) to generate slots.
func (s *Service) StartMetadataSync(ctx context.Context) (string, error) {
	jobID, err := s.jobService.CreateJob(ctx, models.SyncJobTypeMetadata, 0, s.discoveryWorkers)
	if err != nil {
		return "", err
	}
	go s.runMetadataSync(jobID)
	return jobID, nil
}

// StartInventorySync triggers the full three-tier discovery + availability sync.
// Returns the job ID immediately; sync runs in background.
func (s *Service) StartInventorySync(ctx context.Context) (string, error) {
	jobID, err := s.jobService.CreateJob(ctx, models.SyncJobTypeInventory, 0, s.availWorkers)
	if err != nil {
		return "", err
	}
	go s.runInventorySync(jobID)
	return jobID, nil
}

// CancelJob stops a running sync job.
func (s *Service) CancelJob(jobID string) error {
	s.activeJobsMu.RLock()
	cancel, exists := s.activeJobs[jobID]
	s.activeJobsMu.RUnlock()
	if !exists {
		return fmt.Errorf("no active job found with ID %s", jobID)
	}
	cancel()
	_ = s.jobService.CancelJob(context.Background(), jobID)
	return nil
}

func (s *Service) GetJobStatus(ctx context.Context, jobID string) (*models.SyncJob, error) {
	return s.jobService.GetJob(ctx, jobID)
}

func (s *Service) GetSyncProgress(ctx context.Context, jobID string) (float64, error) {
	job, err := s.jobService.GetJob(ctx, jobID)
	if err != nil {
		return 0, err
	}
	if job.TotalProducts == 0 {
		return 0, nil
	}
	return float64(job.ProcessedProducts) / float64(job.TotalProducts) * 100, nil
}

func (s *Service) GetFailedProducts(ctx context.Context, jobID string) ([]models.SyncJobFailedProduct, error) {
	return s.jobService.GetFailedProducts(ctx, jobID)
}

func (s *Service) ListRecentJobs(ctx context.Context, limit int) ([]models.SyncJob, error) {
	return s.jobService.ListRecentJobs(ctx, limit)
}

func (s *Service) GetMetrics(ctx context.Context, jobID string) (map[string]interface{}, error) {
	job, err := s.jobService.GetJob(ctx, jobID)
	if err != nil {
		return nil, err
	}
	m := map[string]interface{}{
		"job_id":              job.JobID,
		"status":              job.Status,
		"type":                job.Type,
		"total_products":      job.TotalProducts,
		"processed_products":  job.ProcessedProducts,
		"successful_products": job.SuccessfulProducts,
		"failed_products":     job.FailedProducts,
		"products_discovered": job.ProductsDiscovered,
		"slots_stored":        job.SlotsStored,
		"products_skipped":    job.ProductsSkipped,
		"worker_count":        job.WorkerCount,
		"progress_pct":        0.0,
		"throughput":          0.0,
	}
	if job.TotalProducts > 0 {
		m["progress_pct"] = float64(job.ProcessedProducts) / float64(job.TotalProducts) * 100
	}
	if job.StartedAt != nil && job.ProcessedProducts > 0 {
		elapsed := time.Since(*job.StartedAt).Seconds()
		if elapsed > 0 {
			m["throughput"] = float64(job.ProcessedProducts) / elapsed
		}
	}
	if job.StartedAt != nil && job.CompletedAt != nil {
		m["duration_seconds"] = job.CompletedAt.Sub(*job.StartedAt).Seconds()
	}
	return m, nil
}

// GetInventoryStats returns aggregate inventory statistics for the settings page.
func (s *Service) GetInventoryStats(ctx context.Context) (map[string]interface{}, error) {
	var totalProducts, availableProducts int64
	var totalSlots, slotsWithCapacity int64
	var totalLocalBookings int64

	s.db.WithContext(ctx).Model(&models.Product{}).Count(&totalProducts)
	s.db.WithContext(ctx).Model(&models.Product{}).Where("is_available = true").Count(&availableProducts)
	s.db.WithContext(ctx).Model(&models.ProductAvailability{}).Count(&totalSlots)
	s.db.WithContext(ctx).Model(&models.ProductAvailability{}).Where("remaining_capacity > 0").Count(&slotsWithCapacity)
	s.db.WithContext(ctx).Model(&models.LocalBooking{}).Count(&totalLocalBookings)

	var lastJob models.SyncJob
	var lastSyncAt *time.Time
	if err := s.db.WithContext(ctx).Where("type = ? AND status = ?", models.SyncJobTypeInventory, models.SyncJobCompleted).
		Order("completed_at desc").First(&lastJob).Error; err == nil {
		lastSyncAt = lastJob.CompletedAt
	}

	var fetchFresh string
	var setting models.Setting
	if err := s.db.WithContext(ctx).Where("key = ?", "fetch_fresh").First(&setting).Error; err == nil {
		fetchFresh = setting.Value
	}

	return map[string]interface{}{
		"total_products":               totalProducts,
		"available_products":           availableProducts,
		"total_slots":                  totalSlots,
		"slots_with_remaining_capacity": slotsWithCapacity,
		"total_local_bookings":         totalLocalBookings,
		"last_sync_at":                 lastSyncAt,
		"last_sync_products":           lastJob.ProductsDiscovered,
		"fetch_fresh":                  fetchFresh,
	}, nil
}

// ─────────────────────────────────────────────────────────────────────────────
// Three-tier inventory sync pipeline
// ─────────────────────────────────────────────────────────────────────────────

type variantWork struct {
	product   models.Product
	variantID string
	variantTitle string
}

// getFetchFresh reads the fetch_fresh setting from the DB.
// Returns true (live Headout sync) when the setting is absent or set to "true".
func (s *Service) getFetchFresh(ctx context.Context) bool {
	var setting models.Setting
	if err := s.db.WithContext(ctx).Where("key = ?", "fetch_fresh").First(&setting).Error; err != nil {
		return true
	}
	return setting.Value == "true"
}

// runSnapshotRestore generates synthetic availability for all DB products without
// touching any Headout endpoints. Uses snapshotWorkers goroutines in parallel.
func (s *Service) runSnapshotRestore(ctx context.Context, jobID string) {
	type variantRow struct {
		VariantID    string   `gorm:"column:variant_id"`
		VariantTitle string   `gorm:"column:variant_title"`
		PriceAmount  float64  `gorm:"column:price_amount"`
		PriceAdult   *float64 `gorm:"column:price_adult"`
		PriceChild   *float64 `gorm:"column:price_child"`
		PriceYouth   *float64 `gorm:"column:price_youth"`
		PriceInfant  *float64 `gorm:"column:price_infant"`
		PriceSenior  *float64 `gorm:"column:price_senior"`
		Currency     string   `gorm:"column:currency"`
		StartTime    string   `gorm:"column:start_time"`
	}

	var products []models.Product
	if err := s.db.WithContext(ctx).Find(&products).Error; err != nil {
		logger.Errorf("Snapshot restore %s: failed to load products: %v", jobID, err)
		_ = s.jobService.FailJob(ctx, jobID, err.Error())
		return
	}

	total := int64(len(products))
	s.db.Model(&models.SyncJob{}).Where("job_id = ?", jobID).Updates(map[string]interface{}{
		"total_products":      total,
		"products_discovered": total,
		"updated_at":          time.Now(),
	})

	today := time.Now().UTC().Truncate(24 * time.Hour)

	var processed, successful, failed, slotsStored atomic.Int64

	workCh := make(chan models.Product, 200)

	var wg stdsync.WaitGroup
	wg.Add(snapshotWorkers)
	for w := 0; w < snapshotWorkers; w++ {
		go func(workerIdx int) {
			defer wg.Done()
			// Each worker has its own RNG so there is no lock contention.
			rng := rand.New(rand.NewSource(time.Now().UnixNano() + int64(workerIdx)*999983))

			vary := func(base float64) float64 {
				if base == 0 {
					return 0
				}
				mult := 1.0 + (rng.Float64()*2-1)*snapshotPriceVariance
				return math.Round(base*mult*100) / 100
			}
			varyPtr := func(p *float64) *float64 {
				if p == nil {
					return nil
				}
				v := vary(*p)
				return &v
			}

			for product := range workCh {
				if ctx.Err() != nil {
					return
				}

				var variants []variantRow
				s.db.WithContext(ctx).Raw(`
					SELECT DISTINCT ON (variant_id, start_time)
						variant_id, variant_title,
						price_amount, price_adult, price_child, price_youth, price_infant, price_senior,
						currency, start_time
					FROM product_availabilities
					WHERE product_id = ?
					ORDER BY variant_id, start_time,
					         (date = '2000-01-01') ASC,
					         updated_at DESC
				`, product.ID).Scan(&variants)

				if len(variants) == 0 {
					currency := product.Currency
					if currency == "" {
						currency = "USD"
					}
					variants = []variantRow{{
						VariantID:    product.HeadoutID,
						VariantTitle: product.Title,
						PriceAmount:  product.PriceFrom,
						Currency:     currency,
						StartTime:    "09:00",
					}}
				}

				var productSlots int64
				for _, v := range variants {
					startTime := v.StartTime
					if startTime == "" {
						startTime = "09:00"
					}
					currency := v.Currency
					if currency == "" {
						currency = "USD"
					}

					for d := 0; d < snapshotDays; d++ {
						if ctx.Err() != nil {
							break
						}
						slotDate := today.AddDate(0, 0, d)
						dateStr := slotDate.Format("2006-01-02")
						inventoryID := fmt.Sprintf("syn-%s-%s-%s", v.VariantID, dateStr, startTime)

						slotPrice := vary(v.PriceAmount)
						slotAdult := varyPtr(v.PriceAdult)
						slotChild := varyPtr(v.PriceChild)
						slotYouth := varyPtr(v.PriceYouth)
						slotInfant := varyPtr(v.PriceInfant)
						slotSenior := varyPtr(v.PriceSenior)

						avail := models.ProductAvailability{
							ProductID:         product.ID,
							HeadoutProductID:  product.HeadoutID,
							VariantID:         v.VariantID,
							VariantTitle:      v.VariantTitle,
							Date:              dateStr,
							StartTime:         startTime,
							InventoryID:       inventoryID,
							InventoryType:     "FIXED_START_FIXED_DURATION",
							PriceAmount:       slotPrice,
							PriceAdult:        slotAdult,
							PriceChild:        slotChild,
							PriceYouth:        slotYouth,
							PriceInfant:       slotInfant,
							PriceSenior:       slotSenior,
							Currency:          currency,
							TotalCapacity:     300,
							RemainingCapacity: 300,
							AvailableSlots:    300,
							RawHeadoutData:    []byte(`{}`),
						}

						result := s.db.WithContext(ctx).Clauses(clause.OnConflict{
							Columns: []clause.Column{
								{Name: "variant_id"},
								{Name: "date"},
								{Name: "start_time"},
							},
							DoUpdates: clause.Assignments(map[string]interface{}{
								"inventory_id":       inventoryID,
								"price_amount":       slotPrice,
								"price_adult":        slotAdult,
								"price_child":        slotChild,
								"price_youth":        slotYouth,
								"price_infant":       slotInfant,
								"price_senior":       slotSenior,
								"available_slots":    300,
								"total_capacity":     300,
								"remaining_capacity": 300,
								"updated_at":         time.Now(),
							}),
						}).Create(&avail)

						if result.Error != nil {
							logger.Warnf("Snapshot slot error product=%s variant=%s date=%s: %v",
								product.HeadoutID, v.VariantID, dateStr, result.Error)
						} else {
							productSlots++
							slotsStored.Add(1)
						}
					}
				}

				now := time.Now()
				s.db.WithContext(ctx).Model(&models.Product{}).Where("id = ?", product.ID).Updates(map[string]interface{}{
					"is_available":              true,
					"last_availability_sync_at": now,
				})

				p := processed.Add(1)
				if productSlots > 0 {
					successful.Add(1)
				} else {
					failed.Add(1)
				}

				// Periodic job progress update every 100 products
				if p%100 == 0 {
					s.db.Model(&models.SyncJob{}).Where("job_id = ?", jobID).Updates(map[string]interface{}{
						"processed_products":  p,
						"successful_products": successful.Load(),
						"failed_products":     failed.Load(),
						"slots_stored":        slotsStored.Load(),
						"updated_at":          time.Now(),
					})
				}
			}
		}(w)
	}

	for _, product := range products {
		if ctx.Err() != nil {
			break
		}
		workCh <- product
	}
	close(workCh)
	wg.Wait()

	now := time.Now()
	s.db.Model(&models.SyncJob{}).Where("job_id = ?", jobID).Updates(map[string]interface{}{
		"status":              models.SyncJobCompleted,
		"processed_products":  processed.Load(),
		"successful_products": successful.Load(),
		"failed_products":     failed.Load(),
		"products_discovered": total,
		"slots_stored":        slotsStored.Load(),
		"products_skipped":    0,
		"completed_at":        now,
		"updated_at":          now,
	})

	logger.Infof("Snapshot restore %s complete: %d products, %d slots stored (%d days each), %d failed",
		jobID, processed.Load(), slotsStored.Load(), snapshotDays, failed.Load())
}

func (s *Service) runInventorySync(jobID string) {
	defer func() {
		if r := recover(); r != nil {
			logger.Errorf("Recovered from panic in inventory sync: %v", r)
		}
	}()

	ctx, cancel := context.WithTimeout(context.Background(), SyncJobTimeout)
	s.activeJobsMu.Lock()
	s.activeJobs[jobID] = cancel
	s.activeJobsMu.Unlock()
	defer func() {
		s.activeJobsMu.Lock()
		delete(s.activeJobs, jobID)
		s.activeJobsMu.Unlock()
		cancel()
	}()

	if err := s.jobService.StartJob(ctx, jobID); err != nil {
		logger.Errorf("Failed to start job %s: %v", jobID, err)
		return
	}

	// When fetch_fresh is disabled, restore synthetic availability from DB instead
	// of hitting Headout live endpoints.
	if !s.getFetchFresh(ctx) {
		s.runSnapshotRestore(ctx, jobID)
		return
	}

	// Counters shared across all tiers
	var (
		discovered  atomic.Int64
		processed   atomic.Int64
		successful  atomic.Int64
		failed      atomic.Int64
		skipped     atomic.Int64
		slotsStored atomic.Int64
	)

	// Channel pipeline: products → variants → availability
	productCh := make(chan models.Product, 500)
	variantCh  := make(chan variantWork, 2000)

	var tier2Wg, tier3Wg stdsync.WaitGroup

	// Tier 2: resolve variants (40 workers).
	// processed counter lives here so it counts at product granularity, matching total_products.
	tier2Wg.Add(s.discoveryWorkers)
	for i := 0; i < s.discoveryWorkers; i++ {
		go func() {
			defer tier2Wg.Done()
			for product := range productCh {
				if ctx.Err() != nil {
					return
				}
				variants, err := s.fetchVariants(ctx, product.HeadoutID)
				if err != nil {
					logger.Warnf("Failed to fetch variants for %s: %v", product.HeadoutID, err)
					failed.Add(1)
					processed.Add(1)
					continue
				}
				if len(variants) == 0 {
					skipped.Add(1)
					processed.Add(1)
					continue
				}
				for _, v := range variants {
					variantCh <- variantWork{product: product, variantID: v.ID, variantTitle: v.Title}
				}
				processed.Add(1) // one product fully queued

				// Periodic progress update every 50 products
				p := processed.Load()
				if p%50 == 0 {
					s.db.Model(&models.SyncJob{}).Where("job_id = ?", jobID).Updates(map[string]interface{}{
						"processed_products": p,
						"failed_products":    failed.Load(),
						"products_skipped":   skipped.Load(),
						"updated_at":         time.Now(),
					})
				}
			}
		}()
	}

	// Tier 3: fetch availability (80 workers).
	// successful_products / slots_stored are variant-level; that is expected and documented.
	tier3Wg.Add(s.availWorkers)
	for i := 0; i < s.availWorkers; i++ {
		go func() {
			defer tier3Wg.Done()
			for work := range variantCh {
				if ctx.Err() != nil {
					return
				}
				slots, err := s.fetchAndStoreAvailability(ctx, work.product, work.variantID, work.variantTitle)
				if err != nil {
					logger.Warnf("Availability error for product %s variant %s: %v", work.product.HeadoutID, work.variantID, err)
					failed.Add(1)
				} else {
					slotsStored.Add(int64(slots))
					successful.Add(1)
				}

				// Periodic slots update every 200 variants
				if successful.Load()%200 == 0 {
					s.db.Model(&models.SyncJob{}).Where("job_id = ?", jobID).Updates(map[string]interface{}{
						"successful_products": successful.Load(),
						"slots_stored":        slotsStored.Load(),
						"updated_at":          time.Now(),
					})
				}
			}
		}()
	}

	// Tier 1: discover cities then products (runs in this goroutine, feeds productCh)
	cityCodes, err := s.discoverCities(ctx)
	if err != nil {
		logger.Errorf("City discovery failed: %v", err)
		_ = s.jobService.FailJob(ctx, jobID, err.Error())
		close(productCh)
		tier2Wg.Wait()
		close(variantCh)
		tier3Wg.Wait()
		return
	}
	logger.Infof("Inventory sync %s: discovered %d cities", jobID, len(cityCodes))

	totalDiscovered := 0
	for _, cityCode := range cityCodes {
		if ctx.Err() != nil {
			break
		}
		count, err := s.discoverProductsForCity(ctx, cityCode, productCh, jobID)
		if err != nil {
			logger.Warnf("Product discovery failed for city %s: %v", cityCode, err)
			continue
		}
		totalDiscovered += count
		discovered.Add(int64(count))

		// Update total_products as we discover so progress % is meaningful
		s.db.Model(&models.SyncJob{}).Where("job_id = ?", jobID).Updates(map[string]interface{}{
			"total_products":      totalDiscovered,
			"products_discovered": totalDiscovered,
			"updated_at":          time.Now(),
		})
	}

	close(productCh)
	tier2Wg.Wait()
	close(variantCh)
	tier3Wg.Wait()

	// Final counters
	now := time.Now()
	s.db.Model(&models.SyncJob{}).Where("job_id = ?", jobID).Updates(map[string]interface{}{
		"status":              models.SyncJobCompleted,
		"processed_products":  processed.Load(),
		"successful_products": successful.Load(),
		"failed_products":     failed.Load(),
		"products_discovered": discovered.Load(),
		"slots_stored":        slotsStored.Load(),
		"products_skipped":    skipped.Load(),
		"completed_at":        now,
		"updated_at":          now,
	})

	logger.Infof("Inventory sync %s complete: %d products discovered, %d slots stored, %d failed in %v",
		jobID, discovered.Load(), slotsStored.Load(), failed.Load(), time.Since(now).Round(time.Second))
}

// discoverCities paginates /v2/cities/ and upserts into cities table.
func (s *Service) discoverCities(ctx context.Context) ([]string, error) {
	var cityCodes []string
	offset := 0
	limit := 100

	for {
		if err := s.rateLimiter.Wait(ctx); err != nil {
			return cityCodes, err
		}

		q := url.Values{}
		q.Set("offset", fmt.Sprintf("%d", offset))
		q.Set("limit", fmt.Sprintf("%d", limit))

		resp, err := s.headoutProxy.Get(ctx, "/v2/cities/", q, true)
		if err != nil {
			return cityCodes, fmt.Errorf("fetch cities page offset=%d: %w", offset, err)
		}

		var body struct {
			Cities     []json.RawMessage `json:"cities"`
			NextOffset *int              `json:"nextOffset"`
		}
		if err := json.Unmarshal(resp.Body, &body); err != nil {
			return cityCodes, fmt.Errorf("parse cities response: %w", err)
		}

		for _, raw := range body.Cities {
			var c map[string]interface{}
			if err := json.Unmarshal(raw, &c); err != nil {
				continue
			}
			code := ExtractString(c, "code", "id", "cityCode")
			name := ExtractString(c, "name")
			if code == "" {
				continue
			}
			cityCodes = append(cityCodes, code)

			rawJSON, _ := json.Marshal(c)
			s.db.Exec(`INSERT INTO cities (code, name, raw_headout_data, last_synced_at, created_at, updated_at)
				VALUES (?, ?, ?, NOW(), NOW(), NOW())
				ON CONFLICT (code) DO UPDATE SET name=EXCLUDED.name, raw_headout_data=EXCLUDED.raw_headout_data, last_synced_at=NOW()`,
				code, name, rawJSON)
		}

		if body.NextOffset == nil || *body.NextOffset <= offset || len(body.Cities) == 0 {
			break
		}
		offset = *body.NextOffset
	}

	return cityCodes, nil
}

// discoverProductsForCity paginates /v2/products?cityCode=... and upserts products.
// Sends each product to productCh for Tier-2 processing.
func (s *Service) discoverProductsForCity(ctx context.Context, cityCode string, productCh chan<- models.Product, jobID string) (int, error) {
	offset := 0
	limit := 100
	count := 0

	for {
		if ctx.Err() != nil {
			return count, ctx.Err()
		}
		if err := s.rateLimiter.Wait(ctx); err != nil {
			return count, err
		}

		q := url.Values{}
		q.Set("cityCode", cityCode)
		q.Set("offset", fmt.Sprintf("%d", offset))
		q.Set("limit", fmt.Sprintf("%d", limit))

		resp, err := s.headoutProxy.Get(ctx, "/v2/products", q, true)
		if err != nil {
			return count, fmt.Errorf("fetch products city=%s offset=%d: %w", cityCode, offset, err)
		}

		var body struct {
			Products   []json.RawMessage `json:"products"`
			NextOffset *int              `json:"nextOffset"`
		}
		if err := json.Unmarshal(resp.Body, &body); err != nil {
			return count, fmt.Errorf("parse products response: %w", err)
		}

		for _, raw := range body.Products {
			var pData map[string]interface{}
			if err := json.Unmarshal(raw, &pData); err != nil {
				continue
			}
			product, err := s.upsertProductFromRaw(ctx, cityCode, pData)
			if err != nil {
				logger.Warnf("Upsert product failed (city=%s): %v", cityCode, err)
				continue
			}
			count++
			select {
			case productCh <- *product:
			case <-ctx.Done():
				return count, ctx.Err()
			}
		}

		if body.NextOffset == nil || *body.NextOffset <= offset || len(body.Products) == 0 {
			break
		}
		offset = *body.NextOffset
	}

	return count, nil
}

// fetchVariants calls /v2/products/{id}/ and returns the variant list.
func (s *Service) fetchVariants(ctx context.Context, headoutID string) ([]VariantData, error) {
	if err := s.rateLimiter.Wait(ctx); err != nil {
		return nil, err
	}
	path := fmt.Sprintf("/v2/products/%s/", url.PathEscape(headoutID))
	resp, err := s.headoutProxy.Get(ctx, path, nil, true)
	if err != nil {
		return nil, err
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, fmt.Errorf("headout status %d for product %s", resp.StatusCode, headoutID)
	}
	var pData map[string]interface{}
	if err := json.Unmarshal(resp.Body, &pData); err != nil {
		return nil, err
	}

	// Update product metadata with full detail response
	productData, _ := ExtractProductData(pData)
	if productData != nil {
		_ = s.upsertProduct(ctx, productData)
	}

	var variants []VariantData
	if vArr, ok := pData["variants"].([]interface{}); ok {
		for _, v := range vArr {
			if vm, ok := v.(map[string]interface{}); ok {
				vid := ExtractString(vm, "id")
				if vid == "" {
					continue
				}
				vtitle := ExtractString(vm, "title", "name")
				variants = append(variants, VariantData{ID: vid, Title: vtitle})
			}
		}
	}
	return variants, nil
}

// fetchAndStoreAvailability fetches the full windowed inventory calendar for one variant.
// Uses /v2/inventory/list-by/tour/ which returns items with id (inventoryId), startDateTime,
// and per-person pricing — required for DB-first booking.
func (s *Service) fetchAndStoreAvailability(ctx context.Context, product models.Product, variantID, variantTitle string) (int, error) {
	today := time.Now().UTC().Truncate(24 * time.Hour)
	sevenDaysLater := today.Add(sevenDays)
	horizon := today.AddDate(0, 0, maxCalendarDays)

	windowStart := today
	storedTotal := 0
	hasNearTermSlot := false

	for windowStart.Before(horizon) {
		if ctx.Err() != nil {
			return storedTotal, ctx.Err()
		}

		windowEnd := windowStart.AddDate(0, 0, availWindowDays-1)
		if windowEnd.After(horizon) {
			windowEnd = horizon
		}

		windowHasSlots := false
		offset := 0

		for {
			if ctx.Err() != nil {
				return storedTotal, ctx.Err()
			}
			if err := s.rateLimiter.Wait(ctx); err != nil {
				return storedTotal, err
			}

			q := url.Values{}
			q.Set("tourId", variantID)
			q.Set("startDateTime", windowStart.Format("2006-01-02")+"T00:00")
			q.Set("endDateTime", windowEnd.Format("2006-01-02")+"T23:59")
			q.Set("currencyCode", "USD")
			q.Set("offset", fmt.Sprintf("%d", offset))
			q.Set("limit", "200")

			resp, err := s.headoutProxy.Get(ctx, "/v2/inventory/list-by/tour/", q, true)
			if err != nil {
				logger.Warnf("Inventory fetch failed product=%s variant=%s window=%s: %v",
					product.HeadoutID, variantID, windowStart.Format("2006-01-02"), err)
				break
			}

			items, nextOffset := parseInventoryResponse(resp.Body)
			if len(items) == 0 {
				break
			}

			windowHasSlots = true
			for _, rawItem := range items {
				var slotData map[string]interface{}
				if err := json.Unmarshal(rawItem, &slotData); err != nil {
					continue
				}

				slotDate := ExtractString(slotData, "date")
				if slotDate == "" {
					if startDT := ExtractString(slotData, "startDateTime"); len(startDT) >= 10 {
						slotDate = startDT[:10]
					}
				}
				if slotDate == "" || slotDate < today.Format("2006-01-02") {
					continue
				}

				if t, err := time.Parse("2006-01-02", slotDate); err == nil && t.Before(sevenDaysLater) {
					hasNearTermSlot = true
				}

				if s.storeAvailabilitySlot(ctx, product, variantID, variantTitle, slotData) {
					storedTotal++
				}
			}

			if nextOffset == nil {
				break
			}
			offset = *nextOffset
		}

		if !windowHasSlots {
			break
		}

		windowStart = windowEnd.AddDate(0, 0, 1)
	}

	now := time.Now()
	s.db.WithContext(ctx).Model(&models.Product{}).Where("id = ?", product.ID).Updates(map[string]interface{}{
		"is_available":              hasNearTermSlot,
		"last_availability_sync_at": now,
	})

	// Keep price_from aligned with the cheapest bookable slot price
	s.db.WithContext(ctx).Exec(`
		UPDATE products SET price_from = (
			SELECT MIN(price_amount) FROM product_availabilities
			WHERE product_id = ? AND remaining_capacity > 0
		) WHERE id = ? AND EXISTS (
			SELECT 1 FROM product_availabilities
			WHERE product_id = ? AND remaining_capacity > 0
		)`, product.ID, product.ID, product.ID)

	return storedTotal, nil
}

// storeAvailabilitySlot upserts a single availability slot using ON CONFLICT.
// Returns true if a row was inserted or updated.
func (s *Service) storeAvailabilitySlot(ctx context.Context, product models.Product, variantID, variantTitle string, slotData map[string]interface{}) bool {
	date := ExtractString(slotData, "date")
	if date == "" {
		if startDT := ExtractString(slotData, "startDateTime"); len(startDT) >= 10 {
			date = startDT[:10]
		}
	}
	startTime := ExtractString(slotData, "startTime", "start_time")
	if startTime == "" {
		if startDT := ExtractString(slotData, "startDateTime"); len(startDT) >= 16 {
			startTime = startDT[11:16]
		}
	}
	endTime := ExtractString(slotData, "endTime", "end_time")
	inventoryID := ExtractString(slotData, "inventoryId", "inventory_id", "id")
	inventoryType := ExtractString(slotData, "inventoryType", "inventory_type")

	// Skip slots with no real inventory ID
	if inventoryID == "" {
		return false
	}

	// Per-type pricing
	var priceAmount float64
	var priceAdult, priceChild, priceYouth, priceInfant, priceSenior *float64
	if pricing, ok := slotData["pricing"].(map[string]interface{}); ok {
		priceAmount = ExtractFloat(pricing, "amount", "price", "headoutSellingPrice", "finalPrice")
		if persons, ok := pricing["persons"].([]interface{}); ok {
			for _, p := range persons {
				if pm, ok := p.(map[string]interface{}); ok {
					ptype := ExtractString(pm, "type")
					price := ExtractFloat(pm, "price", "headoutSellingPrice", "finalPrice")
					if price == 0 {
						continue
					}
					pCopy := price
					switch ptype {
					case "ADULT":
						priceAdult = &pCopy
						if priceAmount == 0 {
							priceAmount = price
						}
					case "CHILD":
						priceChild = &pCopy
					case "YOUTH":
						priceYouth = &pCopy
					case "INFANT":
						priceInfant = &pCopy
					case "SENIOR":
						priceSenior = &pCopy
					}
				}
			}
		}
	}

	slotCurrency := product.Currency
	if pricing, ok := slotData["pricing"].(map[string]interface{}); ok {
		if c := ExtractString(pricing, "currency", "currencyCode"); c != "" {
			slotCurrency = c
		}
	}

	availableSlots := int(ExtractFloat(slotData, "availableSlots", "available_slots", "available", "remainingInventory", "remaining", "seatsAvailable"))
	if availableSlots == 0 {
		switch ExtractString(slotData, "availability", "status") {
		case "UNLIMITED":
			availableSlots = 999
		case "LIMITED":
			availableSlots = 1
		}
	}

	rawJSON, _ := json.Marshal(slotData)

	avail := models.ProductAvailability{
		ProductID:         product.ID,
		HeadoutProductID:  product.HeadoutID,
		VariantID:         variantID,
		VariantTitle:      variantTitle,
		Date:              date,
		StartTime:         startTime,
		EndTime:           endTime,
		InventoryID:       inventoryID,
		InventoryType:     inventoryType,
		PriceAmount:       priceAmount,
		PriceAdult:        priceAdult,
		PriceChild:        priceChild,
		PriceYouth:        priceYouth,
		PriceInfant:       priceInfant,
		PriceSenior:       priceSenior,
		Currency:          slotCurrency,
		TotalCapacity:     300,
		RemainingCapacity: 300, // set to full on first insert; ON CONFLICT clause never overwrites this
		AvailableSlots:    availableSlots,
		RawHeadoutData:    rawJSON,
	}

	result := s.db.WithContext(ctx).Clauses(clause.OnConflict{
		Columns: []clause.Column{
			{Name: "variant_id"},
			{Name: "date"},
			{Name: "start_time"},
		},
		DoUpdates: clause.Assignments(map[string]interface{}{
			"inventory_id":     inventoryID,
			"inventory_type":   inventoryType,
			"price_amount":     priceAmount,
			"price_adult":      priceAdult,
			"price_child":      priceChild,
			"price_youth":      priceYouth,
			"price_infant":     priceInfant,
			"price_senior":     priceSenior,
			"currency":         slotCurrency,
			"available_slots":  availableSlots,
			"end_time":         endTime,
			"raw_headout_data": rawJSON,
			// total_capacity stays 300 on re-sync
			// remaining_capacity NOT touched — preserves real booking state
			"updated_at": time.Now(),
		}),
	}).Create(&avail)

	if result.Error != nil {
		logger.Warnf("storeAvailabilitySlot failed (product=%s variant=%s date=%s start=%s): %v",
			product.HeadoutID, variantID, date, startTime, result.Error)
		return false
	}
	return true
}

// upsertProductFromRaw upserts a product from a raw Headout API response map.
func (s *Service) upsertProductFromRaw(ctx context.Context, cityCode string, pData map[string]interface{}) (*models.Product, error) {
	data, err := ExtractProductData(pData)
	if err != nil {
		return nil, err
	}
	if data.CityCode == "" {
		data.CityCode = cityCode
	}
	if err := s.upsertProduct(ctx, data); err != nil {
		return nil, err
	}
	var p models.Product
	if err := s.db.WithContext(ctx).Where("headout_id = ?", data.HeadoutID).First(&p).Error; err != nil {
		return nil, err
	}
	return &p, nil
}

func (s *Service) upsertProduct(ctx context.Context, data *ProductData) error {
	var existing models.Product
	err := s.db.WithContext(ctx).Where("headout_id = ?", data.HeadoutID).First(&existing).Error
	now := time.Now()

	if err == gorm.ErrRecordNotFound {
		product := models.Product{
			HeadoutID:        data.HeadoutID,
			Title:            data.Title,
			Description:      data.Description,
			CityCode:         data.CityCode,
			CityName:         data.CityName,
			Category:         data.Category,
			ImageURL:         data.ImageURL,
			Currency:         data.Currency,
			PriceFrom:        data.PriceFrom,
			Rating:           data.Rating,
			ReviewCount:      data.ReviewCount,
			Duration:         data.Duration,
			RawHeadoutData:   data.RawJSON,
			LastSyncedAt:     now,
			MetadataSyncedAt: &now,
		}
		return s.db.WithContext(ctx).Create(&product).Error
	}
	if err != nil {
		return err
	}

	existing.Title = data.Title
	existing.Description = data.Description
	if data.CityCode != "" {
		existing.CityCode = data.CityCode
	}
	existing.CityName = data.CityName
	existing.Category = data.Category
	existing.ImageURL = data.ImageURL
	existing.Currency = data.Currency
	existing.PriceFrom = data.PriceFrom
	existing.Rating = data.Rating
	existing.ReviewCount = data.ReviewCount
	existing.Duration = data.Duration
	existing.RawHeadoutData = data.RawJSON
	existing.LastSyncedAt = now
	existing.MetadataSyncedAt = &now
	return s.db.WithContext(ctx).Save(&existing).Error
}

// runMetadataSync fetches city → product → variant data from Headout without pulling any
// availability windows. For each variant it writes a lightweight stub row
// (date = "2000-01-01", capacity = 0) so that runSnapshotRestore can discover real
// variant IDs even when no live availability has ever been synced.
func (s *Service) runMetadataSync(jobID string) {
	defer func() {
		if r := recover(); r != nil {
			logger.Errorf("Recovered from panic in metadata sync: %v", r)
		}
	}()

	ctx, cancel := context.WithTimeout(context.Background(), SyncJobTimeout)
	s.activeJobsMu.Lock()
	s.activeJobs[jobID] = cancel
	s.activeJobsMu.Unlock()
	defer func() {
		s.activeJobsMu.Lock()
		delete(s.activeJobs, jobID)
		s.activeJobsMu.Unlock()
		cancel()
	}()

	if err := s.jobService.StartJob(ctx, jobID); err != nil {
		logger.Errorf("Failed to start metadata sync job %s: %v", jobID, err)
		return
	}

	// Tier 1: discover cities and upsert all products.
	cityCodes, err := s.discoverCities(ctx)
	if err != nil {
		logger.Errorf("Metadata sync %s: city discovery failed: %v", jobID, err)
		_ = s.jobService.FailJob(ctx, jobID, err.Error())
		return
	}

	// Collect products via a buffered channel drained in a goroutine.
	productCh := make(chan models.Product, 500)
	var collectMu stdsync.Mutex
	var collectedProducts []models.Product
	var collectWg stdsync.WaitGroup
	collectWg.Add(1)
	go func() {
		defer collectWg.Done()
		for p := range productCh {
			collectMu.Lock()
			collectedProducts = append(collectedProducts, p)
			collectMu.Unlock()
		}
	}()

	totalDiscovered := 0
	for _, code := range cityCodes {
		if ctx.Err() != nil {
			break
		}
		count, err := s.discoverProductsForCity(ctx, code, productCh, jobID)
		if err != nil {
			logger.Warnf("Metadata sync: product discovery failed for city %s: %v", code, err)
			continue
		}
		totalDiscovered += count
		s.db.Model(&models.SyncJob{}).Where("job_id = ?", jobID).Updates(map[string]interface{}{
			"total_products":      totalDiscovered,
			"products_discovered": totalDiscovered,
			"updated_at":          time.Now(),
		})
	}
	close(productCh)
	collectWg.Wait()

	// Tier 2: fetch full product detail + variant stubs — snapshotWorkers in parallel.
	var processed, successful, failed atomic.Int64

	varWorkCh := make(chan models.Product, 200)
	var tier2Wg stdsync.WaitGroup
	tier2Wg.Add(snapshotWorkers)
	for w := 0; w < snapshotWorkers; w++ {
		go func() {
			defer tier2Wg.Done()
			for product := range varWorkCh {
				if ctx.Err() != nil {
					return
				}

				variants, err := s.fetchVariants(ctx, product.HeadoutID)
				if err != nil {
					logger.Warnf("Metadata sync: variant fetch failed for %s: %v", product.HeadoutID, err)
					failed.Add(1)
					processed.Add(1)
					continue
				}

				// Re-read the product to pick up price_from updated by fetchVariants.
				var fresh models.Product
				if s.db.WithContext(ctx).Where("id = ?", product.ID).First(&fresh).Error == nil {
					product = fresh
				}

				for _, v := range variants {
					s.upsertVariantStub(ctx, product, v.ID, v.Title)
				}

				successful.Add(1)
				p := processed.Add(1)
				if p%100 == 0 {
					s.db.Model(&models.SyncJob{}).Where("job_id = ?", jobID).Updates(map[string]interface{}{
						"processed_products":  p,
						"successful_products": successful.Load(),
						"failed_products":     failed.Load(),
						"updated_at":          time.Now(),
					})
				}
			}
		}()
	}

	for _, product := range collectedProducts {
		if ctx.Err() != nil {
			break
		}
		varWorkCh <- product
	}
	close(varWorkCh)
	tier2Wg.Wait()

	now := time.Now()
	s.db.Model(&models.SyncJob{}).Where("job_id = ?", jobID).Updates(map[string]interface{}{
		"status":              models.SyncJobCompleted,
		"processed_products":  processed.Load(),
		"successful_products": successful.Load(),
		"failed_products":     failed.Load(),
		"products_discovered": int64(totalDiscovered),
		"completed_at":        now,
		"updated_at":          now,
	})

	logger.Infof("Metadata sync %s complete: %d products upserted, %d failed",
		jobID, processed.Load(), failed.Load())
}

// upsertVariantStub writes a placeholder availability row (date "2000-01-01", capacity 0)
// so that runSnapshotRestore can discover real variant IDs and base pricing without a live
// availability window having been synced first. ON CONFLICT only updates the title and
// currency; it never touches price_amount if a real availability row already exists
// (those have dates >= today and will win in the DISTINCT ON ordering).
func (s *Service) upsertVariantStub(ctx context.Context, product models.Product, variantID, variantTitle string) {
	currency := product.Currency
	if currency == "" {
		currency = "USD"
	}
	avail := models.ProductAvailability{
		ProductID:         product.ID,
		HeadoutProductID:  product.HeadoutID,
		VariantID:         variantID,
		VariantTitle:      variantTitle,
		Date:              "2000-01-01",
		StartTime:         "09:00",
		InventoryID:       fmt.Sprintf("stub-%s", variantID),
		InventoryType:     "VARIANT_STUB",
		PriceAmount:       product.PriceFrom,
		Currency:          currency,
		TotalCapacity:     0,
		RemainingCapacity: 0,
		AvailableSlots:    0,
		RawHeadoutData:    []byte(`{}`),
	}
	result := s.db.WithContext(ctx).Clauses(clause.OnConflict{
		Columns: []clause.Column{{Name: "variant_id"}, {Name: "date"}, {Name: "start_time"}},
		DoUpdates: clause.Assignments(map[string]interface{}{
			"variant_title": variantTitle,
			"price_amount":  product.PriceFrom,
			"currency":      currency,
			"updated_at":    time.Now(),
		}),
	}).Create(&avail)
	if result.Error != nil {
		logger.Warnf("upsertVariantStub failed product=%s variant=%s: %v",
			product.HeadoutID, variantID, result.Error)
	}
}

// parseInventoryResponse parses the /v2/inventory/list-by/tour/ response.
// Returns the items array and the nextOffset for pagination (nil = last page).
func parseInventoryResponse(body []byte) ([]json.RawMessage, *int) {
	var resp struct {
		Items      []json.RawMessage `json:"items"`
		NextOffset *int              `json:"nextOffset"`
	}
	if err := json.Unmarshal(body, &resp); err != nil {
		return nil, nil
	}
	return resp.Items, resp.NextOffset
}

// parseAvailabilityResponse handles multiple Headout API response formats.
func parseAvailabilityResponse(body []byte) []json.RawMessage {
	var altBody struct {
		Availabilities []json.RawMessage `json:"availabilities"`
		Slots          []json.RawMessage `json:"slots"`
		Items          []json.RawMessage `json:"items"`
		Data           *struct {
			Availabilities []json.RawMessage `json:"availabilities"`
		} `json:"data"`
	}
	var result []json.RawMessage
	if err := json.Unmarshal(body, &altBody); err == nil {
		result = append(result, altBody.Availabilities...)
		result = append(result, altBody.Slots...)
		result = append(result, altBody.Items...)
		if altBody.Data != nil {
			result = append(result, altBody.Data.Availabilities...)
		}
		return result
	}
	var genericBody map[string]interface{}
	if err := json.Unmarshal(body, &genericBody); err == nil {
		result = append(result, ExtractRawMessages(genericBody, "availabilities", "slots", "items")...)
		if data, ok := genericBody["data"].(map[string]interface{}); ok {
			result = append(result, ExtractRawMessages(data, "availabilities", "slots", "items")...)
		}
	}
	return result
}
