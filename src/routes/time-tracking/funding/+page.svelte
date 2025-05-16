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
      
      // Scroll to top to show success message
      window.scrollTo(0, 0);
    } catch (err) {
      error = typeof err === 'string' ? err : err.message || 'Failed to create funding source';
    } finally {
      creating = false;
    }
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
      
      // Reset form and selection
      fundingSourceForm = {
        name: '',
        description: ''
      };
      selectedFundingSource = null;
      editing = false;
      
      // Reload funding sources
      await loadFundingSources();
      
      // Scroll to top to show success message
      window.scrollTo(0, 0);
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
        fundingSourceForm = {
          name: '',
          description: ''
        };
        selectedFundingSource = null;
        editing = false;
      }
      
      // Reload funding sources
      await loadFundingSources();
      
      // Scroll to top to show success message
      window.scrollTo(0, 0);
    } catch (err) {
      error = typeof err === 'string' ? err : err.message || 'Failed to delete funding source';
    } finally {
      deleting = false;
    }
  }
  
  function selectFundingSource(fundingSource) {
    selectedFundingSource = fundingSource.id;
    fundingSourceForm = {
      name: fundingSource.name,
      description: fundingSource.description || ''
    };
    editing = true;
    error = null;
    successMessage = null;
  }
  
  function cancelEdit() {
    selectedFundingSource = null;
    fundingSourceForm = {
      name: '',
      description: ''
    };
    editing = false;
    error = null;
    successMessage = null;
  }
  
  function navigateTo(path) {
    goto(path);
  }
</script>

<svelte:head>
  <title>Funding Sources Management</title>
</svelte:head>

<div class="container mx-auto px-4 py-8">
  <div class="flex justify-between items-center mb-6">
    <h1 class="text-2xl font-bold text-gray-800">Finansējuma Avoti</h1>
    <div class="flex gap-2">
      <button
        on:click={() => goto('/time-tracking')}
        class="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
      >
        Atpakaļ uz darba laika pārskatu
      </button>
      <button
        on:click={() => goto('/time-tracking/new')}
        class="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
      >
        Pievienot darba laiku
      </button>
    </div>
  </div>
  
  {#if loading}
    <div class="flex justify-center items-center py-12">
      <div class="w-12 h-12 border-4 border-primary-400 border-t-primary-600 rounded-full animate-spin"></div>
    </div>
  {:else}
    {#if error}
      <div class="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
        <p class="text-red-700">{error}</p>
      </div>
    {/if}
    
    {#if successMessage}
      <div class="bg-green-50 border-l-4 border-green-500 p-4 mb-6">
        <p class="text-green-700">{successMessage}</p>
      </div>
    {/if}
    
    <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
      <div class="bg-white rounded-lg shadow-md p-6">
        <h2 class="text-xl font-semibold text-gray-800 mb-4">
          {editing ? 'Rediģēt finansējuma avotu' : 'Pievienot jaunu finansējuma avotu'}
        </h2>
        
        <form on:submit|preventDefault={editing ? updateFundingSource : createFundingSource} class="space-y-4">
          <div>
            <label for="name" class="block text-sm font-medium text-gray-700 mb-1">Nosaukums *</label>
            <input
              type="text"
              id="name"
              bind:value={fundingSourceForm.name}
              class="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Ievadiet finansējuma avota nosaukumu"
              required
            />
          </div>
          
          <div>
            <label for="description" class="block text-sm font-medium text-gray-700 mb-1">Apraksts</label>
            <textarea
              id="description"
              bind:value={fundingSourceForm.description}
              class="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Ievadiet aprakstu (nav obligāts)"
              rows="3"
            ></textarea>
          </div>
          
          <div class="flex justify-end gap-2">
            {#if editing}
              <button
                type="button"
                on:click={cancelEdit}
                class="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
                disabled={creating || deleting}
              >
                Atcelt
              </button>
            {/if}
            
            <button
              type="submit"
              class="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={creating || editing && deleting}
            >
              {#if creating || editing && deleting}
                <span class="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></span>
              {/if}
              {editing ? 'Saglabāt izmaiņas' : 'Pievienot finansējuma avotu'}
            </button>
          </div>
        </form>
      </div>
      
      <div class="bg-white rounded-lg shadow-md p-6">
        <h2 class="text-xl font-semibold text-gray-800 mb-4">Esošie finansējuma avoti</h2>
        
        {#if fundingSources.length === 0}
          <div class="bg-yellow-50 border-l-4 border-yellow-400 p-4">
            <p class="text-yellow-700">Nav pievienotu finansējuma avotu.</p>
          </div>
        {:else}
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nosaukums</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Apraksts</th>
                  <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Darbības</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-200">
                {#each fundingSources as source}
                  <tr class="hover:bg-gray-50">
                    <td class="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{source.name}</td>
                    <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{source.description || '-'}</td>
                    <td class="px-4 py-3 whitespace-nowrap text-sm text-right">
                      <button
                        on:click={() => selectFundingSource(source)}
                        class="text-indigo-600 hover:text-indigo-900 mr-2"
                        title="Rediģēt"
                      >
                        Rediģēt
                      </button>
                      <button
                        on:click={() => deleteFundingSource(source.id)}
                        class="text-red-600 hover:text-red-900"
                        title="Dzēst"
                        disabled={deleting}
                      >
                        Dzēst
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
  {/if}
</div> 