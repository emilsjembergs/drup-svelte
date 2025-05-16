-- Add missing columns to projects table
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS budget DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS contract_number VARCHAR(255),
ADD COLUMN IF NOT EXISTS min_workload INT DEFAULT 0; 