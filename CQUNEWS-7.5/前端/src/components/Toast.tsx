import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { useToastStore } from '@/store/toastStore';

const icons = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

const colors = {
  success: 'bg-green-500',
  error: 'bg-red-500',
  warning: 'bg-yellow-500',
  info: 'bg-blue-500',
};

export function Toast() {
  const { toasts, removeToast } = useToastStore();

  return (
    <div className="fixed top-6 right-6 z-50 space-y-3">
      {toasts.map((toast) => {
        const Icon = icons[toast.type];
        return (
          <div
            key={toast.id}
            className="flex items-center gap-3 px-4 py-3 bg-white rounded-lg shadow-lg border border-gray-100 min-w-[280px] animate-slide-in"
            style={{
              animation: 'slideIn 0.3s ease-out',
            }}
          >
            <div className={`w-8 h-8 ${colors[toast.type]} rounded-full flex items-center justify-center`}>
              <Icon className="w-4 h-4 text-white" />
            </div>
            <span className="flex-1 text-gray-800 font-medium">{toast.message}</span>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
      <style>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(100%);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </div>
  );
}
