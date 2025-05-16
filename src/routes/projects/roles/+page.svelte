<script lang="ts">
  import { onMount } from 'svelte';
  import { getAuthHeaders, isAuthenticated, currentUser } from '$lib/stores/auth';
  import { goto } from '$app/navigation';
  
  interface User {
    id: number;
    username: string;
    full_name?: string;
    email: string;
    role: string;
    project_role?: string;
    workload?: number;
  }
  
  interface Project {
    id: number;
    name: string;
    users: User[];
  }
  
  let projects: Project[] = [];
  let loading = true;
  let saving = false;
  let error: string | null = null;
  let successMessage: string | null = null;
  let selectedProject: number | null = null;
  let projectUsers: User[] = [];
  
  // Available project roles
  const projectRoles = [
    { value: 'project_manager', label: 'Project Manager' },
    { value: 'hr', label: 'HR' },
    { value: 'accounting', label: 'Accounting' },
    { value: 'department_head', label: 'Department Head' },
    { value: 'vsrc', label: 'VSRC' },
    { value: 'employee', label: 'Employee' }
  ];
  
  onMount(async () => {
    if (!$isAuthenticated) {
      goto('/login');
      return;
    }
    
    // Redirect if not admin or project manager
    if (!$currentUser || !['admin', 'project_manager'].includes($currentUser.role)) {
      goto('/projects');
      return;
    }
    
    try {
      await loadProjects();
    } catch (err) {
      console.error('Error loading projects:', err);
      error = err instanceof Error ? err.message : 'Failed to load projects';
    } finally {
      loading = false;
    }
  });
  
  async function loadProjects() {
    const response = await fetch('http://localhost:3000/api/projects', {
      headers: getAuthHeaders()
    });
    
    if (!response.ok) {
      throw new Error('Failed to load projects');
    }
    
    projects = await response.json();
  }
  
  async function loadProjectUsers(projectId: number) {
    if (!projectId) return;
    
    selectedProject = projectId;
    loading = true;
    
    try {
      const response = await fetch(`http://localhost:3000/api/projects/${projectId}`, {
        headers: getAuthHeaders()
      });
      
      if (!response.ok) {
        throw new Error('Failed to load project users');
      }
      
      const projectData = await response.json();
      projectUsers = projectData.users || [];
    } catch (err) {
      console.error('Error loading project users:', err);
      error = err instanceof Error ? err.message : 'Failed to load project users';
      projectUsers = [];
    } finally {
      loading = false;
    }
  }
  
  function handleProjectChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    const projectId = parseInt(target.value, 10);
    
    if (projectId) {
      loadProjectUsers(projectId);
    } else {
      selectedProject = null;
      projectUsers = [];
    }
  }
  
  function handleRoleChange(userId: number, event: Event) {
    const target = event.target as HTMLSelectElement;
    const newRole = target.value;
    
    // Update user role in the array
    projectUsers = projectUsers.map(user => {
      if (user.id === userId) {
        return { ...user, project_role: newRole };
      }
      return user;
    });
  }
  
  async function saveChanges() {
    if (!selectedProject) return;
    
    saving = true;
    error = null;
    successMessage = null;
    
    try {
      // Prepare data for the API
      const userData = projectUsers.map(user => ({
        user_id: user.id,
        role: user.project_role || 'employee',
        workload: user.workload || 100
      }));
      
      // Use a more specific endpoint for updating just the user roles
      // Instead of using the main project update endpoint which requires all project data
      const response = await fetch(`http://localhost:3000/api/projects/${selectedProject}/users`, {
        method: 'PUT',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(userData)
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to update project roles');
      }
      
      successMessage = 'Project roles updated successfully';
      
      // Reload project users
      await loadProjectUsers(selectedProject);
    } catch (err) {
      console.error('Error updating project roles:', err);
      error = err instanceof Error ? err.message : 'Failed to update project roles';
    } finally {
      saving = false;
    }
  }
</script>

<svelte:head>
  <title>Project Role Management</title>
</svelte:head>

<div class="container mx-auto px-4 py-8">
  <div class="mb-6">
    <h1 class="text-2xl font-bold text-gray-800">Project Role Management</h1>
    <p class="text-gray-600">Manage user roles across all projects</p>
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
  
  <div class="bg-white shadow rounded-lg overflow-hidden mb-6">
    <div class="p-6">
      <div class="mb-6">
        <label for="project-select" class="block text-sm font-medium text-gray-700 mb-2">Select Project</label>
        <select
          id="project-select"
          on:change={handleProjectChange}
          class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
        >
          <option value="">Select a project</option>
          {#each projects as project}
            <option value={project.id}>{project.name}</option>
          {/each}
        </select>
      </div>
      
      {#if loading}
        <div class="flex justify-center items-center py-12">
          <div class="w-12 h-12 border-4 border-primary-400 border-t-primary-600 rounded-full animate-spin"></div>
        </div>
      {:else if selectedProject && projectUsers.length > 0}
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">System Role</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Project Role</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              {#each projectUsers as user}
                <tr>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm font-medium text-gray-900">{user.full_name || user.username}</div>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm text-gray-500">{user.email}</div>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm text-gray-500">{user.role}</div>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <select
                      on:change={(e) => handleRoleChange(user.id, e)}
                      bind:value={user.project_role}
                      class="px-3 py-1.5 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    >
                      {#each projectRoles as role}
                        <option value={role.value}>{role.label}</option>
                      {/each}
                    </select>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
        
        <div class="mt-6 flex justify-end">
          <button
            on:click={saveChanges}
            disabled={saving}
            class="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {#if saving}
              <span class="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></span>
            {/if}
            Save Changes
          </button>
        </div>
      {:else if selectedProject}
        <div class="bg-yellow-50 border-l-4 border-yellow-400 p-4">
          <p class="text-yellow-700">No users found for this project.</p>
        </div>
      {:else}
        <div class="bg-blue-50 border-l-4 border-blue-400 p-4">
          <p class="text-blue-700">Please select a project to manage user roles.</p>
        </div>
      {/if}
    </div>
  </div>
  
  <div class="mt-8">
    <h2 class="text-xl font-semibold text-gray-800 mb-4">Available Project Roles</h2>
    
    <div class="bg-white shadow rounded-lg overflow-hidden">
      <div class="p-6">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          {#each projectRoles as role}
            <div class="border border-gray-200 rounded-md p-4">
              <h3 class="font-medium text-lg">{role.label}</h3>
              <p class="text-gray-600 text-sm mt-2">
                {#if role.value === 'project_manager'}
                  Manages the project, has full access to all project features and can assign tasks.
                {:else if role.value === 'hr'}
                  Manages personnel, time tracking, and leave requests within the project.
                {:else if role.value === 'accounting'}
                  Manages project budget, expenses, and financial reports.
                {:else if role.value === 'department_head'}
                  Oversees department-specific tasks and reports to project manager.
                {:else if role.value === 'vsrc'}
                  Special role for VSRC team members with specific access rights.
                {:else if role.value === 'employee'}
                  Standard team member with basic access to tasks and time tracking.
                {/if}
              </p>
            </div>
          {/each}
        </div>
      </div>
    </div>
  </div>
</div> 