-- Add missing columns to project_users table
ALTER TABLE project_users
ADD COLUMN IF NOT EXISTS workload INT DEFAULT 100; 