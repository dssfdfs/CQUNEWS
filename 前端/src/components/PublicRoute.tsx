import { Navigate, useLocation } from 'react-router-dom';
import { useStore } from '@/store/useStore';
import { useAdminStore } from '@/store/adminStore';

interface PublicRouteProps {
  children: React.ReactNode;
}

export function PublicRoute({ children }: PublicRouteProps) {
  const isAuthenticated = useStore((state) => state.isAuthenticated);
  const isAdminAuthenticated = useAdminStore((state) => state.isAuthenticated);
  const location = useLocation();

  if (isAuthenticated && !isAdminAuthenticated && location.pathname === '/login') {
    return <>{children}</>;
  }

  const allowedPaths = ['/forgot-password', '/register'];
  if (isAuthenticated && !isAdminAuthenticated && !allowedPaths.includes(location.pathname)) {
    return <Navigate to="/" replace />;
  }

  if (isAdminAuthenticated) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  return <>{children}</>;
}