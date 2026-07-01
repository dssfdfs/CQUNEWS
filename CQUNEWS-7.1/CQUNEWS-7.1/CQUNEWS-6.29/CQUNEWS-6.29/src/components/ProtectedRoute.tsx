import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useStore } from '@/store/useStore';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const [isLoading, setIsLoading] = useState(true);
  const isAuthenticated = useStore((state) => state.isAuthenticated);
  const restoreAuth = useStore((state) => state.restoreAuth);

  useEffect(() => {
    const restore = async () => {
      await restoreAuth();
      setIsLoading(false);
    };
    restore();
  }, [restoreAuth]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}