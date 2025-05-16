<script lang="ts">
  import { onMount } from 'svelte';
  import { getAuthHeaders, isAuthenticated, currentUser } from '$lib/stores/auth';
  import { goto } from '$app/navigation';
  
  interface Project {
    id: number;
    name: string;
    description?: string;
    start_date?: string;
    end_date?: string;
    budget?: number;
    contract_number?: string;
    users?: any[];
  }
  
  let projects: Project[] = [];
  let loading = true;
  let error = null;
  let searchQuery = '';
  let sortField = 'name';
  let sortOrder = 'asc';
  let deletingProject: Project | null = null;
  let showDeleteConfirm = false;
  
  onMount(async () => {
    if (!$isAuthenticated) {
      goto('/login');
      return;
    }
    
    try {
      await fetchProjects();
    } catch (err) {
      console.error('Error fetching projects:', err);
      error = err instanceof Error ? err.message : 'An error occurred while fetching projects';
    } finally {
      loading = false;
    }
  });
  
  async function fetchProjects() {
    let queryParams = new URLSearchParams();
    
    if (searchQuery) {
      queryParams.append('search', searchQuery);
    }
    
    if (sortField) {
      queryParams.append('sort', sortField);
      queryParams.append('order', sortOrder);
    }
    
    const response = await fetch(`http://localhost:3000/api/projects?${queryParams.toString()}`, {
      headers: getAuthHeaders() as HeadersInit
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch projects');
    }
    
    projects = await response.json();
  }
  
  function handleSort(field: string) {
    if (field === sortField) {
      sortOrder = sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      sortField = field;
      sortOrder = 'asc';
    }
    
    fetchProjects();
  }
  
  function getSortIcon(field: string) {
    if (field !== sortField) return 'fa-sort';
    return sortOrder === 'asc' ? 'fa-sort-up' : 'fa-sort-down';
  }
  
  function formatDate(dateString?: string) {
    if (!dateString) return 'Not set';
    
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(date);
  }
  
  function canCreateProject() {
    return $currentUser && $currentUser.role === 'project_manager';
  }
  
  function canEditProject() {
    return $currentUser && $currentUser.role === 'project_manager';
  }
  
  function canDeleteProject() {
    return $currentUser && $currentUser.role === 'project_manager';
  }
  
  function confirmDelete(project: Project) {
    deletingProject = project;
    showDeleteConfirm = true;
  }
  
  async function deleteProject() {
    if (!deletingProject) return;
    
    try {
      const response = await fetch(`http://localhost:3000/api/projects/${deletingProject.id}`, {
        method: 'DELETE',
        headers: getAuthHeaders() as HeadersInit
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to delete project');
      }
      
      // Remove deleted project from list
      projects = projects.filter(p => p.id !== deletingProject?.id);
      
      // Reset delete state
      showDeleteConfirm = false;
      deletingProject = null;
    } catch (err) {
      console.error('Error deleting project:', err);
      error = err instanceof Error ? err.message : 'An error occurred while deleting the project';
    }
  }
  
  function cancelDelete() {
    showDeleteConfirm = false;
    deletingProject = null;
  }
</script>

<svelte:head>
  <title>Projects</title>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css">
</svelte:head>

<div class="container mx-auto px-4 py-8">
  <div class="flex justify-between items-center mb-6">
    <h1 class="text-3xl font-bold text-gray-800">Projects</h1>
    
    {#if canCreateProject()}
      <a
        href="/projects/new"
        class="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700 transition-colors"
      >
        Create Project
      </a>
    {/if}
  </div>
  
  <div class="bg-white shadow rounded-lg overflow-hidden mb-8">
    <div class="p-4 border-b">
      <form on:submit|preventDefault={() => fetchProjects()} class="flex flex-wrap gap-4">
        <div class="flex-grow min-w-[200px]">
          <label for="search" class="block text-sm font-medium text-gray-700 mb-1">Search</label>
          <input
            id="search"
            type="text"
            placeholder="Search by project name or description"
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
    {:else if projects.length === 0}
      <div class="p-8 text-center">
        <p class="text-gray-500">No projects found. Try changing your search criteria or create a new project.</p>
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
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Contract #
              </th>
              <th 
                class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                on:click={() => handleSort('start_date')}
              >
                Start Date <i class="fas {getSortIcon('start_date')} ml-1"></i>
              </th>
              <th 
                class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                on:click={() => handleSort('end_date')}
              >
                End Date <i class="fas {getSortIcon('end_date')} ml-1"></i>
              </th>
              <th 
                class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                on:click={() => handleSort('budget')}
              >
                Budget (hours) <i class="fas {getSortIcon('budget')} ml-1"></i>
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Team
              </th>
              <th class="px-6 py-3 relative">
                <span class="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            {#each projects as project}
              <tr>
                <td class="px-6 py-4 whitespace-nowrap">
                  <a href="/projects/{project.id}" class="text-primary-600 hover:text-primary-800 font-medium">
                    {project.name}
                  </a>
                  {#if project.description}
                    <p class="text-gray-500 text-sm truncate max-w-md">{project.description}</p>
                  {/if}
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  {project.contract_number || '-'}
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  {formatDate(project.start_date)}
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  {formatDate(project.end_date)}
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  {project.budget ? parseFloat(project.budget).toFixed(2) : '0.00'} hours
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  {#if project.users && project.users.length > 0}
                    <div class="flex items-center">
                      <div class="flex -space-x-2 mr-2">
                        {#each project.users.slice(0, 3) as user}
                          <div class="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center border border-white">
                            <span class="text-xs font-medium text-primary-800">
                              {user.full_name?.split(' ').map(name => name[0]).join('') || user.username[0]}
                            </span>
                          </div>
                        {/each}
                      </div>
                      <span class="text-gray-500 text-sm">
                        {project.users.length} member{project.users.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                  {:else}
                    <span class="text-gray-500 text-sm">No members</span>
                  {/if}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div class="flex space-x-2">
                    <a
                      href={`/projects/${project.id}`}
                      class="text-primary-600 hover:text-primary-800"
                      title="View details"
                    >
                      <i class="fas fa-eye"></i>
                    </a>
                    
                    {#if canEditProject()}
                    <a
                      href={`/projects/${project.id}/edit`}
                      class="text-blue-600 hover:text-blue-800"
                      title="Edit project"
                    >
                      <i class="fas fa-edit"></i>
                    </a>
                    
                    <button
                      on:click={() => confirmDelete(project)}
                      class="text-red-600 hover:text-red-800"
                      title="Delete project"
                    >
                      <i class="fas fa-trash"></i>
                    </button>
                    {/if}
                  </div>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </div>
</div>

<!-- Delete Confirmation Modal -->
{#if showDeleteConfirm}
  <div class="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
    <div class="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
      <div class="p-6">
        <h3 class="text-lg font-medium text-gray-900 mb-4">Delete Project</h3>
        <p class="text-gray-600 mb-6">
          Are you sure you want to delete the project "{deletingProject?.name}"? This action cannot be undone.
        </p>
        <div class="flex justify-end space-x-3">
          <button 
            on:click={cancelDelete}
            class="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            Cancel
          </button>
          <button 
            on:click={deleteProject}
            class="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  .projects-page {
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