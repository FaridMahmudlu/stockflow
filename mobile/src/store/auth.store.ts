import { create } from 'zustand';
import { jwtDecode } from 'jwt-decode';
import { setItemAsync, getItemAsync, deleteItemAsync } from '../utils/storage';

interface User {
  sub: string;
  email: string;
  role: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setTokens: (accessToken: string, refreshToken: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  
  setTokens: async (accessToken: string, refreshToken: string) => {
    try {
      await setItemAsync('accessToken', accessToken);
      await setItemAsync('refreshToken', refreshToken);
      
      const decodedUser = jwtDecode<User>(accessToken);
      
      set({ 
        user: decodedUser, 
        isAuthenticated: true,
        isLoading: false
      });
      // Connect socket when user logs in
      const { useNotificationStore } = require('./notification.store');
      useNotificationStore.getState().connectSocket();
    } catch (error) {
      console.error('Failed to set tokens', error);
      set({ isAuthenticated: false, isLoading: false });
    }
  },

  logout: async () => {
    await deleteItemAsync('accessToken');
    await deleteItemAsync('refreshToken');
    set({ user: null, isAuthenticated: false, isLoading: false });
    // Disconnect socket when user logs out
    const { useNotificationStore } = require('./notification.store');
    useNotificationStore.getState().disconnectSocket();
  },

  checkAuth: async () => {
    try {
      const token = await getItemAsync('accessToken');
      if (token) {
        const decodedUser = jwtDecode<User>(token);
        // We could verify expiration here, but interceptor handles it
        set({ user: decodedUser, isAuthenticated: true });
        // Connect socket on app start if already logged in
        const { useNotificationStore } = require('./notification.store');
        useNotificationStore.getState().connectSocket();
      } else {
        set({ user: null, isAuthenticated: false });
      }
    } catch (error) {
      console.error('Auth check failed', error);
      set({ user: null, isAuthenticated: false });
    } finally {
      set({ isLoading: false });
    }
  }
}));
