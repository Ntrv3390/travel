package main

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/robfig/cron/v3"
	"github.com/travel/backend/internal/database"
	"github.com/travel/backend/internal/gttd"
	gttdhandlers "github.com/travel/backend/internal/handlers/gttd"
	"github.com/travel/backend/internal/handlers"
	"github.com/travel/backend/pkg/config"
	"github.com/travel/backend/pkg/logger"
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

	// Initialize GTTD services
	gttdServices, err := initGTTDServices()
	if err != nil {
		logger.Warnf("Failed to initialize GTTD services (non-fatal): %v", err)
	}

	// Create Gin router
	if cfg.Environment == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	router := gin.Default()

	// Add CORS middleware
	router.Use(corsMiddleware())

	// Health check routes
	healthHandler := handlers.NewHealthHandler()
	router.GET("/health", healthHandler.Health)
	router.GET("/ready", healthHandler.Ready)

	// Experience routes
	expHandler := handlers.NewExperienceHandler()
	router.GET("/api/v1/experiences", expHandler.GetExperiences)
	router.GET("/api/v1/experiences/by-id/:id", expHandler.GetExperienceByID)
	router.GET("/api/v1/experiences/:city/:slug", expHandler.GetExperienceByCityAndSlug)
	router.GET("/api/v1/experiences/search", expHandler.SearchExperiences)

	// Headout proxy routes
	headoutHandler := handlers.NewHeadoutHandler(cfg)
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
		headoutGroup.GET("/v2/products", headoutHandler.ListProductsV2)
		headoutGroup.GET("/v2/categories", headoutHandler.ListCategoriesV2)
		headoutGroup.GET("/v2/collections", headoutHandler.ListCollectionsV2)
		headoutGroup.GET("/v2/subcategories", headoutHandler.ListSubcategoriesV2)
	}

	// Compatibility aliases for frontend booking route
	router.GET("/api/v1/bookings", headoutHandler.ListBookings)
	router.GET("/api/v1/bookings/:id", headoutHandler.GetBookingByID)
	router.POST("/api/v1/bookings", headoutHandler.CreateBooking)
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
		ReadTimeout:    15 * time.Second,
		WriteTimeout:   15 * time.Second,
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
	logger.Warn("GTTD services are temporarily disabled: missing DB adapter implementation")
	return nil, nil
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
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS, GET, PUT, DELETE")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	}
}
