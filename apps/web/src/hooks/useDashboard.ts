import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useAuthStore } from '../store/useAuthStore';

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export interface DashboardStats {
 overview: {
 totalPatients: number;
 totalProcedures: number;
 totalRequests: number;
 };
 requestsByStatus: {
 status: string;
 count: number;
 }[];
 requestsByPriority: {
 priority: string;
 count: number;
 }[];
 recentRequests: any[];
}

export const useDashboardStats = () => {
 const token = useAuthStore((state) => state.token);

 return useQuery<DashboardStats, Error>({
 queryKey: ['dashboard-stats'],
 queryFn: async () => {
 const response = await axios.get(`${apiUrl}/dashboard/stats`, {
 headers: { Authorization: `Bearer ${token}` },
 });
 return response.data;
 },
 enabled: !!token,
 });
};
