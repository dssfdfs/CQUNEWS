import { Navigate, useLocation } from 'react-router-dom';
import { useStore } from '@/store/useStore';

interface PublicRouteProps {
  children: React.ReactNode;
}

export function PublicRoute({ children }: PublicRouteProps) {
  const isAuthenticated = useStore((state) => state.isAuthenticated);
  const location = useLocation();

  const isAdminLoginPage = location.pathname === '/admin/login';

  if (isAuthenticated && !isAdminLoginPage) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
