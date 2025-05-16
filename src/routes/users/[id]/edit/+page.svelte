<script>
  import { onMount } from 'svelte';
  import { getAuthHeaders, isAuthenticated, currentUser } from '$lib/stores/auth';
  import { goto } from '$app/navigation';
  
  export let data;
  
  let user = {
    full_name: '',
    email: '',
    role: '',
    language: 'en'
  };
  
  let loading = true;
  let saving = false;
  let error = null;
  let successMessage = null;
  let userId = data.id;
  
  // Clone user for comparison
  let originalUser = null;
  
  onMount(async () => {
    if (!$isAuthenticated) {
      goto('/login');
      return;
    }
    
    // Check if user has permission to edit this user
    if (!canEditUser()) {
      goto(`/users/${userId}`);
      return;
    }
    
    try {
      loading = true;
      const response = await fetch(`http://localhost:3000/api/users/${userId}`, {
        headers: getAuthHeaders()
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to load user');
      }
      
      const userData = await response.json();
      user = {
        full_name: userData.full_name,
        email: userData.email,
        role: userData.role,
        language: userData.language || 'en'
      };
      
      originalUser = JSON.parse(JSON.stringify(user));
      loading = false;
    } catch (err) {
      error = err.message;
      loading = false;
    }
  });
  
  function canEditUser() {
    if (!$currentUser) return false;
    
    // Admin or HR can edit any user
    if (['admin', 'hr'].includes($currentUser.role)) return true;
    
    // Users can edit their own profile
    if ($currentUser.id == userId) return true;
    
    return false;
  }
  
  function canChangeRole() {
    return $currentUser && ['admin', 'hr'].includes($currentUser.role);
  }
  
  async function saveUser() {
    try {
      saving = true;
      error = null;
      successMessage = null;
      
      const response = await fetch(`http://localhost:3000/api/users/${userId}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(user)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update user');
      }
      
      const updatedUser = await response.json();
      
      // Update the form with new values
      user = {
        full_name: updatedUser.full_name,
        email: updatedUser.email,
        role: updatedUser.role,
        language: updatedUser.language || 'en'
      };
      
      originalUser = JSON.parse(JSON.stringify(user));
      
      successMessage = 'User updated successfully';
      saving = false;
    } catch (err) {
      error = err.message;
      saving = false;
    }
  }
  
  function hasChanges() {
    return JSON.stringify(user) !== JSON.stringify(originalUser);
  }
</script>

<svelte:head>
  <title>Edit User</title>
</svelte:head>

<div class="container mx-auto px-4 py-8">
  <div class="flex justify-between items-center mb-6">
    <h1 class="text-3xl font-bold text-gray-800">
      {#if loading}
        Loading user...
      {:else}
        Edit User
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
    
    <form on:submit|preventDefault={saveUser} class="bg-white shadow rounded-lg overflow-hidden">
      <div class="p-6">
        <h2 class="text-xl font-semibold mb-4">User Information</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label for="full_name" class="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <input
              id="full_name"
              type="text"
              bind:value={user.full_name}
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          
          <div>
            <label for="email" class="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              id="email"
              type="email"
              bind:value={user.email}
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          
          <div>
            <label for="language" class="block text-sm font-medium text-gray-700 mb-1">Language</label>
            <select
              id="language"
              bind:value={user.language}
              class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="en">English</option>
              <option value="lv">Latvian</option>
              <option value="ru">Russian</option>
            </select>
          </div>
          
          {#if canChangeRole()}
            <div>
              <label for="role" class="block text-sm font-medium text-gray-700 mb-1">Role</label>
              <select
                id="role"
                bind:value={user.role}
                class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="admin">Admin</option>
                <option value="hr">HR</option>
                <option value="project_manager">Project Manager</option>
                <option value="employee">Employee</option>
              </select>
            </div>
          {/if}
        </div>
      </div>
      
      <div class="p-6 bg-gray-50 flex justify-end space-x-4">
        <a
          href="/users/{userId}"
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