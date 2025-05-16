-- Migration to add language support to users table
USE drupdb;

-- Add language column if it doesn't exist
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS language VARCHAR(5) DEFAULT 'en';

-- Update existing users to have 'en' as default language
UPDATE users SET language = 'en' WHERE language IS NULL; 