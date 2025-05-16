<script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { currentUser } from '../../../stores/auth';
  import { getAuthHeaders } from '../../../utils/auth';

  let loading = true;
  let error = null;
  
  // Data lists
  let fundingSources = [];
  let projects = [];
  let timeEntries = [];
  
  // Filter states
  let selectedMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format
  let selectedFundingSource = '';
  let selectedReportType = 'projects'; // 'projects', 'entries'
  
  // Report data
  let reportData = {
    totalHours: 0,
    totalBudget: 0,
    items: [] // Will contain either projects or time entries depending on report type
  };

  onMount(async () => {
    try {
      await Promise.all([
        loadFundingSources(),
        loadProjects()
      ]);
      
      await generateReport();
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
  
  async function loadProjects() {
    const response = await fetch('http://localhost:3000/api/projects', {
      headers: getAuthHeaders()
    });
    
    if (!response.ok) {
      throw new Error('Failed to load projects');
    }
    
    projects = await response.json();
  }
  
  async function loadProjectTimeEntries(projectId, month) {
    const response = await fetch(`http://localhost:3000/api/time-entries/project/${projectId}`, {
      headers: getAuthHeaders()
    });
    
    if (!response.ok) {
      throw new Error('Failed to load time entries');
    }
    
    let entries = await response.json();
    
    // Filter by month if provided
    if (month) {
      entries = entries.filter(entry => entry.date.startsWith(month));
    }
    
    return entries;
  }
  
  async function loadTimeEntriesByFundingSource(fundingSourceId, month) {
    const response = await fetch(`http://localhost:3000/api/time-entries/funding-source/${fundingSourceId}${month ? `?month=${month}` : ''}`, {
      headers: getAuthHeaders()
    });
    
    if (!response.ok) {
      throw new Error('Failed to load time entries for funding source');
    }
    
    return await response.json();
  }
  
  async function generateReport() {
    try {
      loading = true;
      error = null;
      
      if (selectedReportType === 'projects') {
        await generateProjectsReport();
      } else {
        await generateEntriesReport();
      }
    } catch (err) {
      error = typeof err === 'string' ? err : err.message || 'Failed to generate report';
      console.error('Error generating report:', err);
    } finally {
      loading = false;
    }
  }
  
  async function generateProjectsReport() {
    let projectsData = [];
    let totalHours = 0;
    let totalBudget = 0;
    
    // If a funding source is selected, get only projects using that funding source
    if (selectedFundingSource) {
      const response = await fetch(`http://localhost:3000/api/funding-sources/${selectedFundingSource}/projects`, {
        headers: getAuthHeaders()
      });
      
      if (!response.ok) {
        throw new Error('Failed to load projects for funding source');
      }
      
      projectsData = await response.json();
    } else {
      projectsData = [...projects];
    }
    
    // For each project, load its time entries for the selected month
    const projectsWithData = await Promise.all(
      projectsData.map(async (project) => {
        const timeEntries = await loadProjectTimeEntries(project.id, selectedMonth);
        const projectHours = timeEntries.reduce((sum, entry) => sum + parseFloat(entry.hours || 0), 0);
        
        // Get project funding sources
        const response = await fetch(`http://localhost:3000/api/projects/${project.id}/funding`, {
          headers: getAuthHeaders()
        });
        
        if (!response.ok) {
          throw new Error(`Failed to load funding for project ${project.name}`);
        }
        
        const projectFunding = await response.json();
        
        // Filter by selected funding source if needed
        const relevantFunding = selectedFundingSource
          ? projectFunding.filter(f => f.funding_source_id == selectedFundingSource)
          : projectFunding;
        
        const fundingDetails = relevantFunding.map(f => ({
          name: f.name,
          percentage: parseFloat(f.percentage) || 0,
          amount: parseFloat(f.amount) || 0,
          hours: (projectHours * parseFloat(f.percentage || 0)) / 100
        }));
        
        // Calculate aggregated funding values
        const fundingPercentage = fundingDetails.reduce((sum, f) => sum + f.percentage, 0);
        const fundingAmount = fundingDetails.reduce((sum, f) => sum + f.amount, 0);
        const fundingHours = fundingDetails.reduce((sum, f) => sum + f.hours, 0);
        
        totalHours += fundingHours;
        totalBudget += fundingAmount;
        
        return {
          ...project,
          hours: fundingHours,
          totalHours: projectHours,
          fundingPercentage,
          fundingAmount,
          fundingDetails
        };
      })
    );
    
    reportData = {
      totalHours,
      totalBudget,
      items: projectsWithData
    };
  }
  
  async function generateEntriesReport() {
    let entriesData = [];
    
    if (selectedFundingSource) {
      entriesData = await loadTimeEntriesByFundingSource(selectedFundingSource, selectedMonth);
    } else {
      // Load all time entries for the selected month from all projects
      const allEntries = [];
      
      for (const project of projects) {
        const projectEntries = await loadProjectTimeEntries(project.id, selectedMonth);
        allEntries.push(...projectEntries);
      }
      
      entriesData = allEntries;
    }
    
    const totalHours = entriesData.reduce((sum, entry) => {
      // If a funding source is selected, only count the hours allocated to that source
      if (selectedFundingSource && entry.funding_distribution) {
        const relevantFunding = entry.funding_distribution.find(f => f.funding_source_id == selectedFundingSource);
        return sum + (relevantFunding ? (parseFloat(entry.hours) * parseFloat(relevantFunding.percentage) / 100) : 0);
      }
      
      return sum + parseFloat(entry.hours || 0);
    }, 0);
    
    reportData = {
      totalHours,
      totalBudget: 0, // Can't calculate without project budget data
      items: entriesData
    };
  }
  
  function handleFilterChange() {
    generateReport();
  }
  
  function formatDate(dateString) {
    if (!dateString) return 'Not set';
    const date = new Date(dateString);
    return date.toLocaleDateString();
  }
  
  function formatNumber(value, decimals = 2) {
    if (value === null || value === undefined) return '0';
    return parseFloat(value).toFixed(decimals);
  }
  
  function navigateTo(path) {
    goto(path);
  }
</script>

<svelte:head>
  <title>Funding Reports</title>
</svelte:head>

<div class="container mx-auto px-4 py-8">
  <div class="flex justify-between items-center mb-6">
    <h1 class="text-2xl font-bold text-gray-800">Finansējuma Pārskati</h1>
    <div class="flex gap-2">
      <button
        on:click={() => navigateTo('/time-tracking')}
        class="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
      >
        Atpakaļ uz darba laika pārskatu
      </button>
      <button
        on:click={() => navigateTo('/time-tracking/funding')}
        class="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
      >
        Pārvaldīt finansējuma avotus
      </button>
    </div>
  </div>
  
  <!-- Filters -->
  <div class="bg-white rounded-lg shadow-md p-6 mb-6">
    <h2 class="text-xl font-semibold text-gray-800 mb-4">Filtrēt pārskatu</h2>
    
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div>
        <label for="month" class="block text-sm font-medium text-gray-700 mb-1">Mēnesis</label>
        <input
          type="month"
          id="month"
          bind:value={selectedMonth}
          on:change={handleFilterChange}
          class="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        />
      </div>
      
      <div>
        <label for="fundingSource" class="block text-sm font-medium text-gray-700 mb-1">Finansējuma Avots</label>
        <select
          id="fundingSource"
          bind:value={selectedFundingSource}
          on:change={handleFilterChange}
          class="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        >
          <option value="">Visi finansējuma avoti</option>
          {#each fundingSources as source}
            <option value={source.id}>{source.name}</option>
          {/each}
        </select>
      </div>
      
      <div>
        <label for="reportType" class="block text-sm font-medium text-gray-700 mb-1">Pārskata Veids</label>
        <select
          id="reportType"
          bind:value={selectedReportType}
          on:change={handleFilterChange}
          class="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        >
          <option value="projects">Pēc projektiem</option>
          <option value="entries">Pēc laika ierakstiem</option>
        </select>
      </div>
    </div>
  </div>
  
  {#if loading}
    <div class="flex justify-center items-center py-12">
      <div class="w-12 h-12 border-4 border-primary-400 border-t-primary-600 rounded-full animate-spin"></div>
    </div>
  {:else if error}
    <div class="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
      <p class="text-red-700">{error}</p>
    </div>
  {:else}
    <!-- Report Summary -->
    <div class="bg-white rounded-lg shadow-md p-6 mb-6">
      <h2 class="text-xl font-semibold text-gray-800 mb-4">Pārskata Kopsavilkums</h2>
      
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div class="bg-gray-50 p-4 rounded-lg">
          <p class="text-sm text-gray-500 mb-1">Kopējās Stundas</p>
          <p class="text-2xl font-bold text-gray-800">{formatNumber(reportData.totalHours, 1)} h</p>
        </div>
        
        {#if selectedReportType === 'projects'}
          <div class="bg-gray-50 p-4 rounded-lg">
            <p class="text-sm text-gray-500 mb-1">Kopējais Budžets</p>
            <p class="text-2xl font-bold text-gray-800">{formatNumber(reportData.totalBudget)} hours</p>
          </div>
        {/if}
      </div>
    </div>
    
    <!-- Report Data -->
    <div class="bg-white rounded-lg shadow-md p-6">
      <h2 class="text-xl font-semibold text-gray-800 mb-4">
        {selectedReportType === 'projects' ? 'Projektu Finansējums' : 'Laika Ieraksti'}
      </h2>
      
      {#if reportData.items.length === 0}
        <div class="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-md">
          <p class="text-yellow-700">Nav datu ar izvēlētajiem filtriem.</p>
        </div>
      {:else}
        <div class="overflow-x-auto">
          {#if selectedReportType === 'projects'}
            <!-- Projects Report Table -->
            <table class="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Projekts</th>
                  <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Stundas (filtrētas)</th>
                  <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Procenti</th>
                  <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Finansējums (h)</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-200">
                {#each reportData.items as project}
                  <tr class="hover:bg-gray-50">
                    <td class="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{project.name}</td>
                    <td class="px-4 py-3 whitespace-nowrap text-sm text-right">{formatNumber(project.hours, 1)}</td>
                    <td class="px-4 py-3 whitespace-nowrap text-sm text-right">{formatNumber(project.fundingPercentage)}%</td>
                    <td class="px-4 py-3 whitespace-nowrap text-sm text-right">{formatNumber(project.fundingAmount)} h</td>
                  </tr>
                  
                  <!-- Funding details if multiple sources -->
                  {#if selectedFundingSource === '' && project.fundingDetails.length > 1}
                    {#each project.fundingDetails as funding}
                      <tr class="bg-gray-50">
                        <td class="px-4 py-3 pl-8 whitespace-nowrap text-sm text-gray-500">- {funding.name}</td>
                        <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-500 text-right">{formatNumber(funding.hours, 1)}</td>
                        <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-500 text-right">{formatNumber(funding.percentage)}%</td>
                        <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-500 text-right">{formatNumber(funding.amount)} h</td>
                      </tr>
                    {/each}
                  {/if}
                {/each}
              </tbody>
            </table>
          {:else}
            <!-- Time Entries Report Table -->
            <table class="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Datums</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Projekts</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Darbinieks</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Apraksts</th>
                  <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Stundas</th>
                  <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Finansējuma Avots</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-200">
                {#each reportData.items as entry}
                  <tr class="hover:bg-gray-50">
                    <td class="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{formatDate(entry.date)}</td>
                    <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{entry.project_name}</td>
                    <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{entry.user_name}</td>
                    <td class="px-4 py-3 text-sm text-gray-500">{entry.description || '-'}</td>
                    <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-500 text-right">{formatNumber(entry.hours, 1)}</td>
                    <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-500 text-right">{entry.funding_sources || '-'}</td>
                  </tr>
                {/each}
              </tbody>
            </table>
          {/if}
        </div>
      {/if}
    </div>
  {/if}
</div> 