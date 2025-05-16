<script lang="ts">
  import { getAuthHeaders, isAuthenticated, currentUser } from '$lib/stores/auth';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  
  // Types
  interface User {
    id: number;
    username: string;
    full_name?: string;
    email: string;
    department?: {
      id: number;
      name: string;
    };
  }
  
  interface Department {
    id: number;
    name: string;
  }
  
  interface UserWorkload {
    user_id: number;
    workload: number;
    start_date?: string;
    end_date?: string;
  }
  
  interface FundingSource {
    id: number;
    name: string;
    description?: string;
  }
  
  interface ProjectFunding {
    funding_source_id: number;
    amount: number;
    percentage: number;
    name?: string;
  }
  
  interface ProjectUser {
    id: number;
    project_role: string;
    workload: number;
  }
  
  interface Project {
    name: string;
    description: string;
    start_date: string;
    end_date: string;
    budget: number;
    contract_number: string;
    min_workload: number;
    users: ProjectUser[];
  }
  
  // Form fields
  let name = '';
  let description = '';
  let startDate = '';
  let endDate = '';
  let contractNumber = '';
  let minWorkload = 0;
  
  // Users (employees)
  let users: User[] = [];
  let allUsers: User[] = [];
  let selectedUsers: number[] = [];
  let userWorkloads: Record<number, UserWorkload> = {};
  
  // Departments
  let departments: Department[] = [];
  let selectedDepartment = 0; // 0 means all departments
  
  // Funding sources
  let fundingSources: FundingSource[] = [];
  let projectFunding: ProjectFunding[] = [];
  let totalFundingPercentage = 0;
  let totalFundingAmount = 0; // Now represents hours instead of euros
  
  // Modal state for funding source creation
  let showFundingSourceModal = false;
  let newFundingSource = {
    name: '',
    description: ''
  };
  let creatingFundingSource = false;
  let fundingSourceError = '';
  
  // Search & filtering
  let userSearchQuery = '';
  
  // Form state
  let error = '';
  let loading = false;
  let loadingDepartments = false;
  let activeTab = 'basic'; // basic, employees, funding, deadlines
  
  let project: Project = {
    name: '',
    description: '',
    start_date: '',
    end_date: '',
    budget: 0,
    contract_number: '',
    min_workload: 0,
    users: []
  };
  
  let availableUsers: User[] = [];
  let creating = false;
  
  // Fetch users and departments on mount
  onMount(async () => {
    if (!$isAuthenticated) {
      goto('/login');
      return;
    }
    
    // Check if user has permission to create projects
    if (!$currentUser || !['admin', 'project_manager'].includes($currentUser.role)) {
      goto('/projects');
      return;
    }
    
    try {
      loading = true;
      
      // Fetch departments first
      loadingDepartments = true;
      const deptResponse = await fetch('http://localhost:3000/api/departments', {
        headers: getAuthHeaders() as HeadersInit
      });
      
      if (!deptResponse.ok) {
        throw new Error('Failed to fetch departments');
      }
      
      departments = await deptResponse.json();
      loadingDepartments = false;
      
      // Fetch users
      const userResponse = await fetch('http://localhost:3000/api/users', {
        headers: getAuthHeaders() as HeadersInit
      });
      
      if (!userResponse.ok) {
        throw new Error('Failed to fetch users');
      }
      
      allUsers = await userResponse.json();
      users = [...allUsers];
      
      // Fetch funding sources
      const fundingResponse = await fetch('http://localhost:3000/api/funding-sources', {
        headers: getAuthHeaders() as HeadersInit
      });
      
      if (fundingResponse.ok) {
        fundingSources = await fundingResponse.json();
      } else {
        console.error('Failed to fetch funding sources');
        fundingSources = [];
      }
      
      availableUsers = [...allUsers];
      loading = false;
    } catch (err) {
      console.error('Error fetching data:', err);
      error = err instanceof Error ? err.message : 'Failed to load data';
      loadingDepartments = false;
    }
  });
  
  // Handle user selection
  function toggleUserSelection(userId: number): void {
    if (selectedUsers.includes(userId)) {
      selectedUsers = selectedUsers.filter(id => id !== userId);
      // Remove workload if user is unselected
      delete userWorkloads[userId];
    } else {
      selectedUsers = [...selectedUsers, userId];
      // Initialize workload with default values
      userWorkloads[userId] = {
        user_id: userId,
        workload: 0, // Default to 0 hours
        start_date: startDate || '',
        end_date: ''
      };
    }
  }
  
  // Update user workload
  function updateWorkload(userId: number, workload: string): void {
    if (!userWorkloads[userId]) {
      userWorkloads[userId] = {
        user_id: userId,
        workload: 0,
        start_date: '',
        end_date: ''
      };
    }
    userWorkloads[userId].workload = parseFloat(workload);
  }
  
  // Update user start date for project
  function updateUserStartDate(userId: number, date: string): void {
    if (!userWorkloads[userId]) {
      userWorkloads[userId] = {
        user_id: userId,
        workload: 0,
        start_date: '',
        end_date: ''
      };
    }
    userWorkloads[userId].start_date = date;
  }
  
  // Update user end date for project
  function updateUserEndDate(userId: number, date: string): void {
    if (!userWorkloads[userId]) {
      userWorkloads[userId] = {
        user_id: userId,
        workload: 0,
        start_date: '',
        end_date: ''
      };
    }
    userWorkloads[userId].end_date = date;
  }
  
  // Filter users by search query and department
  $: filteredUsers = allUsers.filter(user => {
    const matchesQuery = userSearchQuery === '' ||
      user.full_name?.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
      user.username.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(userSearchQuery.toLowerCase());
      
    const matchesDepartment = selectedDepartment === 0 || 
      user.department?.id === selectedDepartment;
      
    return matchesQuery && matchesDepartment;
  });
  
  // Reactive statement to update users
  $: users = filteredUsers;
  
  // Handle department selection change
  function handleDepartmentChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    selectedDepartment = parseInt(target.value, 10);
  }
  
  // Handle form submission
  async function handleSubmit() {
    loading = true;
    error = '';
    
    try {
      // Calculate budget automatically based on funding sources total hours
      const calculatedBudget = totalFundingAmount;
      
      // Prepare user data from selected users
      const projectUsers = selectedUsers.map(userId => {
        const user = userWorkloads[userId] || { workload: 0 };
        return {
          id: userId,
          project_role: 'employee', 
          workload: user.workload
        };
      });
      
      // Add the current user as project manager if not already included
      const currentUserId = $currentUser?.id;
      if (currentUserId && !projectUsers.some(user => user.id === currentUserId)) {
        projectUsers.push({
          id: currentUserId,
          project_role: 'project_manager',
          workload: 40 // Default for project manager
        });
      }
      
      // Prepare project data
      const projectData = {
        name,
        description,
        start_date: startDate,
        end_date: endDate,
        budget: calculatedBudget, // Set budget to calculated amount
        contract_number: contractNumber,
        min_workload: parseFloat(minWorkload.toString()),
        users: projectUsers,
        funding_sources: projectFunding.map(funding => ({
          funding_source_id: funding.funding_source_id,
          amount: funding.amount, // Now represents hours
          percentage: funding.percentage
        }))
      };
      
      // Validate form data
      if (!projectData.name) {
        throw new Error('Project name is required');
      }
      
      if (projectData.min_workload < 0) {
        throw new Error('Minimum workload cannot be negative');
      }
      
      if (projectData.start_date && projectData.end_date) {
        const start = new Date(projectData.start_date);
        const end = new Date(projectData.end_date);
        if (end < start) {
          throw new Error('End date cannot be before start date');
        }
      }
      
      // Validate funding sources if they are added
      if (projectData.funding_sources.length > 0) {
        if (Math.abs(totalFundingPercentage - 100) > 0.1) {
          throw new Error('Total funding percentage should equal 100%');
        }
      } else {
        throw new Error('At least one funding source with hours allocation is required');
      }
      
      // Validate that at least one user is assigned to the project
      if (projectData.users.length === 0) {
        throw new Error('Please assign at least one team member to the project');
      }
      
      console.log('Creating project with data:', projectData);
      
      // Send request to create project
      const response = await fetch('http://localhost:3000/api/projects', {
        method: 'POST',
        headers: {
          ...getAuthHeaders() as HeadersInit,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(projectData)
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to create project');
      }
      
      const result = await response.json();
      // Redirect to projects list on success
      goto(`/projects/${result.projectId}`);
    } catch (err) {
      error = err instanceof Error ? err.message : 'An error occurred';
      console.error('Error creating project:', err);
    } finally {
      loading = false;
    }
  }
  
  // Handle input event with proper typing
  function handleInputChange(userId: number, event: Event): void {
    const target = event.target as HTMLInputElement;
    if (target && target.value) {
      updateWorkload(userId, target.value);
    }
  }
  
  // Handle date input event for user start date
  function handleUserStartDateChange(userId: number, event: Event): void {
    const target = event.target as HTMLInputElement;
    if (target) {
      updateUserStartDate(userId, target.value);
    }
  }
  
  // Handle date input event for user end date
  function handleUserEndDateChange(userId: number, event: Event): void {
    const target = event.target as HTMLInputElement;
    if (target) {
      updateUserEndDate(userId, target.value);
    }
  }
  
  async function createProject() {
    try {
      creating = true;
      error = '';
      
      // Add current user to the project if not already added
      const currentUserId = $currentUser?.id;
      if (currentUserId && !project.users.some(user => user.id === currentUserId)) {
        project.users.push({
          id: currentUserId,
          project_role: 'project_manager',
          workload: 40
        });
      }
      
      const response = await fetch('http://localhost:3000/api/projects', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(project)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create project');
      }
      
      const data = await response.json();
      creating = false;
      
      // Navigate to the newly created project
      goto(`/projects/${data.projectId}`);
    } catch (err) {
      error = err instanceof Error ? err.message : 'An error occurred';
      creating = false;
    }
  }
  
  function addUser() {
    if (availableUsers.length > 0) {
      // Find first available user not already in the project
      const firstAvailableUserId = availableUsers.find(
        user => !project.users.some(pu => pu.id === user.id)
      )?.id;
      
      if (firstAvailableUserId) {
        project.users = [
          ...project.users,
          {
            id: firstAvailableUserId,
            project_role: 'employee',
            workload: 40 // Default hours allocation
          }
        ];
      }
    }
  }
  
  function removeUser(index: number) {
    project.users = project.users.filter((_, i) => i !== index);
  }
  
  // Add a funding source to the project
  function addFundingSource() {
    // Check if there are any funding sources available
    if (fundingSources.length === 0) {
      // If no funding sources at all, show modal to create one
      showFundingSourceModal = true;
      return;
    }
    
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
    } else {
      // All funding sources are already added
      // Show modal to create a new one instead
      showFundingSourceModal = true;
    }
    
    // Force reactivity by re-assigning
    projectFunding = [...projectFunding];
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
          ...getAuthHeaders() as HeadersInit,
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
        headers: getAuthHeaders() as HeadersInit
      });
      
      if (sourcesResponse.ok) {
        fundingSources = await sourcesResponse.json();
        
        // Add the newly created funding source to the project
        const newSource = fundingSources.find(source => source.id === result.fundingSourceId);
        if (newSource) {
          projectFunding = [
            ...projectFunding,
            {
              funding_source_id: newSource.id,
              amount: 0,
              percentage: 0,
              name: newSource.name
            }
          ];
          
          calculateFundingTotals();
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
  
  // Remove a funding source from the project
  function removeFundingSource(index: number) {
    projectFunding = projectFunding.filter((_, i) => i !== index);
    calculateFundingTotals();
  }
  
  // Update funding amount for a source and recalculate percentages
  function updateFundingAmount(index: number, amount: number) {
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
  
  // Update funding percentage for a source and recalculate amounts
  function updateFundingPercentage(index: number, percentage: number) {
    if (index >= 0 && index < projectFunding.length) {
      projectFunding[index].percentage = percentage;
      
      // Recalculate amount based on percentage of budget
      if (totalFundingAmount > 0) {
        projectFunding[index].amount = (percentage / 100) * totalFundingAmount;
      } else {
        projectFunding[index].amount = 0;
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
  
  // Distribute funding evenly between sources
  function distributeEvenFunding() {
    if (projectFunding.length === 0 || totalFundingAmount <= 0) return;
    
    const evenPercentage = 100 / projectFunding.length;
    const evenAmount = totalFundingAmount / projectFunding.length;
    
    projectFunding = projectFunding.map(item => ({
      ...item,
      percentage: evenPercentage,
      amount: evenAmount
    }));
    
    calculateFundingTotals();
  }
  
  // Handle amount input change
  function handleAmountChange(index: number, event: Event) {
    const target = event.target as HTMLInputElement;
    if (target && target.value) {
      updateFundingAmount(index, parseFloat(target.value));
    }
  }
  
  // Handle percentage input change
  function handlePercentageChange(index: number, event: Event) {
    const target = event.target as HTMLInputElement;
    if (target && target.value) {
      updateFundingPercentage(index, parseFloat(target.value));
    }
  }
</script>

<div class="max-w-4xl mx-auto">
  <div class="mb-6">
    <h1 class="text-2xl font-bold text-gray-900">Create New Project</h1>
    <p class="text-gray-600">Fill out the details below to create a new project</p>
  </div>
  
  {#if error}
    <div class="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded mb-6">
      {error}
    </div>
  {/if}
  
  <!-- Tabs -->
  <div class="mb-6 border-b border-gray-200">
    <nav class="flex -mb-px">
      <button 
        class="py-4 px-6 font-medium text-sm border-b-2 {activeTab === 'basic' ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}"
        on:click={() => activeTab = 'basic'}
      >
        Project Details
      </button>
      <button 
        class="py-4 px-6 font-medium text-sm border-b-2 {activeTab === 'funding' ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}"
        on:click={() => activeTab = 'funding'}
      >
        Funding Sources
      </button>
      <button 
        class="py-4 px-6 font-medium text-sm border-b-2 {activeTab === 'employees' ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}"
        on:click={() => activeTab = 'employees'}
      >
        Employees & Workload
      </button>
      <button 
        class="py-4 px-6 font-medium text-sm border-b-2 {activeTab === 'deadlines' ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}"
        on:click={() => activeTab = 'deadlines'}
      >
        Deadlines & Constraints
      </button>
    </nav>
  </div>
  
  <div class="bg-white shadow rounded-lg p-6">
    <form on:submit|preventDefault={handleSubmit}>
      <!-- Basic Project Details Tab -->
      {#if activeTab === 'basic'}
        <div class="space-y-6">
          <div>
            <label for="name" class="block text-sm font-medium text-gray-700 mb-1">Project Name*</label>
            <input 
              type="text" 
              id="name" 
              bind:value={name} 
              required 
              class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              placeholder="Enter project name"
            />
          </div>
          
          <div>
            <label for="description" class="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea 
              id="description" 
              bind:value={description} 
              rows="4"
              class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              placeholder="Describe the project purpose and goals"
            ></textarea>
          </div>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label for="contractNumber" class="block text-sm font-medium text-gray-700 mb-1">Contract Number</label>
              <input 
                type="text" 
                id="contractNumber" 
                bind:value={contractNumber}
                class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                placeholder="Enter contract number"
              />
            </div>
          </div>
        </div>
      {/if}
      
      <!-- Employees & Workload Tab -->
      {#if activeTab === 'employees'}
        <div class="space-y-6">
          <div>
            <h3 class="text-lg font-medium text-gray-900 mb-3">Assign Employees</h3>
            <p class="text-sm text-gray-500 mb-4">Search and assign employees to this project</p>
            
            <!-- Search and Filter Controls -->
            <div class="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label for="user-search" class="block text-sm font-medium text-gray-700 mb-1">Search Employees</label>
                <input 
                  type="text"
                  id="user-search"
                  bind:value={userSearchQuery}
                  placeholder="Search by name, username, or email"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              
              <div>
                <label for="department-filter" class="block text-sm font-medium text-gray-700 mb-1">Filter by Department</label>
                <select 
                  id="department-filter"
                  on:change={handleDepartmentChange}
                  class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  disabled={loadingDepartments || departments.length === 0}
                >
                  <option value="0">All Departments</option>
                  {#if loadingDepartments}
                    <option disabled>Loading departments...</option>
                  {:else if departments.length === 0}
                    <option disabled>No departments found</option>
                  {:else}
                    {#each departments as dept}
                      <option value={dept.id}>{dept.name}</option>
                    {/each}
                  {/if}
                </select>
              </div>
            </div>
            
            {#if users.length === 0}
              <div class="bg-gray-50 p-4 text-center rounded-md">
                <p class="text-gray-500">
                  {userSearchQuery ? 'No employees match your search' : 
                   loadingDepartments ? 'Loading employees...' : 'No employees found'}
                </p>
              </div>
            {:else}
              <div class="border border-gray-200 rounded-md overflow-hidden overflow-x-auto">
                <table class="min-w-full divide-y divide-gray-200">
                  <thead class="bg-gray-50">
                    <tr>
                      <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Select</th>
                      <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name/Email</th>
                      <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                      <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Budget (H)</th>
                      <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Start Date</th>
                      <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">End Date</th>
                    </tr>
                  </thead>
                  <tbody class="bg-white divide-y divide-gray-200">
                    {#each users as user (user.id)}
                      <tr>
                        <td class="px-6 py-4 whitespace-nowrap">
                          <input 
                            type="checkbox" 
                            checked={selectedUsers.includes(user.id)}
                            on:change={() => toggleUserSelection(user.id)}
                            class="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                          />
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap">
                          <div class="font-medium text-gray-900">{user.full_name || user.username}</div>
                          <div class="text-sm text-gray-500">{user.email}</div>
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {user.department?.name || 'Not assigned'}
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap">
                          <input 
                            type="number" 
                            min="0" 
                            step="1"
                            disabled={!selectedUsers.includes(user.id)} 
                            value={userWorkloads[user.id]?.workload || 0}
                            on:input={(e) => handleInputChange(user.id, e)}
                            class="w-20 px-3 py-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 {!selectedUsers.includes(user.id) ? 'bg-gray-100 cursor-not-allowed' : ''}"
                          />
                          <span class="ml-1 text-sm text-gray-500">hours</span>
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap">
                          <input 
                            type="date" 
                            disabled={!selectedUsers.includes(user.id)} 
                            value={userWorkloads[user.id]?.start_date || ''}
                            on:input={(e) => handleUserStartDateChange(user.id, e)}
                            class="w-full px-3 py-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 {!selectedUsers.includes(user.id) ? 'bg-gray-100 cursor-not-allowed' : ''}"
                          />
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap">
                          <input 
                            type="date" 
                            disabled={!selectedUsers.includes(user.id)} 
                            value={userWorkloads[user.id]?.end_date || ''}
                            on:input={(e) => handleUserEndDateChange(user.id, e)}
                            class="w-full px-3 py-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 {!selectedUsers.includes(user.id) ? 'bg-gray-100 cursor-not-allowed' : ''}"
                          />
                        </td>
                      </tr>
                    {/each}
                  </tbody>
                </table>
              </div>
              
              <div class="mt-4 flex items-center justify-between text-sm">
                <span class="text-gray-500">
                  {users.length} employee{users.length !== 1 ? 's' : ''} shown
                </span>
                <span class="text-primary-600">
                  {selectedUsers.length} selected
                </span>
              </div>
            {/if}
          </div>
        </div>
      {/if}
      
      <!-- Funding Sources Tab -->
      {#if activeTab === 'funding'}
        <div class="space-y-6">
          <div>
            <h3 class="text-lg font-medium text-gray-900 mb-3">Funding Distribution</h3>
            <p class="text-sm text-gray-500 mb-4">Specify how the project hours are distributed across funding sources</p>
            
            <div class="mb-6">
              <div class="flex justify-between items-center mb-4">
                <h4 class="text-md font-medium">Total Project Hours: {totalFundingAmount ? totalFundingAmount.toFixed(2) : '0.00'} hours</h4>
                <div>
                  <button
                    type="button"
                    class="px-3 py-1.5 text-sm bg-primary-600 text-white rounded hover:bg-primary-700"
                    on:click={addFundingSource}
                  >
                    Add Funding Source
                  </button>
                  <button
                    type="button"
                    class="ml-2 px-3 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700"
                    on:click={openCreateFundingSourceModal}
                  >
                    Create New Source
                  </button>
                  <!-- <button
                    type="button"
                    class="ml-2 px-3 py-1.5 text-sm bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
                    on:click={distributeEvenFunding}
                    disabled={projectFunding.length === 0 || totalFundingAmount <= 0}
                  >
                    Distribute Evenly
                  </button> -->
                </div>
              </div>
              
              <!-- Status Bar -->
              <div class="mb-4">
                <div class="flex justify-between text-sm mb-1">
                  <span>Total: {totalFundingAmount ? totalFundingAmount.toFixed(2) : '0.00'} hours ({totalFundingPercentage ? totalFundingPercentage.toFixed(2) : '0.00'}%)</span>
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
                <div class="border border-gray-200 rounded-md overflow-hidden overflow-x-auto">
                  <table class="min-w-full divide-y divide-gray-200">
                    <thead class="bg-gray-50">
                      <tr>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Source</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount (Hours)</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Percentage (%)</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody class="bg-white divide-y divide-gray-200">
                      {#each projectFunding as funding, index (index)}
                        <tr>
                          <td class="px-6 py-4 whitespace-nowrap">
                            <select
                              class="w-full px-3 py-1.5 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                              bind:value={funding.funding_source_id}
                            >
                              {#each fundingSources as source}
                                <option value={source.id}>{source.name}</option>
                              {/each}
                            </select>
                          </td>
                          <td class="px-6 py-4 whitespace-nowrap">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              class="w-full px-3 py-1.5 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                              value={funding.amount ? funding.amount.toFixed(2) : '0.00'}
                              on:input={(e) => handleAmountChange(index, e)}
                            />
                          </td>
                          <td class="px-6 py-4 whitespace-nowrap">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="0.1"
                              class="w-full px-3 py-1.5 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                              value={funding.percentage ? funding.percentage.toFixed(2) : '0.00'}
                              on:input={(e) => handlePercentageChange(index, e)}
                            />
                          </td>
                          <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button
                              type="button"
                              class="text-red-600 hover:text-red-900"
                              on:click={() => removeFundingSource(index)}
                            >
                              Remove
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
        </div>
      {/if}
      
      <!-- Deadlines & Constraints Tab -->
      {#if activeTab === 'deadlines'}
        <div class="space-y-6">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label for="startDate" class="block text-sm font-medium text-gray-700 mb-1">Project Start Date</label>
              <input 
                type="date" 
                id="startDate" 
                bind:value={startDate}
                class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              />
              <p class="mt-1 text-xs text-gray-500">
                This is the default start date for all assigned employees unless individually specified.
              </p>
            </div>
            
            <div>
              <label for="endDate" class="block text-sm font-medium text-gray-700 mb-1">Project End Date</label>
              <input 
                type="date" 
                id="endDate" 
                bind:value={endDate}
                class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              />
              <p class="mt-1 text-xs text-gray-500">
                This is the default end date for all assigned employees unless individually specified.
              </p>
            </div>
          </div>
          
          <!-- <div>
            <label for="minWorkload" class="block text-sm font-medium text-gray-700 mb-1">Minimum Workload (%)</label>
            <input 
              type="number" 
              id="minWorkload" 
              bind:value={minWorkload}
              min="0"
              max="100"
              class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              placeholder="Enter minimum required workload"
            />
            <p class="mt-1 text-sm text-gray-500">The minimum percentage of work that must be allocated to this project.</p>
          </div> -->
        </div>
      {/if}
      
      <!-- Form Navigation/Submission -->
      <div class="pt-6 mt-6 border-t border-gray-200 flex justify-between">
        <div>
          {#if activeTab === 'basic'}
            <a href="/projects" class="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
              Cancel
            </a>
          {:else if activeTab === 'funding'}
            <button 
              type="button"
              class="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              on:click={() => activeTab = 'basic'}
            >
              Back
            </button>
          {:else if activeTab === 'employees'}
            <button 
              type="button"
              class="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              on:click={() => activeTab = 'funding'}
            >
              Back
            </button>
          {:else if activeTab === 'deadlines'}
            <button 
              type="button"
              class="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              on:click={() => activeTab = 'employees'}
            >
              Back
            </button>
          {/if}
        </div>
        
        <div>
          {#if activeTab === 'basic'}
            <button 
              type="button"
              class="px-4 py-2 bg-primary-600 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-primary-700"
              on:click={() => activeTab = 'funding'}
            >
              Next: Assign Funding Sources
            </button>
          {:else if activeTab === 'funding'}
            <button 
              type="button"
              class="px-4 py-2 bg-primary-600 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-primary-700"
              on:click={() => activeTab = 'employees'}
            >
              Next: Assign Employees
            </button>
          {:else if activeTab === 'employees'}
            <button 
              type="button"
              class="px-4 py-2 bg-primary-600 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-primary-700"
              on:click={() => activeTab = 'deadlines'}
            >
              Next: Set Deadlines
            </button>
          {:else if activeTab === 'deadlines'}
            <button 
              type="submit"
              class="px-4 py-2 bg-primary-600 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              disabled={creating}
            >
              {creating ? 'Creating...' : 'Create Project'}
            </button>
          {/if}
        </div>
      </div>
    </form>
  </div>
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