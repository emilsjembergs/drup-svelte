<script lang="ts">
  import { onMount } from 'svelte';
  import { getAuthHeaders, isAuthenticated, currentUser } from '$lib/stores/auth';
  import { goto } from '$app/navigation';
  
  // Data types
  interface Project {
    id: number;
    name: string;
    description?: string;
    start_date?: string;
    end_date?: string;
    budget: number;
    contract_number?: string;
  }
  
  interface FundingSource {
    id: number;
    name: string;
    description?: string;
  }
  
  // State
  let loading = true;
  let projects: Project[] = [];
  let fundingSources: FundingSource[] = [];
  let selectedProjectId: number | null = null;
  let selectedFundingSourceId: number | null = null;
  let startDate = '';
  let endDate = '';
  let activeTab = 'export'; // export, accounting, supervisory, management
  let error: string | null = null;
  let exportingPdf = false;
  let exportingXlsx = false;
  
  // Check if user is logged in
  onMount(async () => {
    if (!$isAuthenticated) {
      goto('/login');
      return;
    }
    
    try {
      loading = true;
      
      // Fetch projects
      const projectsResponse = await fetch('http://localhost:3000/api/projects', {
        headers: getAuthHeaders()
      });
      
      if (!projectsResponse.ok) {
        throw new Error('Failed to load projects');
      }
      
      projects = await projectsResponse.json();
      
      // Fetch funding sources
      const fundingResponse = await fetch('http://localhost:3000/api/funding-sources', {
        headers: getAuthHeaders()
      });
      
      if (fundingResponse.ok) {
        fundingSources = await fundingResponse.json();
      }
      
      // Set default dates to current month
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      
      startDate = firstDay.toISOString().slice(0, 10);
      endDate = lastDay.toISOString().slice(0, 10);
      
      loading = false;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'An error occurred';
      error = errorMsg;
      loading = false;
    }
  });
  
  // Export functions
  async function exportToPdf() {
    if (!selectedProjectId) {
      error = 'Please select a project to export';
      return;
    }
    
    try {
      exportingPdf = true;
      error = null;
      
      // Build query params
      const params = new URLSearchParams();
      params.append('projectId', selectedProjectId.toString());
      params.append('startDate', startDate);
      params.append('endDate', endDate);
      
      if (selectedFundingSourceId) {
        params.append('fundingSourceId', selectedFundingSourceId.toString());
      }
      
      // Call the export API
      const response = await fetch(`http://localhost:3000/api/exports/pdf?${params.toString()}`, {
        headers: getAuthHeaders()
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to export PDF');
      }
      
      // Get the blob data
      const blob = await response.blob();
      
      // Create object URL and trigger download
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `project-export-${selectedProjectId}-${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      exportingPdf = false;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'An error occurred';
      error = errorMsg;
      exportingPdf = false;
    }
  }
  
  async function exportToXlsx() {
    if (!selectedProjectId) {
      error = 'Please select a project to export';
      return;
    }
    
    try {
      exportingXlsx = true;
      error = null;
      
      // Build query params
      const params = new URLSearchParams();
      params.append('projectId', selectedProjectId.toString());
      params.append('startDate', startDate);
      params.append('endDate', endDate);
      
      if (selectedFundingSourceId) {
        params.append('fundingSourceId', selectedFundingSourceId.toString());
      }
      
      // Call the export API
      const response = await fetch(`http://localhost:3000/api/exports/xlsx?${params.toString()}`, {
        headers: getAuthHeaders()
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to export XLSX');
      }
      
      // Get the blob data
      const blob = await response.blob();
      
      // Create object URL and trigger download
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `project-export-${selectedProjectId}-${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      exportingXlsx = false;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'An error occurred';
      error = errorMsg;
      exportingXlsx = false;
    }
  }
  
  // Handle tab change
  function switchTab(tab: string) {
    activeTab = tab;
    error = null;
  }
</script>

<svelte:head>
  <title>Eksports un Atskaites - DRUP</title>
</svelte:head>

<div>
  <h1 class="text-2xl font-bold text-gray-800 mb-6">Datu eksportēšana un atskaites (pārskati)</h1>
  
  {#if error}
    <div class="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
      <p class="text-red-700">{error}</p>
    </div>
  {/if}
  
  <!-- Tabs -->
  <div class="mb-6 border-b border-gray-200">
    <nav class="flex -mb-px">
      <button 
        class="py-4 px-6 font-medium text-sm border-b-2 {activeTab === 'export' ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}"
        on:click={() => switchTab('export')}
      >
        Eksports uz .pdf un .xlsx
      </button>
      <button 
        class="py-4 px-6 font-medium text-sm border-b-2 {activeTab === 'accounting' ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}"
        on:click={() => switchTab('accounting')}
      >
        Grāmatvedības atskaites
      </button>
      <button 
        class="py-4 px-6 font-medium text-sm border-b-2 {activeTab === 'supervisory' ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}"
        on:click={() => switchTab('supervisory')}
      >
        Uzraugošajām iestādēm
      </button>
      <button 
        class="py-4 px-6 font-medium text-sm border-b-2 {activeTab === 'management' ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}"
        on:click={() => switchTab('management')}
      >
        Vadības atskaites
      </button>
    </nav>
  </div>
  
  {#if loading}
    <div class="flex justify-center my-12">
      <div class="w-12 h-12 border-4 border-primary-400 border-t-primary-600 rounded-full animate-spin"></div>
    </div>
  {:else}
    <!-- Export to PDF & XLSX Tab -->
    {#if activeTab === 'export'}
      <div class="bg-white shadow rounded-lg p-6">
        <h2 class="text-xl font-semibold mb-4">Eksportēšana uz PDF un XLSX</h2>
        <p class="text-gray-600 mb-6">Eksportējiet projekta informāciju, tai skaitā darba laiku, finansējuma avotus un uzdevumus.</p>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <!-- Project Selection -->
          <div>
            <label for="project" class="block text-sm font-medium text-gray-700 mb-1">Projekts *</label>
            <select 
              id="project"
              bind:value={selectedProjectId}
              class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              required
            >
              <option value={null}>Izvēlieties projektu</option>
              {#each projects as project}
                <option value={project.id}>{project.name}</option>
              {/each}
            </select>
          </div>
          
          <!-- Funding Source -->
          <div>
            <label for="funding-source" class="block text-sm font-medium text-gray-700 mb-1">Finansējuma avots (neobligāts)</label>
            <select 
              id="funding-source"
              bind:value={selectedFundingSourceId}
              class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
            >
              <option value={null}>Visi finansējuma avoti</option>
              {#each fundingSources as source}
                <option value={source.id}>{source.name}</option>
              {/each}
            </select>
          </div>
          
          <!-- Date Range -->
          <div>
            <label for="start-date" class="block text-sm font-medium text-gray-700 mb-1">Sākuma datums</label>
            <input 
              id="start-date"
              type="date"
              bind:value={startDate}
              class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          
          <div>
            <label for="end-date" class="block text-sm font-medium text-gray-700 mb-1">Beigu datums</label>
            <input 
              id="end-date"
              type="date"
              bind:value={endDate}
              class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
        </div>
        
        <!-- Export Buttons -->
        <div class="flex flex-wrap gap-4">
          <button 
            type="button"
            class="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
            on:click={exportToPdf}
            disabled={exportingPdf || !selectedProjectId}
          >
            {#if exportingPdf}
              <span class="mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            {:else}
              <span class="mr-2">📄</span>
            {/if}
            Eksportēt uz PDF
          </button>
          
          <button 
            type="button"
            class="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
            on:click={exportToXlsx}
            disabled={exportingXlsx || !selectedProjectId}
          >
            {#if exportingXlsx}
              <span class="mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            {:else}
              <span class="mr-2">📊</span>
            {/if}
            Eksportēt uz XLSX
          </button>
        </div>
      </div>
    {/if}
    
    <!-- Accounting Reports Tab -->
    {#if activeTab === 'accounting'}
      <div class="bg-white shadow rounded-lg p-6">
        <h2 class="text-xl font-semibold mb-4">Grāmatvedības atskaites</h2>
        <p class="text-gray-600 mb-6">Finansējuma avotu darba laika uzskaites atskaites grāmatvedībai.</p>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <!-- Project Selection -->
          <div>
            <label for="acc-project" class="block text-sm font-medium text-gray-700 mb-1">Projekts *</label>
            <select 
              id="acc-project"
              bind:value={selectedProjectId}
              class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              required
            >
              <option value={null}>Izvēlieties projektu</option>
              {#each projects as project}
                <option value={project.id}>{project.name}</option>
              {/each}
            </select>
          </div>
          
          <!-- Funding Source -->
          <div>
            <label for="acc-funding-source" class="block text-sm font-medium text-gray-700 mb-1">Finansējuma avots *</label>
            <select 
              id="acc-funding-source"
              bind:value={selectedFundingSourceId}
              class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              required
            >
              <option value={null}>Izvēlieties finansējuma avotu</option>
              {#each fundingSources as source}
                <option value={source.id}>{source.name}</option>
              {/each}
            </select>
          </div>
          
          <!-- Date Range -->
          <div>
            <label for="acc-start-date" class="block text-sm font-medium text-gray-700 mb-1">Sākuma datums *</label>
            <input 
              id="acc-start-date"
              type="date"
              bind:value={startDate}
              class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              required
            />
          </div>
          
          <div>
            <label for="acc-end-date" class="block text-sm font-medium text-gray-700 mb-1">Beigu datums *</label>
            <input 
              id="acc-end-date"
              type="date"
              bind:value={endDate}
              class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              required
            />
          </div>
        </div>
        
        <button 
          type="button"
          class="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700 flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={!selectedProjectId || !selectedFundingSourceId}
          on:click={exportToPdf}
        >
          <span class="mr-2">📊</span>
          Ģenerēt finansējuma avotu darba laika atskaiti
        </button>
      </div>
    {/if}
    
    <!-- Supervisory Reports Tab -->
    {#if activeTab === 'supervisory'}
      <div class="bg-white shadow rounded-lg p-6">
        <h2 class="text-xl font-semibold mb-4">Uzraugošo iestāžu atskaites</h2>
        <p class="text-gray-600 mb-6">Darba laika uzskaites tabula par konkrētu darbinieku (DLUT).</p>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <!-- Project Selection -->
          <div>
            <label for="sup-project" class="block text-sm font-medium text-gray-700 mb-1">Projekts *</label>
            <select 
              id="sup-project"
              bind:value={selectedProjectId}
              class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              required
            >
              <option value={null}>Izvēlieties projektu</option>
              {#each projects as project}
                <option value={project.id}>{project.name}</option>
              {/each}
            </select>
          </div>
          
          <!-- Employee Selection -->
          <div>
            <label for="employee" class="block text-sm font-medium text-gray-700 mb-1">Darbinieks *</label>
            <select 
              id="employee"
              class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">Izvēlieties darbinieku</option>
              {#if selectedProjectId && projects.find(p => p.id === selectedProjectId)?.users}
                {#each projects.find(p => p.id === selectedProjectId)?.users || [] as user}
                  <option value={user.id}>{user.full_name || user.username}</option>
                {/each}
              {/if}
            </select>
          </div>
          
          <!-- Date Range -->
          <div>
            <label for="sup-start-date" class="block text-sm font-medium text-gray-700 mb-1">Sākuma datums *</label>
            <input 
              id="sup-start-date"
              type="date"
              bind:value={startDate}
              class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              required
            />
          </div>
          
          <div>
            <label for="sup-end-date" class="block text-sm font-medium text-gray-700 mb-1">Beigu datums *</label>
            <input 
              id="sup-end-date"
              type="date"
              bind:value={endDate}
              class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              required
            />
          </div>
        </div>
        
        <button 
          type="button"
          class="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700 flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={!selectedProjectId}
          on:click={exportToPdf}
        >
          <span class="mr-2">📊</span>
          Ģenerēt DLUT atskaiti
        </button>
      </div>
    {/if}
    
    <!-- Management Reports Tab -->
    {#if activeTab === 'management'}
      <div class="bg-white shadow rounded-lg p-6">
        <h2 class="text-xl font-semibold mb-4">Vadības atskaites</h2>
        <p class="text-gray-600 mb-6">Projektu vadībai paredzētās atskaites un pārskati.</p>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <!-- Project Selection -->
          <div>
            <label for="mgmt-project" class="block text-sm font-medium text-gray-700 mb-1">Projekts *</label>
            <select 
              id="mgmt-project"
              bind:value={selectedProjectId}
              class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              required
            >
              <option value={null}>Izvēlieties projektu</option>
              {#each projects as project}
                <option value={project.id}>{project.name}</option>
              {/each}
            </select>
          </div>
          
          <!-- Report Type -->
          <div>
            <label for="report-type" class="block text-sm font-medium text-gray-700 mb-1">Atskaites tips *</label>
            <select 
              id="report-type"
              class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              required
            >
              <option value="">Izvēlieties atskaites tipu</option>
              <option value="summary">Projekta kopsavilkums</option>
              <option value="progress">Projekta progress pa periodiem</option>
              <option value="budget">Budžeta izpildes atskaite</option>
              <option value="team">Komandas darba laika analīze</option>
            </select>
          </div>
          
          <!-- Date Range -->
          <div>
            <label for="mgmt-start-date" class="block text-sm font-medium text-gray-700 mb-1">Sākuma datums *</label>
            <input 
              id="mgmt-start-date"
              type="date"
              bind:value={startDate}
              class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              required
            />
          </div>
          
          <div>
            <label for="mgmt-end-date" class="block text-sm font-medium text-gray-700 mb-1">Beigu datums *</label>
            <input 
              id="mgmt-end-date"
              type="date"
              bind:value={endDate}
              class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              required
            />
          </div>
        </div>
        
        <div class="flex flex-wrap gap-4">
          <button 
            type="button"
            class="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700 flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!selectedProjectId}
            on:click={exportToPdf}
          >
            <span class="mr-2">📄</span>
            Ģenerēt PDF atskaiti
          </button>
          
          <button 
            type="button"
            class="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!selectedProjectId}
            on:click={exportToXlsx}
          >
            <span class="mr-2">📊</span>
            Ģenerēt XLSX atskaiti
          </button>
        </div>
      </div>
    {/if}
  {/if}
</div> 