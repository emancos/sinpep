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
 active: boolean;
}

export interface Procedure {
 id: string;
 code: string;
 name: string;
 procedureGroupId: string;
 procedureGroup: ProcedureGroup;
 variants: ProcedureVariant[];
 genderAllowed: 'AMBOS' | 'FEMININO' | 'MASCULINO';
 minAge: number;
 maxAge: number;
 active: boolean;
 createdAt: string;
 updatedAt: string;
}

export const useProcedures = (params: PaginationParams) => {
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

export const useCreateProcedure = () => {
 const token = useAuthStore((state) => state.token);
 const queryClient = useQueryClient();

 return useMutation<Procedure, Error, { code: string; name: string; procedureGroupId: string; genderAllowed?: string; minAge?: number; maxAge?: number }>({
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

 return useMutation<Procedure, Error, { id: string; data: { code?: string; name?: string; procedureGroupId?: string; genderAllowed?: string; minAge?: number; maxAge?: number } }>({
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
