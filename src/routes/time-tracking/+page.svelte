<script>
  import { onMount } from 'svelte';
  import { getAuthHeaders, isAuthenticated, currentUser } from '$lib/stores/auth';
  import { goto } from '$app/navigation';
  
  let loading = true;
  let error = null;
  let userProjects = [];
  let selectedProject = null;
  let selectedMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format
  let budget = 0; // Now represents total hours instead of money
  let totalHours = 0;
  let progressPercentage = 0;
  let timeEntries = [];
  let fundingSources = [];

  onMount(async () => {
    if (!$isAuthenticated) {
      goto('/login');
      return;
    }
    
    try {
      // Load user's projects
      await loadUserProjects();
      
      if (selectedProject) {
        await Promise.all([
          loadTimeEntries(),
          loadProjectFunding()
        ]);
      }
    } catch (err) {
      error = typeof err === 'string' ? err : err.message || 'Failed to load data';
    } finally {
      loading = false;
    }
  });
  
  async function loadUserProjects() {
    try {
      const response = await fetch(`http://localhost:3000/api/users/${$currentUser?.id}`, {
        headers: getAuthHeaders()
      });
      
      if (!response.ok) {
        throw new Error('Failed to load user projects');
      }
      
      const userData = await response.json();
      userProjects = userData.projects || [];
      
      if (userProjects.length > 0) {
        selectedProject = userProjects[0].id;
        budget = parseFloat(userProjects[0].budget) || 0;
      }
    } catch (err) {
      console.error('Error loading user projects:', err);
      throw err;
    }
  }
  
  async function loadTimeEntries() {
    if (!selectedProject) return;
    
    try {
      const response = await fetch(`http://localhost:3000/api/time-entries/project/${selectedProject}`, {
        headers: getAuthHeaders()
      });
      
      if (!response.ok) {
        throw new Error('Failed to load time entries');
      }
      
      const allEntries = await response.json();
      
      // Filter by selected month
      const [year, month] = selectedMonth.split('-');
      timeEntries = allEntries.filter(entry => {
        const entryDate = new Date(entry.date);
        return entryDate.getFullYear() === parseInt(year) && 
               entryDate.getMonth() === parseInt(month) - 1;
      });
      
      // Calculate total hours
      totalHours = timeEntries.reduce((sum, entry) => sum + parseFloat(entry.hours), 0);
      
      // Calculate progress percentage based on hours
      if (budget > 0) {
        progressPercentage = Math.min(Math.round((totalHours / budget) * 100), 100);
      } else {
        progressPercentage = 0;
      }
    } catch (err) {
      console.error('Error loading time entries:', err);
      error = typeof err === 'string' ? err : err.message || 'Failed to load time entries';
    }
  }
  
  async function loadProjectFunding() {
    if (!selectedProject) return;
    
    try {
      const response = await fetch(`http://localhost:3000/api/projects/${selectedProject}/funding`, {
        headers: getAuthHeaders()
      });
      
      if (!response.ok) {
        throw new Error('Failed to load project funding');
      }
      
      fundingSources = await response.json();
    } catch (err) {
      console.error('Error loading project funding:', err);
    }
  }

  function formatDate(dateString) {
    if (!dateString) return 'Not set';
    const date = new Date(dateString);
    return date.toLocaleDateString();
  }
  
  async function handleProjectSelect(event) {
    const projectId = parseInt(event.target.value, 10);
    selectedProject = projectId;
    
    // Update budget when project changes
    const project = userProjects.find(p => p.id === projectId);
    if (project) {
      budget = parseFloat(project.budget) || 0;
    } else {
      budget = 0;
    }
    
    // Reload data for the selected project
    await Promise.all([
      loadTimeEntries(),
      loadProjectFunding()
    ]);
  }
  
  async function handleMonthSelect(event) {
    selectedMonth = event.target.value;
    await loadTimeEntries();
  }
  
  function navigateTo(path) {
    goto(path);
  }

  function getEntryTypeLabel(type) {
    const types = {
      'work': 'Darbs',
      'vacation': 'Atvaļinājums',
      'sick_leave': 'Slimības Lapa',
      'holiday': 'Svētku Diena',
      'other': 'Cits'
    };
    return types[type] || type;
  }
</script>

<svelte:head>
  <title>Darba Laika Uzskaite</title>
</svelte:head>

<div class="container mx-auto">
  <div class="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center">
    <h1 class="text-3xl font-bold text-gray-800 mb-4 sm:mb-0">Darba Laika Uzskaite</h1>
    
    {#if $currentUser && $currentUser.role !== 'employee'}
      <div class="flex gap-4">
        <button 
          class="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 transition-colors"
          on:click={() => navigateTo('/time-tracking/new')}
        >
          Pievienot Jaunu Ierakstu
        </button>
      </div>
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
  {:else}
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <!-- Time Entry Section -->
      <div class="bg-white shadow rounded-lg p-6 md:col-span-2">
        <h2 class="text-xl font-semibold mb-4">Laika Ieraksti</h2>
        
        <div class="flex flex-col sm:flex-row gap-4 mb-6">
          <div class="w-full sm:w-1/2">
            <label for="project" class="block text-sm font-medium text-gray-700 mb-1">Projekts</label>
            <select 
              id="project"
              class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              on:change={handleProjectSelect}
              disabled={userProjects.length === 0}
            >
              {#if userProjects.length === 0}
                <option value="">Nav pieejamu projektu</option>
              {:else}
                {#each userProjects as project}
                  <option value={project.id}>{project.name}</option>
                {/each}
              {/if}
            </select>
          </div>
          
          <div class="w-full sm:w-1/2">
            <label for="month" class="block text-sm font-medium text-gray-700 mb-1">Mēnesis</label>
            <input 
              type="month"
              id="month"
              class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              bind:value={selectedMonth}
              on:change={handleMonthSelect}
            />
          </div>
        </div>
        
        {#if userProjects.length === 0}
          <div class="bg-yellow-50 border-l-4 border-yellow-400 p-4">
            <p class="text-yellow-700">Jums nav pievienoti projekti. Lūdzu, sazinieties ar projekta vadītāju.</p>
          </div>
        {:else if !selectedProject}
          <div class="bg-yellow-50 border-l-4 border-yellow-400 p-4">
            <p class="text-yellow-700">Lūdzu, izvēlieties projektu, lai redzētu laika ierakstus.</p>
          </div>
        {:else if timeEntries.length === 0}
          <div class="bg-gray-50 p-4 text-center rounded">
            <p>Šajā mēnesī nav pievienots neviens laika ieraksts.</p>
            <button 
              class="mt-4 bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 transition-colors"
              on:click={() => navigateTo('/time-tracking/new')}
            >
              Pievienot Laika Ierakstu
            </button>
          </div>
        {:else}
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Datums</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tips</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stundas</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Apraksts</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Darbības</th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                {#each timeEntries as entry}
                  <tr>
                    <td class="px-6 py-4 whitespace-nowrap">{formatDate(entry.date)}</td>
                    <td class="px-6 py-4 whitespace-nowrap">{getEntryTypeLabel(entry.entry_type)}</td>
                    <td class="px-6 py-4 whitespace-nowrap">{entry.hours}</td>
                    <td class="px-6 py-4">
                      {#if entry.description}
                        {entry.description}
                      {:else}
                        <span class="text-gray-400">Nav apraksta</span>
                      {/if}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                      <button 
                        class="text-primary-600 hover:text-primary-900 mr-3"
                        on:click={() => navigateTo(`/time-tracking/edit/${entry.id}`)}
                      >
                        Rediģēt
                      </button>
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        {/if}
      </div>
      
      <!-- Summary Section -->
      <div class="bg-white shadow rounded-lg p-6">
        <h2 class="text-xl font-semibold mb-4">Kopsavilkums</h2>
        
        <div class="space-y-6">
          <div>
            <h3 class="font-medium text-gray-700 mb-2">Kopējās Stundas</h3>
            <div class="bg-gray-100 p-4 rounded-lg text-center">
              <span class="text-3xl font-bold text-primary-600">{totalHours}</span>
              <span class="text-gray-600 ml-2">stundas</span>
            </div>
          </div>
          
          <div>
            <h3 class="font-medium text-gray-700 mb-2">Projekta Progress</h3>
            <div class="bg-gray-100 p-4 rounded-lg">
              <div class="w-full bg-gray-300 rounded-full h-4 mb-2">
                <div class="bg-primary-600 h-4 rounded-full" style="width: {progressPercentage}%"></div>
              </div>
              <div class="flex justify-between text-sm text-gray-600">
                <span>{progressPercentage}%</span>
                <span>Budžets: {budget.toFixed(2)} stundas</span>
              </div>
              <div class="flex justify-between text-sm text-gray-600 mt-1">
                <span>Izlietots: {totalHours.toFixed(2)} stundas</span>
                <span>Atlikums: {Math.max(0, budget - totalHours).toFixed(2)} stundas</span>
              </div>
            </div>
          </div>
          
          <div>
            <h3 class="font-medium text-gray-700 mb-2">Finansējuma Avoti</h3>
            <div class="bg-gray-100 p-4 rounded-lg">
              {#if fundingSources.length === 0}
                <p class="text-center text-gray-600">Nav pieejamu datu</p>
              {:else}
                <div class="space-y-3">
                  {#each fundingSources as source}
                    <div class="flex justify-between">
                      <span>{source.name}</span>
                      <span>{source.percentage}%</span>
                    </div>
                  {/each}
                </div>
              {/if}
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Quick Links -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <div class="bg-white shadow rounded-lg p-6 hover:shadow-md transition-shadow">
        <h3 class="text-lg font-semibold mb-2">Atvaļinājumi un Slimības Lapas</h3>
        <p class="text-gray-600 mb-4">Reģistrējiet atvaļinājumus, slimības lapas, un citas prombūtnes</p>
        <button 
          class="bg-secondary-600 text-white px-4 py-2 rounded-md hover:bg-secondary-700 transition-colors w-full"
          on:click={() => navigateTo('/time-tracking/absences')}
        >
          Pārvaldīt Prombūtnes
        </button>
      </div>
      
      <div class="bg-white shadow rounded-lg p-6 hover:shadow-md transition-shadow">
        <h3 class="text-lg font-semibold mb-2">Darba Laika Atskaites</h3>
        <p class="text-gray-600 mb-4">Apskatīt un eksportēt darba laika atskaites</p>
        <button 
          class="bg-secondary-600 text-white px-4 py-2 rounded-md hover:bg-secondary-700 transition-colors w-full"
          on:click={() => navigateTo('/time-tracking/reports')}
        >
          Apskatīt Atskaites
        </button>
      </div>
      
      <div class="bg-white shadow rounded-lg p-6 hover:shadow-md transition-shadow">
        <h3 class="text-lg font-semibold mb-2">Finansējuma Avotu Sadale</h3>
        <p class="text-gray-600 mb-4">Pārvaldiet darba stundu sadali starp finansējuma avotiem</p>
        <button 
          class="bg-secondary-600 text-white px-4 py-2 rounded-md hover:bg-secondary-700 transition-colors w-full"
          on:click={() => navigateTo('/time-tracking/funding')}
        >
          Pārvaldīt Finansējumu
        </button>
      </div>
    </div>
  {/if}
</div> 