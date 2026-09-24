import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useAuthStore } from '../store/useAuthStore';

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export interface ReportItem {
 id: string;
 code: number;
 patientName: string;
 patientCpf: string;
 procedures: string;
 healthCenter: string;
 status: string;
 priority: string;
 createdAt: string;
 updatedAt: string;
 scheduledAt: string | null;
}

export const useGeneralReport = (filters: { startDate?: string; endDate?: string; status?: string; healthCenterId?: string; regulatoryCenter?: string }) => {
 const token = useAuthStore((state) => state.token);

 return useQuery<ReportItem[], Error>({
 queryKey: ['reports-general', filters],
 queryFn: async () => {
 const response = await axios.get(`${apiUrl}/reports/general`, {
 headers: { Authorization: `Bearer ${token}` },
 params: filters,
 });
 return response.data;
 },
 enabled: !!token,
 });
};

export interface RegulatoryCenterReportItem {
 regulatoryCenter: string;
 total: number;
 scheduled: number;
 returned: number;
 pending: number;
 canceled: number;
 requests: ReportItem[];
}

export const useRegulatoryCenterReport = (filters: { startDate?: string; endDate?: string; status?: string; healthCenterId?: string; regulatoryCenter?: string }) => {
 const token = useAuthStore((state) => state.token);

 return useQuery<RegulatoryCenterReportItem[], Error>({
 queryKey: ['reports-regulatory-center', filters],
 queryFn: async () => {
 const response = await axios.get(`${apiUrl}/reports/regulatory-center`, {
 headers: { Authorization: `Bearer ${token}` },
 params: filters,
 });
 return response.data;
 },
 enabled: !!token,
 });
};
