package database

import (
	"context"

	"github.com/google/uuid"
	"github.com/travel/backend/internal/gttd"
	"github.com/travel/backend/internal/models"
	"github.com/travel/backend/internal/pricing"
	"gorm.io/gorm"
)

// GTTDDBAdapter implements the database interfaces needed by GTTD services.
// It wraps *gorm.DB to provide the specific methods required by:
//   - gttd.DBInterface (feed_generator.go)
//   - gttd.WorkerDB (worker.go)
//   - gttd.DBGetter (jsonld_builder.go)
//   - pricing.DB (engine.go)
//
// This ensures pricing consistency: the same PricingEngine instance is used
// by feed generation, JSON-LD building, and checkout.
type GTTDDBAdapter struct {
	db *gorm.DB
}

// NewGTTDDBAdapter creates a new GTTD database adapter
func NewGTTDDBAdapter(db *gorm.DB) *GTTDDBAdapter {
	return &GTTDDBAdapter{db: db}
}

// Ensure GTTDDBAdapter implements the required interfaces
var _ gttd.DBInterface = (*GTTDDBAdapter)(nil)
var _ gttd.WorkerDB = (*GTTDDBAdapter)(nil)
var _ gttd.DBGetter = (*GTTDDBAdapter)(nil)
var _ pricing.DB = (*GTTDDBAdapter)(nil)

// GetGTTDEnabledExperiences returns all experiences with GTTD enabled (for feed generation)
func (a *GTTDDBAdapter) GetGTTDEnabledExperiences(ctx context.Context) ([]models.ExperienceGTTD, error) {
	var experiences []models.ExperienceGTTD
	err := a.db.WithContext(ctx).
		Where("gttd_enabled = ? AND is_active = ?", true, true).
		Preload("Options").
		Find(&experiences).Error
	if err != nil {
		return nil, err
	}
	return experiences, nil
}

// GetApplicablePricingRule returns the pricing rule for an experience
func (a *GTTDDBAdapter) GetApplicablePricingRule(ctx context.Context, experienceID string, city string) *models.PricingRule {
	var rule models.PricingRule
	err := a.db.WithContext(ctx).
		Where("(experience_id = ? OR city = ? OR is_global = ?) AND is_active = ?",
			experienceID, city, true, true).
		Order("priority ASC, created_at DESC").
		First(&rule).Error
	if err != nil {
		return nil
	}
	return &rule
}

// CreateFeedStatus creates a new feed upload status record and returns its ID
func (a *GTTDDBAdapter) CreateFeedStatus(ctx context.Context, environment string) (string, error) {
	status := models.GTTDFeedUploadStatus{
		ID:          uuid.New().String(),
		Environment: environment,
		Status:      "PENDING",
	}
	err := a.db.WithContext(ctx).Create(&status).Error
	if err != nil {
		return "", err
	}
	return status.ID, nil
}

// UpdateFeedStatus updates a feed upload status record
func (a *GTTDDBAdapter) UpdateFeedStatus(ctx context.Context, statusID string, status string, productCount int, errorMsg string) error {
	updates := map[string]interface{}{
		"status":        status,
		"product_count": productCount,
	}
	if errorMsg != "" {
		updates["error_message"] = errorMsg
	}
	return a.db.WithContext(ctx).
		Model(&models.GTTDFeedUploadStatus{}).
		Where("id = ?", statusID).
		Updates(updates).Error
}

// GetExperienceByHeadoutID fetches an experience by its Headout ID (for JSON-LD)
func (a *GTTDDBAdapter) GetExperienceByHeadoutID(ctx context.Context, headoutID string) (interface{}, error) {
	var exp models.ExperienceGTTD
	err := a.db.WithContext(ctx).
		Where("headout_id = ?", headoutID).
		Preload("Options").
		First(&exp).Error
	if err != nil {
		return nil, err
	}
	return &exp, nil
}
