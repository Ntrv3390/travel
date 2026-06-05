package sync

import (
	"context"
	"fmt"
	"math"
	"math/rand"
	"time"

	"github.com/travel/backend/pkg/logger"
)

// RetryConfig holds parameters for exponential backoff retry.
type RetryConfig struct {
	MaxRetries  int
	BaseDelay   time.Duration
	MaxDelay    time.Duration
	Multiplier  float64
}

// DefaultRetryConfig returns sensible defaults for Headout API retries.
func DefaultRetryConfig(maxRetries int, baseDelayMs int) RetryConfig {
	return RetryConfig{
		MaxRetries: maxRetries,
		BaseDelay:  time.Duration(baseDelayMs) * time.Millisecond,
		MaxDelay:   30 * time.Second,
		Multiplier: 2.0,
	}
}

// RetryableFunc is a function that may fail and should be retried.
type RetryableFunc func(ctx context.Context) error

// Retry executes fn with exponential backoff on failure.
// It respects context cancellation and stops retrying immediately
// if the context is done.
func Retry(ctx context.Context, cfg RetryConfig, operation string, fn RetryableFunc) error {
	var lastErr error

	for attempt := 0; attempt <= cfg.MaxRetries; attempt++ {
		if err := fn(ctx); err != nil {
			lastErr = err

			if attempt == cfg.MaxRetries {
				break
			}

			// Calculate delay with jitter
			delay := cfg.BaseDelay * time.Duration(math.Pow(cfg.Multiplier, float64(attempt)))
			if delay > cfg.MaxDelay {
				delay = cfg.MaxDelay
			}

			// Add jitter: ±25% of delay
			jitter := time.Duration(float64(delay) * 0.25 * (rand.Float64()*2 - 1))
			delay += jitter

			logger.Warnf("Retry %d/%d for %s: %v (next attempt in %v)", attempt+1, cfg.MaxRetries, operation, err, delay)

			select {
			case <-ctx.Done():
				return ctx.Err()
			case <-time.After(delay):
			}
		} else {
			if attempt > 0 {
				logger.Infof("Succeeded %s on attempt %d", operation, attempt+1)
			}
			return nil
		}
	}

	return fmt.Errorf("%s failed after %d retries: %w", operation, cfg.MaxRetries, lastErr)
}
