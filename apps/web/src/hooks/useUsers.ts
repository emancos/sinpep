import { useMutation } from '@tanstack/react-query';
import axios from 'axios';
import { useAuthStore } from '../store/useAuthStore';

const apiUrl = (import.meta.env.VITE_API_URL as string) || 'http://localhost:3000';

export interface UpdateProfileInput {
 name?: string;
 phone?: string;
 password?: string;
 avatarFile?: File;
 sisregUsername?: string;
 sisregPassword?: string;
}

export const useUpdateProfile = () => {
 const token = useAuthStore((state) => state.token);
 const updateUser = useAuthStore((state) => state.updateUser);

 return useMutation({
 mutationFn: async (input: UpdateProfileInput) => {
 const formData = new FormData();
 if (input.name) formData.append('name', input.name);
 if (input.phone !== undefined) formData.append('phone', input.phone);
 if (input.password) formData.append('password', input.password);
 if (input.avatarFile) formData.append('avatar', input.avatarFile);
 if (input.sisregUsername !== undefined) formData.append('sisregUsername', input.sisregUsername);
 if (input.sisregPassword) formData.append('sisregPassword', input.sisregPassword);

 const response = await axios.put(`${apiUrl}/users/profile`, formData, {
 headers: {
 Authorization: `Bearer ${token}`,
 'Content-Type': 'multipart/form-data',
 },
 });
 return response.data;
 },
 onSuccess: (data) => {
 // Update local storage and zustand store with new user fields
 updateUser({
 name: data.name,
 phone: data.phone,
 avatar: data.avatar,
 sisregUsername: data.sisregUsername,
 });
 },
 });
};

export interface UserList {
  id: string;
  email: string;
  name: string;
  phone?: string;
  avatar?: string;
  isActive: boolean;
  isMunicipalRegulator?: boolean;
  createdAt: string;
  profile?: {
    id: string;
    name: string;
  };
  healthCenter?: {
    id: string;
    name: string;
    cnes?: string;
  };
  userProfiles?: Array<{
    id: string;
    profileId: string;
    isDefault: boolean;
    profile: { id: string; name: string };
  }>;
  userHealthCenters?: Array<{
    id: string;
    healthCenterId: string;
    isDefault: boolean;
    healthCenter: { id: string; name: string; cnes?: string };
  }>;
}

export const useUsers = () => {
 const token = useAuthStore((state) => state.token);
 return import('@tanstack/react-query').then(({ useQuery }) => 
 useQuery({
 queryKey: ['users'],
 queryFn: async () => {
 const { data } = await axios.get(`${apiUrl}/users`, {
 headers: { Authorization: `Bearer ${token}` },
 });
 return data as UserList[];
 },
 })
 );
};

// Create a synchronous version since it's cleaner to use useQuery directly
import { useQuery, useQueryClient } from '@tanstack/react-query';

export const useUsersQuery = (includeInactive: boolean = false) => {
 const token = useAuthStore((state) => state.token);
 return useQuery({
 queryKey: ['users', includeInactive],
 queryFn: async () => {
 const params = new URLSearchParams();
 if (includeInactive) params.append('includeInactive', 'true');
 
 const { data } = await axios.get(`${apiUrl}/users${params.toString() ? `?${params.toString()}` : ''}`, {
 headers: { Authorization: `Bearer ${token}` },
 });
 return data as UserList[];
 },
 });
};

export const useUser = (id?: string) => {
 const token = useAuthStore((state) => state.token);
 return useQuery({
 queryKey: ['users', id],
 queryFn: async () => {
 if (!id) return null;
 const { data } = await axios.get(`${apiUrl}/users/${id}`, {
 headers: { Authorization: `Bearer ${token}` },
 });
 return data;
 },
 enabled: !!id,
 });
};

export const usePermissions = () => {
 const token = useAuthStore((state) => state.token);
 return useQuery({
 queryKey: ['permissions'],
 queryFn: async () => {
 const { data } = await axios.get(`${apiUrl}/permissions`, {
 headers: { Authorization: `Bearer ${token}` },
 });
 return data as { id: string; name: string; description: string }[];
 },
 });
};

export const useProfiles = () => {
 const token = useAuthStore((state) => state.token);
 return useQuery({
 queryKey: ['profiles'],
 queryFn: async () => {
 const { data } = await axios.get(`${apiUrl}/profiles`, {
 headers: { Authorization: `Bearer ${token}` },
 });
 return data as { 
 id: string; 
 name: string; 
 description: string;
 profilePermissions: { permissionId: string, permission: { id: string, name: string } }[] 
 }[];
 },
 });
};

export const useCreateUser = () => {
 const token = useAuthStore((state) => state.token);
 const queryClient = useQueryClient();

 return useMutation({
 mutationFn: async (userData: any) => {
 const { data } = await axios.post(`${apiUrl}/users`, userData, {
 headers: { Authorization: `Bearer ${token}` },
 });
 return data;
 },
 onSuccess: () => {
 queryClient.invalidateQueries({ queryKey: ['users'] });
 },
 });
};

export const useUpdateUser = () => {
 const token = useAuthStore((state) => state.token);
 const queryClient = useQueryClient();

 return useMutation({
 mutationFn: async ({ id, ...userData }: { id: string } & any) => {
 const { data } = await axios.put(`${apiUrl}/users/${id}`, userData, {
 headers: { Authorization: `Bearer ${token}` },
 });
 return data;
 },
 onSuccess: (_, variables) => {
 queryClient.invalidateQueries({ queryKey: ['users'] });
 queryClient.invalidateQueries({ queryKey: ['users', variables.id] });
 },
 });
};

export const useDeleteUser = () => {
 const token = useAuthStore((state) => state.token);
 const queryClient = useQueryClient();

 return useMutation({
 mutationFn: async (id: string) => {
 const { data } = await axios.delete(`${apiUrl}/users/${id}`, {
 headers: { Authorization: `Bearer ${token}` },
 });
 return data;
 },
 onSuccess: () => {
 queryClient.invalidateQueries({ queryKey: ['users'] });
 },
 });
};

export const useToggleUserActive = () => {
 const token = useAuthStore((state) => state.token);
 const queryClient = useQueryClient();

 return useMutation({
 mutationFn: async (id: string) => {
 const { data } = await axios.patch(`${apiUrl}/users/${id}/toggle-active`, {}, {
 headers: { Authorization: `Bearer ${token}` },
 });
 return data;
 },
 onSuccess: () => {
 queryClient.invalidateQueries({ queryKey: ['users'] });
 },
 });
};

