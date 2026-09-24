import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useAuthStore } from '../store/useAuthStore';
import type { PaginationParams, PaginatedResponse } from './types';

const apiUrl = (import.meta.env.VITE_API_URL as string) || 'http://localhost:3000';

export interface HealthCenter {
 id: string;
 name: string;
}

export interface HealthAgent {
 id: string;
 name: string;
 phone?: string;
 microArea?: string;
 healthCenterId: string;
 healthCenter: HealthCenter;
 active: boolean;
 createdAt: string;
 updatedAt: string;
}

export const useHealthAgents = (params: PaginationParams) => {
 const token = useAuthStore((state) => state.token);

 return useQuery<PaginatedResponse<HealthAgent>>({
 queryKey: ['health-agents', params],
 queryFn: async () => {
 const response = await axios.get(`${apiUrl}/health-agents`, {
 headers: {
 Authorization: `Bearer ${token}`,
 },
 params,
 });
 return response.data;
 },
 enabled: !!token,
 });
};

export const useDeleteHealthAgent = () => {
 const token = useAuthStore((state) => state.token);
 const queryClient = useQueryClient();

 return useMutation<void, Error, string>({
 mutationFn: async (id) => {
 await axios.delete(`${apiUrl}/health-agents/${id}`, {
 headers: { Authorization: `Bearer ${token}` },
 });
 },
 onSuccess: () => {
 queryClient.invalidateQueries({ queryKey: ['health-agents'] });
 queryClient.invalidateQueries({ queryKey: ['health-centers'] });
 queryClient.invalidateQueries({ queryKey: ['patients'] });
 queryClient.invalidateQueries({ queryKey: ['requests'] });
 },
 });
};

export const useToggleHealthAgentActive = () => {
 const token = useAuthStore((state) => state.token);
 const queryClient = useQueryClient();

 return useMutation<void, Error, string>({
 mutationFn: async (id) => {
 await axios.patch(`${apiUrl}/health-agents/${id}/toggle-active`, {}, {
 headers: { Authorization: `Bearer ${token}` },
 });
 },
 onSuccess: () => {
 queryClient.invalidateQueries({ queryKey: ['health-agents'] });
 queryClient.invalidateQueries({ queryKey: ['health-centers'] });
 queryClient.invalidateQueries({ queryKey: ['patients'] });
 },
 });
};

export const useCreateHealthAgent = () => {
 const token = useAuthStore((state) => state.token);
 const queryClient = useQueryClient();

 return useMutation<HealthAgent, Error, Partial<HealthAgent>>({
 mutationFn: async (data) => {
 const response = await axios.post(`${apiUrl}/health-agents`, data, {
 headers: { Authorization: `Bearer ${token}` },
 });
 return response.data;
 },
 onSuccess: () => {
 queryClient.invalidateQueries({ queryKey: ['health-agents'] });
 queryClient.invalidateQueries({ queryKey: ['health-centers'] });
 },
 });
};

export const useUpdateHealthAgent = () => {
 const token = useAuthStore((state) => state.token);
 const queryClient = useQueryClient();

 return useMutation<HealthAgent, Error, { id: string; data: Partial<HealthAgent> }>({
 mutationFn: async ({ id, data }) => {
 const response = await axios.put(`${apiUrl}/health-agents/${id}`, data, {
 headers: { Authorization: `Bearer ${token}` },
 });
 return response.data;
 },
 onSuccess: (_, { id }) => {
 queryClient.invalidateQueries({ queryKey: ['health-agents'] });
 queryClient.invalidateQueries({ queryKey: ['health-centers'] });
 queryClient.invalidateQueries({ queryKey: ['health-agents', id] });
 },
 });
};
