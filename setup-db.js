import mysql from 'mysql2/promise';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Get directory name in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function setupDatabase() {
  try {
    // Create connection without database selection
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: ''
    });

    console.log('Connected to MySQL server');

    // Create database if it doesn't exist
    await connection.query('CREATE DATABASE IF NOT EXISTS drupdb');
    console.log('Database drupdb created or already exists');

    // Switch to the database
    await connection.query('USE drupdb');
    console.log('Using drupdb database');

    // Read SQL setup file
    const sqlFile = path.join(__dirname, 'server', 'db-setup.sql');
    const sqlContent = await fs.readFile(sqlFile, 'utf8');
    
    // Split SQL commands by semicolon
    const commands = sqlContent.split(';').filter(cmd => cmd.trim() !== '');
    
    // Execute each command
    for (const command of commands) {
      if (command.trim()) {
        await connection.query(command);
      }
    }
    
    console.log('Database setup completed successfully');
    
    // Check if tables were created
    const [tables] = await connection.query('SHOW TABLES');
    console.log('Tables in database:', tables.map(t => Object.values(t)[0]));
    
    // Close connection
    await connection.end();
    console.log('Database connection closed');
    
    return true;
  } catch (error) {
    console.error('Error setting up database:', error);
    return false;
  }
}

setupDatabase(); 