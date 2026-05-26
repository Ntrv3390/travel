-- Create experiences table (updated for GTTD integration)
CREATE TABLE IF NOT EXISTS experiences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  headout_id VARCHAR(255) UNIQUE NOT NULL,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  city VARCHAR(255),
  country VARCHAR(255),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  poi_id VARCHAR(500),
  poi_name VARCHAR(500),
  category VARCHAR(100),
  location VARCHAR(255),
  duration VARCHAR(50),
  duration_min_seconds INT,
  duration_max_seconds INT,
  min_group_size INT DEFAULT 1,
  max_group_size INT DEFAULT 50,
  price DECIMAL(10, 2),
  currency VARCHAR(3) DEFAULT 'USD',
  headout_rating DECIMAL(3, 2),
  headout_review_count INT DEFAULT 0,
  image_url TEXT,
  images JSONB,
  tags TEXT,
  availability TEXT,
  operator_name VARCHAR(255),
  operator_description TEXT,
  categories TEXT[],
  languages TEXT[],
  cancellation_policy JSONB,
  raw_headout_data JSONB,
  status VARCHAR(50) DEFAULT 'active',
  is_active BOOLEAN DEFAULT true,
  gttd_enabled BOOLEAN DEFAULT false,
  last_synced_at TIMESTAMP,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Create experience_options table
CREATE TABLE IF NOT EXISTS experience_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  experience_id UUID REFERENCES experiences(id) ON DELETE CASCADE,
  headout_variant_id VARCHAR(255),
  title VARCHAR(500) NOT NULL,
  description TEXT,
  base_price_amount DECIMAL(12, 4) NOT NULL,
  base_price_currency VARCHAR(10) NOT NULL,
  fulfillment_mobile BOOLEAN DEFAULT true,
  fulfillment_print BOOLEAN DEFAULT false,
  fulfillment_pickup BOOLEAN DEFAULT false,
  inclusions TEXT[],
  exclusions TEXT[],
  highlights TEXT[],
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_experience_options_experience_id ON experience_options(experience_id);

-- Create pricing_rules table (GTTD-enabled)
CREATE TABLE IF NOT EXISTS pricing_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255),
  applies_to VARCHAR(50) DEFAULT 'ALL',
  target_id UUID,
  target_city VARCHAR(255),
  markup_percentage DECIMAL(5, 2) DEFAULT 0,
  fixed_fee_amount DECIMAL(10, 4) DEFAULT 0,
  fixed_fee_currency VARCHAR(10) DEFAULT 'USD',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pricing_rules_applies_to ON pricing_rules(applies_to);
CREATE INDEX IF NOT EXISTS idx_pricing_rules_target_id ON pricing_rules(target_id);
CREATE INDEX IF NOT EXISTS idx_pricing_rules_target_city ON pricing_rules(target_city);

-- Create bookings table
CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id VARCHAR(255) UNIQUE NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  experience_id UUID NOT NULL REFERENCES experiences(id) ON DELETE CASCADE,
  option_id UUID REFERENCES experience_options(id),
  headout_reference VARCHAR(255),
  status VARCHAR(50) NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  total_price DECIMAL(10, 2),
  currency VARCHAR(3) DEFAULT 'USD',
  booking_date TIMESTAMPTZ,
  experience_date DATE,
  experience_time VARCHAR(50),
  customer_email VARCHAR(255),
  customer_phone VARCHAR(20),
  special_requests TEXT,
  confirmation_email VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_experience_id ON bookings(experience_id);

-- Create google_feed_status table (comprehensive tracking)
CREATE TABLE IF NOT EXISTS google_feed_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  environment VARCHAR(20) NOT NULL,
  upload_started_at TIMESTAMPTZ,
  upload_completed_at TIMESTAMPTZ,
  status VARCHAR(50),
  product_count INT DEFAULT 0,
  shard_count INT DEFAULT 1,
  nonce BIGINT,
  file_paths TEXT[],
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_google_feed_status_env ON google_feed_status(environment);
CREATE INDEX IF NOT EXISTS idx_google_feed_status_status ON google_feed_status(status);

-- Create POI mappings table
CREATE TABLE IF NOT EXISTS poi_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  headout_location_name VARCHAR(500),
  headout_city VARCHAR(255),
  google_place_id VARCHAR(500) UNIQUE NOT NULL,
  google_place_name VARCHAR(500),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_poi_mappings_google_place_id ON poi_mappings(google_place_id);
CREATE INDEX IF NOT EXISTS idx_poi_mappings_headout_city ON poi_mappings(headout_city);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_experiences_status ON experiences(status);
CREATE INDEX IF NOT EXISTS idx_experiences_category ON experiences(category);
CREATE INDEX IF NOT EXISTS idx_experiences_city ON experiences(city);
CREATE INDEX IF NOT EXISTS idx_experiences_headout_id ON experiences(headout_id);
CREATE INDEX IF NOT EXISTS idx_experiences_gttd_enabled ON experiences(gttd_enabled);
CREATE INDEX IF NOT EXISTS idx_pricing_rules_experience_id ON pricing_rules(target_id);
