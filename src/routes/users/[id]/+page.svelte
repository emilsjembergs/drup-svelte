<script>
  import { onMount } from 'svelte';
  import { getAuthHeaders, isAuthenticated, currentUser } from '$lib/stores/auth';
  import { goto } from '$app/navigation';
  
  export let data;
  
  let user = null;
  let loading = true;
  let error = null;
  let userId = data.id;
  
  onMount(async () => {
    if (!$isAuthenticated) {
      goto('/login');
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
      
      user = await response.json();
      loading = false;
    } catch (err) {
      error = err.message;
      loading = false;
    }
  });
  
  function formatDate(dateString) {
    if (!dateString) return 'Not set';
    const date = new Date(dateString);
    return date.toLocaleDateString();
  }
  
  function canEditUser() {
    if (!$currentUser) return false;
    
    // Admin or HR can edit any user
    if (['admin', 'hr'].includes($currentUser.role)) return true;
    
    // Users can edit their own profile
    if ($currentUser.id == userId) return true;
    
    return false;
  }
</script>

<svelte:head>
  <title>{user ? user.full_name : 'User Details'}</title>
</svelte:head>

<div class="container mx-auto px-4 py-8">
  <div class="flex justify-between items-center mb-6">
    <h1 class="text-3xl font-bold text-gray-800">
      {#if loading}
        Loading user...
      {:else if user}
        {user.full_name}
      {:else}
        User Details
      {/if}
    </h1>
    
    {#if user && canEditUser()}
      <a 
        href="/users/{userId}/edit" 
        class="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700 transition-colors"
      >
        Edit User
      </a>
    {/if}
  </div>
  
  {#if loading}
    <div class="flex justify-center my-12">
      <div class="w-12 h-12 border-4 border-primary-400 border-t-primary-600 rounded-full animate-spin"></div>
    </div>
  {:else if error}
    <div class="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
      <p class="text-red-700">{error}</p>
    </div>
  {:else if user}
    <div class="bg-white shadow rounded-lg overflow-hidden">
      <div class="p-6 border-b">
        <h2 class="text-xl font-semibold mb-4">User Information</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p class="text-gray-600 mb-1">Username</p>
            <p class="text-gray-900">{user.username}</p>
          </div>
          <div>
            <p class="text-gray-600 mb-1">Full Name</p>
            <p class="text-gray-900">{user.full_name}</p>
          </div>
          <div>
            <p class="text-gray-600 mb-1">Email</p>
            <p class="text-gray-900">{user.email}</p>
          </div>
          <div>
            <p class="text-gray-600 mb-1">Role</p>
            <p class="text-gray-900">
              <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
                {user.role}
              </span>
            </p>
          </div>
        </div>
      </div>
      
      {#if user.projects && user.projects.length > 0}
        <div class="p-6 border-b">
          <h2 class="text-xl font-semibold mb-4">Projects</h2>
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Project Name</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Workload</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dates</th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                {#each user.projects as project}
                  <tr>
                    <td class="px-6 py-4 whitespace-nowrap">
                      <a href="/projects/{project.id}" class="text-primary-600 hover:text-primary-800">
                        {project.name}
                      </a>
                      {#if project.description}
                        <p class="text-gray-500 text-sm truncate max-w-xs">{project.description}</p>
                      {/if}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                      {project.project_role || 'Member'}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                      {project.workload || 100}%
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                      <div class="text-sm text-gray-900">
                        {formatDate(project.start_date)} - {formatDate(project.end_date)}
                      </div>
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        </div>
      {/if}
      
      {#if user.departments && user.departments.length > 0}
        <div class="p-6">
          <h2 class="text-xl font-semibold mb-4">Departments</h2>
          <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {#each user.departments as department}
              <a 
                href="/departments/{department.id}" 
                class="block p-4 border border-gray-200 rounded-lg hover:border-primary-400 transition-colors"
              >
                <h3 class="font-medium text-gray-900">{department.name}</h3>
                {#if department.description}
                  <p class="text-sm text-gray-500 mt-1 truncate">{department.description}</p>
                {/if}
              </a>
            {/each}
          </div>
        </div>
      {/if}
    </div>
  {:else}
    <p class="text-gray-500">User not found.</p>
  {/if}
  
  <div class="mt-6">
    <a href="/users" class="text-primary-600 hover:text-primary-800">
      &larr; Back to Users
    </a>
  </div>
</div> 