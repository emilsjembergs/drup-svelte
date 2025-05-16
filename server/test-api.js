import fetch from 'node-fetch';

// First attempt to login
async function testApi() {
  try {
    console.log('Testing API...');
    
    // Login to get a token
    const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: 'admin',
        password: 'admin123'
      })
    });
    
    if (!loginResponse.ok) {
      const errorData = await loginResponse.json();
      throw new Error(`Login failed: ${errorData.message || 'Unknown error'}`);
    }
    
    const loginData = await loginResponse.json();
    console.log('Login successful. User info:', loginData.user);
    
    // Get token from login response
    const token = loginData.token;
    
    // Try to fetch departments
    const departmentsResponse = await fetch('http://localhost:3000/api/departments', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!departmentsResponse.ok) {
      const errorData = await departmentsResponse.json();
      throw new Error(`Fetching departments failed: ${errorData.message || 'Unknown error'}`);
    }
    
    const departments = await departmentsResponse.json();
    console.log('Departments fetched successfully:', departments);
    
    // Try to fetch users
    const usersResponse = await fetch('http://localhost:3000/api/users', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!usersResponse.ok) {
      const errorData = await usersResponse.json();
      throw new Error(`Fetching users failed: ${errorData.message || 'Unknown error'}`);
    }
    
    const users = await usersResponse.json();
    console.log('Users fetched successfully. Count:', users.length);
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testApi(); 