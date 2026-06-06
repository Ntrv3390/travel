package sync

import (
	"context"
	"encoding/json"
	"fmt"
	"net/url"
	stdsync "sync"
	"time"

	"github.com/travel/backend/internal/models"
	"github.com/travel/backend/internal/services"
	"github.com/travel/backend/pkg/config"
	"github.com/travel/backend/pkg/logger"
	"gorm.io/gorm"
)

const (
	// MetadataSyncThreshold is the duration after which metadata is considered stale.
	MetadataSyncThreshold = 24 * time.Hour
	// AvailabilitySyncThreshold is the duration after which availability is considered stale.
	AvailabilitySyncThreshold = 1 * time.Hour
)

// Service orchestrates concurrent product synchronization with the Headout API.
type Service struct {
	db             *gorm.DB
	headoutProxy   *services.HeadoutProxyService
	workerCount    int
	jobService     *JobService

	// Active jobs for cancellation
	activeJobs   map[string]context.CancelFunc
	activeJobsMu stdsync.RWMutex
}

// NewService creates a new sync service with configured worker pool.
func NewService(cfg *config.Config, db *gorm.DB, headoutProxy *services.HeadoutProxyService) *Service {
	return &Service{
		db:           db,
		headoutProxy: headoutProxy,
		workerCount:  cfg.SyncWorkerCount,
		jobService:   NewJobService(db),
		activeJobs:   make(map[string]context.CancelFunc),
	}
}

// StartMetadataSync creates a job for metadata synchronization and runs it
// asynchronously. Returns the job ID immediately.
func (s *Service) StartMetadataSync(ctx context.Context) (string, error) {
	products, err := s.loadProductsNeedingMetadataSync(ctx)
	if err != nil {
		return "", fmt.Errorf("load products: %w", err)
	}

	jobs := s.buildJobsFromProducts(products)
	jobID, err := s.jobService.CreateJob(ctx, models.SyncJobTypeMetadata, len(products), s.workerCount)
	if err != nil {
		return "", err
	}

	go s.runSyncJob(jobID, jobs, s.processMetadata)
	return jobID, nil
}

// StartAvailabilitySync creates a job for availability synchronization and runs it
// asynchronously. Returns the job ID immediately.
func (s *Service) StartAvailabilitySync(ctx context.Context) (string, error) {
	products, err := s.loadProductsNeedingAvailabilitySync(ctx)
	if err != nil {
		return "", fmt.Errorf("load products: %w", err)
	}

	jobs := s.buildJobsFromProducts(products)
	jobID, err := s.jobService.CreateJob(ctx, models.SyncJobTypeAvailability, len(products), s.workerCount)
	if err != nil {
		return "", err
	}

	go s.runSyncJob(jobID, jobs, s.processAvailability)
	return jobID, nil
}

// StartFullSync creates a job for combined metadata + availability sync and runs it
// asynchronously. Returns the job ID immediately.
func (s *Service) StartFullSync(ctx context.Context) (string, error) {
	products, err := s.loadAllProducts(ctx)
	if err != nil {
		return "", fmt.Errorf("load products: %w", err)
	}

	jobs := s.buildJobsFromProducts(products)
	jobID, err := s.jobService.CreateJob(ctx, models.SyncJobTypeFull, len(products), s.workerCount)
	if err != nil {
		return "", err
	}

	go s.runSyncJob(jobID, jobs, s.processFullProduct)
	return jobID, nil
}

// CancelJob stops a running sync job gracefully.
func (s *Service) CancelJob(jobID string) error {
	s.activeJobsMu.RLock()
	cancel, exists := s.activeJobs[jobID]
	s.activeJobsMu.RUnlock()

	if !exists {
		return fmt.Errorf("no active job found with ID %s", jobID)
	}

	cancel()

	if err := s.jobService.CancelJob(context.Background(), jobID); err != nil {
		logger.Warnf("Failed to mark job %s as cancelled: %v", jobID, err)
	}

	return nil
}

// GetJobStatus returns the current status of a sync job.
func (s *Service) GetJobStatus(ctx context.Context, jobID string) (*models.SyncJob, error) {
	return s.jobService.GetJob(ctx, jobID)
}

// GetSyncProgress returns the progress percentage for a job.
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

// GetFailedProducts returns products that failed during a sync job.
func (s *Service) GetFailedProducts(ctx context.Context, jobID string) ([]models.SyncJobFailedProduct, error) {
	return s.jobService.GetFailedProducts(ctx, jobID)
}

// ListRecentJobs returns the most recent sync jobs.
func (s *Service) ListRecentJobs(ctx context.Context, limit int) ([]models.SyncJob, error) {
	return s.jobService.ListRecentJobs(ctx, limit)
}

// GetMetrics returns aggregate processing metrics for a job.
func (s *Service) GetMetrics(ctx context.Context, jobID string) (map[string]interface{}, error) {
	job, err := s.jobService.GetJob(ctx, jobID)
	if err != nil {
		return nil, err
	}

	metrics := map[string]interface{}{
		"job_id":             job.JobID,
		"status":             job.Status,
		"type":               job.Type,
		"total_products":     job.TotalProducts,
		"processed_products": job.ProcessedProducts,
		"successful_products": job.SuccessfulProducts,
		"failed_products":    job.FailedProducts,
		"worker_count":       job.WorkerCount,
		"progress_pct":       0.0,
		"throughput":         0.0,
	}

	if job.TotalProducts > 0 {
		metrics["progress_pct"] = float64(job.ProcessedProducts) / float64(job.TotalProducts) * 100
	}

	if job.StartedAt != nil && job.ProcessedProducts > 0 {
		elapsed := time.Since(*job.StartedAt).Seconds()
		if elapsed > 0 {
			metrics["throughput"] = float64(job.ProcessedProducts) / elapsed
		}
	}

	if job.StartedAt != nil && job.CompletedAt != nil {
		metrics["duration_seconds"] = job.CompletedAt.Sub(*job.StartedAt).Seconds()
	}

	return metrics, nil
}

// --- Internal methods ---

func (s *Service) runSyncJob(jobID string, jobs []Job, handler func(ctx context.Context, job Job) error) {
	ctx, cancel := context.WithCancel(context.Background())

	s.activeJobsMu.Lock()
	s.activeJobs[jobID] = cancel
	s.activeJobsMu.Unlock()

	defer func() {
		s.activeJobsMu.Lock()
		delete(s.activeJobs, jobID)
		s.activeJobsMu.Unlock()
	}()

	if err := s.jobService.StartJob(ctx, jobID); err != nil {
		logger.Errorf("Failed to start job %s: %v", jobID, err)
		return
	}

	pool := NewWorkerPool(s.workerCount, handler)
	result := pool.Run(ctx, jobs)

	if ctx.Err() != nil {
		// Job was cancelled
		logger.Infof("Job %s was cancelled after processing %d/%d products", jobID, result.Processed, result.Total)
		return
	}

	if err := s.jobService.CompleteJob(ctx, jobID, result); err != nil {
		logger.Errorf("Failed to complete job %s: %v", jobID, err)
	}

	if len(result.FailedProducts) > 0 {
		if err := s.jobService.RecordFailedProducts(ctx, jobID, result.FailedProducts); err != nil {
			logger.Warnf("Failed to record failed products for job %s: %v", jobID, err)
		}
	}

	logger.Infof("Job %s completed: %d/%d successful, %d failed in %v",
		jobID, result.Successful, result.Total, result.Failed, result.Duration.Round(time.Second))
}

func (s *Service) processMetadata(ctx context.Context, job Job) error {
	path := fmt.Sprintf("/v2/products/%s/", url.PathEscape(job.HeadoutID))
	resp, err := s.headoutProxy.Get(ctx, path, nil, true)
	if err != nil {
		return fmt.Errorf("fetch product %s: %w", job.HeadoutID, err)
	}

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return fmt.Errorf("headout returned status %d for product %s", resp.StatusCode, job.HeadoutID)
	}

	var pData map[string]interface{}
	if err := json.Unmarshal(resp.Body, &pData); err != nil {
		return fmt.Errorf("parse response for %s: %w", job.HeadoutID, err)
	}

	productData, err := ExtractProductData(pData)
	if err != nil {
		return fmt.Errorf("extract data for %s: %w", job.HeadoutID, err)
	}

	return s.upsertProduct(ctx, productData)
}

func (s *Service) processAvailability(ctx context.Context, job Job) error {
	path := fmt.Sprintf("/v2/products/%s/", url.PathEscape(job.HeadoutID))
	resp, err := s.headoutProxy.Get(ctx, path, nil, true)
	if err != nil {
		return fmt.Errorf("fetch product %s: %w", job.HeadoutID, err)
	}

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return fmt.Errorf("headout returned status %d for product %s", resp.StatusCode, job.HeadoutID)
	}

	var pData map[string]interface{}
	if err := json.Unmarshal(resp.Body, &pData); err != nil {
		return fmt.Errorf("parse response for %s: %w", job.HeadoutID, err)
	}

	return s.syncProductAvailabilities(ctx, job, pData)
}

func (s *Service) processFullProduct(ctx context.Context, job Job) error {
	// Full sync: metadata + availability in one pass
	if err := s.processMetadata(ctx, job); err != nil {
		return err
	}
	return s.processAvailability(ctx, job)
}

func (s *Service) syncProductAvailabilities(ctx context.Context, job Job, pData map[string]interface{}) error {
	headoutID := ExtractString(pData, "id")
	if headoutID == "" {
		return fmt.Errorf("no id in product data")
	}

	variants, _ := pData["variants"].([]interface{})
	if len(variants) == 0 {
		return nil
	}

	// Find the local product
	var product models.Product
	if err := s.db.WithContext(ctx).Where("headout_id = ?", headoutID).First(&product).Error; err != nil {
		return fmt.Errorf("find local product %s: %w", headoutID, err)
	}

	startDate := time.Now().UTC().Format("2006-01-02")
	endDate := time.Now().UTC().AddDate(0, 0, 30).Format("2006-01-02")

	productAvailable := false

	for _, v := range variants {
		variant, ok := v.(map[string]interface{})
		if !ok {
			continue
		}

		variantID := ExtractString(variant, "id")
		if variantID == "" {
			continue
		}

		variantTitle := ExtractString(variant, "title")
		if variantTitle == "" {
			variantTitle = ExtractString(variant, "name")
		}

		availPath := fmt.Sprintf("/v2/products/%s/variants/%s/availabilities/", url.PathEscape(headoutID), url.PathEscape(variantID))
		availResp, err := s.headoutProxy.Get(ctx, availPath, nil, true)
		if err != nil {
			logger.Warnf("Failed to fetch availabilities for variant %s: %v", variantID, err)
			continue
		}

		availabilities := parseAvailabilityResponse(availResp.Body)

		for _, rawSlot := range availabilities {
			var slotData map[string]interface{}
			if err := json.Unmarshal(rawSlot, &slotData); err != nil {
				continue
			}

			slotDate := ExtractString(slotData, "date")
			if slotDate == "" {
				startDT := ExtractString(slotData, "startDateTime", "start_time")
				if len(startDT) >= 10 {
					slotDate = startDT[:10]
				}
			}
			if slotDate == "" {
				continue
			}

			if slotDate >= startDate && slotDate <= endDate {
				availableSlots := int(ExtractFloat(slotData, "availableSlots", "available_slots", "available", "remainingInventory", "remaining", "seatsAvailable", "availableCapacity"))
				availStatus := ExtractString(slotData, "availability", "status")

				if availableSlots > 0 || (availStatus != "CLOSED" && availStatus != "SOLD_OUT" && availStatus != "UNAVAILABLE") {
					productAvailable = true
					s.upsertAvailabilityRecord(ctx, product, variantID, variantTitle, slotData)
				}
			}
		}
	}

	now := time.Now()
	if err := s.db.WithContext(ctx).Model(&models.Product{}).Where("id = ?", product.ID).Updates(map[string]interface{}{
		"is_available":               productAvailable,
		"last_availability_sync_at": now,
	}).Error; err != nil {
		return fmt.Errorf("update product availability %s: %w", headoutID, err)
	}

	return nil
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
	existing.CityCode = data.CityCode
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

func (s *Service) upsertAvailabilityRecord(ctx context.Context, product models.Product, variantID, variantTitle string, slotData map[string]interface{}) {
	date := ExtractString(slotData, "date")
	startTime := ExtractString(slotData, "startTime", "start_time")
	if startTime == "" {
		startDT := ExtractString(slotData, "startDateTime")
		if len(startDT) >= 16 {
			startTime = startDT[11:16]
		}
	}
	endTime := ExtractString(slotData, "endTime", "end_time")
	inventoryID := ExtractString(slotData, "inventoryId", "inventory_id")
	inventoryType := ExtractString(slotData, "inventoryType", "inventory_type")

	var priceAmount float64
	if pricing, ok := slotData["pricing"].(map[string]interface{}); ok {
		priceAmount = ExtractFloat(pricing, "amount", "price", "headoutSellingPrice", "netPrice")
	}

	slotCurrency := product.Currency
	if pricing, ok := slotData["pricing"].(map[string]interface{}); ok {
		if c := ExtractString(pricing, "currency", "currencyCode"); c != "" {
			slotCurrency = c
		}
	}

	availableSlots := int(ExtractFloat(slotData, "availableSlots", "available_slots", "available", "remainingInventory", "remaining", "seatsAvailable"))
	if availableSlots == 0 {
		availStatus := ExtractString(slotData, "availability", "status")
		switch availStatus {
		case "UNLIMITED":
			availableSlots = 999
		case "LIMITED":
			availableSlots = 1
		}
	}

	availRawJSON, _ := json.Marshal(slotData)

	var existing models.ProductAvailability
	availErr := s.db.WithContext(ctx).Where("product_id = ? AND variant_id = ? AND date = ? AND start_time = ?",
		product.ID, variantID, date, startTime).First(&existing).Error

	if availErr == gorm.ErrRecordNotFound {
		avail := models.ProductAvailability{
			ProductID:        product.ID,
			HeadoutProductID: product.HeadoutID,
			VariantID:        variantID,
			VariantTitle:     variantTitle,
			Date:             date,
			StartTime:        startTime,
			EndTime:          endTime,
			InventoryID:      inventoryID,
			InventoryType:    inventoryType,
			PriceAmount:      priceAmount,
			Currency:         slotCurrency,
			AvailableSlots:   availableSlots,
			RawHeadoutData:   availRawJSON,
		}
		s.db.WithContext(ctx).Create(&avail)
	} else if availErr == nil {
		existing.HeadoutProductID = product.HeadoutID
		existing.VariantTitle = variantTitle
		existing.EndTime = endTime
		existing.InventoryID = inventoryID
		existing.InventoryType = inventoryType
		existing.PriceAmount = priceAmount
		existing.Currency = slotCurrency
		existing.AvailableSlots = availableSlots
		existing.RawHeadoutData = availRawJSON
		s.db.WithContext(ctx).Save(&existing)
	}
}

// --- Product loading helpers ---

func (s *Service) loadProductsNeedingMetadataSync(ctx context.Context) ([]models.Product, error) {
	var products []models.Product
	cutoff := time.Now().Add(-MetadataSyncThreshold)

	err := s.db.WithContext(ctx).
		Where("metadata_synced_at IS NULL OR metadata_synced_at < ?", cutoff).
		Find(&products).Error
	if err != nil {
		return nil, err
	}

	logger.Infof("Found %d products needing metadata sync (threshold: %v)", len(products), MetadataSyncThreshold)
	return products, nil
}

func (s *Service) loadProductsNeedingAvailabilitySync(ctx context.Context) ([]models.Product, error) {
	var products []models.Product
	cutoff := time.Now().Add(-AvailabilitySyncThreshold)

	err := s.db.WithContext(ctx).
		Where("last_availability_sync_at IS NULL OR last_availability_sync_at < ?", cutoff).
		Find(&products).Error
	if err != nil {
		return nil, err
	}

	logger.Infof("Found %d products needing availability sync (threshold: %v)", len(products), AvailabilitySyncThreshold)
	return products, nil
}

func (s *Service) loadAllProducts(ctx context.Context) ([]models.Product, error) {
	var products []models.Product
	if err := s.db.WithContext(ctx).Find(&products).Error; err != nil {
		return nil, err
	}
	return products, nil
}

func (s *Service) buildJobsFromProducts(products []models.Product) []Job {
	jobs := make([]Job, 0, len(products))
	for _, p := range products {
		jobs = append(jobs, Job{
			ProductID:   p.ID,
			HeadoutID:   p.HeadoutID,
			ProductName: p.Title,
		})
	}
	return jobs
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
