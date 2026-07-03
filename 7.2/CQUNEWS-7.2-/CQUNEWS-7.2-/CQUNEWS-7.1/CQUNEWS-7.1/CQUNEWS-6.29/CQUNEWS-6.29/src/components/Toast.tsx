import { useToastStore } from '@/store/toastStore';
import { CheckCircle, XCircle, Info, X } from 'lucide-react';

export function Toast() {
  const { message, type, show, hide } = useToastStore();

  if (!show) return null;

  const icons = {
    success: <CheckCircle className="w-5 h-5" />,
    error: <XCircle className="w-5 h-5" />,
    info: <Info className="w-5 h-5" />,
  };

  const colors = {
    success: 'bg-green-500 text-white',
    error: 'bg-red-500 text-white',
    info: 'bg-blue-500 text-white',
  };

  return (
    <div className="fixed top-4 right-4 z-50 animate-bounce-in">
      <div className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg ${colors[type || 'info']}`}>
        {icons[type || 'info']}
        <span className="font-medium">{message}</span>
        <button onClick={hide} className="hover:opacity-80 transition-opacity">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}