-- Add hourly_wage column to time_entries table
ALTER TABLE time_entries
ADD COLUMN hourly_wage DECIMAL(10, 2) DEFAULT 50.00 AFTER hours; 