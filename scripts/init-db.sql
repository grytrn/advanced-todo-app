-- Database initialization script
-- This runs when the PostgreSQL container starts

-- Create custom types
CREATE TYPE user_role AS ENUM ('ADMIN', 'USER', 'VENDOR');

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For text search

-- Set default timezone
SET timezone = 'UTC';

-- Create application user (for production, use a strong password)
-- This is handled by Prisma migrations in production
-- DO $$
-- BEGIN
--     IF NOT EXISTS (SELECT FROM pg_user WHERE usename = 'app_user') THEN
--         CREATE USER app_user WITH PASSWORD 'change_me_in_production';
--     END IF;
-- END $$;

-- Grant permissions
-- GRANT ALL PRIVILEGES ON DATABASE app_db TO app_user;

-- Note: Actual tables are created by Prisma migrations
-- This file is for database-level setup only

COMMENT ON DATABASE app_db IS 'Multi-Agent Template Application Database';
