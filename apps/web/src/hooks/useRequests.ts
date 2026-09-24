import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useAuthStore } from '../store/useAuthStore';
import type { PaginationParams, PaginatedResponse } from './types';

const apiUrl = (import.meta.env.VITE_API_URL as string) || 'http://localhost:3000';

export interface RequestHistory {
 id: string;
 status: string;
 notes?: string;
 createdAt: string;
 changedByUser: {
 id: string;
 name: string;
 email: string;
 };
}

export interface RequestProcedure {
 requestId: string;
 procedureId: string;
 procedure: {
 id: string;
 code: string;
 name: string;
 procedureGroup: {
 id: string;
 name: string;
 };
 };
 side?: string;
 contrast: boolean;
 sedation: boolean;
}

export interface RequestAttachment {
 id: string;
 url: string;
 name: string;
 createdAt: string;
}

export interface Request {
 id: string;
 code: number;
 status: string;
 priority: string;
 clinicalIndication: string;
 procedures: RequestProcedure[];
 attachments: RequestAttachment[];
 requestedAt: string;
 scheduledAt?: string;
 patientId: string;
 patient: {
 id: string;
 name: string;
 cpf: string;
 cns?: string;
 birthDate: string;
 gender: string;
 attentionLevel?: number;
 attentionNotes?: string | null;
 phones?: { id: string; phoneNumber: string; isWhatsapp: boolean }[];
 };
 requestingHealthCenterId: string;
 requestingHealthCenter: {
 id: string;
 name: string;
 };
 requestingUserId: string;
 requestingUser: {
 id: string;
 name: string;
 email: string;
 };
 requestingDoctorId: string;
 requestingDoctor: {
 id: string;
 name: string;
 crm: string;
 crmState: string;
 };
 sisregCode?: string;
 regnutsCode?: string;
 scheduledLocation?: string;
 regulatoryCenter?: string;
  cid10Code?: string;
  cid10?: {
    code: string;
    description: string;
  };
 history?: RequestHistory[];
 createdAt: string;
 updatedAt: string;
}

export const useRequests = (params: PaginationParams) => {
 const token = useAuthStore((state) => state.token);

 return useQuery<PaginatedResponse<Request>>({
 queryKey: ['requests', params],
 queryFn: async () => {
 const response = await axios.get(`${apiUrl}/requests`, {
 headers: { Authorization: `Bearer ${token}` },
 params: {
 ...params,
 _t: new Date().getTime(),
 },
 });
 return response.data;
 },
 enabled: !!token,
 });
};

export const useRequest = (id: string) => {
 const token = useAuthStore((state) => state.token);

 return useQuery<Request>({
 queryKey: ['requests', id],
 queryFn: async () => {
 const response = await axios.get(`${apiUrl}/requests/${id}`, {
 headers: { Authorization: `Bearer ${token}` },
 });
 return response.data;
 },
 enabled: !!token && !!id,
 });
};

export const useCreateRequest = () => {
 const token = useAuthStore((state) => state.token);
 const queryClient = useQueryClient();

 return useMutation<Request, Error, FormData>({
 mutationFn: async (formData) => {
 const response = await axios.post(`${apiUrl}/requests`, formData, {
 headers: {
 Authorization: `Bearer ${token}`,
 'Content-Type': 'multipart/form-data',
 },
 });
 return response.data;
 },
 onSuccess: () => {
 queryClient.invalidateQueries({ queryKey: ['requests'] });
 },
 });
};

export const useUpdateRequest = () => {
 const token = useAuthStore((state) => state.token);
 const queryClient = useQueryClient();

 return useMutation<Request, Error, { id: string; data: UpdateRequestInput }>({
 mutationFn: async ({ id, data }) => {
 const response = await axios.put(`${apiUrl}/requests/${id}`, data, {
 headers: { Authorization: `Bearer ${token}` },
 });
 return response.data;
 },
 onSuccess: (_, variables) => {
 queryClient.invalidateQueries({ queryKey: ['requests'] });
 queryClient.invalidateQueries({ queryKey: ['requests', variables.id] });
 },
 });
};

export const useUpdateRequestStatus = () => {
 const token = useAuthStore((state) => state.token);
 const queryClient = useQueryClient();

 return useMutation<
 Request,
 Error,
 { id: string; status: string; notes?: string; sisregCode?: string; regnutsCode?: string; scheduledLocation?: string; regulatoryCenter?: string }
 >({
 mutationFn: async ({ id, status, notes, sisregCode, regnutsCode, scheduledLocation, regulatoryCenter }) => {
 const response = await axios.patch(
 `${apiUrl}/requests/${id}/status`,
 { status, notes, sisregCode, regnutsCode, scheduledLocation, regulatoryCenter },
 {
 headers: { Authorization: `Bearer ${token}` },
 },
 );
 return response.data;
 },
 onSuccess: (_, variables) => {
 queryClient.invalidateQueries({ queryKey: ['requests'] });
 queryClient.invalidateQueries({ queryKey: ['requests', variables.id] });
 },
 });
};

export const useDeleteRequest = () => {
 const token = useAuthStore((state) => state.token);
 const queryClient = useQueryClient();

 return useMutation<void, Error, string>({
 mutationFn: async (id) => {
 await axios.delete(`${apiUrl}/requests/${id}`, {
 headers: { Authorization: `Bearer ${token}` },
 });
 },
 onSuccess: () => {
 queryClient.invalidateQueries({ queryKey: ['requests'] });
 },
 });
};

export interface CreateRequestProcedureInput {
 procedureId: string;
 side?: string;
 contrast?: boolean;
 sedation?: boolean;
}

export interface CreateRequestInput {
 patientId: string;
 procedures: CreateRequestProcedureInput[];
 clinicalIndication: string;
 requestingHealthCenterId?: string;
 status?: string;
 priority?: string;
 requestingDoctorId?: string;
 requestingDoctorName?: string;
 requestingDoctorCrm?: string;
 requestingDoctorCrmState?: string;
}

export interface UpdateRequestInput {
 patientId?: string;
 procedures?: CreateRequestProcedureInput[];
 clinicalIndication?: string;
 requestingHealthCenterId?: string;
 status?: string;
 priority?: string;
 scheduledAt?: string;
 sisregCode?: string;
 regnutsCode?: string;
 scheduledLocation?: string;
}

export const useImportSchedules = () => {
 const token = useAuthStore((state) => state.token);
 const queryClient = useQueryClient();

 return useMutation<
 { successCount: number; notFoundCount: number; errorCount: number; errors: string[] },
 Error,
 File
 >({
 mutationFn: async (file: File) => {
 const formData = new FormData();
 formData.append('file', file);

 const response = await axios.post(`${apiUrl}/requests/import-schedules`, formData, {
 headers: {
 Authorization: `Bearer ${token}`,
 'Content-Type': 'multipart/form-data',
 },
 });
 return response.data;
 },
 onSuccess: () => {
 queryClient.invalidateQueries({ queryKey: ['requests'] });
 },
 });
};

export const useSisregFicha = (code: string | undefined, enabled: boolean) => {
 const token = useAuthStore((state) => state.token);

 return useQuery<any>({
 queryKey: ['sisreg-ficha', code],
 queryFn: async () => {
 const response = await axios.get(`${apiUrl}/sisreg/requests/${code}/ficha`, {
 headers: { Authorization: `Bearer ${token}` },
 });
 return response.data;
 },
 enabled: !!token && !!code && enabled,
 });
};

export const useEmailRecipients = () => {
 const token = useAuthStore((state) => state.token);

 return useQuery<{ id: string; email: string; name?: string }[]>({
 queryKey: ['email-recipients'],
 queryFn: async () => {
 const response = await axios.get(`${apiUrl}/requests/email-recipients`, {
 headers: { Authorization: `Bearer ${token}` },
 });
 return response.data;
 },
 enabled: !!token,
 });
};

export const useSendRequestEmail = () => {
 const token = useAuthStore((state) => state.token);
 const queryClient = useQueryClient();

 return useMutation<
 { success: boolean; message: string },
 Error,
 { id: string; recipientEmail: string; subject?: string; body?: string }
 >({
 mutationFn: async ({ id, ...data }) => {
 const response = await axios.post(`${apiUrl}/requests/${id}/send-email`, data, {
 headers: { Authorization: `Bearer ${token}` },
 });
 return response.data;
 },
 onSuccess: (_, variables) => {
 queryClient.invalidateQueries({ queryKey: ['requests'] });
 queryClient.invalidateQueries({ queryKey: ['request', variables.id] });
 queryClient.invalidateQueries({ queryKey: ['email-recipients'] });
 },
 });
};


