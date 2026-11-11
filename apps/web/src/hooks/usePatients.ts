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

export interface PatientAnamnesis {
  isHypertensive: boolean;
  isDiabetic: boolean;
  isSmoker: boolean;
  otherDiseases?: string | null;
  isOncological: boolean;
  oncologicalStage?: string | null;
  allergies?: string | null;
  isPcd: boolean;
  pcdDescription?: string | null;
  continuousMedications: string[];
  bloodPressure?: string | null;
  glycemia?: string | null;
  weight?: string | null;
  height?: string | null;
}

export interface Patient {
 id: string;
 name: string;
 cpf?: string | null;
 cns?: string;
 email?: string | null;
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
 patientAnamnesis?: PatientAnamnesis;
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
        params,
      });
      return response.data;
    },
    enabled: !!token,
    placeholderData: keepPreviousData,
    staleTime: 1000 * 60 * 2, // 2 minutos
    gcTime: 1000 * 60 * 10,
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

export interface PatientEditChange {
  field: string;
  label: string;
  before: unknown;
  after: unknown;
}

export interface PatientEditHistoryEntry {
  id: string;
  patientId: string;
  editedByUserId: string | null;
  editedByName: string;
  editedByEmail: string;
  editedByPhone?: string | null;
  origin: 'PATIENT_EDIT' | 'PATIENT_STATUS' | 'PATIENT_ATTENTION' | 'REGULATION_CREATE' | 'REGULATION_RESUBMIT' | string;
  changes: PatientEditChange[];
  createdAt: string;
}

export const usePatientEditHistory = (id: string) => {
  const token = useAuthStore((state) => state.token);

  return useQuery<PatientEditHistoryEntry[]>({
    queryKey: ['patients', id, 'history'],
    queryFn: async () => {
      const response = await axios.get(`${apiUrl}/patients/${id}/history`, {
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
 data: Partial<Omit<CreatePatientInput, 'healthAgentId'>> & {
   healthAgentId?: string | null;
 };
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
    queryClient.invalidateQueries({ queryKey: ['patients', id, 'history'] });
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
