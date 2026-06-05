package sync

import (
	"context"
	"fmt"
	stdsync "sync"
	"sync/atomic"
	"time"

	"github.com/travel/backend/pkg/logger"
)

// Job represents a unit of work to be processed by a worker.
type Job struct {
	ProductID   uint
	HeadoutID   string
	ProductName string
}

// WorkerPool manages a pool of concurrent workers processing jobs from a channel.
type WorkerPool struct {
	workerCount int
	jobs        chan Job
	handler     func(ctx context.Context, job Job) error

	// Metrics
	processed   atomic.Int64
	successful  atomic.Int64
	failed      atomic.Int64
	failedJobs  []FailedProduct
	failedMu    stdsync.Mutex

	wg     stdsync.WaitGroup
	cancel context.CancelFunc
}

// FailedProduct tracks a product that failed processing.
type FailedProduct struct {
	ProductID   uint
	HeadoutID   string
	ProductName string
	Error       string
	FailureType string
}

// PoolResult holds the final result after all workers complete.
type PoolResult struct {
	Total           int
	Processed       int
	Successful      int
	Failed          int
	FailedProducts  []FailedProduct
	Duration        time.Duration
}

// NewWorkerPool creates a new worker pool with the given handler function.
func NewWorkerPool(workerCount int, handler func(ctx context.Context, job Job) error) *WorkerPool {
	if workerCount < 1 {
		workerCount = 1
	}
	return &WorkerPool{
		workerCount: workerCount,
		handler:     handler,
	}
}

// Run starts the worker pool, processes all jobs, and returns the result.
// It respects context cancellation for graceful shutdown.
func (wp *WorkerPool) Run(ctx context.Context, jobs []Job) *PoolResult {
	start := time.Now()
	ctx, wp.cancel = context.WithCancel(ctx)

	wp.jobs = make(chan Job, len(jobs))
	wp.failedJobs = nil

	// Load jobs into the channel
	for _, job := range jobs {
		wp.jobs <- job
	}
	close(wp.jobs)

	logger.Infof("Starting worker pool: %d workers, %d jobs", wp.workerCount, len(jobs))

	// Start workers
	wp.wg.Add(wp.workerCount)
	for i := 0; i < wp.workerCount; i++ {
		go wp.worker(ctx, i)
	}

	// Wait for all workers to finish
	wp.wg.Wait()

	result := &PoolResult{
		Total:          len(jobs),
		Processed:      int(wp.processed.Load()),
		Successful:     int(wp.successful.Load()),
		Failed:         int(wp.failed.Load()),
		FailedProducts: wp.getFailedProducts(),
		Duration:       time.Since(start),
	}

	logger.Infof("Worker pool complete: %d/%d processed, %d successful, %d failed in %v",
		result.Processed, result.Total, result.Successful, result.Failed, result.Duration.Round(time.Second))

	return result
}

// Stop signals all workers to stop processing and waits for them to finish.
func (wp *WorkerPool) Stop() {
	if wp.cancel != nil {
		wp.cancel()
	}
}

// worker is the main loop for each worker goroutine.
func (wp *WorkerPool) worker(ctx context.Context, id int) {
	defer wp.wg.Done()

	for job := range wp.jobs {
		// Check for cancellation before processing each job
		select {
		case <-ctx.Done():
			logger.Infof("Worker %d: context cancelled, stopping", id)
			return
		default:
		}

		if err := wp.handler(ctx, job); err != nil {
			wp.failed.Add(1)
			wp.addFailedProduct(FailedProduct{
				ProductID:   job.ProductID,
				HeadoutID:   job.HeadoutID,
				ProductName: job.ProductName,
				Error:       err.Error(),
				FailureType: classifyError(err),
			})
			logger.Warnf("Worker %d: failed to process product %s: %v", id, job.HeadoutID, err)
		} else {
			wp.successful.Add(1)
		}

		wp.processed.Add(1)
	}
}

func (wp *WorkerPool) addFailedProduct(fp FailedProduct) {
	wp.failedMu.Lock()
	defer wp.failedMu.Unlock()
	wp.failedJobs = append(wp.failedJobs, fp)
}

func (wp *WorkerPool) getFailedProducts() []FailedProduct {
	wp.failedMu.Lock()
	defer wp.failedMu.Unlock()
	result := make([]FailedProduct, len(wp.failedJobs))
	copy(result, wp.failedJobs)
	return result
}

// classifyError determines the failure type based on the error message.
func classifyError(err error) string {
	errMsg := err.Error()
	switch {
	case contains(errMsg, "timeout"):
		return "timeout"
	case contains(errMsg, "connection"):
		return "connection"
	case contains(errMsg, "429"):
		return "rate_limit"
	case contains(errMsg, "500") || contains(errMsg, "502") || contains(errMsg, "503"):
		return "server_error"
	case contains(errMsg, "404"):
		return "not_found"
	default:
		return "unknown"
	}
}

func contains(s, substr string) bool {
	return len(s) >= len(substr) && (s == substr || len(s) > 0 && containsSubstring(s, substr))
}

func containsSubstring(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}

// Progress represents current sync progress for a job.
type Progress struct {
	Total      int64
	Processed  int64
	Successful int64
	Failed     int64
}

// ProgressPercent returns the sync progress as a percentage.
func (p *Progress) ProgressPercent() float64 {
	if p.Total == 0 {
		return 0
	}
	return float64(p.Processed) / float64(p.Total) * 100
}

// GetProgress returns current pool progress (safe for concurrent use).
func (wp *WorkerPool) GetProgress(total int) *Progress {
	return &Progress{
		Total:      int64(total),
		Processed:  wp.processed.Load(),
		Successful: wp.successful.Load(),
		Failed:     wp.failed.Load(),
	}
}

// IsRunning reports whether the pool is still processing jobs.
func (wp *WorkerPool) IsRunning() bool {
	return wp.processed.Load() < int64(cap(wp.jobs))
}

// WorkerCount returns the configured number of workers.
func (wp *WorkerPool) WorkerCount() int {
	return wp.workerCount
}

// ProgressTracker provides real-time progress updates for a running sync job.
type ProgressTracker struct {
	pool      *WorkerPool
	total     int
	startTime time.Time
}

// NewProgressTracker creates a tracker for the given pool.
func NewProgressTracker(pool *WorkerPool, total int) *ProgressTracker {
	return &ProgressTracker{
		pool:      pool,
		total:     total,
		startTime: time.Now(),
	}
}

// GetProgress returns the current progress snapshot.
func (pt *ProgressTracker) GetProgress() *Progress {
	return pt.pool.GetProgress(pt.total)
}

// ETA returns an estimated time remaining based on current throughput.
func (pt *ProgressTracker) ETA() time.Duration {
	processed := pt.pool.processed.Load()
	if processed == 0 {
		return 0
	}
	elapsed := time.Since(pt.startTime)
	rate := float64(processed) / elapsed.Seconds()
	remaining := float64(int64(pt.total) - processed) / rate
	return time.Duration(remaining * float64(time.Second))
}

// FormatProgress returns a human-readable progress string.
func (pt *ProgressTracker) FormatProgress() string {
	p := pt.GetProgress()
	return fmt.Sprintf("%.1f%% (%d/%d) - ETA: %v",
		p.ProgressPercent(), p.Processed, pt.total, pt.ETA().Round(time.Second))
}
