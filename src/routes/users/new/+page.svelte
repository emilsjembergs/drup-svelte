<script lang="ts">
  import { getAuthHeaders } from '$lib/stores/auth';
  import { goto } from '$app/navigation';
  
  let username = '';
  let password = '';
  let confirmPassword = '';
  let fullName = '';
  let email = '';
  let role = 'user';
  let error = '';
  let loading = false;
  
  async function handleSubmit() {
    loading = true;
    error = '';
    
    if (password !== confirmPassword) {
      error = 'Passwords do not match';
      loading = false;
      return;
    }
    
    try {
      const response = await fetch('http://localhost:3000/api/users', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          username,
          password,
          full_name: fullName,
          email,
          role
        })
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to create user');
      }
      
      // Redirect to users list on success
      goto('/users');
    } catch (err) {
      error = err instanceof Error ? err.message : 'An error occurred';
      console.error('Error creating user:', err);
    } finally {
      loading = false;
    }
  }
</script>

<div class="new-user-page">
  <header>
    <h1>Create New User</h1>
  </header>
  
  {#if error}
    <div class="error-message">
      {error}
    </div>
  {/if}
  
  <div class="form-container">
    <form on:submit|preventDefault={handleSubmit}>
      <div class="form-group">
        <label for="username">Username*</label>
        <input 
          type="text" 
          id="username" 
          bind:value={username} 
          required 
          autofocus
        />
      </div>
      
      <div class="form-row">
        <div class="form-group">
          <label for="password">Password*</label>
          <input 
            type="password" 
            id="password" 
            bind:value={password} 
            required
          />
        </div>
        
        <div class="form-group">
          <label for="confirmPassword">Confirm Password*</label>
          <input 
            type="password" 
            id="confirmPassword" 
            bind:value={confirmPassword} 
            required
          />
        </div>
      </div>
      
      <div class="form-group">
        <label for="fullName">Full Name*</label>
        <input 
          type="text" 
          id="fullName" 
          bind:value={fullName} 
          required
        />
      </div>
      
      <div class="form-group">
        <label for="email">Email*</label>
        <input 
          type="email" 
          id="email" 
          bind:value={email} 
          required
        />
      </div>
      
      <div class="form-group">
        <label for="role">Role*</label>
        <select id="role" bind:value={role} required>
          <option value="user">User</option>
          <option value="project_manager">Project Manager</option>
          <option value="admin">Admin</option>
        </select>
      </div>
      
      <div class="form-actions">
        <a href="/users" class="cancel-button">Cancel</a>
        <button type="submit" disabled={loading}>
          {loading ? 'Creating...' : 'Create User'}
        </button>
      </div>
    </form>
  </div>
</div>

<style>
  .new-user-page {
    max-width: 800px;
    margin: 0 auto;
  }
  
  header {
    margin-bottom: 1.5rem;
  }
  
  h1 {
    color: #2c3e50;
  }
  
  .form-container {
    background-color: white;
    padding: 2rem;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }
  
  .form-group {
    margin-bottom: 1.5rem;
  }
  
  .form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
  }
  
  label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 500;
  }
  
  input, select {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 1rem;
  }
  
  select {
    background-color: white;
  }
  
  .form-actions {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 2rem;
  }
  
  button {
    padding: 0.75rem 1.5rem;
    background-color: #3498db;
    color: white;
    border: none;
    border-radius: 4px;
    font-size: 1rem;
    cursor: pointer;
  }
  
  button:hover {
    background-color: #2980b9;
  }
  
  button:disabled {
    background-color: #95a5a6;
    cursor: not-allowed;
  }
  
  .cancel-button {
    padding: 0.75rem 1.5rem;
    background-color: #f8f9fa;
    color: #2c3e50;
    border: 1px solid #ddd;
    border-radius: 4px;
    text-decoration: none;
  }
  
  .cancel-button:hover {
    background-color: #e9ecef;
  }
  
  .error-message {
    background-color: #f8d7da;
    color: #721c24;
    padding: 1rem;
    border-radius: 4px;
    margin-bottom: 1rem;
  }
</style> 