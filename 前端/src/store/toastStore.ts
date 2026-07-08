import { create } from 'zustand';

interface ToastState {
  toasts: {
    id: string;
    message: string;
    type: 'success' | 'error' | 'warning' | 'info';
  }[];
  addToast: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
  success: (message: string) => void;
  error: (message: string) => void;
  removeToast: (id: string) => void;
  clearToasts: () => void;
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  addToast: (message, type = 'info') => {
    const id = Date.now().toString();
    set((state) => ({ toasts: [...state.toasts, { id, message, type }] }));
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
    }, 3000);
  },
  success: (message: string) => {
    const id = Date.now().toString();
    set((state) => ({ toasts: [...state.toasts, { id, message, type: 'success' }] }));
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
    }, 3000);
  },
  error: (message: string) => {
    const id = Date.now().toString();
    set((state) => ({ toasts: [...state.toasts, { id, message, type: 'error' }] }));
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
    }, 3000);
  },
  removeToast: (id) => {
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
  },
  clearToasts: () => set({ toasts: [] }),
}));