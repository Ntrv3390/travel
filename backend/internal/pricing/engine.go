package pricing

import (
	"context"
	"fmt"
	"math"
	"traviia/internal/models"
)

type DB interface {
	GetApplicablePricingRule(ctx context.Context, experienceID string, city string) *models.PricingRule
}

type PriceResult struct {
	DisplayAmount   float64
	CurrencyCode    string
	FormattedAmount string // e.g., "25.00"
}

type PricingEngine struct {
	db DB
}

// NewPricingEngine creates a new pricing engine instance
func NewPricingEngine(db DB) *PricingEngine {
	return &PricingEngine{db: db}
}

// CalculatePrice applies markup rules to a base price.
// This function MUST be called by:
//   1. feed_generator.go (building GTTD feed)
//   2. jsonld_builder.go (building JSON-LD for PDPs)
//   3. The checkout handler (validating payment amount)
//
// Never calculate prices anywhere else.
func (e *PricingEngine) CalculatePrice(
	ctx context.Context,
	baseAmount float64,
	baseCurrency string,
	experienceID string,
	city string,
) PriceResult {
	rule := e.db.GetApplicablePricingRule(ctx, experienceID, city)

	marked := baseAmount
	if rule != nil && rule.IsActive {
		// Apply percentage markup first
		if rule.MarkupPercentage > 0 {
			marked = baseAmount * (1 + rule.MarkupPercentage/100)
		}
		// Then add flat fee (assume same currency for now)
		if rule.FixedFeeAmount > 0 {
			marked += rule.FixedFeeAmount
		}
	}

	// Round to 2 decimal places
	rounded := math.Round(marked*100) / 100

	return PriceResult{
		DisplayAmount:   rounded,
		CurrencyCode:    baseCurrency,
		FormattedAmount: fmt.Sprintf("%.2f", rounded),
	}
}

// GetDisplayPrice returns just the formatted price string
func (e *PricingEngine) GetDisplayPrice(
	ctx context.Context,
	baseAmount float64,
	baseCurrency string,
	experienceID string,
	city string,
) string {
	result := e.CalculatePrice(ctx, baseAmount, baseCurrency, experienceID, city)
	return result.FormattedAmount
}

// GetNumericPrice returns just the numeric value
func (e *PricingEngine) GetNumericPrice(
	ctx context.Context,
	baseAmount float64,
	baseCurrency string,
	experienceID string,
	city string,
) float64 {
	result := e.CalculatePrice(ctx, baseAmount, baseCurrency, experienceID, city)
	return result.DisplayAmount
}
