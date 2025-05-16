import mysql from 'mysql2/promise';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Get directory name in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configure dotenv
dotenv.config();

// Test user data
const testUser = {
  username: 'testpm',
  password: 'password123',
  full_name: 'Test Project Manager',
  email: 'testpm@example.com',
  role: 'project_manager'
};

async function createTestUser() {
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
    
    // Check if user already exists
    const [existingUsers] = await pool.query('SELECT * FROM users WHERE username = ?', [testUser.username]);
    
    if (existingUsers.length > 0) {
      console.log(`User '${testUser.username}' already exists with ID: ${existingUsers[0].id}`);
      await pool.end();
      return;
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(testUser.password, 10);
    
    // Insert user into database
    const [result] = await pool.query(
      'INSERT INTO users (username, password, full_name, email, role) VALUES (?, ?, ?, ?, ?)',
      [testUser.username, hashedPassword, testUser.full_name, testUser.email, testUser.role]
    );
    
    console.log(`User '${testUser.username}' created successfully with ID: ${result.insertId}`);
    console.log(`Login credentials: ${testUser.username} / ${testUser.password}`);
  } catch (error) {
    console.error('Error creating test user:', error);
  } finally {
    await pool.end();
  }
}

createTestUser(); 