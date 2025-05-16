-- Remove hourly_wage column from time_entries table
ALTER TABLE time_entries
DROP COLUMN hourly_wage;

-- Update project_funding table to reflect that amount is now in hours instead of euros
ALTER TABLE project_funding 
CHANGE COLUMN amount amount DECIMAL(10, 2) DEFAULT 0.00 COMMENT 'Amount in hours'; 