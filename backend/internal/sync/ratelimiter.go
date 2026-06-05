package sync

import (
	"context"

	"golang.org/x/time/rate"
)

// RateLimiter wraps a token bucket rate limiter for Headout API calls.
// It provides a globally shared limiter that all workers consume from,
// ensuring the total request rate across all concurrent workers stays
// within the configured limit.
type RateLimiter struct {
	limiter *rate.Limiter
}

// NewRateLimiter creates a new rate limiter.
// ratePerSec: sustained requests per second.
// burst: maximum burst size (allows short spikes above the sustained rate).
func NewRateLimiter(ratePerSec float64, burst int) *RateLimiter {
	return &RateLimiter{
		limiter: rate.NewLimiter(rate.Limit(ratePerSec), burst),
	}
}

// Wait blocks until a token is available or the context is cancelled.
// Every Headout API call must call this before making the request.
func (r *RateLimiter) Wait(ctx context.Context) error {
	return r.limiter.Wait(ctx)
}

// Allow reports whether a single event may happen now.
// Useful for non-blocking checks.
func (r *RateLimiter) Allow() bool {
	return r.limiter.Allow()
}
