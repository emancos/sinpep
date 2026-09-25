import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useAuthStore } from '../store/useAuthStore';

const apiUrl = (import.meta.env.VITE_API_URL as string) || 'http://localhost:3000';

export interface Specialty {
  id: string;
  cbo?: string;
  name: string;
  description?: string;
  isActive: boolean;
}

export function useSpecialties(params?: any) {
  const token = useAuthStore((state) => state.token);
  return useQuery({
    queryKey: ['specialties', params],
    queryFn: async () => {
      const { data } = await axios.get<{ data: Specialty[]; total: number }>(`${apiUrl}/specialties`, {
        params,
        headers: { Authorization: `Bearer ${token}` }
      });
      return data;
    },
  });
}

export function useSpecialty(id?: string) {
  const token = useAuthStore((state) => state.token);
  return useQuery({
    queryKey: ['specialties', id],
    queryFn: async () => {
      if (!id) return null;
      const { data } = await axios.get<Specialty>(`${apiUrl}/specialties/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateSpecialty() {
  const queryClient = useQueryClient();
  const token = useAuthStore((state) => state.token);
  return useMutation({
    mutationFn: async (data: Partial<Specialty>) => {
      const res = await axios.post(`${apiUrl}/specialties`, data, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['specialties'] });
    },
  });
}

export function useUpdateSpecialty() {
  const queryClient = useQueryClient();
  const token = useAuthStore((state) => state.token);
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<Specialty> & { id: string }) => {
      const res = await axios.patch(`${apiUrl}/specialties/${id}`, data, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['specialties'] });
    },
  });
}

export function useToggleSpecialtyActive() {
  const queryClient = useQueryClient();
  const token = useAuthStore((state) => state.token);
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await axios.patch(`${apiUrl}/specialties/${id}/toggle-active`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['specialties'] });
    },
  });
}
