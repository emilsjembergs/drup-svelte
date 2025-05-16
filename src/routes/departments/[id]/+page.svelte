<script>
  import { onMount } from 'svelte';
  import { getAuthHeaders, isAuthenticated, currentUser } from '$lib/stores/auth';
  import { goto } from '$app/navigation';
  
  export let data;
  
  let department = null;
  let loading = true;
  let error = null;
  let departmentId = data.id;
  
  onMount(async () => {
    if (!$isAuthenticated) {
      goto('/login');
      return;
    }
    
    try {
      loading = true;
      const response = await fetch(`http://localhost:3000/api/departments/${departmentId}`, {
        headers: getAuthHeaders()
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to load department');
      }
      
      department = await response.json();
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
</script>

<svelte:head>
  <title>{department ? department.name : 'Department Details'}</title>
</svelte:head>

<div class="container mx-auto px-4 py-8">
  <div class="flex justify-between items-center mb-6">
    <h1 class="text-3xl font-bold text-gray-800">
      {#if loading}
        Loading department...
      {:else if department}
        {department.name}
      {:else}
        Department Details
      {/if}
    </h1>
    
    {#if department && canEditDepartment()}
      <a 
        href="/departments/{departmentId}/edit" 
        class="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700 transition-colors"
      >
        Edit Department
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
  {:else if department}
    <div class="bg-white shadow rounded-lg overflow-hidden">
      <div class="p-6 border-b">
        <h2 class="text-xl font-semibold mb-4">Department Information</h2>
        <div>
          <p class="text-gray-600 mb-1">Description</p>
          <p class="text-gray-900">{department.description || 'No description provided'}</p>
        </div>
      </div>
      
      {#if department.users && department.users.length > 0}
        <div class="p-6">
          <h2 class="text-xl font-semibold mb-4">Department Members</h2>
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                {#each department.users as user}
                  <tr>
                    <td class="px-6 py-4 whitespace-nowrap">
                      <a href="/users/{user.id}" class="text-primary-600 hover:text-primary-800">
                        {user.full_name}
                      </a>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                      <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
                        {user.role}
                      </span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                      <a href="mailto:{user.email}" class="text-gray-500 hover:text-gray-700">
                        {user.email}
                      </a>
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        </div>
      {:else}
        <div class="p-6">
          <p class="text-gray-500">No members in this department.</p>
        </div>
      {/if}
    </div>
  {:else}
    <p class="text-gray-500">Department not found.</p>
  {/if}
  
  <div class="mt-6">
    <a href="/departments" class="text-primary-600 hover:text-primary-800">
      &larr; Back to Departments
    </a>
  </div>
</div> 