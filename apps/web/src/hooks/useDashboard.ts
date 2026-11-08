import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useAuthStore } from '../store/useAuthStore';
import { toast } from 'sonner';

const apiUrl = (import.meta.env.VITE_API_URL as string) || 'http://localhost:3000';

export interface DashboardNotice {
  id: string;
  title: string;
  content: string;
  type: 'INFO' | 'WARNING' | 'URGENT';
  scope: 'GLOBAL' | 'HEALTH_CENTER';
  healthCenterId?: string | null;
  authorId: string;
  isPinned: boolean;
  isActive: boolean;
  expiresAt?: string | null;
  createdAt: string;
  updatedAt: string;
  authorName: string;
  authorAvatar?: string | null;
  healthCenterName?: string | null;
}

export interface CreateNoticePayload {
  title: string;
  content: string;
  type?: 'INFO' | 'WARNING' | 'URGENT';
  scope?: 'GLOBAL' | 'HEALTH_CENTER';
  healthCenterId?: string | null;
  isPinned?: boolean;
  expiresAt?: string | null;
}

export interface UpdateNoticePayload {
  title?: string;
  content?: string;
  type?: 'INFO' | 'WARNING' | 'URGENT';
  scope?: 'GLOBAL' | 'HEALTH_CENTER';
  healthCenterId?: string | null;
  isPinned?: boolean;
  isActive?: boolean;
  expiresAt?: string | null;
}

export interface DashboardSummaryResponse {
  profile: string;
  kpis: Record<string, any>;
  charts?: Record<string, any>;
  alerts?: any[];
  recentItems?: any[];
  recentScheduled?: any[];
  todayFlow?: Record<string, any>;
  activeSchedules?: any[];
  activeRooms?: any[];
  doctorInfo?: any;
  recentRecords?: any[];
}

export function useDashboardSummary() {
  const token = useAuthStore((state) => state.token);
  const activeProfile = useAuthStore((state) => state.activeProfile);

  return useQuery<DashboardSummaryResponse>({
    queryKey: ['dashboard-summary', activeProfile?.id || 'default'],
    queryFn: async () => {
      const { data } = await axios.get<DashboardSummaryResponse>(`${apiUrl}/dashboard/summary`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return data;
    },
    enabled: !!token,
    staleTime: 30000,
  });
}

export function useDashboardNotices() {
  const token = useAuthStore((state) => state.token);

  return useQuery<DashboardNotice[]>({
    queryKey: ['dashboard-notices'],
    queryFn: async () => {
      const { data } = await axios.get<DashboardNotice[]>(`${apiUrl}/dashboard/notices`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return data;
    },
    enabled: !!token,
    staleTime: 60000,
  });
}

export function useCreateNotice() {
  const token = useAuthStore((state) => state.token);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateNoticePayload) => {
      const { data } = await axios.post(`${apiUrl}/dashboard/notices`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-notices'] });
      toast.success('Aviso publicado com sucesso no mural!');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Falha ao publicar aviso.');
    },
  });
}

export function useUpdateNotice() {
  const token = useAuthStore((state) => state.token);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: UpdateNoticePayload }) => {
      const { data } = await axios.put(`${apiUrl}/dashboard/notices/${id}`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-notices'] });
      toast.success('Aviso atualizado com sucesso.');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Falha ao atualizar aviso.');
    },
  });
}

export function useDeleteNotice() {
  const token = useAuthStore((state) => state.token);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await axios.delete(`${apiUrl}/dashboard/notices/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-notices'] });
      toast.success('Aviso removido do mural.');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Falha ao remover aviso.');
    },
  });
}
