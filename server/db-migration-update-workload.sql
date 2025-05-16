-- Update comment on workload column to indicate it's in hours
ALTER TABLE project_users
MODIFY COLUMN workload DECIMAL(10, 2) DEFAULT 0.00 COMMENT 'Workload in hours (not percentage)';

-- Update any existing references in schema that might refer to workload as percentage
-- Note: this is just documentation, any actual data transformation would need to be done separately 