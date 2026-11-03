import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useAuthStore } from '../store/useAuthStore';
import type { MunicipalityBranding } from './useMunicipalityBranding';

const apiUrl = (import.meta.env.VITE_API_URL as string) || 'http://localhost:3000';

export function useMunicipalities(search?: string) {
  const token = useAuthStore((state) => state.token);

  return useQuery<MunicipalityBranding[]>({
    queryKey: ['admin-municipalities', search],
    queryFn: async () => {
      const response = await axios.get<MunicipalityBranding[]>(`${apiUrl}/admin/brandings`, {
        headers: { Authorization: `Bearer ${token}` },
        params: search ? { search } : {},
      });
      return response.data;
    },
    enabled: !!token,
  });
}

export function useCreateMunicipality() {
  const queryClient = useQueryClient();
  const token = useAuthStore((state) => state.token);

  return useMutation({
    mutationFn: async (data: Partial<MunicipalityBranding>) => {
      const res = await axios.post(`${apiUrl}/admin/brandings`, data, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-municipalities'] });
      queryClient.invalidateQueries({ queryKey: ['municipality-branding'] });
    },
  });
}

export function useUpdateMunicipality() {
  const queryClient = useQueryClient();
  const token = useAuthStore((state) => state.token);

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<MunicipalityBranding> }) => {
      const res = await axios.put(`${apiUrl}/admin/brandings/${id}`, data, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-municipalities'] });
      queryClient.invalidateQueries({ queryKey: ['municipality-branding'] });
    },
  });
}

export function useDeleteMunicipality() {
  const queryClient = useQueryClient();
  const token = useAuthStore((state) => state.token);

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await axios.delete(`${apiUrl}/admin/brandings/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-municipalities'] });
      queryClient.invalidateQueries({ queryKey: ['municipality-branding'] });
    },
  });
}

export function useUploadCoatOfArms() {
  const queryClient = useQueryClient();
  const token = useAuthStore((state) => state.token);

  return useMutation({
    mutationFn: async ({ id, file }: { id: string; file: File }) => {
      const formData = new FormData();
      formData.append('file', file);

      const res = await axios.post(`${apiUrl}/admin/brandings/${id}/coat-of-arms`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-municipalities'] });
      queryClient.invalidateQueries({ queryKey: ['municipality-branding'] });
    },
  });
}
