<script lang="ts">
  import { onMount } from 'svelte';
  import { getAuthHeaders, isAuthenticated, currentUser } from '$lib/stores/auth';
  import { goto } from '$app/navigation';
  
  let department = {
    name: '',
    description: '',
    users: []
  };
  
  let availableUsers = [];
  let loading = false;
  let creating = false;
  let error = null;
  
  onMount(async () => {
    if (!$isAuthenticated) {
      goto('/login');
      return;
    }
    
    // Check if user has permission to create departments
    if (!$currentUser || !['admin', 'project_manager'].includes($currentUser.role)) {
      goto('/departments');
      return;
    }
    
    try {
      loading = true;
      
      // Fetch available users
      const response = await fetch('http://localhost:3000/api/users', {
        headers: getAuthHeaders()
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to load users');
      }
      
      availableUsers = await response.json();
      loading = false;
    } catch (err) {
      error = err.message;
      loading = false;
    }
  });
  
  async function createDepartment() {
    try {
      creating = true;
      error = null;
      
      // Transform users array to match API expectation (just user IDs)
      const departmentData = {
        ...department,
        users: department.users.map(user => user.id)
      };
      
      const response = await fetch('http://localhost:3000/api/departments', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(departmentData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create department');
      }
      
      const result = await response.json();
      creating = false;
      
      // Navigate to the newly created department
      goto(`/departments/${result.departmentId}`);
    } catch (err) {
      error = err.message;
      creating = false;
    }
  }
  
  function toggleUser(userId) {
    const userIndex = department.users.findIndex(u => u.id === userId);
    
    if (userIndex >= 0) {
      // Remove user
      department.users = department.users.filter(u => u.id !== userId);
    } else {
      // Add user
      const user = availableUsers.find(u => u.id === userId);
      if (user) {
        department.users = [...department.users, user];
      }
    }
    
    // Trigger reactivity
    department = department;
  }
  
  function isUserSelected(userId) {
    return department.users.some(u => u.id === userId);
  }
</script>

<svelte:head>
  <title>Create New Department</title>
</svelte:head>

<div class="container mx-auto px-4 py-8">
  <div class="flex justify-between items-center mb-6">
    <h1 class="text-3xl font-bold text-gray-800">Create New Department</h1>
  </div>
  
  {#if loading}
    <div class="flex justify-center my-12">
      <div class="w-12 h-12 border-4 border-primary-400 border-t-primary-600 rounded-full animate-spin"></div>
    </div>
  {:else if error}
    <div class="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
      <p class="text-red-700">{error}</p>
    </div>
  {:else}
    <form on:submit|preventDefault={createDepartment} class="bg-white shadow rounded-lg overflow-hidden">
      <div class="p-6 border-b">
        <h2 class="text-xl font-semibold mb-4">Department Information</h2>
        <div class="grid grid-cols-1 gap-6">
          <div>
            <label for="name" class="block text-sm font-medium text-gray-700 mb-1">Department Name *</label>
            <input
              id="name"
              type="text"
              bind:value={department.name}
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          
          <div>
            <label for="description" class="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              id="description"
              rows="3"
              bind:value={department.description}
              class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
            ></textarea>
          </div>
        </div>
      </div>
      
      <div class="p-6">
        <h2 class="text-xl font-semibold mb-4">Department Members</h2>
        
        {#if availableUsers.length === 0}
          <p class="text-gray-500">No users available to add to this department.</p>
        {:else}
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {#each availableUsers as user}
              <div 
                class={`p-4 border rounded-lg cursor-pointer transition-colors ${isUserSelected(user.id) ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-primary-300'}`}
                on:click={() => toggleUser(user.id)}
              >
                <div class="flex items-center">
                  <input 
                    type="checkbox" 
                    checked={isUserSelected(user.id)} 
                    class="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    on:change={() => toggleUser(user.id)}
                  />
                  <div class="ml-3">
                    <p class="text-sm font-medium text-gray-900">{user.full_name}</p>
                    <p class="text-sm text-gray-500">{user.email}</p>
                    <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary-100 text-primary-800 mt-1">
                      {user.role}
                    </span>
                  </div>
                </div>
              </div>
            {/each}
          </div>
          
          <div class="mt-4 text-sm text-gray-500">
            <p>Select users to add them to the department. Click on a user to toggle selection.</p>
            <p>Currently selected: {department.users.length} users</p>
          </div>
        {/if}
      </div>
      
      <div class="p-6 bg-gray-50 flex justify-end space-x-4">
        <a
          href="/departments"
          class="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50"
        >
          Cancel
        </a>
        <button
          type="submit"
          disabled={creating}
          class="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {creating ? 'Creating...' : 'Create Department'}
        </button>
      </div>
    </form>
  {/if}
</div>

<style>
  .new-department-page {
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
  
  label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 500;
  }
  
  input, textarea {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 1rem;
  }
  
  textarea {
    resize: vertical;
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