import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useLocation } from 'react-router-dom';

const apiUrl = (import.meta.env.VITE_API_URL as string) || 'http://localhost:3000';

export interface MunicipalityBranding {
  id: string;
  slug: string;
  name: string;
  fullName: string;
  department: string;
  networkName: string;
  systemTitle: string;
  systemSubtitle: string;
  description?: string | null;
  badgeText: string;
  coatOfArmsUrl: string;
  logoUrl?: string | null;
  primaryGradientStart: string;
  primaryGradientEnd: string;
  footerText?: string | null;
  supportContact?: string | null;
  isDefault: boolean;
  isActive: boolean;
}

const DEFAULT_BRANDING: MunicipalityBranding = {
  id: 'default',
  slug: 'padrao',
  name: 'Padrão',
  fullName: 'Unidade de Saúde',
  department: 'Rede de Atenção à Saúde',
  networkName: 'Rede de Atenção à Saúde',
  systemTitle: 'SINPeP',
  systemSubtitle: 'Sistema Integrado de Prontuário Eletrônico do Paciente',
  description: 'Sistema Integrado de Prontuário Eletrônico do Paciente para suporte ao atendimento ambulatorial e fluxos assistenciais.',
  badgeText: 'Gestão Clínica e Assistencial',
  coatOfArmsUrl: '/brasao.png',
  logoUrl: null,
  primaryGradientStart: '#003366',
  primaryGradientEnd: '#001c3a',
  footerText: 'Acesso restrito a profissionais autorizados • Uso Institucional',
  supportContact: null,
  isDefault: true,
  isActive: true,
};

export function useMunicipalityBranding() {
  const location = useLocation();

  // 1. Extração do parâmetro m ou municipio na URL
  const searchParams = new URLSearchParams(location.search);
  const paramSlug = searchParams.get('m') || searchParams.get('municipio');

  let activeSlug = '';

  if (paramSlug && paramSlug.trim()) {
    activeSlug = paramSlug.trim().toLowerCase();
    try {
      localStorage.setItem('sinpep_active_municipality', activeSlug);
    } catch (e) {
      console.warn('Failed to save municipality slug to localStorage:', e);
    }
  } else {
    try {
      activeSlug = localStorage.getItem('sinpep_active_municipality') || '';
    } catch (e) {
      activeSlug = '';
    }
  }

  // 2. Consulta à API pública com cache do TanStack Query
  const { data, isLoading, isError } = useQuery<MunicipalityBranding>({
    queryKey: ['municipality-branding', activeSlug],
    queryFn: async () => {
      const response = await axios.get<MunicipalityBranding>(`${apiUrl}/public/branding`, {
        params: activeSlug ? { m: activeSlug } : {},
      });
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutos de cache em memória
    retry: 1,
  });

  const branding = data || DEFAULT_BRANDING;

  // Função utilitária para obter a URL absoluta de uma imagem (brasão ou logo)
  const getAssetUrl = (url?: string | null) => {
    if (!url) return '/brasao.png';
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
      return url;
    }
    if (url.startsWith('/uploads/')) {
      return `${apiUrl}${url}`;
    }
    return url;
  };

  return {
    branding,
    isLoading,
    isError,
    activeSlug,
    getAssetUrl,
  };
}
