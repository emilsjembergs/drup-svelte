import fetch from 'node-fetch';
import fs from 'fs';

// Read project data
const projectData = JSON.parse(fs.readFileSync('./project.json', 'utf8'));

// Get token from file or command line
let token;
try {
  token = fs.readFileSync('./token.txt', 'utf8').trim();
  console.log('Using token from file:', token.substring(0, 10) + '...');
} catch (err) {
  token = process.argv[2] || 'your_token_here';
  console.log('Using token from command line:', token.substring(0, 10) + '...');
}

async function createProject() {
  try {
    console.log('Making request with project data:', JSON.stringify(projectData, null, 2));
    console.log('Authorization header:', `Bearer ${token.substring(0, 15)}...`);
    
    const response = await fetch('http://localhost:3000/api/projects', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(projectData)
    });
    
    console.log('Response status:', response.status);
    
    const textResponse = await response.text();
    console.log('Raw response:', textResponse);
    
    let data;
    try {
      data = JSON.parse(textResponse);
      console.log('Response data:', JSON.stringify(data, null, 2));
    } catch (err) {
      console.log('Could not parse response as JSON');
    }
  } catch (error) {
    console.error('Error making request:', error);
  }
}

createProject(); 