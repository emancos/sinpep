import { useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '../store/useAuthStore';
import { isTokenExpired } from '../utils/token';
import { handleUnauthorizedSession, apiUrl } from '../services/api';
import { useSessionMonitor } from '../hooks/useSessionMonitor';

interface ProtectedRouteProps {
  requiredPermission?: string;
}

export const ProtectedRoute = ({ requiredPermission }: ProtectedRouteProps) => {
  const { token, isAuthenticated, permissions, syncSession } = useAuthStore();
  const location = useLocation();

  // Ativa o monitoramento contínuo de sessão (retomada de foco e timer periódico)
  useSessionMonitor();

  // 1. Verificação local imediata do token
  const isExpired = isTokenExpired(token);

  if (!isAuthenticated || !token || isExpired) {
    if (token && isExpired) {
      handleUnauthorizedSession();
    } else {
      const currentPath = location.pathname + location.search;
      if (currentPath && currentPath !== '/login') {
        sessionStorage.setItem('redirect_after_login', currentPath);
      }
    }
    return <Navigate to="/login" replace />;
  }

  // 2. Validação no backend via GET /auth/me
  const { data: profile, isLoading, isError } = useQuery({
    queryKey: ['auth-me'],
    queryFn: async () => {
      const response = await axios.get(`${apiUrl}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data;
    },
    enabled: !!token && !isExpired,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  useEffect(() => {
    if (profile) {
      syncSession(profile, profile.permissions);
    }
  }, [profile, syncSession]);

  if (isError) {
    handleUnauthorizedSession();
    return <Navigate to="/login" replace />;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100">
        <div className="flex flex-col items-center gap-4 animate-in fade-in duration-300">
          <img src="/brasao.png" alt="SINPeP" className="w-16 h-16 object-contain drop-shadow" />
          <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 font-medium">
            <Loader2 className="w-4 h-4 animate-spin text-blue-600 dark:text-blue-400" />
            <span>Validando sessão...</span>
          </div>
        </div>
      </div>
    );
  }

  // 3. Verificação de permissões da rota
  const effectivePermissions = profile?.permissions || permissions;
  if (
    requiredPermission &&
    !effectivePermissions.includes(requiredPermission) &&
    !effectivePermissions.includes('admin:access')
  ) {
    toast.error('Acesso negado. Você não possui permissão para acessar esta página.');
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};
