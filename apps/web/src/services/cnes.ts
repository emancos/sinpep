import axios from 'axios';
import { useAuthStore } from '../store/useAuthStore';

const apiUrl = (import.meta.env.VITE_API_URL as string) || 'http://localhost:3000';

const api = axios.create({
  baseURL: apiUrl,
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export interface Estabelecimento {
  coUf: string;
  sgUf: string;
  coCep: string;
  coCnes: string;
  nuCnpj: string | null;
  dsEmail: string | null;
  noBairro: string;
  tpGestao: string;
  noFantasia: string;
  nuEndereco: string;
  nuTelefone: string | null;
  noMunicipio: string;
  noLogradouro: string;
  stCotaTabela: boolean;
  stExecutante: boolean;
  noComplemento: string | null;
  noRazaoSocial: string;
  stSolicitante: boolean;
  stSolicitaFora: boolean;
  coMunicipioIbge: string;
  coNaturezaJuridica: string;
  coNaturezaOrganizacao: string | null;
}

export interface EstabelecimentoResponse {
  data: Estabelecimento[];
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export const getEstabelecimentos = async (params: { nome?: string; municipio?: string; cnes?: string; page?: number; limit?: number }): Promise<EstabelecimentoResponse> => {
  const { data } = await api.get('/health-centers/cnes/search', { params });
  return data;
};

export interface Profissional {
  cns: string;
  cbos: { nome: string; codigo: string }[];
  nome: string;
  unidades: {
    cbo: { nome: string; codigo: string };
    nome: string;
    codigo: string;
    municipio: { uf: string; nome: string; codigo: string };
  }[];
  cpf_mascarado: string;
}

export interface ProfissionaisResponse {
  data: Profissional[];
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export const getProfissionais = async (params: { nome?: string; cnes?: string; profissao?: string; page?: number; limit?: number }): Promise<ProfissionaisResponse> => {
  const { data } = await api.get('/health-centers/cnes/professionals', { params });
  return data;
};
