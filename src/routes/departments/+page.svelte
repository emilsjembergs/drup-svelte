<script lang="ts">
  import { onMount } from 'svelte';
  import { getAuthHeaders, isAuthenticated, currentUser } from '$lib/stores/auth';
  import { goto } from '$app/navigation';
  
  interface Department {
    id: number;
    name: string;
    description: string;
    created_at: string;
  }
  
  let departments: Department[] = [];
  let loading = true;
  let error = null;
  
  // Filters
  let searchQuery = '';
  let sortField = 'name';
  let sortOrder = 'asc';
  
  onMount(async () => {
    if (!$isAuthenticated) {
      goto('/login');
      return;
    }
    
    await loadDepartments();
  });
  
  async function loadDepartments() {
    try {
      loading = true;
      
      // Build query parameters
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      if (sortField) params.append('sort', sortField);
      if (sortOrder) params.append('order', sortOrder);
      
      const queryString = params.toString() ? `?${params.toString()}` : '';
      
      const response = await fetch(`http://localhost:3000/api/departments${queryString}`, {
        headers: getAuthHeaders()
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to load departments');
      }
      
      departments = await response.json();
      loading = false;
    } catch (err) {
      error = err.message;
      loading = false;
    }
  }
  
  function handleSort(field) {
    if (sortField === field) {
      // Toggle order if clicking the same field
      sortOrder = sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      // Default to ascending for new field
      sortField = field;
      sortOrder = 'asc';
    }
    
    loadDepartments();
  }
  
  function getSortIcon(field) {
    if (sortField !== field) return 'fa-sort';
    return sortOrder === 'asc' ? 'fa-sort-up' : 'fa-sort-down';
  }
  
  function handleSearch() {
    loadDepartments();
  }
  
  function canCreateDepartment() {
    return $currentUser && ['admin', 'project_manager'].includes($currentUser.role);
  }
</script>

<svelte:head>
  <title>Departments</title>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css">
</svelte:head>

<div class="container mx-auto px-4 py-8">
  <div class="flex justify-between items-center mb-6">
    <h1 class="text-3xl font-bold text-gray-800">Departments</h1>
    
    {#if canCreateDepartment()}
      <a
        href="/departments/new"
        class="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700 transition-colors"
      >
        Create Department
      </a>
    {/if}
  </div>
  
  <div class="bg-white shadow rounded-lg overflow-hidden mb-8">
    <div class="p-4 border-b">
      <form on:submit|preventDefault={handleSearch} class="flex flex-wrap gap-4">
        <div class="flex-grow min-w-[200px]">
          <label for="search" class="block text-sm font-medium text-gray-700 mb-1">Search</label>
          <input
            id="search"
            type="text"
            placeholder="Search by department name or description"
            bind:value={searchQuery}
            class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
          />
        </div>
        
        <div class="flex items-end">
          <button
            type="submit"
            class="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700 transition-colors"
          >
            Search
          </button>
        </div>
      </form>
    </div>
    
    {#if loading}
      <div class="p-8 flex justify-center">
        <div class="w-12 h-12 border-4 border-primary-400 border-t-primary-600 rounded-full animate-spin"></div>
      </div>
    {:else if error}
      <div class="bg-red-50 border-l-4 border-red-500 p-4">
        <p class="text-red-700">{error}</p>
      </div>
    {:else if departments.length === 0}
      <div class="p-8 text-center">
        <p class="text-gray-500">No departments found. Try changing your search criteria or create a new department.</p>
      </div>
    {:else}
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th 
                class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                on:click={() => handleSort('name')}
              >
                Name <i class="fas {getSortIcon('name')} ml-1"></i>
              </th>
              <th 
                class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                on:click={() => handleSort('description')}
              >
                Description <i class="fas {getSortIcon('description')} ml-1"></i>
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Members
              </th>
              <th class="px-6 py-3 relative">
                <span class="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            {#each departments as department}
              <tr>
                <td class="px-6 py-4 whitespace-nowrap">
                  <a href="/departments/{department.id}" class="text-primary-600 hover:text-primary-800 font-medium">
                    {department.name}
                  </a>
                </td>
                <td class="px-6 py-4">
                  <div class="text-sm text-gray-900 truncate max-w-md">
                    {department.description || '-'}
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  {#if department.users && department.users.length > 0}
                    <div class="flex items-center">
                      <div class="flex -space-x-2 mr-2">
                        {#each department.users.slice(0, 3) as user}
                          <div class="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center border border-white">
                            <span class="text-xs font-medium text-primary-800">
                              {user.full_name.split(' ').map(name => name[0]).join('')}
                            </span>
                          </div>
                        {/each}
                      </div>
                      <span class="text-gray-500 text-sm">
                        {department.users.length} member{department.users.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                  {:else}
                    <span class="text-gray-500 text-sm">No members</span>
                  {/if}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <a href="/departments/{department.id}" class="text-primary-600 hover:text-primary-900 mr-3">View</a>
                  {#if canCreateDepartment()}
                    <a href="/departments/{department.id}/edit" class="text-primary-600 hover:text-primary-900">Edit</a>
                  {/if}
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </div>
</div>

<style>
  .departments-page {
    max-width: 1200px;
    margin: 0 auto;
  }
  
  header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
  }
  
  h1 {
    margin: 0;
    color: #2c3e50;
  }
  
  .new-button {
    background-color: #27ae60;
    color: white;
    padding: 0.5rem 1rem;
    border-radius: 4px;
    text-decoration: none;
    font-weight: 500;
  }
  
  .loading, .empty-state {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    min-height: 200px;
    text-align: center;
  }
  
  .error-message {
    background-color: #f8d7da;
    color: #721c24;
    padding: 1rem;
    border-radius: 4px;
    margin-bottom: 1rem;
  }
  
  .button {
    background-color: #3498db;
    color: white;
    padding: 0.5rem 1rem;
    border-radius: 4px;
    text-decoration: none;
    margin-top: 1rem;
    display: inline-block;
  }
  
  .table-container {
    overflow-x: auto;
    background-color: white;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }
  
  table {
    width: 100%;
    border-collapse: collapse;
  }
  
  th, td {
    padding: 0.75rem;
    text-align: left;
    border-bottom: 1px solid #ecf0f1;
  }
  
  th {
    background-color: #f8f9fa;
    font-weight: 600;
  }
  
  tbody tr:hover {
    background-color: #f8f9fa;
  }
  
  .actions {
    display: flex;
    gap: 0.5rem;
  }
  
  .action-link {
    color: #3498db;
    text-decoration: none;
  }
  
  .action-link:hover {
    text-decoration: underline;
  }
</style> 