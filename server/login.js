import fetch from 'node-fetch';
import fs from 'fs';

// Login with our test user
const credentials = {
  username: 'testpm',
  password: 'password123'
};

async function login() {
  try {
    console.log('Attempting to login with:', credentials.username);
    
    const response = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(credentials)
    });
    
    const data = await response.json();
    
    if (response.ok) {
      console.log('Login successful!');
      console.log('Token:', data.token);
      
      // Save token to file for later use
      fs.writeFileSync('./token.txt', data.token);
      console.log('Token saved to token.txt');
      
      return data.token;
    } else {
      console.error('Login failed:', data.message);
    }
  } catch (error) {
    console.error('Error logging in:', error);
  }
}

login(); 