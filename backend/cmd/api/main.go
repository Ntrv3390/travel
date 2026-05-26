package main

import (
	"context"
	"fmt"
	"io/ioutil"
	"net/http"
	"os"
	"os/signal"
	"strconv"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/robfig/cron/v3"
	"github.com/travel/backend/internal/database"
	"github.com/travel/backend/internal/gttd"
	gttdhandlers "github.com/travel/backend/internal/handlers/gttd"
	"github.com/travel/backend/internal/handlers"
	"github.com/travel/backend/internal/pricing"
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
	router.GET("/api/v1/experiences/:id", expHandler.GetExperienceByID)
	router.GET("/api/v1/experiences/:city/:slug", expHandler.GetExperienceByCityAndSlug)
	router.GET("/api/v1/experiences/search", expHandler.SearchExperiences)

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
	PricingEngine  *pricing.PricingEngine
}

func initGTTDServices() (*GTTDServices, error) {
	// Get database instance
	db := database.GetDB()
	if db == nil {
		return nil, fmt.Errorf("database not initialized")
	}

	// Create pricing engine
	pricingEngine := pricing.NewPricingEngine(db)

	// Get GTTD base URL from environment
	baseURL := os.Getenv("GTTD_BASE_URL")
	if baseURL == "" {
		baseURL = "https://traviia.com"
	}

	// Create feed generator
	generator := gttd.NewFeedGenerator(db, pricingEngine, baseURL)

	// Create JSON-LD builder
	jsonldBuilder := gttd.NewJSONLDBuilder(db, pricingEngine, baseURL)

	// Load SSH private key from environment or file
	var sftpPrivateKey []byte
	var err error

	keyPath := os.Getenv("GTTD_PROD_SSH_PRIVATE_KEY_PATH")
	if keyPath == "" {
		keyPath = os.Getenv("GTTD_DEV_SSH_PRIVATE_KEY_PATH")
	}

	if keyPath != "" {
		sftpPrivateKey, err = ioutil.ReadFile(keyPath)
		if err != nil {
			logger.Warnf("Failed to load SSH private key from %s: %v", keyPath, err)
			sftpPrivateKey = []byte("") // Will be empty, uploader will fail gracefully
		}
	}

	// Get SFTP configuration
	sftpHost := os.Getenv("GTTD_PROD_SFTP_HOST")
	if sftpHost == "" {
		sftpHost = os.Getenv("GTTD_DEV_SFTP_HOST")
	}

	sftpPort := 22
	if portStr := os.Getenv("GTTD_PROD_SFTP_PORT"); portStr != "" {
		if p, err := strconv.Atoi(portStr); err == nil {
			sftpPort = p
		}
	}

	sftpUsername := os.Getenv("GTTD_PROD_SFTP_USERNAME")
	if sftpUsername == "" {
		sftpUsername = os.Getenv("GTTD_DEV_SFTP_USERNAME")
	}

	sftpRemoteDir := os.Getenv("GTTD_PROD_SFTP_REMOTE_DIR")
	if sftpRemoteDir == "" {
		sftpRemoteDir = os.Getenv("GTTD_DEV_SFTP_REMOTE_DIR")
	}

	sftpConfig := gttd.SFTPConfig{
		Host:       sftpHost,
		Port:       sftpPort,
		Username:   sftpUsername,
		PrivateKey: sftpPrivateKey,
		RemoteDir:  sftpRemoteDir,
	}

	// Create SFTP uploader
	sftpUploader := gttd.NewSFTPUploader(sftpConfig)

	// Create worker
	env := os.Getenv("GTTD_ENV")
	if env == "" {
		env = "dev"
	}
	worker := gttd.NewWorker(generator, sftpUploader, db, env)

	return &GTTDServices{
		Worker:        worker,
		Generator:     generator,
		JSONLDBuilder: jsonldBuilder,
		SFTPUploader:  sftpUploader,
		PricingEngine: pricingEngine,
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
