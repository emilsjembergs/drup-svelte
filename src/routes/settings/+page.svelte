<script lang="ts">
  import { onMount } from 'svelte';
  import { currentUser, availableLanguages, userLanguage, setLanguage, updateUserSettings } from '$lib/stores/auth';
  
  // Form state
  let loading = false;
  let success = '';
  let error = '';
  
  // Form values
  let fullName = '';
  let email = '';
  let role = '';
  let selectedLanguage = '';
  
  // Helper function to format role for display
  function formatRole(roleValue: string): string {
    const roleMap: {[key: string]: string} = {
      'project_manager': 'Projekta Vadītājs',
      'admin': 'Administrators',
      'user': 'Lietotājs',
      'hr': 'HR',
      'accountant': 'Grāmatvedis',
      'department_head': 'Nodaļas Vadītājs',
      'vsrc': 'VSRC',
      'employee': 'Darbinieks'
    };
    
    return roleMap[roleValue] || roleValue;
  }
  
  // Initialize form values from user data
  onMount(() => {
    if ($currentUser) {
      fullName = $currentUser.full_name || '';
      email = $currentUser.email || '';
      role = $currentUser.role || '';
      console.log('Settings page loaded with role:', role);
    }
    selectedLanguage = $userLanguage;
  });
  
  // Update profile information
  async function updateProfile() {
    loading = true;
    success = '';
    error = '';
    
    try {
      // Basic validation
      if (!fullName) {
        throw new Error('Full name is required');
      }
      
      if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
        throw new Error('Valid email is required');
      }
      
      // Update user profile
      await updateUserSettings({
        full_name: fullName,
        email: email
      });
      
      success = 'Profile updated successfully';
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to update profile';
      console.error('Error updating profile:', err);
    } finally {
      loading = false;
    }
  }
  
  // Handle language change
  function handleLanguageChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    const newLanguage = target.value;
    
    if (newLanguage && newLanguage !== $userLanguage) {
      setLanguage(newLanguage);
      success = 'Language preference saved';
    }
  }
</script>

<div class="max-w-4xl mx-auto">
  <div class="mb-6">
    <h1 class="text-2xl font-bold text-gray-900">Settings</h1>
    <p class="text-gray-600">Manage your account preferences</p>
  </div>
  
  {#if success}
    <div class="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded mb-6">
      {success}
    </div>
  {/if}
  
  {#if error}
    <div class="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded mb-6">
      {error}
    </div>
  {/if}
  
  <!-- Settings Sections -->
  <div class="bg-white shadow rounded-lg overflow-hidden mb-6">
    <div class="border-b border-gray-200">
      <div class="px-6 py-4">
        <h2 class="text-lg font-medium text-gray-900">Language Settings</h2>
        <p class="text-sm text-gray-500 mt-1">Choose your preferred language for the application</p>
      </div>
    </div>
    
    <div class="px-6 py-4">
      <div class="max-w-sm">
        <label for="language" class="block text-sm font-medium text-gray-700 mb-1">Display Language</label>
        <select 
          id="language" 
          bind:value={selectedLanguage}
          on:change={handleLanguageChange}
          class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
        >
          {#each availableLanguages as language}
            <option value={language.code}>
              {language.name} {language.code === $userLanguage ? '(Current)' : ''}
            </option>
          {/each}
        </select>
        <p class="mt-1 text-xs text-gray-500">
          This setting will be saved to your profile and applied whenever you log in.
        </p>
      </div>
    </div>
  </div>
  
  <!-- Profile Settings -->
  <div class="bg-white shadow rounded-lg overflow-hidden">
    <div class="border-b border-gray-200">
      <div class="px-6 py-4">
        <h2 class="text-lg font-medium text-gray-900">Profile Information</h2>
        <p class="text-sm text-gray-500 mt-1">Update your account information</p>
      </div>
    </div>
    
    <div class="px-6 py-4">
      <form on:submit|preventDefault={updateProfile}>
        <div class="space-y-4">
          <div>
            <label for="fullName" class="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <input 
              type="text"
              id="fullName"
              bind:value={fullName}
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          
          <div>
            <label for="email" class="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
            <input 
              type="email"
              id="email"
              bind:value={email}
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          
          <div>
            <label for="role" class="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <input 
              type="text"
              id="role"
              value={formatRole(role)}
              disabled
              class="w-full px-3 py-2 border border-gray-300 bg-gray-100 rounded-md shadow-sm cursor-not-allowed"
            />
          </div>
        </div>
        
        <div class="mt-6">
          <button 
            type="submit"
            class="px-4 py-2 bg-primary-600 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Save Profile Information'}
          </button>
        </div>
      </form>
    </div>
  </div>
</div> 