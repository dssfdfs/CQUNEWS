import { useState, useEffect, useCallback, useRef } from 'react';
import { CheckCircle, AlertCircle, Info, X, Bell } from 'lucide-react';

interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
  autoClose?: boolean;
  duration?: number;
}

const icons = {
  success: CheckCircle,
  error: AlertCircle,
  info: Info,
  warning: Bell,
};

const colors = {
  success: {
    bg: 'bg-green-50',
    border: 'border-green-200',
    text: 'text-green-700',
    icon: 'text-green-500',
  },
  error: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-700',
    icon: 'text-red-500',
  },
  info: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-700',
    icon: 'text-blue-500',
  },
  warning: {
    bg: 'bg-yellow-50',
    border: 'border-yellow-200',
    text: 'text-yellow-700',
    icon: 'text-yellow-500',
  },
};

let toasts: ToastMessage[] = [];
let listeners: ((toasts: ToastMessage[]) => void)[] = [];

const notify = (message: string, type: ToastMessage['type'] = 'success', options: { autoClose?: boolean; duration?: number } = {}) => {
  const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const newToast: ToastMessage = {
    id,
    type,
    message,
    autoClose: options.autoClose ?? true,
    duration: options.duration ?? 4000,
  };
  toasts = [newToast, ...toasts];
  listeners.forEach((listener) => listener(toasts));
  return id;
};

const dismiss = (id: string) => {
  toasts = toasts.filter((t) => t.id !== id);
  listeners.forEach((listener) => listener(toasts));
};

const dismissAll = () => {
  toasts = [];
  listeners.forEach((listener) => listener(toasts));
};

export function ToastContainer() {
  const [currentToasts, setCurrentToasts] = useState<ToastMessage[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const listener = (updatedToasts: ToastMessage[]) => {
      setCurrentToasts(updatedToasts);
    };
    listeners.push(listener);
    return () => {
      listeners = listeners.filter((l) => l !== listener);
    };
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      const updated = currentToasts.filter((t) => !t.autoClose);
      if (updated.length !== currentToasts.length) {
        toasts = updated;
        listeners.forEach((listener) => listener(toasts));
      }
    }, Math.max(...currentToasts.map((t) => t.duration || 4000)));
    return () => clearTimeout(timer);
  }, [currentToasts]);

  const handleDismiss = useCallback((id: string) => {
    dismiss(id);
  }, []);

  return (
    <div
      ref={containerRef}
      className="fixed top-6 right-6 z-50 flex flex-col gap-3 max-w-sm"
    >
      {currentToasts.map((toast) => {
        const Icon = icons[toast.type];
        const color = colors[toast.type];
        return (
          <div
            key={toast.id}
            className={`flex items-center gap-3 p-4 rounded-lg border shadow-lg ${color.bg} ${color.border} animate-in slide-in-from-right-4 fade-in duration-300`}
            style={{ animationDuration: '0.3s' }}
          >
            <Icon className={`w-5 h-5 ${color.icon} flex-shrink-0`} />
            <span className={`flex-1 text-sm font-medium ${color.text}`}>{toast.message}</span>
            <button
              onClick={() => handleDismiss(toast.id)}
              className="text-gray-400 hover:text-gray-600 transition-colors p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

export const toast = {
  success: (message: string, options?: { autoClose?: boolean; duration?: number }) =>
    notify(message, 'success', options),
  error: (message: string, options?: { autoClose?: boolean; duration?: number }) =>
    notify(message, 'error', options),
  info: (message: string, options?: { autoClose?: boolean; duration?: number }) =>
    notify(message, 'info', options),
  warning: (message: string, options?: { autoClose?: boolean; duration?: number }) =>
    notify(message, 'warning', options),
  dismiss,
  dismissAll,
};
