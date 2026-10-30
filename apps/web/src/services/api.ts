import axios, { AxiosError } from 'axios';
import { toast } from 'sonner';
import { useAuthStore } from '../store/useAuthStore';

export const apiUrl = (import.meta.env.VITE_API_URL as string) || 'http://localhost:3000';

let isHandling401 = false;

/**
 * Lida com o erro 401 de forma centralizada:
 * - Salva a URL atual no sessionStorage para redirecionamento pós-login
 * - Limpa a sessão no useAuthStore
 * - Emite notificação amigável (sem duplicar toasts)
 * - Redireciona para /login
 */
export function handleUnauthorizedSession() {
  const currentPath = window.location.pathname + window.location.search;
  if (
    currentPath &&
    currentPath !== '/login' &&
    !currentPath.startsWith('/reset-password') &&
    !currentPath.startsWith('/forgot-password')
  ) {
    sessionStorage.setItem('redirect_after_login', currentPath);
  }

  useAuthStore.getState().logout();

  if (!isHandling401) {
    isHandling401 = true;
    toast.warning('Sua sessão expirou. Faça login novamente para continuar.');
    setTimeout(() => {
      isHandling401 = false;
    }, 4000);
  }

  if (window.location.pathname !== '/login') {
    window.location.href = '/login';
  }
}

// Configura o interceptor no axios global para capturar requisições de todos os hooks
axios.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const url = error.config?.url || '';
    const isAuthRoute =
      url.includes('/auth/login') ||
      url.includes('/auth/forgot-password') ||
      url.includes('/auth/reset-password');

    // Se for 401 e não for tentativa de login/recuperação
    if (error.response?.status === 401 && !isAuthRoute) {
      handleUnauthorizedSession();
    }

    return Promise.reject(error);
  }
);

// Cria e exporta instância padronizada 'api'
export const api = axios.create({
  baseURL: apiUrl,
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const url = error.config?.url || '';
    const isAuthRoute =
      url.includes('/auth/login') ||
      url.includes('/auth/forgot-password') ||
      url.includes('/auth/reset-password');

    if (error.response?.status === 401 && !isAuthRoute) {
      handleUnauthorizedSession();
    }

    return Promise.reject(error);
  }
);

export default api;
