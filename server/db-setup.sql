-- Create database
CREATE DATABASE IF NOT EXISTS drupdb;
USE drupdb;

-- Users table with expanded roles
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  full_name VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL,
  role ENUM('project_manager', 'admin', 'hr', 'accountant', 'department_head', 'vsrc', 'employee') NOT NULL DEFAULT 'project_manager',
  language VARCHAR(5) DEFAULT 'en',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Projects table (Projekti) with extended properties
CREATE TABLE IF NOT EXISTS projects (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  start_date DATE,
  end_date DATE,
  budget DECIMAL(15, 2) DEFAULT 0,
  contract_number VARCHAR(100),
  min_workload DECIMAL(5, 2) DEFAULT 0, -- Minimum workload percentage
  created_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Departments table (Nodaļas)
CREATE TABLE IF NOT EXISTS departments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Project_User relation table with workload information
CREATE TABLE IF NOT EXISTS project_users (
  project_id INT,
  user_id INT,
  role VARCHAR(50) DEFAULT 'employee',
  workload DECIMAL(5, 2) DEFAULT 100.00, -- Percentage of workload (e.g., 50.00 = 50%)
  PRIMARY KEY (project_id, user_id),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Department_User relation table
CREATE TABLE IF NOT EXISTS department_users (
  department_id INT,
  user_id INT,
  PRIMARY KEY (department_id, user_id),
  FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create initial admin user (password: admin123)
INSERT INTO users (username, password, full_name, email, role) 
VALUES ('admin', '$2b$10$8KvTK6XuYSG7rRQeM6H7Gu3Z8Pfb1bR9LnfwSJWZ9MDGIrJVeDWGG', 'Admin User', 'admin@drup.com', 'admin');

-- Add some example users with different roles
INSERT IGNORE INTO users (username, password, full_name, email, role)
VALUES 
('manager1', '$2b$10$8KvTK6XuYSG7rRQeM6H7Gu3Z8Pfb1bR9LnfwSJWZ9MDGIrJVeDWGG', 'Project Manager', 'manager@drup.com', 'project_manager'),
('hr1', '$2b$10$8KvTK6XuYSG7rRQeM6H7Gu3Z8Pfb1bR9LnfwSJWZ9MDGIrJVeDWGG', 'HR Staff', 'hr@drup.com', 'hr'),
('accountant1', '$2b$10$8KvTK6XuYSG7rRQeM6H7Gu3Z8Pfb1bR9LnfwSJWZ9MDGIrJVeDWGG', 'Accountant', 'accountant@drup.com', 'accountant'),
('dept_head1', '$2b$10$8KvTK6XuYSG7rRQeM6H7Gu3Z8Pfb1bR9LnfwSJWZ9MDGIrJVeDWGG', 'Department Head', 'dept_head@drup.com', 'department_head'),
('vsrc1', '$2b$10$8KvTK6XuYSG7rRQeM6H7Gu3Z8Pfb1bR9LnfwSJWZ9MDGIrJVeDWGG', 'VSRC Staff', 'vsrc@drup.com', 'vsrc'),
('employee1', '$2b$10$8KvTK6XuYSG7rRQeM6H7Gu3Z8Pfb1bR9LnfwSJWZ9MDGIrJVeDWGG', 'Regular Employee', 'employee@drup.com', 'employee'); 