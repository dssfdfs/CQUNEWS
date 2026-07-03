import { create } from 'zustand';

interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
}

interface ToastState {
  toasts: Toast[];
  addToast: (type: Toast['type'], message: string, duration?: number) => void;
  removeToast: (id: string) => void;
  success: (message: string, duration?: number) => void;
  error: (message: string, duration?: number) => void;
  warning: (message: string, duration?: number) => void;
  info: (message: string, duration?: number) => void;
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  
  addToast: (type, message, duration = 3000) => {
    const id = Date.now().toString() + Math.random().toString(36).slice(2, 9);
    set((state) => ({ toasts: [...state.toasts, { id, type, message, duration }] }));
    
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
    }, duration);
  },
  
  removeToast: (id) => {
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
  },
  
  success: (message, duration) => {
    useToastStore.getState().addToast('success', message, duration);
  },
  
  error: (message, duration) => {
    useToastStore.getState().addToast('error', message, duration);
  },
  
  warning: (message, duration) => {
    useToastStore.getState().addToast('warning', message, duration);
  },
  
  info: (message, duration) => {
    useToastStore.getState().addToast('info', message, duration);
  },
}));
