package services

import (
	"github.com/travel/backend/internal/models"
	"github.com/travel/backend/pkg/logger"
)

// ExperienceService handles business logic for experiences
type ExperienceService struct{}

// NewExperienceService creates a new experience service
func NewExperienceService() *ExperienceService {
	return &ExperienceService{}
}

// CalculateDiscountedPrice calculates the final price with markup
func (s *ExperienceService) CalculateDiscountedPrice(
	basePrice float64,
	markupPercentage float64,
	fixedFee float64,
) float64 {
	markupAmount := basePrice * (markupPercentage / 100)
	return basePrice + markupAmount + fixedFee
}

// ValidateBookingAvailability checks if booking is valid (Phase 2)
func (s *ExperienceService) ValidateBookingAvailability(
	experienceID uint,
	quantity int,
) bool {
	logger.Debugf("Validating booking availability for experience %d, quantity %d", experienceID, quantity)
	// TODO: Implement Headout API call for real-time availability
	return true
}

// ProcessBooking creates a booking (Phase 3)
func (s *ExperienceService) ProcessBooking(booking *models.Booking) error {
	logger.Infof("Processing booking: %s", booking.BookingID)
	// TODO: Implement booking flow with Headout API
	return nil
}

// PricingService handles pricing logic
type PricingService struct{}

// NewPricingService creates a new pricing service
func NewPricingService() *PricingService {
	return &PricingService{}
}

// ApplyPricingRule applies pricing rules to an experience
func (s *PricingService) ApplyPricingRule(
	exp *models.Experience,
	rule *models.PricingRule,
) float64 {
	finalPrice := exp.Price + rule.FixedFee
	finalPrice = finalPrice * (1 + rule.MarkupPercentage/100)

	if rule.MinPrice > 0 && finalPrice < rule.MinPrice {
		return rule.MinPrice
	}

	if rule.MaxPrice > 0 && finalPrice > rule.MaxPrice {
		return rule.MaxPrice
	}

	return finalPrice
}

// HeadoutService handles Headout API integration (Phase 2)
type HeadoutService struct {
	APIKey string
}

// NewHeadoutService creates a new Headout service
func NewHeadoutService(apiKey string) *HeadoutService {
	return &HeadoutService{
		APIKey: apiKey,
	}
}

// FetchExperiences fetches experiences from Headout API (Phase 2)
func (s *HeadoutService) FetchExperiences() ([]models.Experience, error) {
	logger.Info("Fetching experiences from Headout API")
	// TODO: Implement Headout API call
	return []models.Experience{}, nil
}

// CheckAvailability checks real-time availability (Phase 2)
func (s *HeadoutService) CheckAvailability(experienceID string, date string) (bool, error) {
	logger.Debugf("Checking availability for experience %s on %s", experienceID, date)
	// TODO: Implement Headout API call for availability
	return true, nil
}

// GoogleFeedService handles Google Things to Do integration (Phase 2)
type GoogleFeedService struct{}

// NewGoogleFeedService creates a new Google feed service
func NewGoogleFeedService() *GoogleFeedService {
	return &GoogleFeedService{}
}

// GenerateProductFeed generates a Google Things to Do feed
func (s *GoogleFeedService) GenerateProductFeed(experiences []models.Experience) []models.GoogleFeedProduct {
	logger.Infof("Generating Google feed for %d experiences", len(experiences))
	products := make([]models.GoogleFeedProduct, 0, len(experiences))

	for _, exp := range experiences {
		product := models.GoogleFeedProduct{
			ProductID:      exp.HeadoutID,
			Title:          exp.Title,
			LandingPageURL: "http://localhost:3000/experiences/" + string(rune(exp.ID)),
			Price:          exp.Price,
			Currency:       exp.Currency,
			Description:    exp.Description,
			ImageURL:       exp.ImageURL,
			Availability:   "In stock",
		}
		products = append(products, product)
	}

	return products
}
