import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { toast } from 'sonner';

interface ProtectedRouteProps {
 requiredPermission?: string;
}

export const ProtectedRoute = ({ requiredPermission }: ProtectedRouteProps) => {
 const { isAuthenticated, permissions } = useAuthStore();

 if (!isAuthenticated) {
 return <Navigate to="/login" replace />;
 }

 if (requiredPermission && !permissions.includes(requiredPermission)) {
 // If authenticated but unauthorized, we can redirect to a main page or show an alert.
 toast.error('Acesso negado. Apenas para administradores.');
 return <Navigate to="/" replace />;
 }

 return <Outlet />;
};
