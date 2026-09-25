import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useAuthStore } from '../store/useAuthStore';

const apiUrl = (import.meta.env.VITE_API_URL as string) || 'http://localhost:3000';

export interface Doctor {
  id: string;
  name: string;
  cpf?: string;
  cns?: string;
  crm: string;
  crmState: string;
  userId?: string;
  isActive: boolean;
  user?: {
    id: string;
    name: string;
    email: string;
  };
  doctorSpecialties?: {
    specialtyId: string;
    specialty: {
      id: string;
      name: string;
    };
  }[];
}

export function useDoctors(params?: any) {
  const token = useAuthStore((state) => state.token);
  return useQuery({
    queryKey: ['doctors', params],
    queryFn: async () => {
      const { data } = await axios.get<{ data: Doctor[]; total: number }>(`${apiUrl}/doctors`, {
        params,
        headers: { Authorization: `Bearer ${token}` }
      });
      return data;
    },
  });
}

export function useDoctor(id?: string) {
  const token = useAuthStore((state) => state.token);
  return useQuery({
    queryKey: ['doctors', id],
    queryFn: async () => {
      if (!id) return null;
      const { data } = await axios.get<Doctor>(`${apiUrl}/doctors/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateDoctor() {
  const queryClient = useQueryClient();
  const token = useAuthStore((state) => state.token);
  return useMutation({
    mutationFn: async (data: Partial<Doctor> & { specialties?: string[] }) => {
      const res = await axios.post(`${apiUrl}/doctors`, data, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctors'] });
    },
  });
}

export function useUpdateDoctor() {
  const queryClient = useQueryClient();
  const token = useAuthStore((state) => state.token);
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<Doctor> & { id: string; specialties?: string[] }) => {
      const res = await axios.patch(`${apiUrl}/doctors/${id}`, data, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctors'] });
    },
  });
}

export function useToggleDoctorActive() {
  const queryClient = useQueryClient();
  const token = useAuthStore((state) => state.token);
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await axios.patch(`${apiUrl}/doctors/${id}/toggle-active`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctors'] });
    },
  });
}
