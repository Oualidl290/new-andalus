-- Initialize New Andalus database
-- This file is executed when the PostgreSQL container starts for the first time

-- Create extensions if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- The tables will be created by Drizzle migrations
-- This file is mainly for any initial setup or extensions