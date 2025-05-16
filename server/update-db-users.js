import mysql from 'mysql2/promise';
import fs from 'fs';
import dotenv from 'dotenv';

// Configure dotenv
dotenv.config();

async function updateDatabase() {
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
    
    // Read SQL file
    const sql = fs.readFileSync('./update-project-users-table.sql', 'utf8');
    console.log('Executing SQL:', sql);
    
    // Execute SQL
    const [result] = await pool.query(sql);
    console.log('Database updated successfully:', result);
    
    // Check if the columns were added
    const [columns] = await pool.query('DESCRIBE project_users');
    console.log('Project_users table structure:');
    columns.forEach(col => {
      console.log(`  ${col.Field} (${col.Type})`);
    });
    
  } catch (error) {
    console.error('Error updating database:', error);
  } finally {
    await pool.end();
  }
}

updateDatabase(); 