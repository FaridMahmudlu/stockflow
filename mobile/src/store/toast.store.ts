import { create } from 'zustand';

export type ToastType = 'success' | 'error' | 'info';

interface ToastState {
  isVisible: boolean;
  message: string;
  type: ToastType;
  showToast: (message: string, type?: ToastType) => void;
  hideToast: () => void;
}

export const useToastStore = create<ToastState>((set) => ({
  isVisible: false,
  message: '',
  type: 'info',
  showToast: (message, type = 'info') => {
    set({ isVisible: true, message, type });
  },
  hideToast: () => set({ isVisible: false }),
}));
