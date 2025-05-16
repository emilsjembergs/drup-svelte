<script lang="ts">
  import { onMount } from 'svelte';
  import { getAuthHeaders, isAuthenticated } from '$lib/stores/auth';
  import { goto } from '$app/navigation';
  
  export let data;
  
  // Define types for better TypeScript support
  interface User {
    id: number;
    username: string;
    full_name?: string;
    email: string;
    project_role: string;
    workload: number;
  }
  
  interface Project {
    id: number;
    name: string;
    description?: string;
    start_date?: string;
    end_date?: string;
    budget: number;
    contract_number?: string;
    min_workload: number;
    users: User[];
  }
  
  interface TimeEntry {
    id: number;
    user_id: number;
    project_id: number;
    date: string;
    hours: number;
    description?: string;
    entry_type: string;
    user_name?: string;
  }
  
  let project: Project | null = null;
  let loading = true;
  let error: string | null = null;
  let projectId = data.id;
  let timeEntries: TimeEntry[] = []; // To store time entries for the project
  let userTotals: Record<number, number> = {}; // To track total hours used per user
  let totalHoursUsed = 0;
  let progressPercentage = 0;
  
  onMount(async () => {
    if (!$isAuthenticated) {
      goto('/login');
      return;
    }
    
    try {
      loading = true;
      const response = await fetch(`http://localhost:3000/api/projects/${projectId}`, {
        headers: getAuthHeaders()
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to load project');
      }
      
      project = await response.json();
      
      // Load time entries for the project to calculate usage
      await loadTimeEntries();
      
      // Calculate hours used for each team member
      calculateUserTotals();
      
      // Calculate overall project progress
      if (project && project.budget > 0) {
        totalHoursUsed = Object.values(userTotals).reduce((sum, hours) => sum + hours, 0);
        progressPercentage = Math.min(100, Math.round((totalHoursUsed / project.budget) * 100));
      }
      
      loading = false;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'An error occurred';
      error = errorMsg;
      loading = false;
    }
  });
  
  async function loadTimeEntries() {
    try {
      const response = await fetch(`http://localhost:3000/api/time-entries/project/${projectId}`, {
        headers: getAuthHeaders()
      });
      
      if (response.ok) {
        timeEntries = await response.json();
      } else {
        console.error('Failed to load time entries');
        timeEntries = [];
      }
    } catch (err) {
      console.error('Error loading time entries:', err);
      timeEntries = [];
    }
  }
  
  function calculateUserTotals() {
    userTotals = {};
    
    // Initialize with zero for all users
    if (project && project.users) {
      project.users.forEach(user => {
        userTotals[user.id] = 0;
      });
    }
    
    // Sum up hours from time entries
    timeEntries.forEach(entry => {
      if (userTotals[entry.user_id] !== undefined) {
        userTotals[entry.user_id] += parseFloat(entry.hours.toString() || '0');
      }
    });
  }
  
  function formatDate(dateString?: string) {
    if (!dateString) return 'Not set';
    const date = new Date(dateString);
    return date.toLocaleDateString();
  }
  
  function calculatePercentage(hours: number) {
    if (!project || !project.budget || project.budget <= 0) return 0;
    return Math.round((hours / project.budget) * 100);
  }
  
  function calculateWorkloadPercentage(user: User) {
    if (!project || !project.budget || project.budget <= 0) return 0;
    return Math.round((user.workload / project.budget) * 100);
  }
</script>

<svelte:head>
  <title>{project ? project.name : 'Project Details'}</title>
</svelte:head>

<div class="container mx-auto px-4 py-8">
  <div class="flex justify-between items-center mb-6">
    <h1 class="text-3xl font-bold text-gray-800">
      {#if loading}
        Loading project...
      {:else if project}
        {project.name}
      {:else}
        Project Details
      {/if}
    </h1>
    
    {#if project}
      <a 
        href="/projects/{projectId}/edit" 
        class="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700 transition-colors"
      >
        Edit Project
      </a>
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
  {:else if project}
    <div class="bg-white shadow rounded-lg overflow-hidden">
      <div class="p-6 border-b">
        <h2 class="text-xl font-semibold mb-4">Project Information</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
          <div>
            <p class="text-gray-600 mb-1">Description</p>
            <p class="text-gray-900">{project.description || 'No description provided'}</p>
          </div>
          <div>
            <p class="text-gray-600 mb-1">Contract Number</p>
            <p class="text-gray-900">{project.contract_number || 'Not specified'}</p>
          </div>
          <div>
            <p class="text-gray-600 mb-1">Start Date</p>
            <p class="text-gray-900">{formatDate(project.start_date)}</p>
          </div>
          <div>
            <p class="text-gray-600 mb-1">End Date</p>
            <p class="text-gray-900">{formatDate(project.end_date)}</p>
          </div>
          <div>
            <p class="text-gray-600 mb-1">Budget</p>
            <p class="text-gray-900">{project.budget || '0'} hours</p>
          </div>
          <div>
            <p class="text-gray-600 mb-1">Minimum Workload</p>
            <p class="text-gray-900">{project.min_workload || '0'}%</p>
          </div>
        </div>
        
        <!-- Overall Project Progress -->
        <div class="mt-4 mb-2">
          <div class="flex justify-between items-center mb-1">
            <h3 class="font-medium">Overall Progress</h3>
            <div class="text-sm">
              <span class="font-medium">{totalHoursUsed.toFixed(1)}</span> of <span class="font-medium">{project.budget}</span> hours used 
              (<span class={progressPercentage > 90 ? 'text-red-600 font-medium' : 'font-medium'}>{progressPercentage}%</span>)
            </div>
          </div>
          <div class="w-full bg-gray-200 rounded-full h-2.5">
            <div 
              class={`h-2.5 rounded-full ${progressPercentage > 90 ? 'bg-red-600' : 'bg-primary-600'}`}
              style="width: {progressPercentage}%"
            ></div>
          </div>
        </div>
      </div>
      
      <div class="p-6">
        <h2 class="text-xl font-semibold mb-4">Team Members</h2>
        {#if project.users && project.users.length > 0}
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Budget (H)</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Budget %</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Used (H)</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Remaining</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                {#each project.users as user}
                  <tr>
                    <td class="px-6 py-4 whitespace-nowrap">
                      <a href="/users/{user.id}" class="text-primary-600 hover:text-primary-800">
                        {user.full_name || user.username}
                      </a>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">{user.project_role || 'Member'}</td>
                    <td class="px-6 py-4 whitespace-nowrap">{user.workload} h</td>
                    <td class="px-6 py-4 whitespace-nowrap">{calculateWorkloadPercentage(user)}%</td>
                    <td class="px-6 py-4 whitespace-nowrap">
                      {userTotals[user.id] ? userTotals[user.id].toFixed(1) : 0} h
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                      <div class="flex items-center">
                        <span class="mr-2">{Math.max(0, user.workload - (userTotals[user.id] || 0)).toFixed(1)} h</span>
                        <div class="w-24 bg-gray-200 rounded-full h-2.5">
                          <div 
                            class={`h-2.5 rounded-full ${(userTotals[user.id] || 0) > user.workload ? 'bg-red-600' : 'bg-primary-600'}`} 
                            style="width: {Math.min(100, (userTotals[user.id] || 0) / user.workload * 100)}%"
                          ></div>
                        </div>
                      </div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">{user.email}</td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        {:else}
          <p class="text-gray-500">No team members assigned to this project.</p>
        {/if}
      </div>
    </div>
  {:else}
    <p class="text-gray-500">Project not found.</p>
  {/if}
  
  <div class="mt-6">
    <a href="/projects" class="text-primary-600 hover:text-primary-800">
      &larr; Back to Projects
    </a>
  </div>
</div> 