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

	// Add unique index on visitors.ip
	if db.Migrator().HasTable("visitors") {
		db.Exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_visitors_ip ON visitors(ip) WHERE deleted_at IS NULL`)
	}

	// Ensure visitors table exists
	ensureTable("visitors", `CREATE TABLE IF NOT EXISTS visitors (
		id SERIAL PRIMARY KEY,
		ip VARCHAR(45) NOT NULL,
		country VARCHAR(100) DEFAULT '',
		city VARCHAR(200) DEFAULT '',
		region VARCHAR(200) DEFAULT '',
		isp VARCHAR(200) DEFAULT '',
		user_agent TEXT DEFAULT '',
		referrer TEXT DEFAULT '',
		page_url TEXT DEFAULT '',
		first_visit TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
		last_visit TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
		visit_count INTEGER DEFAULT 1,
		created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
		updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
		deleted_at TIMESTAMP WITH TIME ZONE
	)`)

	// Ensure page_visits table exists
	ensureTable("page_visits", `CREATE TABLE IF NOT EXISTS page_visits (
		id SERIAL PRIMARY KEY,
		visitor_id INTEGER NOT NULL REFERENCES visitors(id),
		pathname TEXT NOT NULL,
		visited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
		created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
		deleted_at TIMESTAMP WITH TIME ZONE
	)`)
	db.Exec(`CREATE INDEX IF NOT EXISTS idx_page_visits_pathname ON page_visits(pathname)`)
	db.Exec(`CREATE INDEX IF NOT EXISTS idx_page_visits_visitor_id ON page_visits(visitor_id)`)

	// Ensure cart_items has the guest_counts column (GORM AutoMigrate sometimes misses jsonb columns)
	if err := db.Exec(`ALTER TABLE cart_items ADD COLUMN IF NOT EXISTS guest_counts jsonb DEFAULT '{}';`).Error; err != nil {
		logger.Warnf("Could not add guest_counts column to cart_items (may not exist yet): %v", err)
	}
	if err := db.Exec(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS guest_counts jsonb DEFAULT '{}';`).Error; err != nil {
		logger.Warnf("Could not add guest_counts column to bookings: %v", err)
	}

	// Ensure new tables exist (fallback if AutoMigrate fails)
	ensureTable("users", `CREATE TABLE IF NOT EXISTS users (
		id SERIAL PRIMARY KEY,
		email VARCHAR(255) UNIQUE NOT NULL,
		password_hash TEXT NOT NULL,
		name VARCHAR(255) DEFAULT '',
		role VARCHAR(50) NOT NULL DEFAULT 'user',
		created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
		updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
		deleted_at TIMESTAMP WITH TIME ZONE
	)`)
	ensureTable("help_submissions", `CREATE TABLE IF NOT EXISTS help_submissions (
		id SERIAL PRIMARY KEY,
		name VARCHAR(255) NOT NULL,
		email VARCHAR(255) NOT NULL,
		subject VARCHAR(255) NOT NULL,
		message TEXT NOT NULL,
		created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
		deleted_at TIMESTAMP WITH TIME ZONE
	)`)
	// Indexes for search performance
	db.Exec(`CREATE INDEX IF NOT EXISTS idx_bookings_email ON bookings(email)`)
	db.Exec(`CREATE INDEX IF NOT EXISTS idx_bookings_first_name ON bookings(first_name)`)
	db.Exec(`CREATE INDEX IF NOT EXISTS idx_bookings_last_name ON bookings(last_name)`)
	db.Exec(`CREATE INDEX IF NOT EXISTS idx_users_name ON users(name)`)
	db.Exec(`CREATE INDEX IF NOT EXISTS idx_help_submissions_email ON help_submissions(email)`)
	db.Exec(`CREATE INDEX IF NOT EXISTS idx_help_submissions_name ON help_submissions(name)`)
	db.Exec(`CREATE INDEX IF NOT EXISTS idx_help_submissions_subject ON help_submissions(subject)`)

	ensureTable("password_reset_tokens", `CREATE TABLE IF NOT EXISTS password_reset_tokens (
		id SERIAL PRIMARY KEY,
		user_id INTEGER NOT NULL REFERENCES users(id),
		token VARCHAR(255) UNIQUE NOT NULL,
		expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
		used BOOLEAN DEFAULT FALSE,
		created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
		deleted_at TIMESTAMP WITH TIME ZONE
	)`)
	ensureTable("refresh_tokens", `CREATE TABLE IF NOT EXISTS refresh_tokens (
		id SERIAL PRIMARY KEY,
		user_id INTEGER NOT NULL REFERENCES users(id),
		token VARCHAR(512) UNIQUE NOT NULL,
		expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
		created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
		deleted_at TIMESTAMP WITH TIME ZONE
	)`)

	// Ensure cities table exists
	ensureTable("cities", `CREATE TABLE IF NOT EXISTS cities (
		id SERIAL PRIMARY KEY,
		code VARCHAR(100) UNIQUE NOT NULL,
		name VARCHAR(255) NOT NULL DEFAULT '',
		image_url VARCHAR(500) DEFAULT '',
		country_code VARCHAR(10) DEFAULT '',
		country_name VARCHAR(255) DEFAULT '',
		timezone VARCHAR(100) DEFAULT '',
		raw_headout_data jsonb DEFAULT '{}',
		last_synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
		created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
		updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
		deleted_at TIMESTAMP WITH TIME ZONE
	)`)

	// Ensure settings table exists
	ensureTable("settings", `CREATE TABLE IF NOT EXISTS settings (
		id SERIAL PRIMARY KEY,
		key VARCHAR(100) UNIQUE NOT NULL,
		value VARCHAR(500) NOT NULL DEFAULT '',
		created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
		updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
	)`)

	// Ensure products table exists
	ensureTable("products", `CREATE TABLE IF NOT EXISTS products (
		id SERIAL PRIMARY KEY,
		headout_id VARCHAR(100) UNIQUE NOT NULL,
		title VARCHAR(500) NOT NULL DEFAULT '',
		description TEXT DEFAULT '',
		city_code VARCHAR(100) DEFAULT '',
		city_name VARCHAR(255) DEFAULT '',
		category VARCHAR(255) DEFAULT '',
		image_url VARCHAR(500) DEFAULT '',
		currency VARCHAR(10) DEFAULT '',
		price_from NUMERIC(12,4) DEFAULT 0,
		rating NUMERIC(3,2) DEFAULT 0,
		review_count INTEGER DEFAULT 0,
		duration VARCHAR(100) DEFAULT '',
		raw_headout_data jsonb DEFAULT '{}',
		last_synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
		created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
		updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
		deleted_at TIMESTAMP WITH TIME ZONE
	)`)
	ensureTable("product_availabilities", `CREATE TABLE IF NOT EXISTS product_availabilities (
		id SERIAL PRIMARY KEY,
		product_id INTEGER NOT NULL REFERENCES products(id),
		headout_product_id VARCHAR(100) DEFAULT '',
		variant_id VARCHAR(100) DEFAULT '',
		variant_title VARCHAR(500) DEFAULT '',
		date VARCHAR(20) DEFAULT '',
		start_time VARCHAR(20) DEFAULT '',
		end_time VARCHAR(20) DEFAULT '',
		inventory_id VARCHAR(100) DEFAULT '',
		inventory_type VARCHAR(50) DEFAULT '',
		price_amount NUMERIC(12,4) DEFAULT 0,
		currency VARCHAR(10) DEFAULT '',
		available_slots INTEGER DEFAULT 0,
		raw_headout_data jsonb DEFAULT '{}',
		created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
		updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
	)`)
	db.Exec(`CREATE INDEX IF NOT EXISTS idx_products_city_code ON products(city_code)`)
	db.Exec(`CREATE INDEX IF NOT EXISTS idx_product_availabilities_product_id ON product_availabilities(product_id)`)
	db.Exec(`CREATE INDEX IF NOT EXISTS idx_product_availabilities_headout_product_id ON product_availabilities(headout_product_id)`)

	// Ensure default fetch_fresh setting exists (after table creation)
	var settingCount int64
	db.Model(&models.Setting{}).Where("key = ?", "fetch_fresh").Count(&settingCount)
	if settingCount == 0 {
		db.Create(&models.Setting{Key: "fetch_fresh", Value: "true"})
	}

	return nil
}

func ensureTable(name, ddl string) {
	if !db.Migrator().HasTable(name) {
		logger.Infof("Creating table: %s", name)
		if err := db.Exec(ddl).Error; err != nil {
			logger.Errorf("Failed to create table %s: %v", name, err)
		}
	}
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
		&models.Cart{},
		&models.CartItem{},
		&models.GTTDFeedUploadStatus{},
		&models.User{},
		&models.HelpSubmission{},
		&models.PasswordResetToken{},
		&models.Visitor{},
		&models.PageVisit{},
		&models.RefreshToken{},
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
