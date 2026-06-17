package handlers

import (
	"encoding/json"
	"fmt"
	"math"
	"net/http"
	"os"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
)

type erAPIResponse struct {
	Result          string             `json:"result"`
	ConversionRates map[string]float64 `json:"conversion_rates"`
	Rates           map[string]float64 `json:"rates"` // open.er-api.com uses this field
}

type rateSnapshot struct {
	rates     map[string]float64
	fetchedAt time.Time
}

// ExchangeRateService fetches USD-based rates and caches them for 23h.
type ExchangeRateService struct {
	apiKey string
	ttl    time.Duration
	mu     sync.RWMutex
	snap   *rateSnapshot
}

var (
	erSvcOnce sync.Once
	erSvc     *ExchangeRateService
)

// GetExchangeRateService returns the process-wide singleton.
func GetExchangeRateService() *ExchangeRateService {
	erSvcOnce.Do(func() {
		erSvc = &ExchangeRateService{
			apiKey: os.Getenv("EXCHANGE_RATE_API_KEY"),
			ttl:    23 * time.Hour,
		}
		// Best-effort pre-warm; non-fatal if it fails on startup.
		_, _ = erSvc.Rates()
	})
	return erSvc
}

// Rates returns the cached conversion map (USD-based). On error it returns
// the stale cache if available, otherwise a minimal fallback.
func (s *ExchangeRateService) Rates() (map[string]float64, error) {
	s.mu.RLock()
	if s.snap != nil && time.Since(s.snap.fetchedAt) < s.ttl {
		r := s.snap.rates
		s.mu.RUnlock()
		return r, nil
	}
	s.mu.RUnlock()

	s.mu.Lock()
	defer s.mu.Unlock()

	// Double-check after acquiring write lock.
	if s.snap != nil && time.Since(s.snap.fetchedAt) < s.ttl {
		return s.snap.rates, nil
	}

	var url string
	if s.apiKey != "" {
		url = fmt.Sprintf("https://v6.exchangerate-api.com/v6/%s/latest/USD", s.apiKey)
	} else {
		// Free tier — no API key required
		url = "https://open.er-api.com/v6/latest/USD"
	}
	resp, err := http.Get(url)
	if err != nil {
		if s.snap != nil {
			return s.snap.rates, nil // serve stale
		}
		return nil, fmt.Errorf("exchange rate fetch failed: %w", err)
	}
	defer resp.Body.Close()

	var data erAPIResponse
	if err := json.NewDecoder(resp.Body).Decode(&data); err != nil {
		if s.snap != nil {
			return s.snap.rates, nil
		}
		return nil, fmt.Errorf("exchange rate decode failed: %w", err)
	}

	// Support both v6.exchangerate-api.com (conversion_rates) and open.er-api.com (rates)
	rateMap := data.ConversionRates
	if len(rateMap) == 0 {
		rateMap = data.Rates
	}
	if data.Result != "success" || len(rateMap) == 0 {
		if s.snap != nil {
			return s.snap.rates, nil
		}
		return nil, fmt.Errorf("exchange rate API non-success: result=%s", data.Result)
	}

	s.snap = &rateSnapshot{rates: rateMap, fetchedAt: time.Now()}
	return s.snap.rates, nil
}

// Convert converts amount from fromCurrency to toCurrency.
// Returns the original amount on any error (safe fallback for display).
func (s *ExchangeRateService) Convert(amount float64, from, to string) float64 {
	if from == to || amount == 0 {
		return amount
	}
	rates, err := s.Rates()
	if err != nil {
		return amount
	}
	fromRate, ok1 := rates[from]
	toRate, ok2 := rates[to]
	if !ok1 || !ok2 || fromRate == 0 {
		return amount
	}
	converted := (amount / fromRate) * toRate
	return math.Round(converted*100) / 100
}

// ExchangeRateHandler serves the /api/v1/exchange-rates endpoint.
type ExchangeRateHandler struct{ svc *ExchangeRateService }

func NewExchangeRateHandler() *ExchangeRateHandler {
	return &ExchangeRateHandler{svc: GetExchangeRateService()}
}

func (h *ExchangeRateHandler) GetRates(c *gin.Context) {
	rates, err := h.svc.Rates()
	if err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "exchange rates temporarily unavailable"})
		return
	}
	c.Header("Cache-Control", "public, max-age=3600")
	c.JSON(http.StatusOK, gin.H{"base": "USD", "rates": rates})
}
