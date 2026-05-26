package database

import (
	"fmt"

	"github.com/travel/backend/internal/models"
	"github.com/travel/backend/pkg/config"
	"github.com/travel/backend/pkg/logger"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

var db *gorm.DB

func Init(cfg *config.Config) error {
	dsn := fmt.Sprintf(
		"host=%s port=%s user=%s password=%s dbname=%s sslmode=%s",
		cfg.DBHost,
		cfg.DBPort,
		cfg.DBUser,
		cfg.DBPassword,
		cfg.DBName,
		cfg.DBSSLMode,
	)

	var err error
	db, err = gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		logger.Errorf("Failed to connect to database: %v", err)
		return err
	}

	logger.Info("Database connection established")

	// Run migrations
	err = Migrate()
	if err != nil {
		logger.Warnf("Migration failed, continuing without migrations: %v", err)
	}

	return nil
}

func Migrate() error {
	return db.AutoMigrate(
		&models.Experience{},
		&models.ExperienceGTTD{},
		&models.ExperienceOption{},
		&models.Booking{},
		&models.PricingRule{},
		&models.GoogleFeedStatus{},
		&models.POIMapping{},
	)
}

func GetDB() *gorm.DB {
	if db == nil {
		logger.Error("Database not initialized")
		panic("database not initialized")
	}
	return db
}

func Close() error {
	sqlDB, err := db.DB()
	if err != nil {
		return err
	}
	return sqlDB.Close()
}
