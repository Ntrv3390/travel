package main

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"strconv"
	"os/signal"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/robfig/cron/v3"
	"github.com/travel/backend/internal/database"
	"github.com/travel/backend/internal/pricing"
	"github.com/travel/backend/internal/gttd"
	gttdhandlers "github.com/travel/backend/internal/handlers/gttd"
	"github.com/travel/backend/internal/handlers"
	"github.com/travel/backend/internal/middleware"
	"github.com/travel/backend/internal/models"
	"github.com/travel/backend/internal/services"
	"github.com/travel/backend/pkg/config"
	"github.com/travel/backend/pkg/logger"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

func main() {
	// Load configuration
	cfg := config.Load()

	// Initialize logger
	err := logger.Init(cfg.Environment)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to initialize logger: %v\n", err)
		os.Exit(1)
	}
	defer logger.Close()

	logger.Infof("Starting Travel API Server - Environment: %s", cfg.Environment)

	// Initialize database
	err = database.Init(cfg)
	if err != nil {
		logger.Errorf("Failed to initialize database: %v", err)
		os.Exit(1)
	}
	defer database.Close()

	// Seed admin users
	seedUsers(database.GetDB())

	// Initialize GTTD services
	gttdServices, err := initGTTDServices()
	if err != nil {
		logger.Warnf("Failed to initialize GTTD services (non-fatal): %v", err)
	}

	// Create Gin router
	if cfg.Environment == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	router := gin.New()
	router.Use(middleware.Recovery())

	// Add middleware
	router.Use(corsMiddleware())
	router.Use(middleware.RequestLogger())

	rl := middleware.NewRateLimiter(300, time.Minute)
	router.Use(rl.RateLimit())

	// Health check routes
	healthHandler := handlers.NewHealthHandler()
	router.GET("/health", healthHandler.Health)
	router.GET("/ready", healthHandler.Ready)

	// Experience routes
	expHandler := handlers.NewExperienceHandler(database.GetDB())
	router.GET("/api/v1/experiences", expHandler.GetExperiences)
	router.GET("/api/v1/experiences/by-id/:id", expHandler.GetExperienceByID)
	router.GET("/api/v1/experiences/:city/:slug", expHandler.GetExperienceByCityAndSlug)
	router.GET("/api/v1/experiences-availability/:id", expHandler.GetAvailability)
	router.GET("/api/v1/experiences/search", expHandler.SearchExperiences)

	// Email service
	emailSvc := services.NewEmailService(services.SMTPConfig{
		Host:       cfg.SMTPHost,
		Port:       cfg.SMTPPort,
		User:       cfg.SMTPUser,
		Pass:       cfg.SMTPPass,
		From:       cfg.SMTPFrom,
		AdminEmail: cfg.AdminEmail,
	})

	// Auth routes
	authHandler := handlers.NewAuthHandler(database.GetDB(), emailSvc)
	router.POST("/api/v1/auth/signup", authHandler.SignUp)
	router.POST("/api/v1/auth/signin", authHandler.SignIn)
	router.POST("/api/v1/auth/forgot-password", authHandler.ForgotPassword)
	router.POST("/api/v1/auth/reset-password", authHandler.ResetPassword)

	// Help submission routes (public)
	helpHandler := handlers.NewHelpHandler(database.GetDB(), emailSvc)
	router.POST("/api/v1/help/submit", helpHandler.Submit)

	// Token refresh (public — uses refresh_token, not access_token)
	router.POST("/api/v1/auth/refresh", authHandler.RefreshToken)

	// Protected auth routes
	authProtected := router.Group("/api/v1/auth")
	authProtected.Use(middleware.JWTAuth())
	{
		authProtected.GET("/profile", authHandler.GetProfile)
		authProtected.POST("/signout", authHandler.SignOut)
	}

	// Visitor tracking
	visitorHandler := handlers.NewVisitorHandler(database.GetDB())
	router.POST("/api/v1/track/visit", visitorHandler.TrackVisit)

	// Headout proxy service (used by multiple handlers)
	headoutProxy := services.NewHeadoutProxyService(cfg)

	// Admin routes (protected by JWT + admin role)
	adminHandler := handlers.NewAdminHandler(database.GetDB(), emailSvc, headoutProxy)
	adminGroup := router.Group("/api/v1/admin")
	adminGroup.Use(middleware.AdminAuthJWT())
	{
		adminGroup.GET("/stats", adminHandler.GetStats)
		adminGroup.GET("/bookings", adminHandler.ListBookings)
		adminGroup.GET("/bookings/:id/headout", adminHandler.GetHeadoutBooking)
		adminGroup.GET("/help-submissions", adminHandler.ListHelpSubmissions)
		adminGroup.GET("/users", adminHandler.ListUsers)
		adminGroup.PUT("/users/:id", adminHandler.UpdateUser)
		adminGroup.GET("/visitors", visitorHandler.ListVisitors)
		adminGroup.GET("/cities", adminHandler.ListCities)
		adminGroup.POST("/cities/sync", adminHandler.SyncCities)
		adminGroup.GET("/products", adminHandler.ListProducts)
		adminGroup.POST("/products/sync", adminHandler.SyncProducts)
		adminGroup.POST("/products/sync-all-individual", adminHandler.SyncAllIndividualProducts)
		adminGroup.GET("/products/sync-status", adminHandler.GetSyncStatus)
		adminGroup.POST("/products/:id/sync", adminHandler.SyncSingleProduct)
		adminGroup.GET("/products/:id/availabilities", adminHandler.GetProductAvailabilities)
		adminGroup.GET("/settings", adminHandler.GetSetting)
		adminGroup.PUT("/settings", adminHandler.UpdateSetting)
		adminGroup.GET("/status", adminHandler.GetStatus)
		adminGroup.GET("/categories", adminHandler.ListCategoriesAdmin)
		adminGroup.POST("/categories/sync", adminHandler.SyncCategoriesAdmin)
		adminGroup.GET("/subcategories", adminHandler.ListSubcategoriesAdmin)
		adminGroup.POST("/subcategories/sync", adminHandler.SyncSubcategoriesAdmin)
		adminGroup.GET("/collections", adminHandler.ListCollectionsAdmin)
		adminGroup.POST("/collections/sync", adminHandler.SyncCollectionsAdmin)
		adminGroup.GET("/testimonials", adminHandler.ListTestimonialsAdmin)
		adminGroup.POST("/testimonials", adminHandler.CreateTestimonial)
		adminGroup.PUT("/testimonials/:id", adminHandler.UpdateTestimonial)
		adminGroup.PATCH("/testimonials/:id/toggle", adminHandler.ToggleTestimonial)
	}

	// Admin sync routes (protected by admin key - keep for backwards compatibility)
	adminSyncGroup := router.Group("/api/v1/admin")
	adminSyncGroup.Use(middleware.AdminAuth())
	{
		adminSyncGroup.POST("/sync", expHandler.SyncExperiences)
		adminSyncGroup.POST("/sync/:id", expHandler.SyncExperienceByID)
	}

	// Search endpoint
	searchHandler := handlers.NewSearchHandler(database.GetDB())
	router.GET("/api/v1/search", searchHandler.Search)
	router.GET("/api/v1/search/cities/:slug", searchHandler.GetCityBySlug)
	router.GET("/api/v1/search/categories/:slug", searchHandler.GetCategoryBySlug)

	// Home page endpoints (curated categories, collections & testimonials)
	homeHandler := handlers.NewHomeHandler(database.GetDB())
	router.GET("/api/v1/home/categories", homeHandler.GetCategories)
	router.GET("/api/v1/home/collections", homeHandler.GetCollections)
	router.GET("/api/v1/home/testimonials", homeHandler.GetTestimonials)

	// Currencies endpoint
	currencyHandler := handlers.NewCurrencyHandler()
	router.GET("/api/v1/currencies", currencyHandler.ListCurrencies)

	// Headout proxy routes
	headoutHandler := handlers.NewHeadoutHandler(cfg, database.GetDB())
	headoutGroup := router.Group("/api/v1/headout")
	{
		headoutGroup.GET("/v1/product/get/:productId", headoutHandler.GetProductByID)
		headoutGroup.GET("/v1/product/listing/list-by/city", headoutHandler.ListProductsByCity)
		headoutGroup.GET("/v1/product/listing/list-by/category", headoutHandler.ListProductsByCategory)
		headoutGroup.GET("/v1/inventory/list-by/variant", headoutHandler.ListInventoryByVariant)
		headoutGroup.GET("/v1/booking", headoutHandler.ListBookings)
		headoutGroup.GET("/v1/booking/:id", headoutHandler.GetBookingByID)
		headoutGroup.POST("/v1/booking", headoutHandler.CreateBooking)
		headoutGroup.PUT("/v1/booking/:id", headoutHandler.UpdateBooking)
		headoutGroup.GET("/v1/city", headoutHandler.ListCities)
		headoutGroup.GET("/v1/category/list-by/city", headoutHandler.ListCategoriesByCityV1)
		headoutGroup.GET("/v2/cities", headoutHandler.ListCitiesV2)
		headoutGroup.GET("/v2/products", headoutHandler.ListProductsV2)
		headoutGroup.GET("/v2/products/:productId", headoutHandler.GetProductByIDV2)
		headoutGroup.GET("/v2/products/:productId/variants/:variantId/availabilities", headoutHandler.ListNormalAvailabilities)
		headoutGroup.GET("/v2/categories", headoutHandler.ListCategoriesV2)
		headoutGroup.GET("/v2/collections", headoutHandler.ListCollectionsV2)
		headoutGroup.GET("/v2/inventory", headoutHandler.ListNormalInventory)
		headoutGroup.GET("/v2/subcategories", headoutHandler.ListSubcategoriesV2)
	}

	// Normalized booking flow routes (for frontend consumption)
	bookingFlowHandler := handlers.NewBookingFlowHandler(cfg, emailSvc)
	bookingFlowGroup := router.Group("/api/v1/booking-flow")
	{
		bookingFlowGroup.GET("/calendar", bookingFlowHandler.GetCalendar)
		bookingFlowGroup.GET("/availability", bookingFlowHandler.GetAvailability)
		bookingFlowGroup.POST("/bookings", bookingFlowHandler.CreateBooking)
		bookingFlowGroup.GET("/bookings/:id", bookingFlowHandler.GetBooking)
		bookingFlowGroup.PUT("/bookings/:id/capture", bookingFlowHandler.CaptureBooking)
	}

	// Cart routes (for multi-item booking support)
	cartSvc := services.NewCartService(database.GetDB())
	cartHandler := handlers.NewCartHandler(cartSvc)
	checkoutHandler := handlers.NewCheckoutHandler(cartSvc, services.NewHeadoutProxyService(cfg), emailSvc)
	cartGroup := router.Group("/api/v1/cart")
	{
		cartGroup.GET("", cartHandler.GetCart)
		cartGroup.POST("/items", cartHandler.AddItem)
		cartGroup.PATCH("/items/:id", cartHandler.UpdateItem)
		cartGroup.DELETE("/items/:id", cartHandler.RemoveItem)
		cartGroup.DELETE("", cartHandler.ClearCart)
		cartGroup.POST("/checkout", checkoutHandler.Checkout)
	}

	// Frontend-facing booking API (uses booking flow handler for proper request/response mapping)
	router.GET("/api/v1/bookings", headoutHandler.ListBookings)
	router.GET("/api/v1/bookings/:id", headoutHandler.GetBookingByID)
	router.POST("/api/v1/bookings", bookingFlowHandler.CreateBooking)
	router.PUT("/api/v1/bookings/:id", headoutHandler.UpdateBooking)

	// GTTD routes
	if gttdServices != nil {
		gttdHandler := gttdhandlers.NewGttdHandler(
			gttdServices.Worker,
			gttdServices.Generator,
			gttdServices.JSONLDBuilder,
		)
		gttdGroup := router.Group("/api/v1/gttd")
		{
			gttdGroup.POST("/trigger-upload", gttdHandler.TriggerUpload)
			gttdGroup.GET("/status", gttdHandler.GetStatus)
			gttdGroup.GET("/preview", gttdHandler.GetPreview)
			gttdGroup.GET("/jsonld/:headout_id", gttdHandler.GetJSONLD)
			gttdGroup.GET("/health", gttdHandler.Health)
		}
	}

	// Setup cron jobs
	if gttdServices != nil {
		setupCronJobs(gttdServices.Worker)
	}

	// Create HTTP server
	server := &http.Server{
		Addr:           ":" + cfg.Port,
		Handler:        router,
		ReadTimeout:    600 * time.Second,
		WriteTimeout:   600 * time.Second,
		MaxHeaderBytes: 1 << 20,
	}

	// Start server in a goroutine
	go func() {
		logger.Infof("Server listening on port %s", cfg.Port)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.Errorf("Server error: %v", err)
			os.Exit(1)
		}
	}()

	// Graceful shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	logger.Info("Shutting down server...")
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := server.Shutdown(ctx); err != nil {
		logger.Errorf("Server forced to shutdown: %v", err)
		os.Exit(1)
	}

	logger.Info("Server exited")
}

type GTTDServices struct {
	Worker         *gttd.Worker
	Generator      *gttd.FeedGenerator
	JSONLDBuilder  *gttd.JSONLDBuilder
	SFTPUploader   *gttd.SFTPUploader
}

func initGTTDServices() (*GTTDServices, error) {
	gormDB := database.GetDB()
	if gormDB == nil {
		return nil, fmt.Errorf("database not available for GTTD services")
	}

	// Create the DB adapter that implements all GTTD interfaces
	dbAdapter := database.NewGTTDDBAdapter(gormDB)

	// Create the pricing engine (centralized, used by feed gen, JSON-LD, and checkout)
	pricingEngine := pricing.NewPricingEngine(dbAdapter)

	// Determine environment for SFTP config
	gttdEnv := os.Getenv("GTTD_ENV")
	if gttdEnv == "" {
		gttdEnv = "dev"
	}

	// Build SFTP config from environment variables
	sftpHostKey := "GTTD_PROD_SFTP_HOST"
	sftpUserKey := "GTTD_PROD_SFTP_USERNAME"
	sftpPortKey := "GTTD_PROD_SFTP_PORT"
	sftpDirKey := "GTTD_PROD_SFTP_REMOTE_DIR"
	sshKeyPathKey := "GTTD_PROD_SSH_PRIVATE_KEY_PATH"

	if gttdEnv == "dev" || gttdEnv == "sandbox" || gttdEnv == "development" {
		sftpHostKey = "GTTD_DEV_SFTP_HOST"
		sftpUserKey = "GTTD_DEV_SFTP_USERNAME"
		sftpPortKey = "GTTD_DEV_SFTP_PORT"
		sftpDirKey = "GTTD_DEV_SFTP_REMOTE_DIR"
		sshKeyPathKey = "GTTD_DEV_SSH_PRIVATE_KEY_PATH"
	}

	sshKeyPath := os.Getenv(sshKeyPathKey)
	if sshKeyPath == "" {
		return nil, fmt.Errorf("SSH private key path not set (env: %s)", sshKeyPathKey)
	}

	privateKey, err := os.ReadFile(sshKeyPath)
	if err != nil {
		return nil, fmt.Errorf("read SSH private key from %s: %w", sshKeyPath, err)
	}

	port := 22
	if portStr := os.Getenv(sftpPortKey); portStr != "" {
		if p, err := strconv.Atoi(portStr); err == nil {
			port = p
		}
	}

	sftpCfg := gttd.SFTPConfig{
		Host:       os.Getenv(sftpHostKey),
		Port:       port,
		Username:   os.Getenv(sftpUserKey),
		PrivateKey: privateKey,
		RemoteDir:  os.Getenv(sftpDirKey),
	}

	// Build feed output directory
	feedOutputDir := os.Getenv("GTTD_FEED_OUTPUT_DIR")
	if feedOutputDir == "" {
		feedOutputDir = "/tmp/gttd_feeds"
	}
	if err := os.MkdirAll(feedOutputDir, 0755); err != nil {
		return nil, fmt.Errorf("create feed output dir: %w", err)
	}

	baseURL := os.Getenv("GTTD_BASE_URL")
	if baseURL == "" {
		baseURL = "https://traviia.com"
	}

	// Create GTTD components
	generator := gttd.NewFeedGenerator(dbAdapter, pricingEngine, baseURL)
	jsonldBuilder := gttd.NewJSONLDBuilder(dbAdapter, pricingEngine, baseURL)
	sftpUploader := gttd.NewSFTPUploader(sftpCfg)
	worker := gttd.NewWorker(generator, sftpUploader, dbAdapter, gttdEnv)

	logger.Infof("GTTD services initialized successfully (env: %s, sftp: %s)", gttdEnv, sftpCfg.Host)

	return &GTTDServices{
		Worker:        worker,
		Generator:     generator,
		JSONLDBuilder: jsonldBuilder,
		SFTPUploader:  sftpUploader,
	}, nil
}

func setupCronJobs(worker *gttd.Worker) {
	cronSchedule := os.Getenv("GTTD_CRON_SCHEDULE")
	if cronSchedule == "" {
		cronSchedule = "0 2 * * *" // Default: 2 AM UTC daily
	}

	c := cron.New()
	
	_, err := c.AddFunc(cronSchedule, func() {
		ctx := context.Background()
		if err := worker.RunFeedUpload(ctx); err != nil {
			logger.Errorf("GTTD feed upload failed: %v", err)
		}
	})

	if err != nil {
		logger.Warnf("Failed to schedule GTTD cron job: %v", err)
		return
	}

	c.Start()
	logger.Infof("GTTD cron job scheduled: %s", cronSchedule)
}

func seedUsers(db *gorm.DB) {
	if !db.Migrator().HasTable("users") {
		logger.Warn("users table does not exist yet, skipping seed")
		return
	}
	var count int64
	db.Model(&models.User{}).Count(&count)
	if count > 0 {
		logger.Infof("Users already seeded (%d found), skipping", count)
		return
	}

	users := []models.User{
		{
			Email: "info.triipzy@gmail.com",
			Name:  "Triipzy Admin",
			Role:  "admin",
		},
		{
			Email: "mohammedputhawala793@gmail.com",
			Name:  "Mohammed Puthawala",
			Role:  "superadmin",
		},
	}

	for _, u := range users {
		hashedPassword, err := bcrypt.GenerateFromPassword([]byte("admin"), bcrypt.DefaultCost)
		if err != nil {
			logger.Errorf("Failed to hash password for seed user %s: %v", u.Email, err)
			continue
		}
		u.PasswordHash = string(hashedPassword)
		if err := db.Create(&u).Error; err != nil {
			logger.Errorf("Failed to seed user %s: %v", u.Email, err)
		}
	}
	logger.Infof("Seeded %d users", len(users))
}

func corsMiddleware() gin.HandlerFunc {
	allowedOrigin := os.Getenv("FRONTEND_URL")
	if allowedOrigin == "" {
		allowedOrigin = os.Getenv("NEXT_PUBLIC_SITE_URL")
	}
	if allowedOrigin == "" {
		allowedOrigin = "*"
	}

	return func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", allowedOrigin)
		c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, accept, origin, Cache-Control, X-Requested-With")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS, GET, PUT, PATCH, DELETE")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	}
}
