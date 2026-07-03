import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

// Helper to prevent SecureStore operations from hanging indefinitely
const withTimeout = <T>(promise: Promise<T>, timeoutMs: number, fallbackValue: T): Promise<T> => {
  let timeoutId: any;
  const timeoutPromise = new Promise<T>((resolve) => {
    timeoutId = setTimeout(() => {
      console.warn(`SecureStore operation timed out after ${timeoutMs}ms`);
      resolve(fallbackValue);
    }, timeoutMs);
  });
  return Promise.race([
    promise.then((res) => {
      clearTimeout(timeoutId);
      return res;
    }),
    timeoutPromise
  ]);
};

export const setItemAsync = async (key: string, value: string): Promise<void> => {
  if (Platform.OS === 'web') {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      console.error('localStorage error', e);
    }
  } else {
    try {
      await withTimeout(SecureStore.setItemAsync(key, value), 2000, undefined);
    } catch (e) {
      console.error('SecureStore set error', e);
    }
  }
};

export const getItemAsync = async (key: string): Promise<string | null> => {
  if (Platform.OS === 'web') {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      console.error('localStorage error', e);
      return null;
    }
  } else {
    try {
      return await withTimeout(SecureStore.getItemAsync(key), 2000, null);
    } catch (e) {
      console.error('SecureStore get error', e);
      return null;
    }
  }
};

export const deleteItemAsync = async (key: string): Promise<void> => {
  if (Platform.OS === 'web') {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.error('localStorage error', e);
    }
  } else {
    try {
      await withTimeout(SecureStore.deleteItemAsync(key), 2000, undefined);
    } catch (e) {
      console.error('SecureStore delete error', e);
    }
  }
};
