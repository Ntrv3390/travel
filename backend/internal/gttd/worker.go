package gttd

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"time"
)

// WorkerDB is the database interface needed by the worker
type WorkerDB interface {
	GetGTTDEnabledExperiences(ctx context.Context) (interface{}, error)
	GetApplicablePricingRule(ctx context.Context, experienceID string, city string) interface{}
	CreateFeedStatus(ctx context.Context, environment string) (string, error)
	UpdateFeedStatus(ctx context.Context, statusID string, status string, productCount int, errorMsg string) error
}

type Worker struct {
	generator *FeedGenerator
	uploader  *SFTPUploader
	db        WorkerDB
	env       string // "dev" or "production"
}

// NewWorker creates a new GTTD worker
func NewWorker(generator *FeedGenerator, uploader *SFTPUploader, db WorkerDB, env string) *Worker {
	return &Worker{
		generator: generator,
		uploader:  uploader,
		db:        db,
		env:       env,
	}
}

// RunFeedUpload is the main job called by the cron scheduler
// Steps: generate → upload → record status
func (w *Worker) RunFeedUpload(ctx context.Context) error {
	// Record start
	statusID, err := w.db.CreateFeedStatus(ctx, w.env)
	if err != nil {
		return fmt.Errorf("create status record: %w", err)
	}

	// Generate feed files
	filePaths, err := w.generator.GenerateFeed(ctx)
	if err != nil {
		_ = w.db.UpdateFeedStatus(ctx, statusID, StatusFailed, 0, err.Error())
		return fmt.Errorf("generate feed: %w", err)
	}

	_ = w.db.UpdateFeedStatus(ctx, statusID, StatusUploading, len(filePaths), "")

	// Upload to SFTP
	if err := w.uploader.Upload(filePaths); err != nil {
		_ = w.db.UpdateFeedStatus(ctx, statusID, StatusFailed, len(filePaths), err.Error())
		return fmt.Errorf("sftp upload: %w", err)
	}

	// Count products in feed
	productCount := 0
	for _, filePath := range filePaths {
		data, err := os.ReadFile(filePath)
		if err == nil {
			productCount += countProductsInJSON(data)
		}
	}

	_ = w.db.UpdateFeedStatus(ctx, statusID, StatusSuccess, productCount, "")

	// Cleanup local files
	cleanupFiles(filePaths)

	return nil
}

// cleanupFiles removes temporary feed files
func cleanupFiles(filePaths []string) {
	for _, path := range filePaths {
		_ = os.Remove(path)
	}
}

// countProductsInJSON counts the number of products in a feed JSON file
func countProductsInJSON(data []byte) int {
	var feed struct {
		Products []json.RawMessage `json:"products"`
	}
	if err := json.Unmarshal(data, &feed); err != nil {
		return 0
	}
	return len(feed.Products)
}

// TriggerUploadJob manually triggers a feed upload (for testing/ops)
func (w *Worker) TriggerUploadJob(ctx context.Context) error {
	ctx, cancel := context.WithTimeout(ctx, 15*time.Minute)
	defer cancel()

	return w.RunFeedUpload(ctx)
}
