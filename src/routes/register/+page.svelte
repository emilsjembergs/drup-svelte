<script lang="ts">
  import { register, login, isAuthenticated } from '$lib/stores/auth';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  
  let username = '';
  let password = '';
  let confirmPassword = '';
  let fullName = '';
  let email = '';
  let error = '';
  let loading = false;
  let role = 'employee'; // Default to employee role
  
  // Redirect if already authenticated
  onMount(() => {
    if (browser && $isAuthenticated) {
      goto('/');
    }
  });
  
  async function handleRegister() {
    error = '';
    loading = true;
    
    if (password !== confirmPassword) {
      error = 'Passwords do not match';
      loading = false;
      return;
    }
    
    try {
      await register({
        username,
        password,
        full_name: fullName,
        email,
        role // Include the selected role
      });
      
      // Auto login after successful registration
      await login(username, password);
      // Use setTimeout to ensure store updates are processed before navigation
      setTimeout(() => goto('/'), 10);
    } catch (err) {
      error = err instanceof Error ? err.message : 'Registration failed';
    } finally {
      loading = false;
    }
  }
</script>

<div class="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
  <div class="max-w-md w-full space-y-8">
    <div>
      <h1 class="mt-6 text-center text-3xl font-extrabold text-secondary-900">
        Create an account
      </h1>
      <p class="mt-2 text-center text-sm text-secondary-500">
        Join DRUP to manage your projects
      </p>
    </div>
    
    {#if error}
      <div class="rounded-md bg-red-50 p-4">
        <div class="flex">
          <div class="flex-shrink-0">
            <svg class="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
            </svg>
          </div>
          <div class="ml-3">
            <h3 class="text-sm font-medium text-red-800">
              {error}
            </h3>
          </div>
        </div>
      </div>
    {/if}
    
    <form class="mt-8 space-y-6" on:submit|preventDefault={handleRegister}>
      <div class="rounded-md shadow-sm space-y-4">
        <div>
          <label for="username" class="block text-sm font-medium text-secondary-700">Username</label>
          <input 
            id="username" 
            name="username" 
            type="text" 
            required 
            bind:value={username}
            class="mt-1 appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm" 
            autocomplete="username"
          />
        </div>
        
        <div>
          <label for="fullName" class="block text-sm font-medium text-secondary-700">Full Name</label>
          <input 
            id="fullName" 
            name="fullName" 
            type="text" 
            required 
            bind:value={fullName}
            class="mt-1 appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm" 
          />
        </div>
        
        <div>
          <label for="email" class="block text-sm font-medium text-secondary-700">Email</label>
          <input 
            id="email" 
            name="email" 
            type="email" 
            required 
            bind:value={email}
            class="mt-1 appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm" 
            autocomplete="email"
          />
        </div>
        
        <div>
          <label class="block text-sm font-medium text-secondary-700 mb-2">Role</label>
          <div class="flex space-x-6">
            <div class="flex items-center">
              <input 
                id="role-employee" 
                name="role" 
                type="radio" 
                value="employee"
                bind:group={role}
                class="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300"
              />
              <label for="role-employee" class="ml-2 block text-sm text-gray-700">
                Darbinieks
              </label>
            </div>
            <div class="flex items-center">
              <input 
                id="role-project-manager" 
                name="role" 
                type="radio" 
                value="project_manager"
                bind:group={role}
                class="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300"
              />
              <label for="role-project-manager" class="ml-2 block text-sm text-gray-700">
                Projekta Vadītājs
              </label>
            </div>
          </div>
        </div>
        
        <div>
          <label for="password" class="block text-sm font-medium text-secondary-700">Password</label>
          <input 
            id="password" 
            name="password" 
            type="password" 
            required 
            bind:value={password}
            class="mt-1 appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm" 
            autocomplete="new-password"
          />
        </div>
        
        <div>
          <label for="confirmPassword" class="block text-sm font-medium text-secondary-700">Confirm Password</label>
          <input 
            id="confirmPassword" 
            name="confirmPassword" 
            type="password" 
            required 
            bind:value={confirmPassword}
            class="mt-1 appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm" 
            autocomplete="new-password"
          />
        </div>
      </div>

      <div>
        <button 
          type="submit" 
          disabled={loading}
          class="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {#if loading}
            <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Creating account...
          {:else}
            Register
          {/if}
        </button>
      </div>
      
      <div class="text-sm text-center">
        <span class="text-secondary-500">Already have an account?</span>
        <a href="/login" class="font-medium text-primary-600 hover:text-primary-500">
          Sign in
        </a>
      </div>
    </form>
  </div>
</div> 