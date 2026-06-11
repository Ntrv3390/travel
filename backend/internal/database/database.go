package database

import (
	"fmt"
	"time"

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

	if sqlDB, sqlErr := db.DB(); sqlErr == nil {
		sqlDB.SetMaxOpenConns(25)
		sqlDB.SetMaxIdleConns(5)
		sqlDB.SetConnMaxLifetime(5 * time.Minute)
		sqlDB.SetConnMaxIdleTime(1 * time.Minute)
	}

	logger.Info("Database connection established")

	// Run migrations
	if err = Migrate(); err != nil {
		return fmt.Errorf("database migration failed: %w", err)
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

	// Ensure carts table has all required columns (AutoMigrate may miss them)
	if err := db.Exec(`ALTER TABLE carts ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT '';`).Error; err != nil {
		logger.Warnf("Could not add currency column to carts: %v", err)
	}
	if err := db.Exec(`ALTER TABLE carts ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE;`).Error; err != nil {
		logger.Warnf("Could not add expires_at column to carts: %v", err)
	}
	if err := db.Exec(`ALTER TABLE carts ADD COLUMN IF NOT EXISTS auth_type VARCHAR(50) DEFAULT 'anonymous';`).Error; err != nil {
		logger.Warnf("Could not add auth_type column to carts: %v", err)
	}
	if db.Migrator().HasColumn("carts", "user_id") {
		db.Exec(`ALTER TABLE carts ALTER COLUMN user_id DROP DEFAULT`)
		db.Exec(`UPDATE carts SET user_id = 0 WHERE user_id IS NULL`)
		db.Exec(`ALTER TABLE carts ALTER COLUMN user_id SET DEFAULT 0`)
	}

	// Ensure cart_items has all required columns (AutoMigrate may miss them)
	if err := db.Exec(`ALTER TABLE cart_items ADD COLUMN IF NOT EXISTS guest_counts jsonb DEFAULT '{}';`).Error; err != nil {
		logger.Warnf("Could not add guest_counts column to cart_items (may not exist yet): %v", err)
	}
	if err := db.Exec(`ALTER TABLE cart_items ADD COLUMN IF NOT EXISTS input_fields jsonb DEFAULT '[]';`).Error; err != nil {
		logger.Warnf("Could not add input_fields column to cart_items: %v", err)
	}
	if err := db.Exec(`ALTER TABLE cart_items ADD COLUMN IF NOT EXISTS pax_min INTEGER DEFAULT 0;`).Error; err != nil {
		logger.Warnf("Could not add pax_min column to cart_items: %v", err)
	}
	if err := db.Exec(`ALTER TABLE cart_items ADD COLUMN IF NOT EXISTS pax_max INTEGER DEFAULT 0;`).Error; err != nil {
		logger.Warnf("Could not add pax_max column to cart_items: %v", err)
	}
	if err := db.Exec(`ALTER TABLE cart_items ADD COLUMN IF NOT EXISTS original_price_amount NUMERIC(12,4) DEFAULT 0;`).Error; err != nil {
		logger.Warnf("Could not add original_price_amount column to cart_items: %v", err)
	}
	if err := db.Exec(`ALTER TABLE cart_items ADD COLUMN IF NOT EXISTS original_currency VARCHAR(10) DEFAULT '';`).Error; err != nil {
		logger.Warnf("Could not add original_currency column to cart_items: %v", err)
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

	// Idempotency key: clear empty strings, drop old non-partial index, create partial unique index
	db.Exec("UPDATE bookings SET idempotency_key = NULL WHERE idempotency_key = ''")
	db.Exec("DROP INDEX IF EXISTS idx_bookings_idempotency_key")
	db.Exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_idem_partial ON bookings(idempotency_key) WHERE idempotency_key IS NOT NULL AND idempotency_key != ''")

	// Performance indexes
	db.Exec("CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status) WHERE deleted_at IS NULL")
	db.Exec("CREATE INDEX IF NOT EXISTS idx_bookings_session_id ON bookings(session_id) WHERE deleted_at IS NULL")
	db.Exec("CREATE INDEX IF NOT EXISTS idx_bookings_product_id ON bookings(product_id) WHERE deleted_at IS NULL")
	db.Exec("CREATE INDEX IF NOT EXISTS idx_pav_variant_date ON product_availabilities(variant_id, date)")

	// Missing schema columns
	db.Exec("ALTER TABLE bookings ADD COLUMN IF NOT EXISTS cancellation_policy jsonb DEFAULT '{}'")
	db.Exec("ALTER TABLE bookings ADD COLUMN IF NOT EXISTS cancellation_deadline TIMESTAMPTZ")
	db.Exec("ALTER TABLE bookings ADD COLUMN IF NOT EXISTS pax_pricing jsonb DEFAULT '{}'")
	db.Exec("ALTER TABLE cart_items ADD COLUMN IF NOT EXISTS pax_pricing jsonb DEFAULT '{}'")
	db.Exec("ALTER TABLE product_availabilities ADD COLUMN IF NOT EXISTS max_bookable_quantity INTEGER DEFAULT 0")
	db.Exec("ALTER TABLE product_availabilities ADD COLUMN IF NOT EXISTS min_bookable_quantity INTEGER DEFAULT 1")

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

	// Sync jobs table
	ensureTable("sync_jobs", `CREATE TABLE IF NOT EXISTS sync_jobs (
		id SERIAL PRIMARY KEY,
		job_id VARCHAR(100) UNIQUE NOT NULL,
		status VARCHAR(20) NOT NULL DEFAULT 'pending',
		type VARCHAR(20) NOT NULL DEFAULT 'full',
		total_products INTEGER DEFAULT 0,
		processed_products INTEGER DEFAULT 0,
		successful_products INTEGER DEFAULT 0,
		failed_products INTEGER DEFAULT 0,
		worker_count INTEGER DEFAULT 20,
		error_message TEXT DEFAULT '',
		started_at TIMESTAMP WITH TIME ZONE,
		completed_at TIMESTAMP WITH TIME ZONE,
		created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
		updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
		deleted_at TIMESTAMP WITH TIME ZONE
	)`)
	db.Exec(`CREATE INDEX IF NOT EXISTS idx_sync_jobs_status ON sync_jobs(status)`)
	db.Exec(`CREATE INDEX IF NOT EXISTS idx_sync_jobs_job_id ON sync_jobs(job_id)`)

	ensureTable("sync_job_failed_products", `CREATE TABLE IF NOT EXISTS sync_job_failed_products (
		id SERIAL PRIMARY KEY,
		sync_job_id INTEGER NOT NULL REFERENCES sync_jobs(id),
		product_id INTEGER NOT NULL,
		headout_id VARCHAR(100) NOT NULL,
		product_name VARCHAR(500) DEFAULT '',
		error_message TEXT DEFAULT '',
		failure_type VARCHAR(50) DEFAULT '',
		created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
	)`)
	db.Exec(`CREATE INDEX IF NOT EXISTS idx_sync_job_failed_products_job_id ON sync_job_failed_products(sync_job_id)`)

	// Add availability tracking columns to products
	if err := db.Exec(`ALTER TABLE products ADD COLUMN IF NOT EXISTS is_available BOOLEAN DEFAULT TRUE`).Error; err != nil {
		logger.Warnf("Could not add is_available column: %v", err)
	}
	if err := db.Exec(`ALTER TABLE products ADD COLUMN IF NOT EXISTS last_availability_sync_at TIMESTAMP WITH TIME ZONE`).Error; err != nil {
		logger.Warnf("Could not add last_availability_sync_at column: %v", err)
	}
	if err := db.Exec(`ALTER TABLE products ADD COLUMN IF NOT EXISTS metadata_synced_at TIMESTAMP WITH TIME ZONE`).Error; err != nil {
		logger.Warnf("Could not add metadata_synced_at column: %v", err)
	}

	// Ensure api_cache table exists (for caching list endpoints like categories, collections, subcategories)
	ensureTable("api_caches", `CREATE TABLE IF NOT EXISTS api_caches (
		id SERIAL PRIMARY KEY,
		endpoint VARCHAR(200) UNIQUE NOT NULL,
		response jsonb NOT NULL DEFAULT '{}',
		created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
		updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
	)`)

	// Ensure home_categories table exists
	ensureTable("home_categories", `CREATE TABLE IF NOT EXISTS home_categories (
		id SERIAL PRIMARY KEY,
		name VARCHAR(100) NOT NULL,
		slug VARCHAR(100) UNIQUE NOT NULL,
		description VARCHAR(255) DEFAULT '',
		image_url VARCHAR(500) DEFAULT '',
		icon_name VARCHAR(50) DEFAULT '',
		sort_order INTEGER DEFAULT 0,
		is_active BOOLEAN DEFAULT TRUE,
		created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
		updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
	)`)

	// Ensure home_collections table exists
	ensureTable("home_collections", `CREATE TABLE IF NOT EXISTS home_collections (
		id SERIAL PRIMARY KEY,
		title VARCHAR(200) NOT NULL,
		slug VARCHAR(100) UNIQUE NOT NULL,
		description VARCHAR(255) DEFAULT '',
		image_url VARCHAR(500) DEFAULT '',
		experience_count INTEGER DEFAULT 0,
		sort_order INTEGER DEFAULT 0,
		is_active BOOLEAN DEFAULT TRUE,
		created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
		updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
	)`)

	// Seed default home categories
	var catCount int64
	db.Model(&models.HomeCategory{}).Count(&catCount)
	if catCount == 0 {
		categories := []models.HomeCategory{
			{Name: "Adventure", Slug: "adventure", Description: "Thrilling outdoor activities", IconName: "mountain", SortOrder: 1, IsActive: true},
			{Name: "Cultural", Slug: "cultural", Description: "Museums, history & heritage", IconName: "landmark", SortOrder: 2, IsActive: true},
			{Name: "Food & Drink", Slug: "food-drink", Description: "Tastings & culinary tours", IconName: "utensils", SortOrder: 3, IsActive: true},
			{Name: "Nature", Slug: "nature", Description: "Parks, trails & wildlife", IconName: "trees", SortOrder: 4, IsActive: true},
			{Name: "Wellness", Slug: "wellness", Description: "Spa, yoga & meditation", IconName: "sparkles", SortOrder: 5, IsActive: true},
			{Name: "Nightlife", Slug: "nightlife", Description: "Clubs, bars & shows", IconName: "music", SortOrder: 6, IsActive: true},
		}
		for i := range categories {
			db.Create(&categories[i])
		}
	}

	// Seed default home collections
	var colCount int64
	db.Model(&models.HomeCollection{}).Count(&colCount)
	if colCount == 0 {
		collections := []models.HomeCollection{
			{Title: "Weekend Getaways", Slug: "weekend-getaways", Description: "Short escapes that feel like a real vacation", ImageURL: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80", ExperienceCount: 48, SortOrder: 1, IsActive: true},
			{Title: "Bucket List Adventures", Slug: "bucket-list-adventures", Description: "Once-in-a-lifetime experiences you'll never forget", ImageURL: "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800&q=80", ExperienceCount: 36, SortOrder: 2, IsActive: true},
			{Title: "Family Fun", Slug: "family-fun", Description: "Kid-approved activities for the whole family", ImageURL: "https://images.unsplash.com/photo-1445019980597-93fa8acb246c?w=800&q=80", ExperienceCount: 52, SortOrder: 3, IsActive: true},
		}
		for i := range collections {
			db.Create(&collections[i])
		}
	}

	// Ensure testimonials table exists + seed default data
	ensureTable("testimonials", `CREATE TABLE IF NOT EXISTS testimonials (
		id SERIAL PRIMARY KEY,
		name VARCHAR(100) NOT NULL,
		location VARCHAR(100) DEFAULT '',
		text TEXT NOT NULL,
		rating INTEGER DEFAULT 5,
		avatar VARCHAR(10) DEFAULT '',
		color VARCHAR(100) DEFAULT '',
		sort_order INTEGER DEFAULT 0,
		is_active BOOLEAN DEFAULT TRUE,
		created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
		updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
	)`)
	var testCount int64
	db.Model(&models.Testimonial{}).Count(&testCount)
	if testCount == 0 {
		testimonials := []models.Testimonial{
			{Name: "Sarah Johnson", Location: "New York, USA", Text: "Absolutely incredible! The sunset safari exceeded every expectation. Our guide was knowledgeable, the views were breathtaking, and every detail was perfectly organized.", Rating: 5, Avatar: "SJ", Color: "from-sky-400 to-cyan-500", SortOrder: 1, IsActive: true},
			{Name: "Marcus Chen", Location: "Melbourne, Australia", Text: "The street food tour was a highlight of our Bangkok trip. We visited hidden gems we never would have found on our own. Already planning our next Triipzy adventure!", Rating: 5, Avatar: "MC", Color: "from-emerald-400 to-teal-500", SortOrder: 2, IsActive: true},
			{Name: "Priya Patel", Location: "Mumbai, India", Text: "Booking through Triipzy was seamless. The Northern Lights tour was magical — the photographers knew exactly where to take us. Worth every penny!", Rating: 5, Avatar: "PP", Color: "from-purple-400 to-indigo-500", SortOrder: 3, IsActive: true},
			{Name: "James Wilson", Location: "London, UK", Text: "I've used many travel platforms, but Triipzy stands out. The curated experiences are unique, customer support is responsive, and the pricing is transparent.", Rating: 4, Avatar: "JW", Color: "from-amber-400 to-orange-500", SortOrder: 4, IsActive: true},
			{Name: "Emma Laurent", Location: "Paris, France", Text: "The hot air balloon ride in Cappadocia was the most magical morning of my life. Everything from pickup to drop-off was flawlessly coordinated. Thank you Triipzy!", Rating: 5, Avatar: "EL", Color: "from-rose-400 to-pink-500", SortOrder: 5, IsActive: true},
		}
		for i := range testimonials {
			db.Create(&testimonials[i])
		}
	}

	// Ensure categories, subcategories, collections tables exist (for Headout data)
	ensureTable("categories", `CREATE TABLE IF NOT EXISTS categories (
		id SERIAL PRIMARY KEY,
		category_id VARCHAR(100) UNIQUE NOT NULL,
		name VARCHAR(255) NOT NULL,
		image_url VARCHAR(500) DEFAULT '',
		raw_headout_data jsonb DEFAULT '{}',
		last_synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
		created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
		updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
		deleted_at TIMESTAMP WITH TIME ZONE
	)`)
	ensureTable("subcategories", `CREATE TABLE IF NOT EXISTS subcategories (
		id SERIAL PRIMARY KEY,
		subcategory_id VARCHAR(100) UNIQUE NOT NULL,
		name VARCHAR(255) NOT NULL,
		raw_headout_data jsonb DEFAULT '{}',
		last_synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
		created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
		updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
		deleted_at TIMESTAMP WITH TIME ZONE
	)`)
	ensureTable("collections", `CREATE TABLE IF NOT EXISTS collections (
		id SERIAL PRIMARY KEY,
		collection_id VARCHAR(100) UNIQUE NOT NULL,
		name VARCHAR(255) NOT NULL,
		description TEXT DEFAULT '',
		hero_image_url VARCHAR(500) DEFAULT '',
		card_image_url VARCHAR(500) DEFAULT '',
		raw_headout_data jsonb DEFAULT '{}',
		last_synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
		created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
		updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
		deleted_at TIMESTAMP WITH TIME ZONE
	)`)

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
	// Pre-migration fixes: must run before AutoMigrate to prevent crash-loop.

	// carts.user_id was stored as text in an older schema; empty strings can't be
	// cast to bigint, so zero them out before AutoMigrate changes the column type.
	if db.Migrator().HasTable("carts") && db.Migrator().HasColumn("carts", "user_id") {
		db.Exec(`UPDATE carts SET user_id = '0' WHERE user_id::text = '' OR user_id IS NULL`)
	}

	// Tables created via raw DDL have Postgres-default constraint names (e.g.
	// "users_email_key") that differ from GORM's convention ("uni_users_email").
	// AutoMigrate drops the GORM name before re-adding it; if the GORM name doesn't
	// exist the DROP fails and the server crash-loops.
	// Fix: scan every single-column UNIQUE constraint in the public schema that isn't
	// already GORM-named, and create an alias with the GORM name so AutoMigrate can
	// drop/re-create it cleanly. Errors are swallowed — if the alias already exists
	// or the column already has two UNIQUE constraints we just move on.
	db.Exec(`DO $$
	DECLARE
		r      RECORD;
		gname  TEXT;
		exists INT;
	BEGIN
		FOR r IN (
			SELECT DISTINCT t.relname AS tbl, a.attname AS col
			FROM   pg_constraint c
			JOIN   pg_class     t ON t.oid = c.conrelid
			JOIN   pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(c.conkey)
			WHERE  c.contype = 'u'
			AND    array_length(c.conkey, 1) = 1
			AND    t.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
			AND    c.conname NOT LIKE 'uni_%'
		)
		LOOP
			gname := 'uni_' || r.tbl || '_' || r.col;
			SELECT COUNT(*) INTO exists
			FROM   pg_constraint
			WHERE  conname = gname
			AND    conrelid = r.tbl::regclass;

			IF exists = 0 THEN
				BEGIN
					EXECUTE 'ALTER TABLE ' || r.tbl ||
					        ' ADD CONSTRAINT ' || gname ||
					        ' UNIQUE (' || r.col || ')';
				EXCEPTION WHEN others THEN NULL;
				END;
			END IF;
		END LOOP;
	END $$`)

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
		&models.HomeCategory{},
		&models.HomeCollection{},
		&models.Testimonial{},
		&models.Category{},
		&models.Subcategory{},
		&models.Collection{},
		&models.SyncJob{},
		&models.SyncJobFailedProduct{},
		&models.RecentlyViewed{},
		&models.Product{},
		&models.ProductAvailability{},
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
