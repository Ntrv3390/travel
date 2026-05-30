-- Note: Tables managed by GORM AutoMigrate are NOT created here.
-- GORM creates them on application startup with matching column types.
-- This file is kept for reference and any manual-override tables.

-- Create indexes on the experiences table (created by GORM)
CREATE INDEX IF NOT EXISTS idx_experiences_status ON experiences(status);
CREATE INDEX IF NOT EXISTS idx_experiences_category ON experiences(category);
CREATE INDEX IF NOT EXISTS idx_experiences_headout_id ON experiences(headout_id);

-- Ensure cart_items has the guest_counts jsonb column (GORM AutoMigrate sometimes misses this)
ALTER TABLE cart_items ADD COLUMN IF NOT EXISTS guest_counts jsonb DEFAULT '{}';
