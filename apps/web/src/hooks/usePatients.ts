import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import axios from 'axios';
import { useAuthStore } from '../store/useAuthStore';
import type { PaginationParams, PaginatedResponse } from './types';
import type { Request } from './useRequests';

const apiUrl = (import.meta.env.VITE_API_URL as string) || 'http://localhost:3000';

export interface PatientPhone {
 id: string;
 phoneNumber: string;
 isWhatsapp: boolean;
}

export interface HealthCenter {
 id: string;
 name: string;
 cnes?: string;
 nurseName?: string;
}

export interface HealthAgent {
 id: string;
 name: string;
 phone?: string;
 microArea?: string;
}

export interface Patient {
 id: string;
 name: string;
 cpf: string;
 cns?: string;
 birthDate: string;
 gender: string;
 attentionLevel: number;
 attentionNotes?: string | null;
 address?: string;
 isActive: boolean;
 createdAt: string;
 updatedAt: string;
 healthCenterId: string;
 healthCenter: HealthCenter;
 healthAgentId?: string;
 healthAgent?: HealthAgent;
 phones: PatientPhone[];
 requests?: Request[];
}

export const usePatients = (params: PaginationParams) => {
 const token = useAuthStore((state) => state.token);

  return useQuery<PaginatedResponse<Patient>>({
    queryKey: ['patients', params],
    queryFn: async () => {
      const response = await axios.get(`${apiUrl}/patients`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        params: {
          ...params,
          _t: new Date().getTime(), // Bypass Cloudflare cache
        },
      });
      return response.data;
    },
 enabled: !!token,
 placeholderData: keepPreviousData,
 });
};

export const checkPatientUnique = async (token: string, params: { cpf?: string; cns?: string; excludeId?: string }) => {
 const response = await axios.get(`${apiUrl}/patients/check-unique`, {
 headers: { Authorization: `Bearer ${token}` },
 params,
 });
 return response.data as { isUnique: boolean; message?: string; patientId?: string };
};

export const useUpdatePatientAttention = () => {
 const token = useAuthStore((state) => state.token);
 const queryClient = useQueryClient();

 return useMutation<
 Patient,
 Error,
 { id: string; attentionLevel: number; attentionNotes?: string }
 >({
 mutationFn: async ({ id, attentionLevel, attentionNotes }) => {
 const response = await axios.patch(
 `${apiUrl}/patients/${id}/attention`,
 { attentionLevel, attentionNotes },
 {
 headers: { Authorization: `Bearer ${token}` },
 },
 );
 return response.data;
 },
 onSuccess: () => {
 queryClient.invalidateQueries({ queryKey: ['patients'] });
 queryClient.invalidateQueries({ queryKey: ['requests'] });
 },
 });
};

export const usePatient = (id: string) => {
 const token = useAuthStore((state) => state.token);

 return useQuery<Patient>({
 queryKey: ['patients', id],
 queryFn: async () => {
 const response = await axios.get(`${apiUrl}/patients/${id}`, {
 headers: { Authorization: `Bearer ${token}` },
 });
 return response.data;
 },
 enabled: !!token && !!id,
 });
};

export const useDeletePatient = () => {
 const token = useAuthStore((state) => state.token);
 const queryClient = useQueryClient();

 return useMutation<void, Error, string>({
 mutationFn: async (id) => {
 await axios.delete(`${apiUrl}/patients/${id}`, {
 headers: { Authorization: `Bearer ${token}` },
 });
 },
 onSuccess: () => {
 queryClient.invalidateQueries({ queryKey: ['patients'] });
 queryClient.invalidateQueries({ queryKey: ['requests'] });
 },
 });
};

export interface CreatePatientInput {
 name: string;
 cpf: string;
 cns?: string;
 birthDate: string;
 gender: string;
 healthCenterId: string;
 healthAgentId?: string;
 address?: string;
 phones?: { phoneNumber: string; isWhatsapp: boolean }[];
}

export const useCreatePatient = () => {
 const token = useAuthStore((state) => state.token);
 const queryClient = useQueryClient();

 return useMutation<Patient, Error, CreatePatientInput>({
 mutationFn: async (input) => {
 const response = await axios.post(`${apiUrl}/patients`, input, {
 headers: { Authorization: `Bearer ${token}` },
 });
 return response.data;
 },
 onSuccess: () => {
 queryClient.invalidateQueries({ queryKey: ['patients'] });
 },
 });
};

export interface UpdatePatientInput {
 id: string;
 data: Partial<CreatePatientInput>;
}

export const useUpdatePatient = () => {
 const token = useAuthStore((state) => state.token);
 const queryClient = useQueryClient();

 return useMutation<Patient, Error, UpdatePatientInput>({
 mutationFn: async ({ id, data }) => {
 const response = await axios.put(`${apiUrl}/patients/${id}`, data, {
 headers: { Authorization: `Bearer ${token}` },
 });
 return response.data;
 },
 onSuccess: (_, { id }) => {
 queryClient.invalidateQueries({ queryKey: ['patients'] });
 queryClient.invalidateQueries({ queryKey: ['patients', id] });
 queryClient.invalidateQueries({ queryKey: ['requests'] });
 queryClient.invalidateQueries({ queryKey: ['requests'] });
 },
 });
};

export const useTogglePatientActive = () => {
 const token = useAuthStore((state) => state.token);
 const queryClient = useQueryClient();

 return useMutation<void, Error, string>({
 mutationFn: async (id: string) => {
 await axios.patch(`${apiUrl}/patients/${id}/toggle-active`, {}, {
 headers: { Authorization: `Bearer ${token}` },
 });
 },
 onSuccess: () => {
 queryClient.invalidateQueries({ queryKey: ['patients'] });
 },
 });
};
