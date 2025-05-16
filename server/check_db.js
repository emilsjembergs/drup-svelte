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

async function checkTables() {
  try {
    const [tables] = await pool.query('SHOW TABLES');
    console.log('Tables in the database:');
    tables.forEach(table => {
      const tableName = Object.values(table)[0];
      console.log(`  ${tableName}`);
    });
    
    const [projectFields] = await pool.query('DESCRIBE projects');
    console.log('\nProjects table structure:');
    projectFields.forEach(field => {
      console.log(`  ${field.Field} (${field.Type})`);
    });
  } catch (err) {
    console.error('Error getting table info:', err);
  } finally {
    await pool.end();
  }
}

checkTables(); 