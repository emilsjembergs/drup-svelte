import { writable, derived, get } from 'svelte/store';
import { browser } from '$app/environment';
import { goto } from '$app/navigation';

// Types
export interface User {
  id: number;
  username: string;
  full_name: string;
  email: string;
  role: string;
  language?: string;
}

// Create stores
export const isAuthenticated = writable<boolean>(false);
export const currentUser = writable<User | null>(null);
export const userLanguage = writable<string>('en'); // Default language is English

// Available languages
export const availableLanguages = [
  { code: 'en', name: 'English' },
  { code: 'lv', name: 'Latvian' }
];

// API URL
const API_URL = 'http://localhost:3000/api';

// Auth functions
export async function login(username: string, password: string) {
  try {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, password })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Login failed');
    }

    const data = await response.json();
    console.log('Login response data:', { 
      username: data.user.username, 
      role: data.user.role 
    });
    
    if (browser) {
      // Set token in localStorage
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      
      // Set language preference
      if (data.user.language) {
        localStorage.setItem('language', data.user.language);
        userLanguage.set(data.user.language);
      } else {
        // Use default language if not set
        localStorage.setItem('language', 'en');
        userLanguage.set('en');
      }
      
      // Update stores
      isAuthenticated.set(true);
      currentUser.set(data.user);
      console.log('Updated currentUser store with role:', data.user.role);
    }
    
    return data;
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
}

export async function register(userData: { 
  username: string, 
  password: string, 
  full_name: string, 
  email: string,
  role?: string 
}) {
  try {
    console.log('Registration called with role:', userData.role);
    
    const response = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(userData)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Registration failed');
    }

    return await response.json();
  } catch (error) {
    console.error('Registration error:', error);
    throw error;
  }
}

export function logout() {
  if (browser) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('language');
    isAuthenticated.set(false);
    currentUser.set(null);
    userLanguage.set('en');
    goto('/login');
  }
}

// Helper function to get authentication headers
export function getAuthHeaders(): HeadersInit {
  if (!browser) return { 'Content-Type': 'application/json' };
  
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token || ''}`
  };
}

// Update user settings
export async function updateUserSettings(settings: Partial<User>) {
  if (!browser || !get(isAuthenticated)) {
    throw new Error('Not authenticated');
  }
  
  try {
    const user = get(currentUser);
    if (!user) {
      throw new Error('No current user');
    }
    
    const response = await fetch(`${API_URL}/users/${user.id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(settings)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to update settings');
    }
    
    const updatedUser = await response.json();
    
    // Update language setting if changed
    if (settings.language && settings.language !== user.language) {
      localStorage.setItem('language', settings.language);
      userLanguage.set(settings.language);
    }
    
    // Update localStorage and store
    localStorage.setItem('user', JSON.stringify(updatedUser));
    currentUser.set(updatedUser);
    
    return updatedUser;
  } catch (error) {
    console.error('Settings update error:', error);
    throw error;
  }
}

// Update user language preference
export function setLanguage(languageCode: string) {
  if (browser) {
    userLanguage.set(languageCode);
    localStorage.setItem('language', languageCode);
    
    // Also update the user in the database if authenticated
    if (get(isAuthenticated) && get(currentUser)) {
      updateUserSettings({ language: languageCode })
        .catch(error => console.error('Failed to save language preference:', error));
    }
  }
}

// Initialize auth state from localStorage
export function initAuth() {
  if (!browser) return false;
  
  try {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    const language = localStorage.getItem('language') || 'en';
    
    console.log('Auth init - token exists:', !!token);
    
    // Set language regardless of authentication
    userLanguage.set(language);
    
    if (token && user) {
      try {
        const userData = JSON.parse(user);
        console.log('Auth init - parsed user data:', !!userData);
        
        isAuthenticated.set(true);
        currentUser.set(userData);
        return true;
      } catch (e) {
        console.error('Failed to parse user data', e);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    } else {
      console.log('Auth init - no token or user in localStorage');
    }
    
    return false;
  } catch (err) {
    console.error('Error in initAuth:', err);
    return false;
  }
} 