<script>
  import { onMount } from 'svelte';
  import { getAuthHeaders, isAuthenticated, currentUser } from '$lib/stores/auth';
  import { goto } from '$app/navigation';
  
  export let data;
  
  let department = {
    name: '',
    description: '',
    users: []
  };
  
  let availableUsers = [];
  let loading = true;
  let saving = false;
  let error = null;
  let successMessage = null;
  let departmentId = data.id;
  
  // Clone department for comparison
  let originalDepartment = null;
  
  onMount(async () => {
    if (!$isAuthenticated) {
      goto('/login');
      return;
    }
    
    // Check if user has permission to edit departments
    if (!canEditDepartment()) {
      goto(`/departments/${departmentId}`);
      return;
    }
    
    try {
      loading = true;
      
      // Fetch department data
      const departmentResponse = await fetch(`http://localhost:3000/api/departments/${departmentId}`, {
        headers: getAuthHeaders()
      });
      
      if (!departmentResponse.ok) {
        const errorData = await departmentResponse.json();
        throw new Error(errorData.message || 'Failed to load department');
      }
      
      department = await departmentResponse.json();
      originalDepartment = JSON.parse(JSON.stringify(department));
      
      // Fetch available users
      const usersResponse = await fetch('http://localhost:3000/api/users', {
        headers: getAuthHeaders()
      });
      
      if (!usersResponse.ok) {
        const errorData = await usersResponse.json();
        throw new Error(errorData.message || 'Failed to load users');
      }
      
      availableUsers = await usersResponse.json();
      loading = false;
    } catch (err) {
      error = err.message;
      loading = false;
    }
  });
  
  function canEditDepartment() {
    if (!$currentUser) return false;
    return ['admin', 'project_manager'].includes($currentUser.role);
  }
  
  async function saveDepartment() {
    try {
      saving = true;
      error = null;
      successMessage = null;
      
      // Transform users array to match API expectation (just user IDs)
      const departmentData = {
        ...department,
        users: department.users.map(user => user.id)
      };
      
      const response = await fetch(`http://localhost:3000/api/departments/${departmentId}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(departmentData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update department');
      }
      
      // Refetch department with updated data
      const refreshResponse = await fetch(`http://localhost:3000/api/departments/${departmentId}`, {
        headers: getAuthHeaders()
      });
      
      if (refreshResponse.ok) {
        department = await refreshResponse.json();
        originalDepartment = JSON.parse(JSON.stringify(department));
      }
      
      successMessage = 'Department updated successfully';
      saving = false;
    } catch (err) {
      error = err.message;
      saving = false;
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
  
  function hasChanges() {
    return JSON.stringify(department) !== JSON.stringify(originalDepartment);
  }
</script>

<svelte:head>
  <title>Edit Department</title>
</svelte:head>

<div class="container mx-auto px-4 py-8">
  <div class="flex justify-between items-center mb-6">
    <h1 class="text-3xl font-bold text-gray-800">
      {#if loading}
        Loading department...
      {:else}
        Edit Department: {department.name}
      {/if}
    </h1>
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
    {#if successMessage}
      <div class="bg-green-50 border-l-4 border-green-500 p-4 mb-6">
        <p class="text-green-700">{successMessage}</p>
      </div>
    {/if}
    
    <form on:submit|preventDefault={saveDepartment} class="bg-white shadow rounded-lg overflow-hidden">
      <div class="p-6 border-b">
        <h2 class="text-xl font-semibold mb-4">Department Information</h2>
        <div class="grid grid-cols-1 gap-6">
          <div>
            <label for="name" class="block text-sm font-medium text-gray-700 mb-1">Department Name</label>
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
          href="/departments/{departmentId}"
          class="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50"
        >
          Cancel
        </a>
        <button
          type="submit"
          disabled={saving || !hasChanges()}
          class="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </form>
  {/if}
</div> 