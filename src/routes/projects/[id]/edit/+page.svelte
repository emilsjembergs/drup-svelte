<script>
  import { onMount } from 'svelte';
  import { getAuthHeaders, isAuthenticated } from '$lib/stores/auth';
  import { goto } from '$app/navigation';
  
  export let data;
  
  let project = {
    name: '',
    description: '',
    start_date: '',
    end_date: '',
    budget: 0,
    contract_number: '',
    min_workload: 0,
    users: []
  };
  
  let availableUsers = [];
  let loading = true;
  let saving = false;
  let error = null;
  let successMessage = null;
  let projectId = data.id;
  
  // Funding sources
  let fundingSources = [];
  let projectFunding = [];
  let totalFundingAmount = 0;
  let totalFundingPercentage = 0;
  
  // Clone project for comparison
  let originalProject = null;
  
  onMount(async () => {
    if (!$isAuthenticated) {
      goto('/login');
      return;
    }
    
    try {
      loading = true;
      
      // Fetch project data
      const projectResponse = await fetch(`http://localhost:3000/api/projects/${projectId}`, {
        headers: getAuthHeaders()
      });
      
      if (!projectResponse.ok) {
        const errorData = await projectResponse.json();
        throw new Error(errorData.message || 'Failed to load project');
      }
      
      const projectData = await projectResponse.json();
      
      // Format dates for input fields
      if (projectData.start_date) {
        projectData.start_date = projectData.start_date.split('T')[0];
      }
      if (projectData.end_date) {
        projectData.end_date = projectData.end_date.split('T')[0];
      }
      
      project = projectData;
      originalProject = JSON.parse(JSON.stringify(projectData));
      
      // Fetch available users
      const usersResponse = await fetch('http://localhost:3000/api/users', {
        headers: getAuthHeaders()
      });
      
      if (!usersResponse.ok) {
        const errorData = await usersResponse.json();
        throw new Error(errorData.message || 'Failed to load users');
      }
      
      availableUsers = await usersResponse.json();
      
      // Fetch funding sources
      const fundingSourcesResponse = await fetch('http://localhost:3000/api/funding-sources', {
        headers: getAuthHeaders()
      });
      
      if (fundingSourcesResponse.ok) {
        fundingSources = await fundingSourcesResponse.json();
      }
      
      // Fetch project funding distribution
      const projectFundingResponse = await fetch(`http://localhost:3000/api/projects/${projectId}/funding`, {
        headers: getAuthHeaders()
      });
      
      if (projectFundingResponse.ok) {
        projectFunding = await projectFundingResponse.json();
        calculateFundingTotals();
      }
      
      loading = false;
    } catch (err) {
      error = err.message;
      loading = false;
    }
  });
  
  async function saveProject() {
    try {
      saving = true;
      error = null;
      successMessage = null;
      
      // Update project budget based on total funding amount
      project.budget = totalFundingAmount;
      
      // Prepare project data with funding sources
      const projectData = {
        ...project,
        funding_sources: projectFunding.map(funding => ({
          funding_source_id: funding.funding_source_id,
          amount: funding.amount,
          percentage: funding.percentage
        }))
      };
      
      const response = await fetch(`http://localhost:3000/api/projects/${projectId}`, {
        method: 'PUT',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(projectData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update project');
      }
      
      successMessage = 'Project updated successfully';
      originalProject = JSON.parse(JSON.stringify(project));
      saving = false;
    } catch (err) {
      error = err.message;
      saving = false;
    }
  }
  
  function addUser() {
    project.users = [
      ...project.users,
      {
        id: null,
        project_role: 'employee',
        workload: 100
      }
    ];
  }
  
  function removeUser(index) {
    project.users = project.users.filter((_, i) => i !== index);
  }
  
  function addFundingSource() {
    // Find a funding source that's not already in use
    const unusedSource = fundingSources.find(source => 
      !projectFunding.some(funding => funding.funding_source_id === source.id)
    );
    
    if (unusedSource) {
      projectFunding = [
        ...projectFunding,
        {
          funding_source_id: unusedSource.id,
          amount: 0,
          percentage: 0,
          name: unusedSource.name
        }
      ];
      
      calculateFundingTotals();
    }
  }
  
  function removeFundingSource(index) {
    projectFunding = projectFunding.filter((_, i) => i !== index);
    calculateFundingTotals();
  }
  
  // Update funding amount for a source and recalculate percentages
  function updateFundingAmount(index, amount) {
    if (index >= 0 && index < projectFunding.length) {
      projectFunding[index].amount = amount;
      
      // Recalculate percentage based on total funding amount
      const totalAmount = projectFunding.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
      
      if (totalAmount > 0) {
        projectFunding[index].percentage = (amount / totalAmount) * 100;
        
        // Update percentages for all items
        projectFunding.forEach(item => {
          if (item !== projectFunding[index]) {
            item.percentage = (item.amount / totalAmount) * 100;
          }
        });
      } else {
        projectFunding[index].percentage = projectFunding.length > 1 ? 0 : 100;
      }
      
      calculateFundingTotals();
    }
  }
  
  // Calculate totals for funding
  function calculateFundingTotals() {
    totalFundingAmount = projectFunding.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    totalFundingAmount = Math.round(totalFundingAmount * 100) / 100; // Round to 2 decimal places
    
    totalFundingPercentage = projectFunding.reduce((sum, item) => sum + (Number(item.percentage) || 0), 0);
    totalFundingPercentage = Math.round(totalFundingPercentage * 100) / 100; // Round to 2 decimal places
  }
  
  function hasChanges() {
    return JSON.stringify(project) !== JSON.stringify(originalProject);
  }
</script>

<svelte:head>
  <title>Edit Project</title>
</svelte:head>

<div class="container mx-auto px-4 py-8">
  <div class="flex justify-between items-center mb-6">
    <h1 class="text-3xl font-bold text-gray-800">
      {#if loading}
        Loading project...
      {:else}
        Edit Project: {project.name}
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
    
    <form on:submit|preventDefault={saveProject} class="bg-white shadow rounded-lg overflow-hidden">
      <div class="p-6 border-b">
        <h2 class="text-xl font-semibold mb-4">Project Information</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label for="name" class="block text-sm font-medium text-gray-700 mb-1">Project Name</label>
            <input
              id="name"
              type="text"
              bind:value={project.name}
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          
          <div>
            <label for="contract_number" class="block text-sm font-medium text-gray-700 mb-1">Contract Number</label>
            <input
              id="contract_number"
              type="text"
              bind:value={project.contract_number}
              class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          
          <div>
            <label for="start_date" class="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
            <input
              id="start_date"
              type="date"
              bind:value={project.start_date}
              class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          
          <div>
            <label for="end_date" class="block text-sm font-medium text-gray-700 mb-1">End Date</label>
            <input
              id="end_date"
              type="date"
              bind:value={project.end_date}
              class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          
          <!-- <div>
            <label for="min_workload" class="block text-sm font-medium text-gray-700 mb-1">Minimum Workload (%)</label>
            <input
              id="min_workload"
              type="number"
              min="0"
              max="100"
              bind:value={project.min_workload}
              class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
            />
          </div> -->
          
          <div class="md:col-span-2">
            <label for="description" class="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              id="description"
              rows="3"
              bind:value={project.description}
              class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
            ></textarea>
          </div>
        </div>
      </div>
      
      <!-- Funding Sources Section -->
      <div class="p-6 border-t">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-xl font-semibold">Funding Sources</h2>
          <button
            type="button"
            on:click={addFundingSource}
            class="px-3 py-1 bg-primary-600 text-white rounded hover:bg-primary-700 transition-colors text-sm"
            disabled={fundingSources.length === 0 || projectFunding.length === fundingSources.length}
          >
            Add Funding Source
          </button>
        </div>
        
        <div class="mb-4">
          <div class="flex justify-between text-sm mb-1">
            <span>Total: {totalFundingAmount.toFixed(2)} hours ({totalFundingPercentage.toFixed(2)}%)</span>
            <span class={Math.abs(totalFundingPercentage - 100) < 0.1 ? 'text-green-600' : 'text-red-600'}>
              {Math.abs(totalFundingPercentage - 100) < 0.1 ? '✓ Valid' : '⚠ Should be 100%'}
            </span>
          </div>
          
          <div class="w-full bg-gray-200 rounded-full h-2.5">
            <div 
              class="bg-primary-600 h-2.5 rounded-full"
              style="width: {Math.min(totalFundingPercentage, 100)}%"
            ></div>
          </div>
        </div>
        
        {#if projectFunding.length === 0}
          <div class="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-md">
            <p class="text-yellow-700">
              No funding sources have been added. Click "Add Funding Source" to get started.
            </p>
          </div>
        {:else}
          <div class="space-y-4">
            {#each projectFunding as funding, index}
              <div class="flex flex-wrap items-end gap-4 p-4 border border-gray-200 rounded-md">
                <div class="flex-1 min-w-[250px]">
                  <label class="block text-sm font-medium text-gray-700 mb-1">Funding Source</label>
                  <select
                    bind:value={funding.funding_source_id}
                    class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  >
                    {#each fundingSources as source}
                      <option value={source.id}>{source.name}</option>
                    {/each}
                  </select>
                </div>
                
                <div class="w-32">
                  <label class="block text-sm font-medium text-gray-700 mb-1">Hours</label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    bind:value={funding.amount}
                    on:input={() => updateFundingAmount(index, funding.amount)}
                    class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
                
                <div class="w-32">
                  <label class="block text-sm font-medium text-gray-700 mb-1">Percentage (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    bind:value={funding.percentage}
                    disabled
                    class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-100 cursor-not-allowed"
                  />
                </div>
                
                <button
                  type="button"
                  on:click={() => removeFundingSource(index)}
                  class="px-3 py-2 text-red-600 hover:text-red-800"
                >
                  Remove
                </button>
              </div>
            {/each}
          </div>
        {/if}
      </div>
      
      <div class="p-6">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-xl font-semibold">Team Members</h2>
          <button
            type="button"
            on:click={addUser}
            class="px-3 py-1 bg-primary-600 text-white rounded hover:bg-primary-700 transition-colors text-sm"
          >
            Add Member
          </button>
        </div>
        
        {#if project.users && project.users.length > 0}
          <div class="space-y-4">
            {#each project.users as user, index}
              <div class="flex flex-wrap items-end gap-4 p-4 border border-gray-200 rounded-md">
                <div class="flex-1 min-w-[250px]">
                  <label class="block text-sm font-medium text-gray-700 mb-1">User</label>
                  <select
                    bind:value={user.id}
                    required
                    class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="">Select a user</option>
                    {#each availableUsers as availableUser}
                      <option value={availableUser.id}>{availableUser.full_name} ({availableUser.username})</option>
                    {/each}
                  </select>
                </div>
                
                <div class="w-32">
                  <label class="block text-sm font-medium text-gray-700 mb-1">Role</label>
                  <select
                    bind:value={user.project_role}
                    class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="employee">Employee</option>
                    <option value="lead">Team Lead</option>
                    <option value="manager">Manager</option>
                  </select>
                </div>
                
                <div class="w-32">
                  <label class="block text-sm font-medium text-gray-700 mb-1">Max Hours</label>
                  <input
                    type="number"
                    min="1"
                    bind:value={user.workload}
                    class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
                
                <button
                  type="button"
                  on:click={() => removeUser(index)}
                  class="px-3 py-2 text-red-600 hover:text-red-800"
                >
                  Remove
                </button>
              </div>
            {/each}
          </div>
        {:else}
          <p class="text-gray-500 mb-4">No team members assigned to this project. Click "Add Member" to assign users.</p>
        {/if}
      </div>
      
      <div class="p-6 bg-gray-50 flex justify-end space-x-4">
        <a
          href="/projects/{projectId}"
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