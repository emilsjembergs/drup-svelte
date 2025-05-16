<script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { currentUser, isAuthenticated } from '$lib/stores/auth';
  import { getAuthHeaders } from '$lib/stores/auth';

  let loading = true;
  let creating = false;
  let editing = false;
  let deleting = false;
  let error = null;
  let successMessage = null;
  
  // Data lists
  let fundingSources = [];
  let projectsUsingFunding = [];
  let selectedFundingSource = null;
  
  // Form data
  let fundingSourceForm = {
    name: '',
    description: ''
  };

  onMount(async () => {
    if (!$isAuthenticated) {
      goto('/login');
      return;
    }
    
    try {
      await loadFundingSources();
    } catch (err) {
      error = typeof err === 'string' ? err : err.message || 'Failed to load data';
    } finally {
      loading = false;
    }
  });

  async function loadFundingSources() {
    const response = await fetch('http://localhost:3000/api/funding-sources', {
      headers: getAuthHeaders()
    });
    
    if (!response.ok) {
      throw new Error('Failed to load funding sources');
    }
    
    fundingSources = await response.json();
  }

  async function loadProjectsUsingFunding(fundingSourceId) {
    const response = await fetch(`http://localhost:3000/api/funding-sources/${fundingSourceId}/projects`, {
      headers: getAuthHeaders()
    });
    
    if (!response.ok) {
      throw new Error('Failed to load projects using this funding source');
    }
    
    projectsUsingFunding = await response.json();
  }

  async function createFundingSource() {
    if (!fundingSourceForm.name) {
      error = 'Name is required';
      return;
    }
    
    try {
      creating = true;
      error = null;
      successMessage = null;
      
      const response = await fetch('http://localhost:3000/api/funding-sources', {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(fundingSourceForm)
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to create funding source');
      }
      
      const data = await response.json();
      
      successMessage = 'Funding source created successfully';
      
      // Reset form
      fundingSourceForm = {
        name: '',
        description: ''
      };
      
      // Reload funding sources
      await loadFundingSources();
    } catch (err) {
      error = typeof err === 'string' ? err : err.message || 'Failed to create funding source';
    } finally {
      creating = false;
    }
  }
  
  async function selectFundingSource(id) {
    selectedFundingSource = id;
    editing = true;
    error = null;
    successMessage = null;
    
    // Find the selected funding source
    const selected = fundingSources.find(source => source.id === id);
    
    if (selected) {
      fundingSourceForm = {
        name: selected.name,
        description: selected.description || ''
      };
    }
    
    await loadProjectsUsingFunding(id);
  }
  
  async function updateFundingSource() {
    if (!selectedFundingSource) {
      error = 'No funding source selected';
      return;
    }
    
    if (!fundingSourceForm.name) {
      error = 'Name is required';
      return;
    }
    
    try {
      editing = true;
      error = null;
      successMessage = null;
      
      const response = await fetch(`http://localhost:3000/api/funding-sources/${selectedFundingSource}`, {
        method: 'PUT',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(fundingSourceForm)
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to update funding source');
      }
      
      successMessage = 'Funding source updated successfully';
      
      // Reload funding sources
      await loadFundingSources();
      
      // Reset form and selection
      resetForm();
    } catch (err) {
      error = typeof err === 'string' ? err : err.message || 'Failed to update funding source';
    } finally {
      editing = false;
    }
  }
  
  async function deleteFundingSource(id) {
    try {
      deleting = true;
      error = null;
      successMessage = null;
      
      // First check if this funding source is used by any projects
      await loadProjectsUsingFunding(id);
      
      if (projectsUsingFunding.length > 0) {
        const projectNames = projectsUsingFunding.map(p => p.name).join(', ');
        throw new Error(`Cannot delete this funding source because it is used by the following projects: ${projectNames}`);
      }
      
      const response = await fetch(`http://localhost:3000/api/funding-sources/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to delete funding source');
      }
      
      successMessage = 'Funding source deleted successfully';
      
      // Reset form and selection if currently selected
      if (selectedFundingSource === id) {
        resetForm();
      }
      
      // Reload funding sources
      await loadFundingSources();
    } catch (err) {
      error = typeof err === 'string' ? err : err.message || 'Failed to delete funding source';
    } finally {
      deleting = false;
    }
  }
  
  function resetForm() {
    fundingSourceForm = {
      name: '',
      description: ''
    };
    selectedFundingSource = null;
    editing = false;
    error = null;
    successMessage = null;
  }
</script>

<svelte:head>
  <title>Funding Sources</title>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css">
</svelte:head>

<div class="container mx-auto px-4 py-8">
  <div class="flex justify-between items-center mb-6">
    <h1 class="text-3xl font-bold text-gray-800">Funding Sources</h1>
  </div>

  {#if successMessage}
    <div class="bg-green-50 border-l-4 border-green-500 p-4 mb-4">
      <div class="flex">
        <div class="flex-shrink-0">
          <svg class="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
          </svg>
        </div>
        <div class="ml-3">
          <p class="text-sm text-green-700">{successMessage}</p>
        </div>
      </div>
    </div>
  {/if}

  {#if error}
    <div class="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
      <div class="flex">
        <div class="flex-shrink-0">
          <svg class="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
          </svg>
        </div>
        <div class="ml-3">
          <p class="text-sm text-red-700">{error}</p>
        </div>
      </div>
    </div>
  {/if}

  <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
    <!-- Funding Sources List -->
    <div class="col-span-1 lg:col-span-2">
      <div class="bg-white shadow rounded-lg overflow-hidden">
        <div class="border-b border-gray-200 bg-gray-50 px-6 py-4">
          <h2 class="text-lg font-medium text-gray-900">Funding Sources</h2>
        </div>
        
        {#if loading}
          <div class="p-6 flex justify-center">
            <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        {:else if fundingSources.length === 0}
          <div class="p-6 text-center">
            <p class="text-gray-500">No funding sources found. Create your first one using the form.</p>
          </div>
        {:else}
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                  <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                {#each fundingSources as source}
                  <tr class="{selectedFundingSource === source.id ? 'bg-blue-50' : 'hover:bg-gray-50'}">
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{source.name}</td>
                    <td class="px-6 py-4 text-sm text-gray-500">{source.description || '-'}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        class="text-blue-600 hover:text-blue-900 mr-3"
                        on:click={() => selectFundingSource(source.id)}
                      >
                        <i class="fas fa-edit"></i> Edit
                      </button>
                      <button
                        class="text-red-600 hover:text-red-900"
                        on:click={() => deleteFundingSource(source.id)}
                        disabled={deleting}
                      >
                        <i class="fas fa-trash"></i> Delete
                      </button>
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        {/if}
      </div>
    </div>

    <!-- Form -->
    <div class="col-span-1">
      <div class="bg-white shadow rounded-lg overflow-hidden">
        <div class="border-b border-gray-200 bg-gray-50 px-6 py-4">
          <h2 class="text-lg font-medium text-gray-900">
            {editing ? 'Edit Funding Source' : 'Create Funding Source'}
          </h2>
        </div>
        <div class="p-6">
          <form on:submit|preventDefault={editing ? updateFundingSource : createFundingSource}>
            <div class="space-y-4">
              <div>
                <label for="name" class="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input
                  id="name"
                  type="text"
                  bind:value={fundingSourceForm.name}
                  required
                  class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Enter funding source name"
                />
              </div>
              <div>
                <label for="description" class="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  id="description"
                  rows="3"
                  bind:value={fundingSourceForm.description}
                  class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Enter optional description"
                ></textarea>
              </div>
              <div class="flex justify-end space-x-3 pt-4">
                {#if editing}
                  <button
                    type="button"
                    on:click={resetForm}
                    class="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                {/if}
                <button
                  type="submit"
                  disabled={creating || editing && deleting}
                  class="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {#if creating || (editing && !deleting)}
                    <span class="flex items-center">
                      <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      {creating ? 'Creating...' : 'Updating...'}
                    </span>
                  {:else}
                    {editing ? 'Update' : 'Create'}
                  {/if}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {#if selectedFundingSource && projectsUsingFunding.length > 0}
        <div class="bg-white shadow rounded-lg overflow-hidden mt-4">
          <div class="border-b border-gray-200 bg-gray-50 px-6 py-4">
            <h2 class="text-lg font-medium text-gray-900">Projects Using This Funding</h2>
          </div>
          <div class="p-6">
            <ul class="divide-y divide-gray-200">
              {#each projectsUsingFunding as project}
                <li class="py-3">
                  <a href="/projects/{project.id}" class="text-primary-600 hover:text-primary-900 font-medium">
                    {project.name}
                  </a>
                  {#if project.amount}
                    <p class="text-sm text-gray-500 mt-1">
                      Amount: {project.amount} hours ({project.percentage}%)
                    </p>
                  {/if}
                </li>
              {/each}
            </ul>
          </div>
        </div>
      {/if}
    </div>
  </div>
</div> 