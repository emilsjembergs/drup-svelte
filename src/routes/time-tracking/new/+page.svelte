<script>
  import { onMount } from 'svelte';
  import { getAuthHeaders, isAuthenticated, currentUser } from '$lib/stores/auth';
  import { goto } from '$app/navigation';
  
  let loading = true;
  let submitting = false;
  let error = null;
  let successMessage = null;
  
  // Form data
  let projects = [];
  let fundingSources = [];
  let allUsers = []; // All users that can be assigned
  let projectUsers = {}; // Users by project ID
  
  let formData = {
    user_id: $currentUser?.id || 0,
    project_id: '',
    date: new Date().toISOString().slice(0, 10), // YYYY-MM-DD format
    hours: 8,
    description: '',
    entry_type: 'work',
    funding_distribution: []
  };
  
  // UI state
  let showFundingDistribution = false;
  let useCustomDistribution = false;
  let customDistributions = [];
  let totalPercentage = 100;
  
  // Modal state for funding source creation
  let showFundingSourceModal = false;
  let newFundingSource = {
    name: '',
    description: ''
  };
  let creatingFundingSource = false;
  let fundingSourceError = '';
  
  onMount(async () => {
    if (!$isAuthenticated) {
      goto('/login');
      return;
    }
    
    // Set user ID from current user
    if ($currentUser) {
      formData.user_id = $currentUser.id;
    }
    
    try {
      await Promise.all([
        loadUserProjects(),
        loadFundingSources()
      ]);
      
      if (['admin', 'project_manager', 'hr'].includes($currentUser?.role)) {
        await loadAllUsers();
      }
      
      loading = false;
    } catch (err) {
      error = typeof err === 'string' ? err : err.message || 'Failed to load data';
      loading = false;
    }
  });
  
  async function loadAllUsers() {
    try {
      const response = await fetch('http://localhost:3000/api/users', {
        headers: getAuthHeaders()
      });
      
      if (!response.ok) {
        throw new Error('Failed to load users');
      }
      
      allUsers = await response.json();
    } catch (err) {
      console.error('Error loading users:', err);
      throw err;
    }
  }
  
  async function loadProjectUsers(projectId) {
    if (!projectId || projectUsers[projectId]) return;
    
    try {
      const response = await fetch(`http://localhost:3000/api/projects/${projectId}`, {
        headers: getAuthHeaders()
      });
      
      if (!response.ok) {
        throw new Error('Failed to load project users');
      }
      
      const projectData = await response.json();
      projectUsers[projectId] = projectData.users || [];
    } catch (err) {
      console.error('Error loading project users:', err);
      projectUsers[projectId] = [];
    }
  }
  
  async function loadUserProjects() {
    try {
      const response = await fetch(`http://localhost:3000/api/users/${$currentUser?.id}`, {
        headers: getAuthHeaders()
      });
      
      if (!response.ok) {
        throw new Error('Failed to load user projects');
      }
      
      const userData = await response.json();
      projects = userData.projects || [];
      
      if (projects.length > 0) {
        formData.project_id = String(projects[0].id);
        await loadProjectFunding(projects[0].id);
      }
      console.log("got: " + formData.project_id);
      console.log("Available projects:", projects);
    } catch (err) {
      console.error('Error loading user projects:', err);
      throw err;
    }
  }
  
  async function loadFundingSources() {
    try {
      const response = await fetch('http://localhost:3000/api/funding-sources', {
        headers: getAuthHeaders()
      });
      
      if (!response.ok) {
        throw new Error('Failed to load funding sources');
      }
      
      fundingSources = await response.json();
    } catch (err) {
      console.error('Error loading funding sources:', err);
      throw err;
    }
  }
  
  async function loadProjectFunding(projectId) {
    if (!projectId) return;
    
    try {
      const response = await fetch(`http://localhost:3000/api/projects/${projectId}/funding`, {
        headers: getAuthHeaders()
      });
      
      if (!response.ok) {
        throw new Error('Failed to load project funding distribution');
      }
      
      const projectFunding = await response.json();
      
      if (projectFunding && projectFunding.length > 0) {
        showFundingDistribution = true;
        
        // Set custom distributions from project funding
        customDistributions = projectFunding.map(item => ({
          funding_source_id: item.funding_source_id.toString(),
          percentage: item.percentage,
          name: item.name
        }));
        
        console.log("Loaded funding sources:", customDistributions);
      } else {
        showFundingDistribution = false;
        customDistributions = [];
      }
    } catch (err) {
      console.error('Error loading project funding:', err);
      showFundingDistribution = false;
      customDistributions = [];
    }
  }
  
  function handleProjectChange(event) {
    const projectId = event.target.value;
    formData.project_id = projectId;
    
    // Load project users if admin/manager
    if (['admin', 'project_manager', 'hr'].includes($currentUser?.role)) {
      loadProjectUsers(projectId);
    }
    
    loadProjectFunding(projectId);
  }
  
  function addFundingSource() {
    // Check if there are any funding sources available
    if (fundingSources.length === 0) {
      // If no funding sources at all, show modal to create one
      showFundingSourceModal = true;
      return;
    }
    
    // Find a funding source that's not already in use
    const unusedSource = fundingSources.find(source => 
      !customDistributions.some(dist => dist.funding_source_id === source.id.toString())
    );
    
    if (unusedSource) {
      customDistributions = [
        ...customDistributions,
        {
          funding_source_id: unusedSource.id.toString(),
          percentage: 0,
          name: unusedSource.name
        }
      ];
      
      recalculatePercentages();
    } else {
      // All funding sources are already added
      // Show modal to create a new one instead
      showFundingSourceModal = true;
    }
    
    // Force reactivity by re-assigning
    customDistributions = [...customDistributions];
  }
  
  // Open create funding source modal
  function openCreateFundingSourceModal() {
    newFundingSource = {
      name: '',
      description: ''
    };
    fundingSourceError = '';
    showFundingSourceModal = true;
  }
  
  // Close funding source modal
  function closeFundingSourceModal() {
    showFundingSourceModal = false;
    fundingSourceError = '';
  }
  
  // Create a new funding source
  async function createFundingSource() {
    if (!newFundingSource.name) {
      fundingSourceError = 'Funding source name is required';
      return;
    }
    
    try {
      creatingFundingSource = true;
      fundingSourceError = '';
      
      const response = await fetch('http://localhost:3000/api/funding-sources', {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newFundingSource)
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to create funding source');
      }
      
      const result = await response.json();
      
      // Fetch updated funding sources
      const sourcesResponse = await fetch('http://localhost:3000/api/funding-sources', {
        headers: getAuthHeaders()
      });
      
      if (sourcesResponse.ok) {
        fundingSources = await sourcesResponse.json();
        
        // Add the newly created funding source to the distributions
        const newSource = fundingSources.find(source => source.id === result.fundingSourceId);
        if (newSource) {
          customDistributions = [
            ...customDistributions,
            {
              funding_source_id: newSource.id.toString(),
              percentage: 0,
              name: newSource.name
            }
          ];
          
          recalculatePercentages();
          
          // Make sure we're showing custom distribution
          useCustomDistribution = true;
        }
      }
      
      // Close modal
      showFundingSourceModal = false;
      
      // Reset form
      newFundingSource = {
        name: '',
        description: ''
      };
    } catch (err) {
      fundingSourceError = err instanceof Error ? err.message : 'Failed to create funding source';
    } finally {
      creatingFundingSource = false;
    }
  }
  
  function removeFundingSource(index) {
    customDistributions = customDistributions.filter((_, i) => i !== index);
    recalculatePercentages();
  }
  
  function recalculatePercentages() {
    const sum = customDistributions.reduce((total, item) => total + (parseFloat(item.percentage || 0)), 0);
    totalPercentage = Math.round(sum * 100) / 100; // Round to 2 decimal places
  }
  
  function handlePercentageChange() {
    recalculatePercentages();
  }
  
  async function handleSubmit() {
    submitting = true;
    error = null;
    successMessage = null;
    
    try {
      // Validate form
      if (!formData.project_id) {
        throw new Error('Please select a project');
      }
      
      if (!formData.date) {
        throw new Error('Please select a date');
      }
      
      if (!formData.hours || formData.hours <= 0) {
        throw new Error('Please enter valid hours');
      }
      
      // Prepare data
      const timeEntry = {
        ...formData,
        project_id: parseInt(formData.project_id, 10),
        user_id: parseInt(formData.user_id, 10),
        hours: parseFloat(formData.hours)
      };
      
      // Add funding distribution if using custom distribution
      if (useCustomDistribution && showFundingDistribution && customDistributions.length > 0) {
        // Validate total percentage
        if (Math.abs(totalPercentage - 100) > 0.01) {
          throw new Error('Total percentage must equal 100%');
        }
        
        timeEntry.funding_distribution = customDistributions.map(item => ({
          funding_source_id: parseInt(item.funding_source_id, 10),
          percentage: parseFloat(item.percentage)
        }));
      } else if (showFundingDistribution && customDistributions.length > 0) {
        // Use default project funding distribution
        timeEntry.funding_distribution = customDistributions.map(item => ({
          funding_source_id: parseInt(item.funding_source_id, 10),
          percentage: parseFloat(item.percentage)
        }));
      }
      
      console.log("Submitting time entry:", timeEntry);
      
      // Send request to create time entry
      const response = await fetch('http://localhost:3000/api/time-entries', {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(timeEntry)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create time entry');
      }
      
      const result = await response.json();
      console.log("Time entry created:", result);
      
      successMessage = 'Time entry created successfully';
      
      // Reset form
      formData = {
        user_id: $currentUser?.id || 0,
        project_id: projects.length > 0 ? String(projects[0].id) : '',
        date: new Date().toISOString().slice(0, 10),
        hours: 8,
        description: '',
        entry_type: 'work',
        funding_distribution: []
      };
      
      // After successful submission, reset funding distribution to project default
      if (formData.project_id) {
        await loadProjectFunding(formData.project_id);
      }
      
      useCustomDistribution = false;
      
      // Scroll to top to show success message
      window.scrollTo(0, 0);
    } catch (err) {
      error = typeof err === 'string' ? err : err.message || 'Failed to create time entry';
      console.error('Error creating time entry:', err);
    } finally {
      submitting = false;
    }
  }
</script>

<svelte:head>
  <title>Add Time Entry</title>
</svelte:head>

<div class="container mx-auto px-4 py-8">
  <div class="flex justify-between items-center mb-6">
    <h1 class="text-2xl font-bold text-gray-800">Pievienot Darba Laika Ierakstu</h1>
    <button
      on:click={() => goto('/time-tracking')}
      class="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
    >
      Atpakaļ
    </button>
  </div>
  
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
  
  {#if loading}
    <div class="flex justify-center items-center py-12">
      <div class="w-12 h-12 border-4 border-primary-400 border-t-primary-600 rounded-full animate-spin"></div>
    </div>
  {:else}
    <div class="bg-white shadow rounded-lg overflow-hidden">
      <div class="p-6 border-b">
        <h2 class="text-xl font-semibold mb-4">Darba Informācija</h2>
        
        <form on:submit|preventDefault={handleSubmit} class="space-y-6">
          <div class="grid grid-cols-1 gap-6">
            <div>
              <label for="project" class="block text-sm font-medium text-gray-700 mb-1">Projekts *</label>
              <select
                id="project"
                bind:value={formData.project_id}
                on:change={handleProjectChange}
                class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                required
              >
                <option value="" disabled>Izvēlieties projektu</option>
                {#each projects as project}
                  <option value={project.id.toString()}>{project.name}</option>
                {/each}
              </select>
            </div>
            
            {#if ['admin', 'project_manager', 'hr'].includes($currentUser?.role)}
              <div>
                <label for="user" class="block text-sm font-medium text-gray-700 mb-1">Darbinieks *</label>
                <select
                  id="user"
                  bind:value={formData.user_id}
                  class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  required
                >
                  <option value="" disabled>Izvēlieties darbinieku</option>
                  
                  {#if formData.project_id && projectUsers[formData.project_id]}
                    <!-- Show only users assigned to the selected project -->
                    {#each projectUsers[formData.project_id] as user}
                      <option value={user.id}>{user.full_name || user.username}</option>
                    {/each}
                  {:else}
                    <!-- Show all users if project not selected yet -->
                    {#each allUsers as user}
                      <option value={user.id}>{user.full_name || user.username}</option>
                    {/each}
                  {/if}
                </select>
                <p class="text-xs text-gray-500 mt-1">
                  Tikai projekta dalībnieki ir pieejami izvēlei
                </p>
              </div>
            {/if}
            
            <div>
              <label for="date" class="block text-sm font-medium text-gray-700 mb-1">Datums *</label>
              <input
                type="date"
                id="date"
                bind:value={formData.date}
                class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                required
              />
            </div>
            
            <div>
              <label for="hours" class="block text-sm font-medium text-gray-700 mb-1">Stundas*</label>
              <input
                id="hours"
                type="number"
                bind:value={formData.hours}
                min="0.5"
                max="24"
                step="0.5"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            
            <div>
              <label for="entry_type" class="block text-sm font-medium text-gray-700 mb-1">Darba Tips*</label>
              <select
                id="entry_type"
                bind:value={formData.entry_type}
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="work">Darbs</option>
                <option value="vacation">Atvaļinājums</option>
                <option value="sick_leave">Slimības Lapa</option>
                <option value="holiday">Svētku Diena</option>
                <option value="other">Cits</option>
              </select>
            </div>
            
            <div>
              <label for="description" class="block text-sm font-medium text-gray-700 mb-1">Apraksts</label>
              <textarea
                id="description"
                bind:value={formData.description}
                rows="3"
                class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              ></textarea>
            </div>
            
            {#if showFundingDistribution}
              <div class="p-6 border-b bg-gray-50">
                <div class="flex justify-between items-center mb-4">
                  <h2 class="text-xl font-semibold">Finansējuma Avotu Sadale</h2>
                  
                  <div class="flex items-center">
                    <input
                      type="checkbox"
                      id="useCustomDistribution"
                      bind:checked={useCustomDistribution}
                      class="h-4 w-4 text-primary-600 focus:ring-primary-500"
                    />
                    <label for="useCustomDistribution" class="ml-2 text-sm text-gray-700">Pielāgot Sadali</label>
                  </div>
                </div>
                
                {#if useCustomDistribution}
                  <div class="space-y-4">
                    {#if customDistributions.length === 0}
                      <div class="bg-yellow-50 border-l-4 border-yellow-400 p-4">
                        <p class="text-yellow-700">Nav pievienots neviens finansējuma avots.</p>
                      </div>
                    {:else}
                      <div class="flex justify-between mb-2">
                        <span class="text-sm text-gray-700">Kopējā procentuālā vērtība: <span class={totalPercentage === 100 ? 'text-green-600' : 'text-red-600 font-bold'}>{totalPercentage !== undefined ? totalPercentage : 0}%</span></span>
                      </div>
                      
                      {#each customDistributions as item, index}
                        <div class="flex items-end gap-4 p-4 border border-gray-200 rounded-md">
                          <div class="flex-1">
                            <label class="block text-sm font-medium text-gray-700 mb-1">Finansējuma Avots</label>
                            <select
                              bind:value={item.funding_source_id}
                              class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                            >
                              <option value="">Izvēlieties avotu</option>
                              {#each fundingSources as source}
                                <option value={source.id}>{source.name}</option>
                              {/each}
                            </select>
                          </div>
                          
                          <div class="w-32">
                            <label class="block text-sm font-medium text-gray-700 mb-1">Procenti (%)</label>
                            <input
                              type="number"
                              bind:value={item.percentage}
                              on:input={handlePercentageChange}
                              min="0"
                              max="100"
                              step="0.1"
                              class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                            />
                          </div>
                          
                          <button
                            type="button"
                            on:click={() => removeFundingSource(index)}
                            class="px-3 py-2 text-red-600 hover:text-red-800"
                          >
                            Noņemt
                          </button>
                        </div>
                      {/each}
                    {/if}
                    
                    <div class="mt-4">
                      <button
                        type="button"
                        on:click={addFundingSource}
                        class="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition-colors"
                      >
                        + Pievienot Finansējuma Avotu
                      </button>
                      <button
                        type="button"
                        on:click={openCreateFundingSourceModal}
                        class="ml-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                      >
                        + Izveidot Jaunu Avotu
                      </button>
                    </div>
                  </div>
                {:else}
                  <div class="bg-blue-50 border-l-4 border-blue-400 p-4">
                    <p class="text-blue-700">Tiks izmantota projekta noklusējuma finansējuma sadale.</p>
                  </div>
                  
                  <!-- Show the default distribution -->
                  <div class="mt-4 p-4 bg-gray-100 rounded-md">
                    <h3 class="text-sm font-medium mb-2">Noklusējuma sadale:</h3>
                    {#if customDistributions.length === 0}
                      <p class="text-gray-500 italic">Nav pieejama finansējuma sadale šim projektam</p>
                    {:else}
                      <div class="space-y-2">
                        {#each customDistributions as item}
                          <div class="flex justify-between">
                            <span>{item.name || 'Nezināms avots'}</span>
                            <span>{item.percentage}%</span>
                          </div>
                        {/each}
                      </div>
                    {/if}
                  </div>
                {/if}
              </div>
            {:else}
              <div class="p-4 bg-yellow-50 border-l-4 border-yellow-400">
                <p class="text-yellow-700">Šim projektam nav konfigurēti finansējuma avoti. Ieraksts tiks pievienots bez finansējuma avotu sadales.</p>
              </div>
            {/if}
          </div>
          
          <div class="flex justify-end mt-4">
            <button
              type="submit"
              class="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={submitting}
            >
              {#if submitting}
                <span class="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></span>
              {/if}
              Pievienot
            </button>
          </div>
        </form>
      </div>
    </div>
  {/if}
</div>

<!-- Funding Source Creation Modal -->
{#if showFundingSourceModal}
  <div class="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50 p-4">
    <div class="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
      <div class="flex justify-between items-center mb-4">
        <h3 class="text-lg font-medium text-gray-900">Create New Funding Source</h3>
        <button 
          type="button" 
          class="text-gray-400 hover:text-gray-500" 
          on:click={closeFundingSourceModal}
        >
          <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      {#if fundingSourceError}
        <div class="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
          <p class="text-red-700 text-sm">{fundingSourceError}</p>
        </div>
      {/if}
      
      <div class="space-y-4">
        <div>
          <label for="funding-source-name" class="block text-sm font-medium text-gray-700 mb-1">Name *</label>
          <input 
            id="funding-source-name" 
            type="text" 
            bind:value={newFundingSource.name} 
            placeholder="Enter funding source name"
            class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
          />
        </div>
        
        <div>
          <label for="funding-source-description" class="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea 
            id="funding-source-description" 
            bind:value={newFundingSource.description} 
            rows="3" 
            placeholder="Enter optional description"
            class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
          ></textarea>
        </div>
      </div>
      
      <div class="mt-6 flex justify-end">
        <button 
          type="button" 
          class="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 mr-3"
          on:click={closeFundingSourceModal}
        >
          Cancel
        </button>
        <button 
          type="button" 
          class="px-4 py-2 bg-primary-600 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-primary-700"
          on:click={createFundingSource}
          disabled={creatingFundingSource}
        >
          {creatingFundingSource ? 'Creating...' : 'Create Funding Source'}
        </button>
      </div>
    </div>
  </div>
{/if} 