import { create } from 'zustand';
import api from '../services/api';

const useAuthStore = create((set) => ({
  user: null,
  token: localStorage.getItem('access_token') || null,
  isAuthenticated: !!localStorage.getItem('access_token'),
  isLoading: false,
  error: null,

  // Login Action
  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.post('/auth/login', { email, password });
      const { access_token, user } = response.data;
      
      localStorage.setItem('access_token', access_token);
      set({ user, token: access_token, isAuthenticated: true, isLoading: false });
      return true; // Indicate success
    } catch (error) {
      const message = error.response?.data?.detail || "Login failed. Invalid credentials.";
      set({ error: message, isLoading: false });
      return false;
    }
  },

  // Signup Action
  signup: async (userData) => {
    set({ isLoading: true, error: null });
    try {
      await api.post('/auth/signup', userData);
      set({ isLoading: false });
      return true; // Indicate success
    } catch (error) {
      const message = error.response?.data?.detail || "Signup failed. User might already exist.";
      set({ error: message, isLoading: false });
      return false;
    }
  },

  // Logout Action
  logout: () => {
    localStorage.removeItem('access_token');
    set({ user: null, token: null, isAuthenticated: false, error: null });
  },

  // Clear Errors
  clearError: () => set({ error: null }),
}));

export default useAuthStore;