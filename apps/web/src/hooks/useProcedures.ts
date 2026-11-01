import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import axios from 'axios';
import { useAuthStore } from '../store/useAuthStore';
import type { PaginationParams, PaginatedResponse } from './types';

const apiUrl = (import.meta.env.VITE_API_URL as string) || 'http://localhost:3000';

export interface ProcedureVariant {
  id: string;
  procedureId: string;
  sisregProcId: string;
  sisregGroupId: string | null;
  side: string | null;
  contrast: boolean;
  sedation: boolean;
  ageGroup: string | null;
  maxItems: number | null;
}

export interface ProcedureGroup {
  id: string;
  name: string;
  isActive: boolean;
  proceduresCount?: number;
}

export interface ProcedurePreparation {
  id: string;
  procedureId: string;
  title: string;
  contentHtml: string;
  fastingHours: number;
  requiresCompanion: boolean;
  medicationInstructions?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface Procedure {
  id: string;
  code: string;
  name: string;
  procedureGroupId: string;
  procedureGroup?: ProcedureGroup;
  variants?: ProcedureVariant[];
  preparation?: ProcedurePreparation | null;
  genderAllowed: 'AMBOS' | 'FEMININO' | 'MASCULINO';
  minAge: number;
  maxAge: number;

  requiresRegulation: boolean;
  maxReturns: number;
  requestIntervalDays: number;
  consumptionType: string;
  sigtapValue: string;
  regulatorRespectsQuota: boolean;

  viewScheduleFirstTimeDays: number;
  viewScheduleReturnDays: number;
  viewScheduleRegulatorDays: number;
  viewScheduleAutoDays: number;

  releaseScheduleFirstTimeDays: number;
  releaseScheduleReturnDays: number;
  releaseScheduleRegulatorDays: number;
  releaseScheduleAutoDays: number;

  // Oferta executante (quando mapeado)
  monthlyQuantity?: number;
  isOffered?: boolean;
  healthCenterProcedureId?: string;

  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface QuotaSolicitorItem {
  solicitingHealthCenterId: string;
  solicitingHealthCenterName: string;
  solicitingHealthCenterCnes: string;
  monthlyQuota: number;
  usedQuota: number;
  isManualAdjustment: boolean;
}

export interface QuotaMatrixResponse {
  executingHealthCenterId: string;
  executingHealthCenterName?: string;
  procedureId: string;
  totalCapacity: number;
  allocatedTotal: number;
  unallocated: number;
  isOffered: boolean;
  solicitors: QuotaSolicitorItem[];
}

export const useProcedures = (params: PaginationParams & { procedureGroupId?: string; requestingHealthCenterId?: string }) => {
  const token = useAuthStore((state) => state.token);

  return useQuery<PaginatedResponse<Procedure>>({
    queryKey: ['procedures', params],
    queryFn: async () => {
      const response = await axios.get(`${apiUrl}/procedures`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        params,
      });
      return response.data;
    },
    enabled: !!token,
    placeholderData: keepPreviousData,
  });
};

export const useProcedure = (id: string) => {
  const token = useAuthStore((state) => state.token);

  return useQuery<Procedure>({
    queryKey: ['procedures', id],
    queryFn: async () => {
      const response = await axios.get(`${apiUrl}/procedures/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data;
    },
    enabled: !!token && !!id,
  });
};

export const useProcedureGroups = (includeInactive: boolean = false) => {
  const token = useAuthStore((state) => state.token);

  return useQuery<ProcedureGroup[]>({
    queryKey: ['procedure-groups', includeInactive],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (includeInactive) params.append('includeInactive', 'true');

      const response = await axios.get(`${apiUrl}/procedure-groups${params.toString() ? `?${params.toString()}` : ''}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data;
    },
    enabled: !!token,
  });
};

export const useCreateProcedureGroup = () => {
  const token = useAuthStore((state) => state.token);
  const queryClient = useQueryClient();

  return useMutation<ProcedureGroup, Error, { name: string }>({
    mutationFn: async (data) => {
      const response = await axios.post(`${apiUrl}/procedure-groups`, data, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['procedure-groups'] });
      queryClient.invalidateQueries({ queryKey: ['procedures'] });
      queryClient.invalidateQueries({ queryKey: ['executing-offers'] });
    },
  });
};

export const useUpdateProcedureGroup = () => {
  const token = useAuthStore((state) => state.token);
  const queryClient = useQueryClient();

  return useMutation<ProcedureGroup, Error, { id: string; data: { name: string } }>({
    mutationFn: async ({ id, data }) => {
      const response = await axios.put(`${apiUrl}/procedure-groups/${id}`, data, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['procedure-groups'] });
      queryClient.invalidateQueries({ queryKey: ['procedures'] });
    },
  });
};

export const useDeleteProcedureGroup = () => {
  const token = useAuthStore((state) => state.token);
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: async (id) => {
      await axios.delete(`${apiUrl}/procedure-groups/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['procedure-groups'] });
      queryClient.invalidateQueries({ queryKey: ['procedures'] });
    },
  });
};

export const useToggleProcedureGroupActive = () => {
  const token = useAuthStore((state) => state.token);
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: async (id) => {
      await axios.patch(`${apiUrl}/procedure-groups/${id}/toggle-active`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['procedure-groups'] });
      queryClient.invalidateQueries({ queryKey: ['procedures'] });
      queryClient.invalidateQueries({ queryKey: ['executing-offers'] });
    },
  });
};

export const useCreateProcedure = () => {
  const token = useAuthStore((state) => state.token);
  const queryClient = useQueryClient();

  return useMutation<Procedure, Error, Partial<Procedure>>({
    mutationFn: async (data) => {
      const response = await axios.post(`${apiUrl}/procedures`, data, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['procedures'] });
    },
  });
};

export const useUpdateProcedure = () => {
  const token = useAuthStore((state) => state.token);
  const queryClient = useQueryClient();

  return useMutation<Procedure, Error, { id: string; data: Partial<Procedure> }>({
    mutationFn: async ({ id, data }) => {
      const response = await axios.put(`${apiUrl}/procedures/${id}`, data, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['procedures'] });
      queryClient.invalidateQueries({ queryKey: ['procedures', data.id] });
      queryClient.invalidateQueries({ queryKey: ['requests'] });
    },
  });
};

export const useDeleteProcedure = () => {
  const token = useAuthStore((state) => state.token);
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: async (id) => {
      await axios.delete(`${apiUrl}/procedures/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['procedures'] });
      queryClient.invalidateQueries({ queryKey: ['requests'] });
    },
  });
};

export const useToggleProcedureActive = () => {
  const token = useAuthStore((state) => state.token);
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: async (id) => {
      await axios.patch(`${apiUrl}/procedures/${id}/toggle-active`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['procedures'] });
    },
  });
};

// --- INTEGRA SUS API ---
export const useSearchIntegraSus = (search: string, enabled: boolean = false) => {
  const token = useAuthStore((state) => state.token);

  return useQuery<any[]>({
    queryKey: ['integra-sus-search', search],
    queryFn: async () => {
      const response = await axios.get(`${apiUrl}/procedures/integra-sus/search`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { search },
      });
      return response.data;
    },
    enabled: !!token && enabled && search.length >= 2,
    staleTime: 60000,
  });
};

// --- Preparo de Procedimentos ---
export const useProcedurePreparation = (procedureId: string) => {
  const token = useAuthStore((state) => state.token);

  return useQuery<ProcedurePreparation | null>({
    queryKey: ['procedure-preparation', procedureId],
    queryFn: async () => {
      const response = await axios.get(`${apiUrl}/procedures/${procedureId}/preparation`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data;
    },
    enabled: !!token && !!procedureId,
  });
};

export const useSaveProcedurePreparation = () => {
  const token = useAuthStore((state) => state.token);
  const queryClient = useQueryClient();

  return useMutation<ProcedurePreparation, Error, { procedureId: string; data: Partial<ProcedurePreparation> }>({
    mutationFn: async ({ procedureId, data }) => {
      const response = await axios.put(`${apiUrl}/procedures/${procedureId}/preparation`, data, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['procedure-preparation', vars.procedureId] });
      queryClient.invalidateQueries({ queryKey: ['procedures', vars.procedureId] });
    },
  });
};

// --- Ofertas da Unidade Executante (Itens 2 e 5) ---
export const useExecutingOffers = (healthCenterId?: string, groupId?: string, includeInactive: boolean = false) => {
  const token = useAuthStore((state) => state.token);

  return useQuery<Procedure[]>({
    queryKey: ['executing-offers', healthCenterId, groupId, includeInactive],
    queryFn: async () => {
      const response = await axios.get(`${apiUrl}/procedures/executing/${healthCenterId}`, {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          ...(groupId ? { groupId } : {}),
          ...(includeInactive ? { includeInactive: 'true' } : {}),
        },
      });
      return response.data;
    },
    enabled: !!token && !!healthCenterId,
  });
};

export const useUpdateExecutingOffer = () => {
  const token = useAuthStore((state) => state.token);
  const queryClient = useQueryClient();

  return useMutation<any, Error, { healthCenterId: string; procedureId: string; monthlyQuantity: number; isOffered: boolean }>({
    mutationFn: async ({ healthCenterId, procedureId, monthlyQuantity, isOffered }) => {
      const response = await axios.put(`${apiUrl}/procedures/executing/${healthCenterId}`, {
        procedureId,
        monthlyQuantity,
        isOffered,
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['executing-offers', vars.healthCenterId] });
      queryClient.invalidateQueries({ queryKey: ['procedures-quotas-matrix', vars.healthCenterId, vars.procedureId] });
    },
  });
};

// --- Cotas Matrix & Rebalanceamento (Item 3) ---
export const useProcedureQuotasMatrix = (executingHealthCenterId?: string, procedureId?: string) => {
  const token = useAuthStore((state) => state.token);

  return useQuery<QuotaMatrixResponse>({
    queryKey: ['procedures-quotas-matrix', executingHealthCenterId, procedureId],
    queryFn: async () => {
      const response = await axios.get(`${apiUrl}/procedures/quotas/matrix`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { executingHealthCenterId, procedureId },
      });
      return response.data;
    },
    enabled: !!token && !!executingHealthCenterId && !!procedureId,
  });
};

export const useAutoDistributeQuotas = () => {
  const token = useAuthStore((state) => state.token);
  const queryClient = useQueryClient();

  return useMutation<QuotaMatrixResponse, Error, { executingHealthCenterId: string; procedureId: string; totalCapacity?: number }>({
    mutationFn: async (payload) => {
      const response = await axios.post(`${apiUrl}/procedures/quotas/distribute-auto`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['procedures-quotas-matrix', data.executingHealthCenterId, data.procedureId] });
      queryClient.invalidateQueries({ queryKey: ['executing-offers', data.executingHealthCenterId] });
    },
  });
};

export const useRebalanceQuotas = () => {
  const token = useAuthStore((state) => state.token);
  const queryClient = useQueryClient();

  return useMutation<QuotaMatrixResponse, Error, { executingHealthCenterId: string; procedureId: string; solicitingHealthCenterId: string; monthlyQuota: number }>({
    mutationFn: async (payload) => {
      const response = await axios.put(`${apiUrl}/procedures/quotas/rebalance`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['procedures-quotas-matrix', data.executingHealthCenterId, data.procedureId] });
    },
  });
};

export const useSyncSisregCatalog = () => {
  const token = useAuthStore((state) => state.token);
  const queryClient = useQueryClient();

  return useMutation<any, Error, { cpf: string }>({
    mutationFn: async ({ cpf }) => {
      const response = await axios.post(`${apiUrl}/sisreg/sync-catalog`, { cpf }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['procedure-groups'] });
      queryClient.invalidateQueries({ queryKey: ['procedures'] });
    },
  });
};
