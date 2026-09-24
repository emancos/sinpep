import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useAuthStore } from '../store/useAuthStore';

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export interface SisregExtractionItem {
 id: string;
 extractionId: string;
 sisregRequestCode: string;
 sisregAppointmentCode: string;
 patientName: string;
 patientCpf?: string;
 patientCns?: string;
 patientPhone?: string;
 procedureName: string;
 procedureSigtapCode?: string;
 cidCode?: string;
 appointmentDate: string;
 executionUnit: string;
 confirmationKey?: string;
 regulatoryCenterCode: string;
 regulatoryCenterName: string;
 status: string;
 isNew: boolean;
 rawJson: any;
 createdAt: string;
 localRequestId?: string | null;
 localRequestStatus?: string | null;
}

export interface SisregExtraction {
 id: string;
 startDate: string;
 endDate: string;
 extractedAt: string;
 totalItems: number;
 newScheduledCount: number;
 extractedByUser?: {
 name: string;
 email: string;
 };
 items?: SisregExtractionItem[];
}

export interface NotificationItem {
 id: string;
 title: string;
 message: string;
 type: string;
 link?: string;
 createdAt: string;
}

export const useExtractOfficial = () => {
 const queryClient = useQueryClient();
 const token = useAuthStore((state: any) => state.token);

 return useMutation({
 mutationFn: async ({ startDate, endDate }: { startDate: string; endDate: string }) => {
 const response = await axios.post<SisregExtraction>(
 `${apiUrl}/sisreg/official/extract`,
 { startDate, endDate },
 { headers: { Authorization: `Bearer ${token}` } }
 );
 return response.data;
 },
 onSuccess: () => {
 queryClient.invalidateQueries({ queryKey: ['sisreg-extractions'] });
 queryClient.invalidateQueries({ queryKey: ['notifications'] });
 },
 });
};

export const useOfficialExtractions = () => {
 const token = useAuthStore((state: any) => state.token);

 return useQuery<SisregExtraction[]>({
 queryKey: ['sisreg-extractions'],
 queryFn: async () => {
 const response = await axios.get(`${apiUrl}/sisreg/official/extractions`, {
 headers: { Authorization: `Bearer ${token}` },
 });
 return response.data;
 },
 enabled: !!token,
 });
};

export const useOfficialExtractionById = (id: string | null) => {
 const token = useAuthStore((state: any) => state.token);

 return useQuery<SisregExtraction>({
 queryKey: ['sisreg-extraction', id],
 queryFn: async () => {
 const response = await axios.get(`${apiUrl}/sisreg/official/extractions/${id}`, {
 headers: { Authorization: `Bearer ${token}` },
 });
 return response.data;
 },
 enabled: !!token && !!id,
 });
};

export const useNotifications = () => {
 const token = useAuthStore((state: any) => state.token);

 return useQuery<NotificationItem[]>({
 queryKey: ['notifications'],
 queryFn: async () => {
 const response = await axios.get(`${apiUrl}/sisreg/notifications`, {
 headers: { Authorization: `Bearer ${token}` },
 });
 return response.data;
 },
 enabled: !!token,
 refetchInterval: 60000,
 });
};

export const useOfficialAppointmentDetails = (code: string | undefined) => {
 const token = useAuthStore((state: any) => state.token);

 return useQuery<any>({
 queryKey: ['sisreg-official-details', code],
 queryFn: async () => {
 const response = await axios.get(`${apiUrl}/sisreg/official/details/${code}`, {
 headers: { Authorization: `Bearer ${token}` },
 });
 return response.data;
 },
 enabled: !!token && !!code,
 });
};
