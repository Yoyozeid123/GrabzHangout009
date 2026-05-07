-- Add IP address column to banned_users table
ALTER TABLE banned_users ADD COLUMN IF NOT EXISTS ip_address TEXT;
