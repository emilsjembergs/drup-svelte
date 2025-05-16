-- Migration to fix departments table
USE drupdb;

-- Check if head_id column exists and drop it if it does
SET @query = (
  SELECT IF(
    EXISTS(
      SELECT * 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = 'drupdb' 
      AND TABLE_NAME = 'departments' 
      AND COLUMN_NAME = 'head_id'
    ),
    'ALTER TABLE departments DROP FOREIGN KEY departments_ibfk_1, DROP COLUMN head_id;',
    'SELECT 1;'
  )
);

PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt; 