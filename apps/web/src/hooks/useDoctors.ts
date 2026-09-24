import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useAuthStore } from '../store/useAuthStore';
import type { PaginationParams, PaginatedResponse } from './types';

const apiUrl = (import.meta.env.VITE_API_URL as string) || 'http://localhost:3000';

export interface Specialty {
 id: string;
 name: string;
 description?: string | null;
 active: boolean;
}

export interface DoctorSpecialty {
 specialtyId: string;
 specialty: Specialty;
}

export interface Doctor {
 id: string;
 name: string;
 crm: string;
 crmState: string;
 userId?: string | null;
 doctorSpecialties: DoctorSpecialty[];
 active: boolean;
 createdAt: string;
 updatedAt: string;
}

export interface User {
 id: string;
 name: string;
 email: string;
}

export const useDoctors = (params: PaginationParams) => {
 const token = useAuthStore((state) => state.token);

 return useQuery<PaginatedResponse<Doctor>>({
 queryKey: ['doctors', params],
 queryFn: async () => {
 const response = await axios.get(`${apiUrl}/doctors`, {
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

export const useDeleteDoctor = () => {
 const token = useAuthStore((state) => state.token);
 const queryClient = useQueryClient();

 return useMutation<void, Error, string>({
 mutationFn: async (id) => {
 await axios.delete(`${apiUrl}/doctors/${id}`, {
 headers: { Authorization: `Bearer ${token}` },
 });
 },
 onSuccess: () => {
 queryClient.invalidateQueries({ queryKey: ['doctors'] });
 queryClient.invalidateQueries({ queryKey: ['requests'] });
 },
 });
};

export const useDoctor = (id: string) => {
 const token = useAuthStore((state) => state.token);

 return useQuery<Doctor>({
 queryKey: ['doctors', id],
 queryFn: async () => {
 const response = await axios.get(`${apiUrl}/doctors/${id}`, {
 headers: {
 Authorization: `Bearer ${token}`,
 },
 });
 return response.data;
 },
 enabled: !!token && !!id,
 });
};

export const useSpecialties = (includeInactive: boolean = false) => {
 const token = useAuthStore((state) => state.token);

 return useQuery<Specialty[]>({
 queryKey: ['specialties', includeInactive],
 queryFn: async () => {
 const params = new URLSearchParams();
 if (includeInactive) params.append('includeInactive', 'true');
 
 const response = await axios.get(`${apiUrl}/specialties${params.toString() ? `?${params.toString()}` : ''}`, {
 headers: {
 Authorization: `Bearer ${token}`,
 },
 });
 return response.data;
 },
 enabled: !!token,
 });
};

export const useCreateSpecialty = () => {
 const token = useAuthStore((state) => state.token);
 const queryClient = useQueryClient();

 return useMutation<Specialty, Error, { name: string; description?: string }>({
 mutationFn: async (data) => {
 const response = await axios.post(`${apiUrl}/specialties`, data, {
 headers: { Authorization: `Bearer ${token}` },
 });
 return response.data;
 },
 onSuccess: () => {
 queryClient.invalidateQueries({ queryKey: ['specialties'] });
 },
 });
};

export const useUpdateSpecialty = () => {
 const token = useAuthStore((state) => state.token);
 const queryClient = useQueryClient();

 return useMutation<Specialty, Error, { id: string; data: { name: string; description?: string } }>({
 mutationFn: async ({ id, data }) => {
 const response = await axios.put(`${apiUrl}/specialties/${id}`, data, {
 headers: { Authorization: `Bearer ${token}` },
 });
 return response.data;
 },
 onSuccess: () => {
 queryClient.invalidateQueries({ queryKey: ['specialties'] });
 queryClient.invalidateQueries({ queryKey: ['doctors'] });
 },
 });
};

export const useDeleteSpecialty = () => {
 const token = useAuthStore((state) => state.token);
 const queryClient = useQueryClient();

 return useMutation<void, Error, string>({
 mutationFn: async (id) => {
 await axios.delete(`${apiUrl}/specialties/${id}`, {
 headers: { Authorization: `Bearer ${token}` },
 });
 },
 onSuccess: () => {
 queryClient.invalidateQueries({ queryKey: ['specialties'] });
 queryClient.invalidateQueries({ queryKey: ['doctors'] });
 },
 });
};

export const useToggleSpecialtyActive = () => {
 const token = useAuthStore((state) => state.token);
 const queryClient = useQueryClient();

 return useMutation<void, Error, string>({
 mutationFn: async (id) => {
 await axios.patch(`${apiUrl}/specialties/${id}/toggle-active`, {}, {
 headers: { Authorization: `Bearer ${token}` },
 });
 },
 onSuccess: () => {
 queryClient.invalidateQueries({ queryKey: ['specialties'] });
 },
 });
};

export const useUsers = () => {
 const token = useAuthStore((state) => state.token);

 return useQuery<User[]>({
 queryKey: ['users'],
 queryFn: async () => {
 const response = await axios.get(`${apiUrl}/users`, {
 headers: {
 Authorization: `Bearer ${token}`,
 },
 });
 return response.data;
 },
 enabled: !!token,
 });
};

export const useCreateDoctor = () => {
 const token = useAuthStore((state) => state.token);
 const queryClient = useQueryClient();

 return useMutation<Doctor, Error, Partial<Doctor> & { specialtyIds?: string[] }>({
 mutationFn: async (data) => {
 const response = await axios.post(`${apiUrl}/doctors`, data, {
 headers: { Authorization: `Bearer ${token}` },
 });
 return response.data;
 },
 onSuccess: () => {
 queryClient.invalidateQueries({ queryKey: ['doctors'] });
 },
 });
};

export const useUpdateDoctor = () => {
 const token = useAuthStore((state) => state.token);
 const queryClient = useQueryClient();

 return useMutation<Doctor, Error, { id: string; data: Partial<Doctor> & { specialtyIds?: string[] } }>({
 mutationFn: async ({ id, data }) => {
 const response = await axios.put(`${apiUrl}/doctors/${id}`, data, {
 headers: { Authorization: `Bearer ${token}` },
 });
 return response.data;
 },
 onSuccess: (_, { id }) => {
 queryClient.invalidateQueries({ queryKey: ['doctors'] });
 queryClient.invalidateQueries({ queryKey: ['doctors', id] });
 queryClient.invalidateQueries({ queryKey: ['requests'] });
 },
 });
};

export const useToggleDoctorActive = () => {
 const token = useAuthStore((state) => state.token);
 const queryClient = useQueryClient();

 return useMutation<void, Error, string>({
 mutationFn: async (id: string) => {
 await axios.patch(`${apiUrl}/doctors/${id}/toggle-active`, {}, {
 headers: { Authorization: `Bearer ${token}` },
 });
 },
 onSuccess: () => {
 queryClient.invalidateQueries({ queryKey: ['doctors'] });
 },
 });
};
