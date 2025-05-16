import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import path from 'path';

// Get directory name in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configure dotenv to read from server/.env
dotenv.config({ path: path.join(__dirname, '.env') });

// Create database connection
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'drupdb',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

async function migrate() {
  try {
    console.log('Running migrations...');
    
    // Create funding_sources table
    console.log('Creating funding_sources table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS funding_sources (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create project_funding table without foreign keys
    console.log('Creating project_funding table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS project_funding (
        project_id INT NOT NULL,
        funding_source_id INT NOT NULL,
        amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
        percentage DECIMAL(5, 2) NOT NULL DEFAULT 0,
        PRIMARY KEY (project_id, funding_source_id)
      )
    `);
    
    // Create time_entries table without foreign keys
    console.log('Creating time_entries table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS time_entries (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT NOT NULL,
        project_id INT NOT NULL,
        date DATE NOT NULL,
        hours DECIMAL(5, 2) NOT NULL,
        description TEXT,
        entry_type ENUM('work', 'vacation', 'sick_leave', 'holiday', 'other') DEFAULT 'work',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create time_entry_funding table without foreign keys
    console.log('Creating time_entry_funding table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS time_entry_funding (
        time_entry_id INT NOT NULL,
        funding_source_id INT NOT NULL,
        percentage DECIMAL(5, 2) NOT NULL DEFAULT 100,
        hours DECIMAL(5, 2) NOT NULL,
        PRIMARY KEY (time_entry_id, funding_source_id)
      )
    `);
    
    console.log('All migrations completed successfully');
  } catch (error) {
    console.error('Migration error:', error);
  } finally {
    await pool.end();
  }
}

migrate(); 