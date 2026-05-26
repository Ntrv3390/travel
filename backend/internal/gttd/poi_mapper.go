package gttd

import (
	"context"
	"fmt"

	"github.com/travel/backend/internal/models"
)

// POIMapperDB is the database interface for POI operations
type POIMapperDB interface {
	GetPOIMappingByGooglePlaceID(ctx context.Context, placeID string) (*models.POIMapping, error)
	GetPOIMappingsByCity(ctx context.Context, city string) ([]models.POIMapping, error)
	CreatePOIMapping(ctx context.Context, mapping *models.POIMapping) error
	UpdatePOIMapping(ctx context.Context, mapping *models.POIMapping) error
	GetUnmappedExperiences(ctx context.Context) ([]models.ExperienceGTTD, error)
	UpdateExperiencePOI(ctx context.Context, experienceID string, poiID string, poiName string) error
}

type POIMapper struct {
	db POIMapperDB
}

// NewPOIMapper creates a new POI mapper
func NewPOIMapper(db POIMapperDB) *POIMapper {
	return &POIMapper{db: db}
}

// MapExperienceToGooglePlaceID maps an experience to a Google Place ID
func (pm *POIMapper) MapExperienceToGooglePlaceID(ctx context.Context, experienceID string, locationName string, city string, googlePlaceID string) error {
	// Create or update POI mapping
	mapping := &models.POIMapping{
		HeadoutLocationName: &locationName,
		HeadoutCity:         &city,
		GooglePlaceID:       googlePlaceID,
		IsVerified:          false,
	}

	// Try to find existing
	existing, err := pm.db.GetPOIMappingByGooglePlaceID(ctx, googlePlaceID)
	if err == nil && existing != nil {
		// Update existing
		mapping.ID = existing.ID
		return pm.db.UpdatePOIMapping(ctx, mapping)
	}

	// Create new
	if err := pm.db.CreatePOIMapping(ctx, mapping); err != nil {
		return fmt.Errorf("create poi mapping: %w", err)
	}

	// Update experience with POI info
	return pm.db.UpdateExperiencePOI(ctx, experienceID, googlePlaceID, locationName)
}

// VerifyPOIMapping marks a POI mapping as verified (manual verification by team)
func (pm *POIMapper) VerifyPOIMapping(ctx context.Context, poiID string) error {
	mapping, err := pm.db.GetPOIMappingByGooglePlaceID(ctx, poiID)
	if err != nil {
		return fmt.Errorf("get poi mapping: %w", err)
	}

	if mapping == nil {
		return fmt.Errorf("poi mapping not found: %s", poiID)
	}

	mapping.IsVerified = true
	return pm.db.UpdatePOIMapping(ctx, mapping)
}

// GetUnmappedExperiencesByCity gets all experiences in a city that don't have a POI mapping
func (pm *POIMapper) GetUnmappedExperiencesByCity(ctx context.Context, city string) ([]models.ExperienceGTTD, error) {
	experiences, err := pm.db.GetUnmappedExperiences(ctx)
	if err != nil {
		return nil, fmt.Errorf("get unmapped experiences: %w", err)
	}

	var filtered []models.ExperienceGTTD
	for _, exp := range experiences {
		if exp.City == city {
			filtered = append(filtered, exp)
		}
	}

	return filtered, nil
}

// GetPOIMappingsForCity gets all POI mappings for a city
func (pm *POIMapper) GetPOIMappingsForCity(ctx context.Context, city string) ([]models.POIMapping, error) {
	return pm.db.GetPOIMappingsByCity(ctx, city)
}

// ValidatePOIMapping checks if a POI mapping is valid
func (pm *POIMapper) ValidatePOIMapping(mapping *models.POIMapping) error {
	if mapping.GooglePlaceID == "" {
		return fmt.Errorf("google_place_id is required")
	}

	if mapping.HeadoutCity == nil || *mapping.HeadoutCity == "" {
		return fmt.Errorf("headout_city is required")
	}

	return nil
}
