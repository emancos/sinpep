import { useEffect } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { isTokenExpired } from '../utils/token';
import { handleUnauthorizedSession } from '../services/api';

/**
 * Hook para monitorar ativamente a validade da sessão:
 * 1. Ao retomar foco na aba (visibilitychange / window.focus)
 * 2. Em intervalos periódicos em background (a cada 60 segundos)
 */
export function useSessionMonitor() {
  const token = useAuthStore((state) => state.token);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  useEffect(() => {
    if (!isAuthenticated || !token) {
      return;
    }

    const checkSession = () => {
      const currentToken = useAuthStore.getState().token;
      if (currentToken && isTokenExpired(currentToken)) {
        handleUnauthorizedSession();
      }
    };

    // 1. Verificação imediata na montagem
    checkSession();

    // 2. Verificação ao retornar o foco ou tornar a aba visível
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkSession();
      }
    };

    const handleFocus = () => {
      checkSession();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    // 3. Verificação periódica a cada 60 segundos
    const intervalId = setInterval(checkSession, 60 * 1000);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      clearInterval(intervalId);
    };
  }, [token, isAuthenticated]);
}
