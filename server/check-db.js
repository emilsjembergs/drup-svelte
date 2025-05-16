import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

// Configure dotenv
dotenv.config();

async function checkDatabase() {
  // Database connection
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
    console.log('Connected to database');
    
    // Check project table structure
    console.log('Checking projects table structure...');
    const [columns] = await pool.query('DESCRIBE projects');
    
    console.log('Projects table columns:');
    columns.forEach(col => {
      console.log(`  ${col.Field} (${col.Type})`);
    });
    
    // Check if we have any projects
    const [projects] = await pool.query('SELECT * FROM projects');
    console.log('Number of projects:', projects.length);
    
    // List tables in database
    const [tables] = await pool.query('SHOW TABLES');
    console.log('Tables in database:');
    tables.forEach(table => {
      console.log(`  ${Object.values(table)[0]}`);
    });
    
  } catch (error) {
    console.error('Error checking database:', error);
  } finally {
    await pool.end();
  }
}

checkDatabase(); 