-- Add password and email verification fields to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS password varchar(255) NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified timestamp;