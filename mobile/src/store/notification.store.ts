import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';
import { api } from '../services/api';
import { getItemAsync } from '../utils/storage';
import { registerForPushNotificationsAsync } from '../services/push/registerForPushNotifications';
import { Platform } from 'react-native';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  socket: Socket | null;
  fetchNotifications: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  connectSocket: () => Promise<void>;
  disconnectSocket: () => void;
}

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  socket: null,

  fetchNotifications: async () => {
    try {
      const response = await api.get('/notifications');
      const data = response.data.data || [];
      const unread = data.filter((n: Notification) => !n.isRead).length;
      set({ notifications: data, unreadCount: unread });
    } catch (error) {
      console.error('Failed to fetch notifications', error);
    }
  },

  markAsRead: async (id: string) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      set((state) => {
        const updated = state.notifications.map((n) =>
          n.id === id ? { ...n, isRead: true } : n
        );
        const unread = updated.filter((n) => !n.isRead).length;
        return { notifications: updated, unreadCount: unread };
      });
    } catch (error) {
      console.error('Failed to mark notification as read', error);
    }
  },

  markAllAsRead: async () => {
    try {
      await api.patch('/notifications/read-all');
      set((state) => {
        const updated = state.notifications.map((n) => ({ ...n, isRead: true }));
        return { notifications: updated, unreadCount: 0 };
      });
    } catch (error) {
      console.error('Failed to mark all as read', error);
    }
  },

  connectSocket: async () => {
    const { socket } = get();
    if (socket) return; // Already connected

    const token = await getItemAsync('accessToken');
    if (!token) return;

    // Register Push Token asynchronously on successful login/app load
    registerForPushNotificationsAsync().then(async (pushToken) => {
      if (pushToken) {
        try {
          await api.post('/auth/device-token', {
            token: pushToken,
            platform: Platform.OS,
          });
          console.log('Successfully registered device push token on backend.');
        } catch (err) {
          console.error('Failed to register device push token on backend:', err);
        }
      }
    });

    const newSocket = io(API_URL, {
      extraHeaders: {
        Authorization: `Bearer ${token}`
      }
    });

    newSocket.on('connect', () => {
      console.log('Connected to notification socket');
      // Subscribe to backend room for this specific user
      const { useAuthStore } = require('./auth.store');
      const user = useAuthStore.getState().user;
      if (user && user.sub) {
        newSocket.emit('join', user.sub);
        console.log(`Joined notification room for user ${user.sub}`);
      }
    });

    newSocket.on('newNotification', (notification: Notification) => {
      set((state) => {
        const updated = [notification, ...state.notifications];
        return { 
          notifications: updated, 
          unreadCount: state.unreadCount + 1 
        };
      });
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from notification socket');
    });

    set({ socket: newSocket });
    
    // Fetch initial list when connected
    get().fetchNotifications();
  },

  disconnectSocket: () => {
    const { socket } = get();
    if (socket) {
      socket.disconnect();
      set({ socket: null, notifications: [], unreadCount: 0 });
    }
  }
}));
