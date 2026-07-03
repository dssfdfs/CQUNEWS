import { create } from 'zustand';

interface ToastState {
  message: string;
  type: 'success' | 'error' | 'info' | null;
  show: boolean;

  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
  hide: () => void;
}

export const useToastStore = create<ToastState>((set) => ({
  message: '',
  type: null,
  show: false,

  success: (message: string) => {
    set({ message, type: 'success', show: true });
    setTimeout(() => set({ show: false }), 3000);
  },

  error: (message: string) => {
    set({ message, type: 'error', show: true });
    setTimeout(() => set({ show: false }), 3000);
  },

  info: (message: string) => {
    set({ message, type: 'info', show: true });
    setTimeout(() => set({ show: false }), 3000);
  },

  hide: () => set({ show: false }),
}));