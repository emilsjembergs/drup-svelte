import { config } from 'dotenv';
import fs from 'fs';
import path from 'path';
import mysql from 'mysql2/promise';
import { fileURLToPath } from 'url';

config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function updateDatabase() {
  console.log('Updating database schema - removing hourly_wage column...');
  
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
    const migrationFile = path.join(__dirname, 'db-migration-remove-hourly-wage.sql');
    const sql = fs.readFileSync(migrationFile, 'utf8');
    
    // Execute the SQL migration
    console.log('Executing SQL migration...');
    
    // Split SQL by semicolon to handle multiple statements
    const statements = sql.split(';').filter(statement => statement.trim() !== '');
    
    for (const statement of statements) {
      if (statement.trim()) {
        await pool.query(statement);
        console.log(`Executed: ${statement.trim().substring(0, 80)}...`);
      }
    }
    
    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Error updating database:', error);
  } finally {
    await pool.end();
  }
}

// Run the update
updateDatabase(); 