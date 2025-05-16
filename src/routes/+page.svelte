<script lang="ts">
  import { onMount } from 'svelte';
  import { currentUser } from '$lib/stores/auth';
  // Remove Ant Design imports
  // import { Row, Col, Statistic, Table, Spin, Input, Empty } from 'antd';
  
  // Define interface for Project type
  interface Project {
    id: number;
    name: string;
    description: string;
    start_date: string;
    end_date: string;
    budget: number;
    contract_number: string;
    min_workload: number;
    created_by: number;
    created_at: string;
    users?: any[];
  }
  
  // Stats
  let projectCount = 0;
  let recentProjects: Project[] = [];
  let loading = true;
  let searchText = '';
  
  onMount(async () => {
    try {
      // Fetch stats from API
      const headers = {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      };
      
      const projectsRes = await fetch('http://localhost:3000/api/projects', { headers });
      
      if (!projectsRes.ok) {
        console.error('API error', { projects: projectsRes.status });
        throw new Error('Failed to fetch data from API');
      }
      
      const projects: Project[] = await projectsRes.json();
      
      projectCount = projects.length;
      recentProjects = projects.slice(0, 10);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      loading = false;
    }
  });
  
  // Filter projects based on search
  $: filteredProjects = recentProjects.filter(project => 
    project.name.toLowerCase().includes(searchText.toLowerCase()) || 
    (project.description && project.description.toLowerCase().includes(searchText.toLowerCase())) ||
    (project.contract_number && project.contract_number.toLowerCase().includes(searchText.toLowerCase()))
  );
  
  // Format currency
  function formatCurrency(value: number): string {
    return `${parseFloat((value || 0)).toFixed(2)} hours`;
  }
  
  // Format date
  function formatDate(date: string): string {
    return date ? new Date(date).toLocaleDateString() : '-';
  }
  
  // Sort projects by column
  let sortField = 'name';
  let sortDirection = 'asc';
  
  function sortProjects(field: string) {
    if (sortField === field) {
      sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      sortField = field;
      sortDirection = 'asc';
    }
  }
  
  $: sortedProjects = [...filteredProjects].sort((a, b) => {
    let comparison = 0;
    
    if (sortField === 'name') {
      comparison = a.name.localeCompare(b.name);
    } else if (sortField === 'budget') {
      comparison = (a.budget || 0) - (b.budget || 0);
    } else if (sortField === 'start_date') {
      comparison = new Date(a.start_date || 0).getTime() - new Date(b.start_date || 0).getTime();
    } else if (sortField === 'end_date') {
      comparison = new Date(a.end_date || 0).getTime() - new Date(b.end_date || 0).getTime();
    } else if (sortField === 'min_workload') {
      comparison = (a.min_workload || 0) - (b.min_workload || 0);
    }
    
    return sortDirection === 'asc' ? comparison : -comparison;
  });
  
  // Pagination
  let currentPage = 1;
  const pageSize = 5;
  
  $: pageCount = Math.ceil(sortedProjects.length / pageSize);
  $: paginatedProjects = sortedProjects.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  
  function prevPage() {
    if (currentPage > 1) {
      currentPage--;
    }
  }
  
  function nextPage() {
    if (currentPage < pageCount) {
      currentPage++;
    }
  }
</script>

<div>
  <div class="mb-6">
    <h1 class="text-2xl font-bold">Dashboard</h1>
    <p class="text-gray-600">
      Welcome back, <strong>{$currentUser?.full_name || 'User'}</strong>
    </p>
  </div>
  
  {#if loading}
    <div class="flex justify-center items-center py-16">
      <!-- Custom spinner -->
      <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
    </div>
  {:else}
    <!-- Stats Card - Projects only -->
    <div class="mb-6">
      <div class="p-6 bg-white rounded-lg shadow">
        <div>
          <p class="text-sm text-gray-500">Projects</p>
          <p class="text-3xl font-semibold" style="color: var(--color-primary-600)">{projectCount}</p>
        </div>
        <div class="mt-4">
          <a href="/projects" class="text-primary-600 hover:text-primary-500">
            View all projects
          </a>
        </div>
      </div>
    </div>
    
    <!-- Projects -->
    <div class="mb-6">
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-xl font-medium">Projects</h2>
        {#if $currentUser && $currentUser.role !== 'employee'}
          <a href="/projects/new" class="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700">
            Create Project
          </a>
        {/if}
      </div>
      
      <div class="p-6 bg-white rounded-lg shadow">
        <div class="mb-4">
          <!-- Search input -->
          <div class="relative">
            <input 
              type="text"
              class="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              placeholder="Search projects..." 
              bind:value={searchText}
            />
            {#if searchText}
              <button 
                class="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                on:click={() => searchText = ''}
              >
                ✕
              </button>
            {/if}
          </div>
        </div>
        
        {#if recentProjects.length > 0}
          <!-- Project table -->
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th 
                    class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    on:click={() => sortProjects('name')}
                  >
                    <div class="flex items-center space-x-1">
                      <span>Name</span>
                      {#if sortField === 'name'}
                        <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                      {/if}
                    </div>
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contract
                  </th>
                  <th 
                    class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    on:click={() => sortProjects('budget')}
                  >
                    <div class="flex items-center space-x-1">
                      <span>Budget (hours)</span>
                      {#if sortField === 'budget'}
                        <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                      {/if}
                    </div>
                  </th>
                  <th 
                    class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    on:click={() => sortProjects('min_workload')}
                  >
                    <div class="flex items-center space-x-1">
                      <span>Min Workload</span>
                      {#if sortField === 'min_workload'}
                        <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                      {/if}
                    </div>
                  </th>
                  <th 
                    class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    on:click={() => sortProjects('start_date')}
                  >
                    <div class="flex items-center space-x-1">
                      <span>Start Date</span>
                      {#if sortField === 'start_date'}
                        <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                      {/if}
                    </div>
                  </th>
                  <th 
                    class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    on:click={() => sortProjects('end_date')}
                  >
                    <div class="flex items-center space-x-1">
                      <span>End Date</span>
                      {#if sortField === 'end_date'}
                        <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                      {/if}
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                {#each paginatedProjects as project}
                  <tr class="hover:bg-gray-50">
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      <a href="/projects/{project.id}" class="text-primary-600 hover:text-primary-800">
                        {project.name}
                      </a>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 truncate max-w-xs">
                      {project.description || '-'}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {project.contract_number || '-'}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatCurrency(project.budget)}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {project.min_workload || '-'}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(project.start_date)}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(project.end_date)}
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
          
          <!-- Pagination -->
          {#if pageCount > 1}
            <div class="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6 mt-4">
              <div class="flex flex-1 justify-between sm:hidden">
                <button
                  class="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  on:click={prevPage}
                  disabled={currentPage === 1}
                >
                  Previous
                </button>
                <button
                  class="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  on:click={nextPage}
                  disabled={currentPage === pageCount}
                >
                  Next
                </button>
              </div>
              <div class="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                <div>
                  <p class="text-sm text-gray-700">
                    Showing <span class="font-medium">{(currentPage - 1) * pageSize + 1}</span> to <span class="font-medium">{Math.min(currentPage * pageSize, sortedProjects.length)}</span> of <span class="font-medium">{sortedProjects.length}</span> results
                  </p>
                </div>
                <div>
                  <nav class="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                    <button
                      class="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0"
                      on:click={prevPage}
                      disabled={currentPage === 1}
                    >
                      <span class="sr-only">Previous</span>
                      ←
                    </button>
                    {#each Array(pageCount) as _, i}
                      <button
                        class="relative inline-flex items-center px-4 py-2 text-sm font-semibold {currentPage === i + 1 ? 'bg-primary-600 text-white' : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50'} focus:z-20 focus:outline-offset-0"
                        on:click={() => currentPage = i + 1}
                      >
                        {i + 1}
                      </button>
                    {/each}
                    <button
                      class="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0"
                      on:click={nextPage}
                      disabled={currentPage === pageCount}
                    >
                      <span class="sr-only">Next</span>
                      →
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          {/if}
        {:else}
          <!-- Empty state -->
          <div class="text-center py-12">
            <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
            </svg>
            <h3 class="mt-2 text-sm font-medium text-gray-900">No projects found</h3>
            {#if $currentUser && $currentUser.role !== 'employee'}
              <div class="mt-6">
                <a href="/projects/new">
                  <button type="button" class="bg-primary-600 hover:bg-primary-700 text-white py-2 px-4 rounded">
                    Create New Project
                  </button>
                </a>
              </div>
            {/if}
          </div>
        {/if}
      </div>
    </div>
  {/if}
</div>
