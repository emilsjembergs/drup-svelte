import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import path from 'path';
import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';

// Get directory name in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configure dotenv to read from server/.env
dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Add CORS headers directly as middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  next();
});

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

// Authentication middleware
const authenticateToken = (req, res, next) => {
  console.log('Authentication middleware called');
  const authHeader = req.headers['authorization'];
  console.log('Auth header:', authHeader ? `Bearer ${authHeader.substring(7, 15)}...` : 'None');
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    console.log('No token provided');
    return res.status(401).json({ message: 'Access denied' });
  }
  
  jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret_key', (err, user) => {
    if (err) {
      console.log('Token verification failed:', err.message);
      return res.status(403).json({ message: 'Invalid token' });
    }
    console.log('Token verified successfully, user:', { id: user.id, username: user.username, role: user.role });
    req.user = user;
    next();
  });
};

// Authorization middleware - check if user is admin or project manager
const authorizeRole = (allowedRoles) => {
  return (req, res, next) => {
    console.log('Authorization middleware called, allowed roles:', allowedRoles);
    
    if (!req.user) {
      console.log('No user in request');
      return res.status(401).json({ message: 'Access denied' });
    }
    
    console.log('User role:', req.user.role);
    
    // Always allow admin, check other roles only if not admin
    if (req.user.role === 'admin' || allowedRoles.includes(req.user.role)) {
      console.log('Authorization successful');
      next();
    } else {
      console.log('Authorization failed - user role not in allowed roles');
      res.status(403).json({ message: 'Not authorized for this operation' });
    }
  };
};

// Routes
// Auth routes
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password, full_name, email, role } = req.body;
    
    console.log('Registration request received with role:', role);
    
    // Check if user already exists
    const [existingUsers] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);
    
    if (existingUsers.length > 0) {
      return res.status(409).json({ message: 'Username already exists' });
    }
    
    // Validate role
    const validRole = role === 'project_manager' || role === 'employee' ? role : 'employee';
    console.log('Validated role for registration:', validRole);
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Insert user into database
    const [result] = await pool.query(
      'INSERT INTO users (username, password, full_name, email, role) VALUES (?, ?, ?, ?, ?)',
      [username, hashedPassword, full_name, email, validRole]
    );
    
    // Verify the user was created with the correct role
    const [newUser] = await pool.query('SELECT username, role FROM users WHERE id = ?', [result.insertId]);
    console.log('New user created:', newUser[0]);
    
    res.status(201).json({ message: 'User created successfully', userId: result.insertId });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // Get user from database
    const [users] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);
    
    if (users.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    const user = users[0];
    console.log('User found during login:', { id: user.id, username: user.username, role: user.role });
    
    // Check password
    const validPassword = await bcrypt.compare(password, user.password);
    
    if (!validPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    // Create token
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET || 'fallback_secret_key',
      { expiresIn: '24h' }
    );
    
    console.log('Login successful, sending user data with role:', user.role);
    
    res.json({ 
      token, 
      user: { 
        id: user.id, 
        username: user.username, 
        full_name: user.full_name, 
        email: user.email, 
        role: user.role,
        language: user.language || 'en' 
      } 
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Projects routes
app.get('/api/projects', authenticateToken, async (req, res) => {
  try {
    const { search, sort, order } = req.query;
    let query = 'SELECT * FROM projects';
    const queryParams = [];
    
    // For employees, only show projects they're assigned to
    if (req.user.role === 'employee') {
      query = `SELECT p.* FROM projects p 
               JOIN project_users pu ON p.id = pu.project_id 
               WHERE pu.user_id = ?`;
      queryParams.push(req.user.id);
      
      // Add search condition if provided
      if (search) {
        query += ' AND (p.name LIKE ? OR p.description LIKE ?)';
        queryParams.push(`%${search}%`, `%${search}%`);
      }
    } else {
      // For project managers and admins, show all projects
      // Add search condition if provided
      if (search) {
        query += ' WHERE name LIKE ? OR description LIKE ?';
        queryParams.push(`%${search}%`, `%${search}%`);
      }
    }
    
    // Add sorting if provided
    if (sort && ['name', 'start_date', 'end_date', 'budget', 'created_at'].includes(sort)) {
      query += ` ORDER BY ${sort} ${order === 'desc' ? 'DESC' : 'ASC'}`;
    } else {
      query += ' ORDER BY created_at DESC';
    }
    
    const [projects] = await pool.query(query, queryParams);
    
    // For each project, fetch the assigned users
    for (const project of projects) {
      const [projectUsers] = await pool.query(
        `SELECT u.id, u.username, u.full_name, u.email, u.role, pu.role as project_role, pu.workload 
         FROM users u 
         JOIN project_users pu ON u.id = pu.user_id 
         WHERE pu.project_id = ?`,
        [project.id]
      );
      project.users = projectUsers;
    }
    
    res.json(projects);
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/projects/:id', authenticateToken, async (req, res) => {
  try {
    const [projects] = await pool.query('SELECT * FROM projects WHERE id = ?', [req.params.id]);
    
    if (projects.length === 0) {
      return res.status(404).json({ message: 'Project not found' });
    }
    
    const project = projects[0];
    
    // Check if employee is assigned to this project
    if (req.user.role === 'employee') {
      const [projectUser] = await pool.query(
        'SELECT * FROM project_users WHERE project_id = ? AND user_id = ?',
        [project.id, req.user.id]
      );
      
      if (projectUser.length === 0) {
        return res.status(403).json({ message: 'You do not have access to this project' });
      }
    }
    
    // Get project users
    const [projectUsers] = await pool.query(
      `SELECT u.id, u.username, u.full_name, u.email, u.role, pu.role as project_role, pu.workload 
       FROM users u 
       JOIN project_users pu ON u.id = pu.user_id 
       WHERE pu.project_id = ?`,
      [project.id]
    );
    
    project.users = projectUsers;
    
    res.json(project);
  } catch (error) {
    console.error('Error fetching project:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/projects', authenticateToken, authorizeRole(['project_manager']), async (req, res) => {
  try {
    const { 
      name, 
      description, 
      start_date, 
      end_date, 
      budget, 
      contract_number, 
      min_workload, 
      users,
      funding_sources
    } = req.body;
    
    // Insert project
    const [result] = await pool.query(
      `INSERT INTO projects (name, description, start_date, end_date, budget, 
        contract_number, min_workload, created_by) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, description, start_date, end_date, budget || 0, contract_number, min_workload || 0, req.user.id]
    );
    
    const projectId = result.insertId;
    
    // Prepare users array, ensuring creator is included
    let projectUsers = [];
    
    if (users && Array.isArray(users) && users.length > 0) {
      projectUsers = [...users];
      console.log("Project users:", projectUsers);
    }
    
    // Check if creator is already in users list
    const creatorIncluded = projectUsers.some(user => user.id === req.user.id);
    
    // Add creator if not already included
    if (!creatorIncluded) {
      projectUsers.push({
        id: req.user.id,
        project_role: 'project_manager',
        workload: 40 // Default to 40 hours
      });
    }
    
    // Add project users
    if (projectUsers.length > 0) {
      const userValues = projectUsers.map(user => [
        projectId, 
        user.id, 
        user.project_role || 'employee', 
        user.workload || 0 // workload is now in hours
      ]);
      
      const placeholders = userValues.map(() => '(?, ?, ?, ?)').join(', ');
      const flatValues = userValues.flat();
      
      await pool.query(
        `INSERT INTO project_users (project_id, user_id, role, workload) VALUES ${placeholders}`,
        flatValues
      );
    }
    
    // Add funding sources if provided
    if (funding_sources && funding_sources.length > 0) {
      const fundingValues = funding_sources.map(source => [
        projectId,
        source.funding_source_id,
        source.amount || 0,
        source.percentage || 0
      ]);
      
      const placeholders = fundingValues.map(() => '(?, ?, ?, ?)').join(', ');
      const flatValues = fundingValues.flat();
      
      await pool.query(
        `INSERT INTO project_funding (project_id, funding_source_id, amount, percentage) VALUES ${placeholders}`,
        flatValues
      );
    }
    
    res.status(201).json({ 
      message: 'Project created successfully', 
      projectId, 
      name, 
      description, 
      start_date, 
      end_date,
      budget,
      contract_number,
      min_workload 
    });
  } catch (error) {
    console.error('Error creating project:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message,
      details: error.stack,
      sqlMessage: error.sqlMessage || 'No SQL Error'
    });
  }
});

app.put('/api/projects/:id', authenticateToken, authorizeRole(['project_manager']), async (req, res) => {
  try {
    const { 
      name, 
      description, 
      start_date, 
      end_date, 
      budget, 
      contract_number, 
      min_workload, 
      users,
      funding_sources
    } = req.body;
    
    // Check if project exists
    const [projects] = await pool.query('SELECT * FROM projects WHERE id = ?', [req.params.id]);
    
    if (projects.length === 0) {
      return res.status(404).json({ message: 'Project not found' });
    }
    
    // Update project
    await pool.query(
      `UPDATE projects SET name = ?, description = ?, start_date = ?, end_date = ?, 
       budget = ?, contract_number = ?, min_workload = ? WHERE id = ?`,
      [name, description, start_date, end_date, budget || 0, contract_number, min_workload || 0, req.params.id]
    );
    
    // Handle project users if provided
    if (users) {
      // Delete existing project users
      await pool.query('DELETE FROM project_users WHERE project_id = ?', [req.params.id]);
      
      // Add new project users
      if (users.length > 0) {
        const userValues = users.map(user => [
          req.params.id, 
          user.id, 
          user.project_role || 'employee', 
          user.workload || 0 // workload is now in hours
        ]);
        
        const placeholders = userValues.map(() => '(?, ?, ?, ?)').join(', ');
        const flatValues = userValues.flat();
        
        await pool.query(
          `INSERT INTO project_users (project_id, user_id, role, workload) VALUES ${placeholders}`,
          flatValues
        );
      }
    }
    
    // Handle funding sources if provided
    if (funding_sources) {
      // Delete existing funding sources
      await pool.query('DELETE FROM project_funding WHERE project_id = ?', [req.params.id]);
      
      // Add new funding sources
      if (funding_sources.length > 0) {
        const fundingValues = funding_sources.map(source => [
          req.params.id,
          source.funding_source_id,
          source.amount || 0,
          source.percentage || 0
        ]);
        
        const placeholders = fundingValues.map(() => '(?, ?, ?, ?)').join(', ');
        const flatValues = fundingValues.flat();
        
        await pool.query(
          `INSERT INTO project_funding (project_id, funding_source_id, amount, percentage) VALUES ${placeholders}`,
          flatValues
        );
      }
    }
    
    res.json({ message: 'Project updated successfully' });
  } catch (error) {
    console.error('Error updating project:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.delete('/api/projects/:id', authenticateToken, authorizeRole(['project_manager']), async (req, res) => {
  try {
    const [result] = await pool.query('DELETE FROM projects WHERE id = ?', [req.params.id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Project not found' });
    }
    
    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Project users routes
app.post('/api/projects/:id/users', authenticateToken, authorizeRole(['project_manager']), async (req, res) => {
  try {
    const { userId, role, workload } = req.body;
    
    // Check if project exists
    const [projects] = await pool.query('SELECT * FROM projects WHERE id = ?', [req.params.id]);
    
    if (projects.length === 0) {
      return res.status(404).json({ message: 'Project not found' });
    }
    
    // Check if user exists
    const [users] = await pool.query('SELECT * FROM users WHERE id = ?', [userId]);
    
    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Check if user is already assigned to project
    const [projectUsers] = await pool.query(
      'SELECT * FROM project_users WHERE project_id = ? AND user_id = ?',
      [req.params.id, userId]
    );
    
    if (projectUsers.length > 0) {
      return res.status(409).json({ message: 'User already assigned to project' });
    }
    
    // Assign user to project
    await pool.query(
      'INSERT INTO project_users (project_id, user_id, role, workload) VALUES (?, ?, ?, ?)',
      [req.params.id, userId, role || 'employee', workload || 100]
    );
    
    res.status(201).json({ message: 'User assigned to project successfully' });
  } catch (error) {
    console.error('Error assigning user to project:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.put('/api/projects/:id/users/:userId', authenticateToken, authorizeRole(['project_manager']), async (req, res) => {
  try {
    const { role, workload } = req.body;
    
    // Check if project-user relation exists
    const [projectUsers] = await pool.query(
      'SELECT * FROM project_users WHERE project_id = ? AND user_id = ?',
      [req.params.id, req.params.userId]
    );
    
    if (projectUsers.length === 0) {
      return res.status(404).json({ message: 'User not assigned to project' });
    }
    
    // Update project-user relation
    await pool.query(
      'UPDATE project_users SET role = ?, workload = ? WHERE project_id = ? AND user_id = ?',
      [role || 'employee', workload || 100, req.params.id, req.params.userId]
    );
    
    res.json({ message: 'Project user updated successfully' });
  } catch (error) {
    console.error('Error updating project user:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.delete('/api/projects/:id/users/:userId', authenticateToken, authorizeRole(['project_manager']), async (req, res) => {
  try {
    const [result] = await pool.query(
      'DELETE FROM project_users WHERE project_id = ? AND user_id = ?',
      [req.params.id, req.params.userId]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'User not assigned to project' });
    }
    
    res.json({ message: 'User removed from project successfully' });
  } catch (error) {
    console.error('Error removing user from project:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Batch update project users
app.put('/api/projects/:id/users', authenticateToken, authorizeRole(['admin', 'project_manager']), async (req, res) => {
  try {
    const projectId = req.params.id;
    const users = req.body;
    
    if (!Array.isArray(users)) {
      return res.status(400).json({ message: 'Users data should be an array' });
    }
    
    // Check if project exists
    const [projects] = await pool.query('SELECT * FROM projects WHERE id = ?', [projectId]);
    
    if (projects.length === 0) {
      return res.status(404).json({ message: 'Project not found' });
    }
    
    // Start transaction
    await pool.query('START TRANSACTION');
    
    try {
      // Delete existing project users
      await pool.query('DELETE FROM project_users WHERE project_id = ?', [projectId]);
      
      // Add new project users
      if (users.length > 0) {
        const userValues = users.map(user => [
          projectId, 
          user.user_id, 
          user.role || 'employee', 
          user.workload || 0 // workload is now in hours
        ]);
        
        const placeholders = userValues.map(() => '(?, ?, ?, ?)').join(', ');
        const flatValues = userValues.flat();
        
        await pool.query(
          `INSERT INTO project_users (project_id, user_id, role, workload) VALUES ${placeholders}`,
          flatValues
        );
      }
      
      // Commit transaction
      await pool.query('COMMIT');
      
      res.json({ message: 'Project users updated successfully' });
    } catch (error) {
      // Rollback transaction on error
      await pool.query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Error updating project users:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Users routes
app.get('/api/users', authenticateToken, async (req, res) => {
  try {
    const { search, role, sort, order } = req.query;
    let query = 'SELECT id, username, full_name, email, role FROM users';
    let queryParams = [];
    
    // Add filters if provided
    if (search || role) {
      query += ' WHERE';
      
      if (search) {
        query += ' (username LIKE ? OR full_name LIKE ? OR email LIKE ?)';
        queryParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
      }
      
      if (search && role) {
        query += ' AND';
      }
      
      if (role) {
        query += ' role = ?';
        queryParams.push(role);
      }
    }
    
    // Add sorting if provided
    if (sort && ['username', 'full_name', 'email', 'role'].includes(sort)) {
      query += ` ORDER BY ${sort} ${order === 'desc' ? 'DESC' : 'ASC'}`;
    } else {
      query += ' ORDER BY id ASC';
    }
    
    const [users] = await pool.query(query, queryParams);
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/users', authenticateToken, authorizeRole(['admin', 'hr']), async (req, res) => {
  try {
    const { username, password, full_name, email, role } = req.body;
    
    // Check if user already exists
    const [existingUsers] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);
    
    if (existingUsers.length > 0) {
      return res.status(409).json({ message: 'Username already exists' });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Insert user into database
    const [result] = await pool.query(
      'INSERT INTO users (username, password, full_name, email, role) VALUES (?, ?, ?, ?, ?)',
      [username, hashedPassword, full_name, email, role || 'project_manager']
    );
    
    res.status(201).json({ message: 'User created successfully', userId: result.insertId });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/users/:id', authenticateToken, async (req, res) => {
  try {
    const [users] = await pool.query(
      'SELECT id, username, full_name, email, role FROM users WHERE id = ?',
      [req.params.id]
    );
    
    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const user = users[0];
    
    // Get user's projects
    const [userProjects] = await pool.query(
      `SELECT p.id, p.name, p.description, p.start_date, p.end_date, p.budget, 
        p.contract_number, pu.role as project_role, pu.workload
       FROM projects p
       JOIN project_users pu ON p.id = pu.project_id
       WHERE pu.user_id = ?`,
      [user.id]
    );
    
    user.projects = userProjects;
    
    // Get user's departments
    const [userDepartments] = await pool.query(
      `SELECT d.id, d.name, d.description
       FROM departments d
       JOIN department_users du ON d.id = du.department_id
       WHERE du.user_id = ?`,
      [user.id]
    );
    
    user.departments = userDepartments;
    
    res.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.put('/api/users/:id', authenticateToken, async (req, res) => {
  try {
    const { full_name, email, role, language } = req.body;
    
    // Only admins and HR can change roles
    if (role && req.user.role !== 'admin' && req.user.role !== 'hr') {
      return res.status(403).json({ message: 'Not authorized to change roles' });
    }
    
    // Check if user exists
    const [users] = await pool.query('SELECT * FROM users WHERE id = ?', [req.params.id]);
    
    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Check if it's the user's own profile or if the user is an admin
    if (req.user.id != req.params.id && req.user.role !== 'admin' && req.user.role !== 'hr') {
      return res.status(403).json({ message: 'Not authorized to update other users' });
    }
    
    // Update user
    let query = 'UPDATE users SET full_name = ?, email = ?';
    let params = [full_name, email];
    
    // Add language to update if provided
    if (language) {
      query += ', language = ?';
      params.push(language);
    }
    
    if (role && (req.user.role === 'admin' || req.user.role === 'hr')) {
      query += ', role = ?';
      params.push(role);
    }
    
    query += ' WHERE id = ?';
    params.push(req.params.id);
    
    await pool.query(query, params);
    
    // Get updated user to return
    const [updatedUsers] = await pool.query('SELECT * FROM users WHERE id = ?', [req.params.id]);
    if (updatedUsers.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Remove password from response
    const updatedUser = updatedUsers[0];
    delete updatedUser.password;
    
    res.json(updatedUser);
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Departments routes
app.get('/api/departments', authenticateToken, async (req, res) => {
  try {
    const { search, sort, order } = req.query;
    let query = 'SELECT * FROM departments';
    
    // Add search condition if provided
    if (search) {
      query += ' WHERE name LIKE ? OR description LIKE ?';
    }
    
    // Add sorting if provided
    if (sort && ['name', 'description'].includes(sort)) {
      query += ` ORDER BY ${sort} ${order === 'desc' ? 'DESC' : 'ASC'}`;
    } else {
      query += ' ORDER BY id ASC';
    }
    
    const values = search ? [`%${search}%`, `%${search}%`] : [];
    const [departments] = await pool.query(query, values);
    
    // For each department, fetch the users
    for (const department of departments) {
      const [departmentUsers] = await pool.query(
        `SELECT u.id, u.username, u.full_name, u.email, u.role
         FROM users u
         JOIN department_users du ON u.id = du.user_id
         WHERE du.department_id = ?`,
        [department.id]
      );
      department.users = departmentUsers;
    }
    
    res.json(departments);
  } catch (error) {
    console.error('Error fetching departments:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/departments', authenticateToken, authorizeRole(['admin', 'project_manager']), async (req, res) => {
  try {
    const { name, description, users } = req.body;
    
    // Insert department without head_id
    const [result] = await pool.query(
      'INSERT INTO departments (name, description) VALUES (?, ?)',
      [name, description]
    );
    
    const departmentId = result.insertId;
    
    // Add department users if provided
    if (users && users.length > 0) {
      const userValues = users.map(userId => [departmentId, userId]);
      const placeholders = userValues.map(() => '(?, ?)').join(', ');
      const flatValues = userValues.flat();
      
      await pool.query(
        `INSERT INTO department_users (department_id, user_id) VALUES ${placeholders}`,
        flatValues
      );
    }
    
    res.status(201).json({ message: 'Department created successfully', departmentId });
  } catch (error) {
    console.error('Error creating department:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/departments/:id', authenticateToken, async (req, res) => {
  try {
    const [departments] = await pool.query(
      'SELECT * FROM departments WHERE id = ?',
      [req.params.id]
    );
    
    if (departments.length === 0) {
      return res.status(404).json({ message: 'Department not found' });
    }
    
    const department = departments[0];
    
    // Get department users
    const [departmentUsers] = await pool.query(
      `SELECT u.id, u.username, u.full_name, u.email, u.role
       FROM users u
       JOIN department_users du ON u.id = du.user_id
       WHERE du.department_id = ?`,
      [department.id]
    );
    
    department.users = departmentUsers;
    
    res.json(department);
  } catch (error) {
    console.error('Error fetching department:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.put('/api/departments/:id', authenticateToken, authorizeRole(['admin', 'project_manager']), async (req, res) => {
  try {
    const { name, description, users } = req.body;
    
    // Check if department exists
    const [departments] = await pool.query('SELECT * FROM departments WHERE id = ?', [req.params.id]);
    
    if (departments.length === 0) {
      return res.status(404).json({ message: 'Department not found' });
    }
    
    // Update department
    await pool.query(
      'UPDATE departments SET name = ?, description = ? WHERE id = ?',
      [name, description, req.params.id]
    );
    
    // Handle department users if provided
    if (users) {
      // Delete existing department users
      await pool.query('DELETE FROM department_users WHERE department_id = ?', [req.params.id]);
      
      // Add new department users
      if (users.length > 0) {
        const userValues = users.map(userId => [req.params.id, userId]);
        const placeholders = userValues.map(() => '(?, ?)').join(', ');
        const flatValues = userValues.flat();
        
        await pool.query(
          `INSERT INTO department_users (department_id, user_id) VALUES ${placeholders}`,
          flatValues
        );
      }
    }
    
    res.json({ message: 'Department updated successfully' });
  } catch (error) {
    console.error('Error updating department:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.delete('/api/departments/:id', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  try {
    const [result] = await pool.query('DELETE FROM departments WHERE id = ?', [req.params.id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Department not found' });
    }
    
    res.json({ message: 'Department deleted successfully' });
  } catch (error) {
    console.error('Error deleting department:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Funding Sources routes
app.get('/api/funding-sources', authenticateToken, async (req, res) => {
  try {
    const [fundingSources] = await pool.query('SELECT * FROM funding_sources ORDER BY name');
    res.json(fundingSources);
  } catch (error) {
    console.error('Error fetching funding sources:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/funding-sources', authenticateToken, authorizeRole(['project_manager']), async (req, res) => {
  try {
    const { name, description } = req.body;
    
    if (!name) {
      return res.status(400).json({ message: 'Name is required' });
    }
    
    const [result] = await pool.query(
      'INSERT INTO funding_sources (name, description) VALUES (?, ?)',
      [name, description]
    );
    
    res.status(201).json({
      message: 'Funding source created successfully',
      fundingSourceId: result.insertId
    });
  } catch (error) {
    console.error('Error creating funding source:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/funding-sources/:id', authenticateToken, async (req, res) => {
  try {
    const [fundingSources] = await pool.query(
      'SELECT * FROM funding_sources WHERE id = ?',
      [req.params.id]
    );
    
    if (fundingSources.length === 0) {
      return res.status(404).json({ message: 'Funding source not found' });
    }
    
    res.json(fundingSources[0]);
  } catch (error) {
    console.error('Error fetching funding source:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.put('/api/funding-sources/:id', authenticateToken, authorizeRole(['project_manager']), async (req, res) => {
  try {
    const { name, description } = req.body;
    
    if (!name) {
      return res.status(400).json({ message: 'Name is required' });
    }
    
    const [fundingSources] = await pool.query(
      'SELECT * FROM funding_sources WHERE id = ?',
      [req.params.id]
    );
    
    if (fundingSources.length === 0) {
      return res.status(404).json({ message: 'Funding source not found' });
    }
    
    await pool.query(
      'UPDATE funding_sources SET name = ?, description = ? WHERE id = ?',
      [name, description, req.params.id]
    );
    
    res.json({ message: 'Funding source updated successfully' });
  } catch (error) {
    console.error('Error updating funding source:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.delete('/api/funding-sources/:id', authenticateToken, authorizeRole(['project_manager']), async (req, res) => {
  try {
    // Check if the funding source is in use
    const [usageCount] = await pool.query(
      'SELECT COUNT(*) as count FROM project_funding WHERE funding_source_id = ?',
      [req.params.id]
    );
    
    if (usageCount[0].count > 0) {
      return res.status(400).json({
        message: 'Cannot delete funding source because it is in use by one or more projects'
      });
    }
    
    const [result] = await pool.query(
      'DELETE FROM funding_sources WHERE id = ?',
      [req.params.id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Funding source not found' });
    }
    
    res.json({ message: 'Funding source deleted successfully' });
  } catch (error) {
    console.error('Error deleting funding source:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get projects using a specific funding source
app.get('/api/funding-sources/:id/projects', authenticateToken, async (req, res) => {
  try {
    const [projects] = await pool.query(
      `SELECT p.id, p.name, p.description, pf.amount, pf.percentage
       FROM projects p
       JOIN project_funding pf ON p.id = pf.project_id
       WHERE pf.funding_source_id = ?`,
      [req.params.id]
    );
    
    res.json(projects);
  } catch (error) {
    console.error('Error fetching projects using funding source:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Project Funding routes
app.get('/api/projects/:id/funding', authenticateToken, async (req, res) => {
  try {
    const [fundingDistribution] = await pool.query(
      `SELECT pf.*, fs.name, fs.description
       FROM project_funding pf
       JOIN funding_sources fs ON pf.funding_source_id = fs.id
       WHERE pf.project_id = ?`,
      [req.params.id]
    );
    
    res.json(fundingDistribution);
  } catch (error) {
    console.error('Error fetching project funding distribution:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/projects/:id/funding', authenticateToken, authorizeRole(['project_manager']), async (req, res) => {
  try {
    const { funding_distributions } = req.body;
    
    if (!funding_distributions || !Array.isArray(funding_distributions) || funding_distributions.length === 0) {
      return res.status(400).json({ message: 'Funding distributions are required' });
    }
    
    // Check if project exists
    const [projects] = await pool.query('SELECT * FROM projects WHERE id = ?', [req.params.id]);
    
    if (projects.length === 0) {
      return res.status(404).json({ message: 'Project not found' });
    }
    
    // Delete existing funding distributions
    await pool.query('DELETE FROM project_funding WHERE project_id = ?', [req.params.id]);
    
    // Add new funding distributions
    const distributionValues = funding_distributions.map(item => [
      req.params.id,
      item.funding_source_id,
      item.amount || 0,
      item.percentage || 0
    ]);
    
    const placeholders = distributionValues.map(() => '(?, ?, ?, ?)').join(', ');
    const flatValues = distributionValues.flat();
    
    await pool.query(
      `INSERT INTO project_funding (project_id, funding_source_id, amount, percentage) VALUES ${placeholders}`,
      flatValues
    );
    
    res.status(201).json({ message: 'Project funding updated successfully' });
  } catch (error) {
    console.error('Error updating project funding:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Time Entries routes
app.get('/api/time-entries/user/:userId', authenticateToken, async (req, res) => {
  try {
    const userId = req.params.userId;
    
    // Employees can only see their own time entries
    if (req.user.role === 'employee' && req.user.id != userId) {
      return res.status(403).json({ message: 'Not authorized to view this user\'s time entries' });
    }
    
    const [timeEntries] = await pool.query(
      `SELECT te.*, p.name as project_name, 
         GROUP_CONCAT(DISTINCT fs.name) as funding_sources
       FROM time_entries te
       LEFT JOIN projects p ON te.project_id = p.id
       LEFT JOIN time_entry_funding tef ON te.id = tef.time_entry_id
       LEFT JOIN funding_sources fs ON tef.funding_source_id = fs.id
       WHERE te.user_id = ?
       GROUP BY te.id
       ORDER BY te.date DESC`,
      [userId]
    );
    
    res.json(timeEntries);
  } catch (error) {
    console.error('Error getting time entries:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/time-entries/project/:projectId', authenticateToken, async (req, res) => {
  try {
    const projectId = req.params.projectId;
    
    // Check if user is assigned to the project (for employees)
    if (req.user.role === 'employee') {
      const [userProject] = await pool.query(
        'SELECT * FROM project_users WHERE project_id = ? AND user_id = ?',
        [projectId, req.user.id]
      );
      
      if (userProject.length === 0) {
        return res.status(403).json({ message: 'Not authorized to view this project\'s time entries' });
      }
    }
    
    const [timeEntries] = await pool.query(
      `SELECT te.*, u.full_name as user_name, u.username,
         GROUP_CONCAT(DISTINCT fs.name) as funding_sources
       FROM time_entries te
       LEFT JOIN users u ON te.user_id = u.id
       LEFT JOIN time_entry_funding tef ON te.id = tef.time_entry_id
       LEFT JOIN funding_sources fs ON tef.funding_source_id = fs.id
       WHERE te.project_id = ?
       GROUP BY te.id
       ORDER BY te.date DESC, u.full_name`,
      [projectId]
    );
    
    res.json(timeEntries);
  } catch (error) {
    console.error('Error getting project time entries:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get time entries by funding source
app.get('/api/time-entries/funding-source/:fundingSourceId', authenticateToken, async (req, res) => {
  try {
    const fundingSourceId = req.params.fundingSourceId;
    const month = req.query.month;
    
    let query = `
      SELECT te.*, u.full_name as user_name, u.username, p.name as project_name,
        tef.percentage, tef.hours as funding_hours, fs.name as funding_source_name
      FROM time_entry_funding tef
      JOIN time_entries te ON tef.time_entry_id = te.id
      JOIN users u ON te.user_id = u.id
      JOIN projects p ON te.project_id = p.id
      JOIN funding_sources fs ON tef.funding_source_id = fs.id
      WHERE tef.funding_source_id = ?
    `;
    
    const queryParams = [fundingSourceId];
    
    if (month) {
      query += ` AND te.date LIKE '${month}%'`;
    }
    
    query += ` ORDER BY te.date DESC, p.name, u.full_name`;
    
    const [timeEntries] = await pool.query(query, queryParams);
    
    res.json(timeEntries);
  } catch (error) {
    console.error('Error getting funding source time entries:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create time entry
app.post('/api/time-entries', authenticateToken, async (req, res) => {
  const connection = await pool.getConnection();
  await connection.beginTransaction();
  
  try {
    const { user_id, project_id, date, hours, description, entry_type, funding_distribution } = req.body;
    
    // Employees can only create time entries for themselves
    if (req.user.role === 'employee' && req.user.id != user_id) {
      await connection.rollback();
      connection.release();
      return res.status(403).json({ message: 'Not authorized to create time entries for other users' });
    }
    
    // Check if user is assigned to the project
    const [userProject] = await connection.query(
      'SELECT * FROM project_users WHERE project_id = ? AND user_id = ?',
      [project_id, user_id]
    );
    
    if (userProject.length === 0) {
      await connection.rollback();
      connection.release();
      return res.status(400).json({ message: 'User is not assigned to this project' });
    }
    
    // Create time entry
    const [result] = await connection.query(
      `INSERT INTO time_entries (user_id, project_id, date, hours, description, entry_type, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [user_id, project_id, date, hours, description, entry_type || 'work']
    );
    
    const timeEntryId = result.insertId;
    
    // Add funding distribution if provided
    if (funding_distribution && funding_distribution.length > 0) {
      const fundingEntries = funding_distribution.map(item => [
        timeEntryId,
        item.funding_source_id,
        item.percentage,
        (hours * item.percentage) / 100
      ]);
      
      const placeholders = fundingEntries.map(() => '(?, ?, ?, ?)').join(', ');
      const flatValues = fundingEntries.flat();
      
      await connection.query(
        `INSERT INTO time_entry_funding (time_entry_id, funding_source_id, percentage, hours) VALUES ${placeholders}`,
        flatValues
      );
    } else {
      // If no funding distribution provided, try to use project's default distribution
      const [projectFunding] = await connection.query(
        'SELECT * FROM project_funding WHERE project_id = ?',
        [project_id]
      );
      
      if (projectFunding.length > 0) {
        const fundingEntries = projectFunding.map(item => [
          timeEntryId,
          item.funding_source_id,
          item.percentage,
          (hours * item.percentage) / 100
        ]);
        
        const placeholders = fundingEntries.map(() => '(?, ?, ?, ?)').join(', ');
        const flatValues = fundingEntries.flat();
        
        await connection.query(
          `INSERT INTO time_entry_funding (time_entry_id, funding_source_id, percentage, hours) VALUES ${placeholders}`,
          flatValues
        );
      }
    }
    
    await connection.commit();
    connection.release();
    
    res.status(201).json({
      message: 'Time entry created successfully',
      timeEntryId
    });
  } catch (error) {
    await connection.rollback();
    connection.release();
    console.error('Error creating time entry:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.put('/api/time-entries/:id', authenticateToken, async (req, res) => {
  const connection = await pool.getConnection();
  await connection.beginTransaction();
  
  try {
    const timeEntryId = req.params.id;
    const { hours, description, entry_type, funding_distribution } = req.body;
    
    // Get the time entry
    const [timeEntries] = await connection.query('SELECT * FROM time_entries WHERE id = ?', [timeEntryId]);
    
    if (timeEntries.length === 0) {
      await connection.rollback();
      connection.release();
      return res.status(404).json({ message: 'Time entry not found' });
    }
    
    const timeEntry = timeEntries[0];
    
    // Employees can only update their own time entries
    if (req.user.role === 'employee' && req.user.id != timeEntry.user_id) {
      await connection.rollback();
      connection.release();
      return res.status(403).json({ message: 'Not authorized to update this time entry' });
    }
    
    // Update time entry
    await connection.query(
      `UPDATE time_entries SET hours = ?, description = ?, entry_type = ?, updated_at = NOW()
       WHERE id = ?`,
      [
        hours || timeEntry.hours, 
        description || timeEntry.description, 
        entry_type || timeEntry.entry_type, 
        timeEntryId
      ]
    );
    
    // Update funding distribution if provided
    if (funding_distribution && funding_distribution.length > 0) {
      // Delete existing funding entries
      await connection.query('DELETE FROM time_entry_funding WHERE time_entry_id = ?', [timeEntryId]);
      
      // Add new funding entries
      const fundingEntries = funding_distribution.map(item => [
        timeEntryId,
        item.funding_source_id,
        item.percentage,
        ((hours || timeEntry.hours) * item.percentage) / 100
      ]);
      
      const placeholders = fundingEntries.map(() => '(?, ?, ?, ?)').join(', ');
      const flatValues = fundingEntries.flat();
      
      await connection.query(
        `INSERT INTO time_entry_funding (time_entry_id, funding_source_id, percentage, hours) VALUES ${placeholders}`,
        flatValues
      );
    }
    
    await connection.commit();
    connection.release();
    
    res.json({
      message: 'Time entry updated successfully'
    });
  } catch (error) {
    await connection.rollback();
    connection.release();
    console.error('Error updating time entry:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.delete('/api/time-entries/:id', authenticateToken, async (req, res) => {
  try {
    const timeEntryId = req.params.id;
    
    // Get the time entry
    const [timeEntries] = await pool.query('SELECT * FROM time_entries WHERE id = ?', [timeEntryId]);
    
    if (timeEntries.length === 0) {
      return res.status(404).json({ message: 'Time entry not found' });
    }
    
    const timeEntry = timeEntries[0];
    
    // Employees can only delete their own time entries
    if (req.user.role === 'employee' && req.user.id != timeEntry.user_id) {
      return res.status(403).json({ message: 'Not authorized to delete this time entry' });
    }
    
    // Delete time entry (foreign key constraints will handle deleting related funding entries)
    await pool.query('DELETE FROM time_entries WHERE id = ?', [timeEntryId]);
    
    res.json({
      message: 'Time entry deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting time entry:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get a single time entry
app.get('/api/time-entries/:id', authenticateToken, async (req, res) => {
  try {
    const timeEntryId = req.params.id;
    
    // Get the time entry with funding distribution
    const [timeEntries] = await pool.query(
      `SELECT te.*, p.name as project_name,
         GROUP_CONCAT(DISTINCT tef.funding_source_id) as funding_source_ids,
         GROUP_CONCAT(DISTINCT tef.percentage) as funding_percentages,
         GROUP_CONCAT(DISTINCT fs.name) as funding_source_names
       FROM time_entries te
       LEFT JOIN projects p ON te.project_id = p.id
       LEFT JOIN time_entry_funding tef ON te.id = tef.time_entry_id
       LEFT JOIN funding_sources fs ON tef.funding_source_id = fs.id
       WHERE te.id = ?
       GROUP BY te.id`,
      [timeEntryId]
    );
    
    if (timeEntries.length === 0) {
      return res.status(404).json({ message: 'Time entry not found' });
    }
    
    const timeEntry = timeEntries[0];
    
    // Employees can only view their own time entries
    if (req.user.role === 'employee' && req.user.id != timeEntry.user_id) {
      return res.status(403).json({ message: 'Not authorized to access this time entry' });
    }
    
    // Process funding distribution
    let fundingDistribution = [];
    if (timeEntry.funding_source_ids) {
      const sourceIds = timeEntry.funding_source_ids.split(',');
      const percentages = timeEntry.funding_percentages.split(',');
      const names = timeEntry.funding_source_names ? timeEntry.funding_source_names.split(',') : [];
      
      fundingDistribution = sourceIds.map((id, index) => ({
        funding_source_id: parseInt(id),
        percentage: parseFloat(percentages[index]),
        name: names[index] || null
      }));
    }
    
    // Remove concatenated fields and add parsed distribution
    delete timeEntry.funding_source_ids;
    delete timeEntry.funding_percentages;
    delete timeEntry.funding_source_names;
    timeEntry.funding_distribution = fundingDistribution;
    
    res.json(timeEntry);
  } catch (error) {
    console.error('Error getting time entry:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Export Routes
app.get('/api/exports/pdf', authenticateToken, async (req, res) => {
  try {
    const { projectId, startDate, endDate, fundingSourceId } = req.query;
    
    if (!projectId) {
      return res.status(400).json({ message: 'Project ID is required' });
    }
    
    // Verify project exists
    const [projects] = await pool.query('SELECT * FROM projects WHERE id = ?', [projectId]);
    
    if (projects.length === 0) {
      return res.status(404).json({ message: 'Project not found' });
    }
    
    const project = projects[0];
    
    // Create a simple PDF with minimal content to test functionality
    const doc = new PDFDocument();
    
    // Set response headers for PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="project-${projectId}-export.pdf"`);
    
    // Pipe the PDF document to the response
    doc.pipe(res);
    
    // Add content to the PDF
    doc.fontSize(25).text('Project Report', { align: 'center' });
    doc.moveDown();
    doc.fontSize(16).text(`Project: ${project.name}`, { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Generated on: ${new Date().toLocaleString()}`);
    doc.moveDown();
    doc.fontSize(12).text(`Project ID: ${project.id}`);
    doc.fontSize(12).text(`Contract Number: ${project.contract_number || 'N/A'}`);
    doc.fontSize(12).text(`Budget: ${project.budget ? parseFloat(project.budget).toFixed(2) : '0'} hours`);
    
    // Add date range information if provided
    if (startDate && endDate) {
      doc.moveDown();
      doc.fontSize(12).text(`Date Range: ${startDate} to ${endDate}`);
    }
    
    // Finalize the PDF
    doc.end();
    
  } catch (error) {
    console.error('Error generating PDF export:', error);
    res.status(500).json({ message: 'Server error', details: error.message });
  }
});

app.get('/api/exports/xlsx', authenticateToken, async (req, res) => {
  try {
    const { projectId, startDate, endDate, fundingSourceId } = req.query;
    
    if (!projectId) {
      return res.status(400).json({ message: 'Project ID is required' });
    }
    
    // Verify project exists
    const [projects] = await pool.query('SELECT * FROM projects WHERE id = ?', [projectId]);
    
    if (projects.length === 0) {
      return res.status(404).json({ message: 'Project not found' });
    }
    
    const project = projects[0];
    
    // Create a simplified Excel workbook
    const workbook = new ExcelJS.Workbook();
    
    // Set workbook properties
    workbook.creator = 'DRUP System';
    workbook.lastModifiedBy = 'DRUP System';
    workbook.created = new Date();
    workbook.modified = new Date();
    
    // Create a worksheet
    const worksheet = workbook.addWorksheet('Project Data');
    
    // Add headers
    worksheet.columns = [
      { header: 'Property', key: 'property', width: 20 },
      { header: 'Value', key: 'value', width: 40 }
    ];
    
    // Add basic project data
    worksheet.addRow({ property: 'Project Name', value: project.name });
    worksheet.addRow({ property: 'Project ID', value: project.id });
    worksheet.addRow({ property: 'Contract Number', value: project.contract_number || 'N/A' });
    worksheet.addRow({ property: 'Start Date', value: project.start_date || 'Not set' });
    worksheet.addRow({ property: 'End Date', value: project.end_date || 'Not set' });
    worksheet.addRow({ property: 'Budget', value: `${project.budget || 0} hours` });
    worksheet.addRow({ property: 'Generated on', value: new Date().toLocaleString() });
    
    // Add date range if provided
    if (startDate && endDate) {
      worksheet.addRow({ property: 'Date Range', value: `${startDate} to ${endDate}` });
    }
    
    // Format header row
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD3D3D3' }
    };
    
    // Set response headers for XLSX
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="project-${projectId}-export.xlsx"`);
    
    // Write to response
    await workbook.xlsx.write(res);
    
  } catch (error) {
    console.error('Error generating XLSX export:', error);
    res.status(500).json({ message: 'Server error', details: error.message });
  }
});

app.get('/api/exports/accounting', authenticateToken, async (req, res) => {
  try {
    const { projectId, fundingSourceId, startDate, endDate } = req.query;
    
    if (!projectId || !fundingSourceId) {
      return res.status(400).json({ message: 'Project ID and Funding Source ID are required' });
    }
    
    // Verify project exists
    const [projects] = await pool.query('SELECT * FROM projects WHERE id = ?', [projectId]);
    
    if (projects.length === 0) {
      return res.status(404).json({ message: 'Project not found' });
    }
    
    const project = projects[0];
    
    // Verify funding source exists
    const [fundingSources] = await pool.query('SELECT * FROM funding_sources WHERE id = ?', [fundingSourceId]);
    
    if (fundingSources.length === 0) {
      return res.status(404).json({ message: 'Funding source not found' });
    }
    
    const fundingSource = fundingSources[0];
    
    // Get funding details for this project and source
    const [projectFunding] = await pool.query(
      `SELECT * FROM project_funding 
       WHERE project_id = ? AND funding_source_id = ?`,
      [projectId, fundingSourceId]
    );
    
    if (projectFunding.length === 0) {
      return res.status(404).json({ message: 'This funding source is not associated with the project' });
    }
    
    // Get time entries funded by this source
    let queryParams = [projectId, fundingSourceId];
    let timeEntriesQuery = `
      SELECT te.id, te.date, te.hours, te.description, te.entry_type,
        u.id as user_id, u.full_name, u.username,
        tef.percentage, tef.hours as funded_hours
      FROM time_entries te
      JOIN users u ON te.user_id = u.id
      JOIN time_entry_funding tef ON te.id = tef.time_entry_id
      WHERE te.project_id = ? AND tef.funding_source_id = ?
    `;
    
    if (startDate) {
      timeEntriesQuery += ' AND te.date >= ?';
      queryParams.push(startDate);
    }
    
    if (endDate) {
      timeEntriesQuery += ' AND te.date <= ?';
      queryParams.push(endDate);
    }
    
    timeEntriesQuery += ' ORDER BY te.date ASC, u.full_name';
    
    const [timeEntries] = await pool.query(timeEntriesQuery, queryParams);
    
    // Group entries by month and user
    const entriesByMonth = {};
    const userTotals = {};
    let grandTotal = 0;
    
    timeEntries.forEach(entry => {
      const month = entry.date.slice(0, 7); // YYYY-MM format
      const userId = entry.user_id;
      const fundedHours = parseFloat(entry.funded_hours) || 0;
      
      // Initialize month if not exists
      if (!entriesByMonth[month]) {
        entriesByMonth[month] = {
          month,
          userEntries: {},
          total: 0
        };
      }
      
      // Initialize user in this month if not exists
      if (!entriesByMonth[month].userEntries[userId]) {
        entriesByMonth[month].userEntries[userId] = {
          user_id: userId,
          user_name: entry.full_name || entry.username,
          entries: [],
          total: 0
        };
      }
      
      // Add entry to user's entries for this month
      entriesByMonth[month].userEntries[userId].entries.push(entry);
      entriesByMonth[month].userEntries[userId].total += fundedHours;
      entriesByMonth[month].total += fundedHours;
      
      // Update user total across all months
      if (!userTotals[userId]) {
        userTotals[userId] = {
          user_id: userId,
          user_name: entry.full_name || entry.username,
          total: 0
        };
      }
      userTotals[userId].total += fundedHours;
      
      // Update grand total
      grandTotal += fundedHours;
    });
    
    // Convert objects to arrays for easier processing
    const monthlyReports = Object.values(entriesByMonth).map(month => {
      month.userEntries = Object.values(month.userEntries);
      return month;
    });
    
    // Prepare report data
    const reportData = {
      project: {
        id: project.id,
        name: project.name,
        contract_number: project.contract_number
      },
      fundingSource: {
        id: fundingSource.id,
        name: fundingSource.name,
        allocation: projectFunding[0].amount,
        percentage: projectFunding[0].percentage
      },
      period: {
        start_date: startDate || 'All time',
        end_date: endDate || 'All time'
      },
      monthlyReports,
      userTotals: Object.values(userTotals),
      grandTotal
    };
    
    // TODO: In a real implementation, format this as a proper accounting report
    // Set headers for download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="accounting-report-${projectId}-${fundingSourceId}.pdf"`);
    
    // Send the report data (in production, this would be a formatted PDF)
    res.json(reportData);
    
  } catch (error) {
    console.error('Error generating accounting report:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/exports/supervisory', authenticateToken, async (req, res) => {
  try {
    const { projectId, userId, startDate, endDate } = req.query;
    
    if (!projectId) {
      return res.status(400).json({ message: 'Project ID is required' });
    }
    
    // Verify project exists
    const [projects] = await pool.query('SELECT * FROM projects WHERE id = ?', [projectId]);
    
    if (projects.length === 0) {
      return res.status(404).json({ message: 'Project not found' });
    }
    
    const project = projects[0];
    
    // Set query parameters
    const queryParams = [projectId];
    
    // Build base query for time entries
    let timeEntriesQuery = `
      SELECT te.*, u.full_name, u.username, u.email,
        GROUP_CONCAT(DISTINCT CONCAT(fs.name, ': ', tef.percentage, '%') SEPARATOR ', ') as funding_distribution
      FROM time_entries te
      JOIN users u ON te.user_id = u.id
      LEFT JOIN time_entry_funding tef ON te.id = tef.time_entry_id
      LEFT JOIN funding_sources fs ON tef.funding_source_id = fs.id
      WHERE te.project_id = ?
    `;
    
    // Add filters for date range and specific user if provided
    if (userId) {
      timeEntriesQuery += ' AND te.user_id = ?';
      queryParams.push(userId);
    }
    
    if (startDate) {
      timeEntriesQuery += ' AND te.date >= ?';
      queryParams.push(startDate);
    }
    
    if (endDate) {
      timeEntriesQuery += ' AND te.date <= ?';
      queryParams.push(endDate);
    }
    
    timeEntriesQuery += ' GROUP BY te.id ORDER BY u.full_name, te.date';
    
    const [timeEntries] = await pool.query(timeEntriesQuery, queryParams);
    
    // Get the workload allocation for this user in the project
    let workloadQuery = 'SELECT * FROM project_users WHERE project_id = ?';
    const workloadParams = [projectId];
    
    if (userId) {
      workloadQuery += ' AND user_id = ?';
      workloadParams.push(userId);
    }
    
    const [userWorkloads] = await pool.query(workloadQuery, workloadParams);
    
    // Group entries by user
    const userEntries = {};
    timeEntries.forEach(entry => {
      const userId = entry.user_id;
      
      // Initialize user if not exists
      if (!userEntries[userId]) {
        userEntries[userId] = {
          user_id: userId,
          user_name: entry.full_name || entry.username,
          email: entry.email,
          entries: [],
          total_hours: 0,
          workload: userWorkloads.find(w => w.user_id == userId)?.workload || 0
        };
      }
      
      // Add entry and update total
      userEntries[userId].entries.push(entry);
      userEntries[userId].total_hours += parseFloat(entry.hours) || 0;
    });
    
    // Prepare DLUT report data
    const reportData = {
      project: {
        id: project.id,
        name: project.name,
        contract_number: project.contract_number,
        start_date: project.start_date,
        end_date: project.end_date
      },
      period: {
        start_date: startDate || 'All time',
        end_date: endDate || 'All time'
      },
      users: Object.values(userEntries)
    };
    
    // TODO: In a real implementation, format this as a proper DLUT report
    // Set headers for download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="dlut-report-${projectId}${userId ? `-user-${userId}` : ''}.pdf"`);
    
    // Send the report data (in production, this would be a formatted PDF)
    res.json(reportData);
    
  } catch (error) {
    console.error('Error generating supervisory report:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 