import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Get directory name in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configure dotenv
dotenv.config();

async function updateTimeEntries() {
  console.log('Updating time_entries table...');
  
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'drupdb',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });
  
  try {
    // Read the SQL migration file
    const migrationFile = path.join(__dirname, 'db-migration-add-hourly-wage.sql');
    const sql = fs.readFileSync(migrationFile, 'utf8');
    
    // Execute the SQL migration
    console.log('Executing SQL migration...');
    
    // Split SQL by semicolon to handle multiple statements
    const statements = sql.split(';').filter(statement => statement.trim() !== '');
    
    for (const statement of statements) {
      await pool.query(statement);
    }
    
    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Error updating database:', error);
  } finally {
    await pool.end();
  }
}

updateTimeEntries(); 