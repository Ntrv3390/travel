package services

import (
	"context"
	"fmt"
	"math"
	"strings"

	"github.com/travel/backend/internal/models"
	"gorm.io/gorm"
)

type ExperienceCatalogService struct {
	db *gorm.DB
}

func NewExperienceCatalogService(db *gorm.DB) *ExperienceCatalogService {
	return &ExperienceCatalogService{db: db}
}

type ExperienceListResult struct {
	Experiences []models.Experience `json:"data"`
	Count       int64               `json:"count"`
	Page        int                 `json:"page"`
	Limit       int                 `json:"limit"`
	TotalPages  int                 `json:"total_pages"`
}

func (s *ExperienceCatalogService) ListExperiences(ctx context.Context, category, location string, page, limit int) (*ExperienceListResult, error) {
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 12
	}

	offset := (page - 1) * limit
	query := s.db.WithContext(ctx).Model(&models.Experience{}).Where("status = ?", "active")
	if category != "" {
		query = query.Where("category = ?", category)
	}
	if location != "" {
		query = query.Where("location ILIKE ?", "%"+location+"%")
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, err
	}

	var experiences []models.Experience
	if err := query.Order("created_at DESC").Limit(limit).Offset(offset).Find(&experiences).Error; err != nil {
		return nil, err
	}

	return &ExperienceListResult{
		Experiences: experiences,
		Count:       total,
		Page:        page,
		Limit:       limit,
		TotalPages:  int(math.Ceil(float64(total) / float64(limit))),
	}, nil
}

func (s *ExperienceCatalogService) SearchExperiences(ctx context.Context, category, location string, page, limit int) (*ExperienceListResult, error) {
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 12
	}

	offset := (page - 1) * limit
	query := s.db.WithContext(ctx).Model(&models.Experience{}).Where("status = ?", "active")

	if category != "" {
		query = query.Where("category = ?", category)
	}
	if location != "" {
		query = query.Where("location ILIKE ?", "%"+location+"%")
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, err
	}

	var experiences []models.Experience
	if err := query.Order("created_at DESC").Limit(limit).Offset(offset).Find(&experiences).Error; err != nil {
		return nil, err
	}

	return &ExperienceListResult{
		Experiences: experiences,
		Count:       total,
		Page:        page,
		Limit:       limit,
		TotalPages:  int(math.Ceil(float64(total) / float64(limit))),
	}, nil
}

func (s *ExperienceCatalogService) GetExperienceByID(ctx context.Context, id string) (*models.Experience, error) {
	var experience models.Experience
	if err := s.db.WithContext(ctx).Where("id = ? AND status = ?", id, "active").First(&experience).Error; err != nil {
		return nil, err
	}
	return &experience, nil
}

func (s *ExperienceCatalogService) GetExperienceByCityAndSlug(ctx context.Context, city, slug string) (*models.Experience, error) {
	var experiences []models.Experience
	if err := s.db.WithContext(ctx).Where("status = ?", "active").Find(&experiences).Error; err != nil {
		return nil, err
	}

	for _, experience := range experiences {
		if slugify(experience.Location) == slugify(city) && slugify(experience.Title) == slug {
			exp := experience
			return &exp, nil
		}
	}

	return nil, gorm.ErrRecordNotFound
}

func slugify(value string) string {
	value = strings.ToLower(strings.TrimSpace(value))
	builder := strings.Builder{}
	lastDash := false
	for _, r := range value {
		if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') {
			builder.WriteRune(r)
			lastDash = false
			continue
		}
		if !lastDash {
			builder.WriteRune('-')
			lastDash = true
		}
	}
	return strings.Trim(builder.String(), "-")
}
