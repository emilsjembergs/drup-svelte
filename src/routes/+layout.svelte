<script lang="ts">
  import '../app.css';
  import { onMount, afterUpdate } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { isAuthenticated, currentUser, initAuth, logout as authLogout } from '$lib/stores/auth';
  import { browser } from '$app/environment';

  // Responsive state
  let collapsed = false;
  let showProfileModal = false;
  let profileForm: any;
  let userData = {
    full_name: '',
    email: '',
    role: ''
  };
  
  // Form values
  let fullName = '';
  let email = '';
  let role = '';
  
  // Error handling
  let hasError = false;
  let errorMessage = '';
  
  // Form IDs for accessibility
  const fullNameId = 'profile-fullname';
  const emailId = 'profile-email';
  const roleId = 'profile-role';

  // Initialize auth state on mount
  onMount(() => {
    try {
      if (browser) {
        const authInitialized = initAuth();
        console.log('Auth initialized:', authInitialized);
        
        // Redirect if not authenticated and not on login/register page
        if (!authInitialized && 
            $page.url.pathname !== '/login' && 
            $page.url.pathname !== '/register') {
          console.log('Redirecting to login page');
          goto('/login');
        }

        // Initialize profile data if user is authenticated
        if ($currentUser) {
          console.log('Current user available:', $currentUser?.username);
          userData = {
            full_name: $currentUser.full_name || '',
            email: $currentUser.email || '',
            role: $currentUser.role || ''
          };
          
          fullName = userData.full_name;
          email = userData.email;
          role = userData.role;
        } else {
          console.log('No current user available');
        }
      }
    } catch (err) {
      console.error('Error in layout onMount:', err);
      hasError = true;
      errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
    }
  });

  // Handle logout
  function logout() {
    if (confirm('Are you sure you want to log out? You will be redirected to the login page.')) {
      authLogout();
    }
  }

  // Handle profile view/edit
  function showProfile() {
    if ($currentUser) {
      userData = {
        full_name: $currentUser.full_name || '',
        email: $currentUser.email || '',
        role: $currentUser.role || ''
      };
      
      fullName = userData.full_name;
      email = userData.email;
      role = formatRole(userData.role); // Format the role for display
      
      console.log('Showing profile with role:', userData.role, 'formatted as:', role);
      
      showProfileModal = true;
    }
  }

  function saveProfile() {
    // Basic validation
    if (!fullName) {
      alert('Full name is required');
      return;
    }
    
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      alert('Valid email is required');
      return;
    }
    
    // In a real app, you would send this to your API
    alert('Profile updated successfully!');
    showProfileModal = false;
  }

  // Helper function to format role for display
  function formatRole(role: string): string {
    const roleMap: {[key: string]: string} = {
      'project_manager': 'Project Manager',
      'admin': 'Administrator',
      'user': 'User',
      'hr': 'HR',
      'accountant': 'Accountant',
      'department_head': 'Department Head',
      'vsrc': 'VSRC',
      'employee': 'Employee'
    };
    
    return roleMap[role] || role;
  }
  
  // Navigation handlers
  function navigateTo(path: string): void {
    try {
      goto(path);
    } catch (err) {
      console.error('Navigation error:', err);
    }
  }
  
  // Handle sidebar collapse
  function handleCollapse(): void {
    collapsed = !collapsed;
  }
  
  // Toggle profile dropdown
  let showDropdown = false;
  function toggleDropdown() {
    showDropdown = !showDropdown;
  }
  
  // Handle clicks outside dropdown
  function handleClickOutside(event: MouseEvent) {
    const dropdown = document.getElementById('profile-dropdown');
    if (dropdown && !dropdown.contains(event.target as Node)) {
      showDropdown = false;
    }
  }
  
  // Add event listener on mount to handle outside clicks
  onMount(() => {
    if (browser) {
      document.addEventListener('click', handleClickOutside);
      return () => {
        document.removeEventListener('click', handleClickOutside);
      };
    }
  });
</script>

{#if hasError}
  <div class="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
    <div class="bg-white shadow rounded-lg p-6 max-w-lg w-full">
      <h1 class="text-2xl font-bold text-red-600 mb-4">Error Loading Application</h1>
      <p class="mb-4">{errorMessage || "There was a problem loading the application. Please try again."}</p>
      <button 
        class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        on:click={() => window.location.reload()}
      >
        Reload Page
      </button>
    </div>
  </div>
{:else if !$isAuthenticated && ($page.url.pathname === '/login' || $page.url.pathname === '/register')}
  <div class="min-h-screen flex flex-col">
    <slot />
  </div>
{:else if $isAuthenticated}
  <div class="min-h-screen flex">
    <!-- Sidebar -->
    <aside class="bg-secondary-800 text-white {collapsed ? 'w-20' : 'w-64'} transition-all duration-300 flex flex-col">
      <!-- Logo -->
      <div class="p-4 flex justify-center items-center h-16 border-b border-secondary-700">
        <h2 class="text-xl font-bold tracking-wider text-white {collapsed ? 'hidden' : ''}">DRUP</h2>
        {#if collapsed}
          <span class="text-xl font-bold">D</span>
        {/if}
      </div>
      
      <!-- Navigation Menu -->
      <nav class="mt-4">
        <ul>
          <li class="mb-1">
            <button
              class="flex items-center w-full px-4 py-2 text-left hover:bg-secondary-700 {$page.url.pathname === '/' ? 'bg-secondary-700' : ''}"
              on:click={() => navigateTo('/')}
              on:keydown={(e) => e.key === 'Enter' && navigateTo('/')}
            >
              <span class="mr-2">📊</span>
              <span class={collapsed ? 'hidden' : ''}>Dashboard</span>
            </button>
          </li>
          
          {#if $currentUser && $currentUser.role !== 'employee'}
          <!-- Only show for managers -->
          <li class="mb-1">
            <button
              class="flex items-center w-full px-4 py-2 text-left hover:bg-secondary-700 {$page.url.pathname === '/departments' ? 'bg-secondary-700' : ''}"
              on:click={() => navigateTo('/departments')}
              on:keydown={(e) => e.key === 'Enter' && navigateTo('/departments')}
            >
              <span class="mr-2">🏢</span>
              <span class={collapsed ? 'hidden' : ''}>Departamenti</span>
            </button>
          </li>

          <li class="mb-1">
            <button
              class="flex items-center w-full px-4 py-2 text-left hover:bg-secondary-700 {$page.url.pathname === '/users' ? 'bg-secondary-700' : ''}"
              on:click={() => navigateTo('/users')}
              on:keydown={(e) => e.key === 'Enter' && navigateTo('/users')}
            >
              <span class="mr-2">👥</span>
              <span class={collapsed ? 'hidden' : ''}>Darbinieki</span>
            </button>
          </li>
          
          <!-- <li class="mb-1">
            <button
              class="flex items-center w-full px-4 py-2 text-left hover:bg-secondary-700 {$page.url.pathname === '/funding-sources' ? 'bg-secondary-700' : ''}"
              on:click={() => navigateTo('/funding-sources')}
              on:keydown={(e) => e.key === 'Enter' && navigateTo('/funding-sources')}
            >
              <span class="mr-2">💰</span>
              <span class={collapsed ? 'hidden' : ''}>Finansējuma Avoti</span>
            </button>
          </li> -->
          {/if}
            
          <li class="mb-1">
            <button
              class="flex items-center w-full px-4 py-2 text-left hover:bg-secondary-700 {$page.url.pathname === '/projects' ? 'bg-secondary-700' : ''}"
              on:click={() => navigateTo('/projects')}
              on:keydown={(e) => e.key === 'Enter' && navigateTo('/projects')}
            >
              <span class="mr-2">📁</span>
              <span class={collapsed ? 'hidden' : ''}>Projekti</span>
            </button>
          </li>
          
          <li class="mb-1">
            <button
              class="flex items-center w-full px-4 py-2 text-left hover:bg-secondary-700 {$page.url.pathname.startsWith('/time-tracking') ? 'bg-secondary-700' : ''}"
              on:click={() => navigateTo('/time-tracking')}
              on:keydown={(e) => e.key === 'Enter' && navigateTo('/time-tracking')}
            >
              <span class="mr-2">⏱️</span>
              <span class={collapsed ? 'hidden' : ''}>Darba Laika Uzskaite</span>
            </button>
          </li>
          {#if $currentUser && $currentUser.role !== 'employee'}
            <li class="mb-1">
              <button
                class="flex items-center w-full px-4 py-2 text-left hover:bg-secondary-700 {$page.url.pathname.startsWith('/exports') ? 'bg-secondary-700' : ''}"
                on:click={() => navigateTo('/exports')}
                on:keydown={(e) => e.key === 'Enter' && navigateTo('/exports')}
              >
                <span class="mr-2">📊</span>
                <span class={collapsed ? 'hidden' : ''}>Eksports</span>
              </button>
            </li>
          {/if}
        </ul>
      </nav>
      
      <!-- Collapse Button -->
      <button 
        class="mt-auto mb-4 mx-auto text-white"
        on:click={handleCollapse}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {#if collapsed}
          <span class="text-xl">⟩</span>
        {:else}
          <span class="text-xl">⟨</span>
        {/if}
      </button>
    </aside>
    
    <!-- Main Content -->
    <div class="flex-1 flex flex-col">
      <!-- Header -->
      <header class="bg-secondary-800 text-white p-4 flex justify-between items-center shadow-sm">
        <div class="flex items-center">
          <button 
            type="button"
            on:click={handleCollapse}
            class="text-white md:hidden mr-2 px-2 py-1"
          >
            {#if collapsed}
              <span class="text-xl">⟩</span>
            {:else}
              <span class="text-xl">⟨</span>
            {/if}
          </button>
          
          {#if $currentUser && $currentUser.role === 'employee'}
            <div class="ml-2 px-3 py-1 bg-blue-600 rounded-md text-sm font-medium">
              Darbinieks Mode
            </div>
          {/if}
        </div>
        
        {#if $currentUser}
          <div></div>
          <div class="relative" id="profile-dropdown">
            <button
              class="flex items-center cursor-pointer p-2 hover:bg-secondary-700 rounded-md"
              on:click={toggleDropdown}
            >
              <div 
                class="w-10 h-10 rounded-full flex items-center justify-center text-white bg-primary-600"
              >
                {#if !$currentUser.full_name}
                  👤
                {:else}
                  {$currentUser.full_name[0].toUpperCase()}
                {/if}
              </div>
              
              <div class="ml-2 hidden md:block">
                <p class="text-sm font-medium text-white m-0 leading-tight">
                  {$currentUser.full_name || 'User'}
                </p>
                <p class="text-xs text-gray-300 m-0 leading-tight">
                  {formatRole($currentUser.role)}
                </p>
              </div>
            </button>
            
            {#if showDropdown}
              <div 
                class="absolute right-0 top-full mt-1 w-48 bg-white rounded-md shadow-lg z-10"
              >
                <div class="py-1">
                  <button
                    class="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" 
                    on:click={showProfile}
                  >
                    Profile
                  </button>
                  <a 
                    href="/settings"
                    class="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Settings
                  </a>
                  <div class="border-t border-gray-200"></div>
                  <button
                    class="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    on:click={logout}
                  >
                    Logout
                  </button>
                </div>
              </div>
            {/if}
          </div>
        {/if}
      </header>

      <!-- Content -->
      <main class="p-4 md:p-6 overflow-auto flex-1 bg-gray-50">
        <div class="site-layout-content bg-white rounded-lg shadow p-6 min-h-[280px]">
          <slot />
        </div>
      </main>

      <!-- Footer -->
      <footer class="text-center p-4 bg-white border-t">
        DRUP Project Management System ©{new Date().getFullYear()}
      </footer>
    </div>
  </div>

  {#if showProfileModal}
    <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div class="px-6 py-4 border-b">
          <h3 class="text-lg font-medium">User Profile</h3>
        </div>
        
        <div class="p-6">
          <div class="space-y-4">
            <div>
              <label for={fullNameId} class="block mb-1 font-medium">Full Name *</label>
              <input 
                id={fullNameId}
                type="text"
                class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                placeholder="Full Name" 
                bind:value={fullName}
                required
              />
            </div>
            
            <div>
              <label for={emailId} class="block mb-1 font-medium">Email *</label>
              <input 
                id={emailId}
                type="email"
                class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                placeholder="Email" 
                bind:value={email}
                required
              />
            </div>
    
            <div>
              <label for={roleId} class="block mb-1 font-medium">Role</label>
              <input 
                id={roleId}
                type="text"
                class="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 cursor-not-allowed"
                value={role}
                disabled
              />
            </div>
          </div>
        </div>
        
        <div class="px-6 py-4 border-t flex justify-end space-x-3">
          <button 
            type="button"
            class="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            on:click={() => showProfileModal = false}
          >
            Cancel
          </button>
          <button 
            type="button"
            class="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700"
            on:click={saveProfile}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  {/if}
{:else}
  <div class="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
    <div class="bg-white shadow rounded-lg p-6 max-w-lg w-full text-center">
      <h1 class="text-2xl font-bold mb-4">Please log in</h1>
      <p class="mb-4">You need to be logged in to access this page.</p>
      <a href="/login" class="inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
        Go to Login
      </a>
    </div>
  </div>
{/if} 