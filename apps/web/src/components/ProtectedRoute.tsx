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
  const {
    token,
    isAuthenticated,
    permissions,
    activeProfile,
    availableProfiles,
    user,
    isSwitchingProfile,
    syncSession,
  } = useAuthStore();
  const location = useLocation();

  // Ativa o monitoramento contínuo de sessão (retomada de foco e timer periódico)
  useSessionMonitor();

  // 1. Verificação local imediata do token
  const isExpired = isTokenExpired(token);
  const isValidSession = Boolean(isAuthenticated && token && !isExpired);

  // 2. Validação no backend via GET /auth/me vinculada ao token atual
  // Chamada de hook sempre incondicional no topo para cumprir as Regras de Hooks do React
  const { data: profile, isLoading, isError } = useQuery({
    queryKey: ['auth-me', token],
    queryFn: async () => {
      const response = await axios.get(`${apiUrl}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data;
    },
    enabled: isValidSession,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  useEffect(() => {
    // Só sincroniza caso o profile retornado corresponda ao perfil ativo atual da sessão
    if (isValidSession && profile && (!activeProfile?.id || profile.activeProfile?.id === activeProfile?.id)) {
      syncSession(profile, profile.permissions, profile.activeProfile, profile.availableProfiles);
    }
  }, [isValidSession, profile, activeProfile?.id, syncSession]);

  // 3. Verificação de permissões da rota
  // Se o profile do backend pertencer ao perfil ativo atual, utilizamos suas permissões;
  // Caso contrário, utilizamos imediatamente as permissões consolidadas do useAuthStore.
  const isProfileSynchronized = Boolean(
    profile && (!activeProfile?.id || profile.activeProfile?.id === activeProfile?.id),
  );
  const effectivePermissions = isProfileSynchronized ? (profile.permissions ?? []) : permissions;
  const isMasterAdmin =
    user?.profileName === 'Administrador' ||
    profile?.profileName === 'Administrador' ||
    availableProfiles.some((p) => p.name === 'Administrador') ||
    effectivePermissions.includes('admin:access');

  const isDenied = Boolean(
    isValidSession &&
      !isError &&
      !isLoading &&
      !isSwitchingProfile &&
      requiredPermission &&
      !isMasterAdmin &&
      !effectivePermissions.includes(requiredPermission),
  );

  useEffect(() => {
    if (isDenied) {
      toast.error('Acesso negado. Você não possui permissão para acessar esta página.');
    }
  }, [isDenied, location.pathname]);

  // Se a sessão for inválida (logout, sem token ou expirado), redireciona imediatamente para login
  if (!isValidSession) {
    if (token && isExpired) {
      handleUnauthorizedSession();
    } else {
      const isExplicitLogout = sessionStorage.getItem('explicit_logout');
      const currentPath = location.pathname + location.search;
      if (!isExplicitLogout && currentPath && currentPath !== '/login') {
        sessionStorage.setItem('redirect_after_login', currentPath);
      }
    }
    return <Navigate to="/login" replace />;
  }

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

  if (isSwitchingProfile) {
    return <Outlet />;
  }

  if (isDenied) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};
