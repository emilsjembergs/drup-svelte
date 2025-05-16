import { config } from 'dotenv';
import fs from 'fs';
import path from 'path';
import mysql from 'mysql2/promise';
import { fileURLToPath } from 'url';

config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function updateDatabase() {
  console.log('Updating database schema - changing workload to hours...');
  
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
    const migrationFile = path.join(__dirname, 'db-migration-update-workload.sql');
    const sql = fs.readFileSync(migrationFile, 'utf8');
    
    // Execute the SQL migration
    console.log('Executing SQL migration...');
    const statements = sql.split(';').filter(stmt => stmt.trim().length > 0);
    
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

updateDatabase(); 