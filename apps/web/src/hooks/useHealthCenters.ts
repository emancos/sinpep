import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useAuthStore } from '../store/useAuthStore';
import type { PaginationParams, PaginatedResponse } from './types';

const apiUrl = (import.meta.env.VITE_API_URL as string) || 'http://localhost:3000';

export interface HealthCenter {
 id: string;
 name: string;
 cnes?: string;
 address?: string;
 nurseName?: string;
 healthAgents?: any[];
 isActive: boolean;
 createdAt: string;
 updatedAt: string;
}

export const useHealthCenters = (params: PaginationParams) => {
 const token = useAuthStore((state) => state.token);

 return useQuery<PaginatedResponse<HealthCenter>>({
 queryKey: ['health-centers', params],
 queryFn: async () => {
 const response = await axios.get(`${apiUrl}/health-centers`, {
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

export const useDeleteHealthCenter = () => {
 const token = useAuthStore((state) => state.token);
 const queryClient = useQueryClient();

 return useMutation<void, Error, string>({
 mutationFn: async (id) => {
 await axios.delete(`${apiUrl}/health-centers/${id}`, {
 headers: { Authorization: `Bearer ${token}` },
 });
 },
 onSuccess: () => {
 queryClient.invalidateQueries({ queryKey: ['health-centers'] });
 queryClient.invalidateQueries({ queryKey: ['patients'] });
 queryClient.invalidateQueries({ queryKey: ['requests'] });
 },
 });
};

export const useHealthCenter = (id: string) => {
 const token = useAuthStore((state) => state.token);

 return useQuery<HealthCenter & { healthAgents: any[]; patients: any[] }>({
 queryKey: ['health-centers', id],
 queryFn: async () => {
 const response = await axios.get(`${apiUrl}/health-centers/${id}`, {
 headers: {
 Authorization: `Bearer ${token}`,
 },
 });
 return response.data;
 },
 enabled: !!token && !!id,
 });
};

export const useCreateHealthCenter = () => {
 const token = useAuthStore((state) => state.token);
 const queryClient = useQueryClient();

 return useMutation<HealthCenter, Error, Partial<HealthCenter>>({
 mutationFn: async (data) => {
 const response = await axios.post(`${apiUrl}/health-centers`, data, {
 headers: {
 Authorization: `Bearer ${token}`,
 },
 });
 return response.data;
 },
 onSuccess: () => {
 queryClient.invalidateQueries({ queryKey: ['health-centers'] });
 },
 });
};

export const useUpdateHealthCenter = () => {
 const token = useAuthStore((state) => state.token);
 const queryClient = useQueryClient();

 return useMutation<HealthCenter, Error, { id: string; data: Partial<HealthCenter> }>({
 mutationFn: async ({ id, data }) => {
 const response = await axios.put(`${apiUrl}/health-centers/${id}`, data, {
 headers: {
 Authorization: `Bearer ${token}`,
 },
 });
 return response.data;
 },
 onSuccess: (_, { id }) => {
 queryClient.invalidateQueries({ queryKey: ['health-centers'] });
 queryClient.invalidateQueries({ queryKey: ['health-centers', id] });
 },
 });
};

export const useToggleHealthCenterActive = () => {
 const token = useAuthStore((state) => state.token);
 const queryClient = useQueryClient();

 return useMutation<void, Error, string>({
 mutationFn: async (id: string) => {
 await axios.patch(`${apiUrl}/health-centers/${id}/toggle-active`, {}, {
 headers: { Authorization: `Bearer ${token}` },
 });
 },
 onSuccess: () => {
 queryClient.invalidateQueries({ queryKey: ['health-centers'] });
 },
 });
};
