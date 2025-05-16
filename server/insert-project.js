import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import fs from 'fs';

// Configure dotenv
dotenv.config();

// Read project data
const projectData = JSON.parse(fs.readFileSync('./project.json', 'utf8'));

async function insertProject() {
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
    
    // Insert project directly
    const query = `
      INSERT INTO projects 
        (name, description, start_date, end_date, budget, contract_number, min_workload, created_by) 
      VALUES 
        (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const params = [
      projectData.name,
      projectData.description,
      projectData.start_date,
      projectData.end_date,
      projectData.budget || 0,
      projectData.contract_number,
      projectData.min_workload || 0,
      6 // testpm user ID
    ];
    
    console.log('Executing query with params:', params);
    const [result] = await pool.query(query, params);
    
    console.log('Project inserted successfully:', result);
    const projectId = result.insertId;
    
    // Insert project users if provided
    if (projectData.users && projectData.users.length > 0) {
      const userValues = projectData.users.map(user => [
        projectId, 
        user.id, 
        user.project_role || 'employee', 
        user.workload || 100
      ]);
      
      const placeholders = userValues.map(() => '(?, ?, ?, ?)').join(', ');
      const flatValues = userValues.flat();
      
      const userQuery = `
        INSERT INTO project_users 
          (project_id, user_id, role, workload) 
        VALUES 
          ${placeholders}
      `;
      
      console.log('Executing user query with values:', flatValues);
      const [userResult] = await pool.query(userQuery, flatValues);
      console.log('Project users inserted successfully:', userResult);
    }
    
  } catch (error) {
    console.error('Error inserting project:', error);
  } finally {
    await pool.end();
  }
}

insertProject(); 