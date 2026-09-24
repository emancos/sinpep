import { useMutation } from '@tanstack/react-query';
import axios from 'axios';
import { toast } from 'sonner';
import { useAuthStore } from '../store/useAuthStore';

const apiUrl = (import.meta.env.VITE_API_URL as string) || 'http://localhost:3000';

export interface SyncResult {
 code: string;
 cns: string | null;
 patientName: string;
 procedure: string;
 sisregDate: string;
 syncStatus: 'Sucesso' | 'Ignorado' | 'Não Localizado';
 message: string;
 returnReason?: string | null;
}

export const useSisregSync = () => {
 const token = useAuthStore((state) => state.token);

 const syncReturned = useMutation({
 mutationFn: async ({ startDate, endDate }: { startDate: string; endDate: string }): Promise<SyncResult[]> => {
 const response = await axios.post(`${apiUrl}/sisreg/sync-returned`, { startDate, endDate }, {
 headers: { Authorization: `Bearer ${token}` }
 });
 return response.data;
 },
 onSuccess: (data) => {
 const successes = data.filter(d => d.syncStatus === 'Sucesso').length;
 if (successes > 0) {
 toast.success(`${successes} solicitação(ões) atualizadas para Devolvidas!`);
 } else {
 toast.info('Sincronização concluída. Nenhuma solicitação precisou ser atualizada.');
 }
 },
 onError: (error: any) => {
 toast.error(error.response?.data?.message || 'Erro ao sincronizar solicitações devolvidas.');
 },
 });

 const replyReturned = useMutation({
 mutationFn: async (payload: { requestCode: string; action: 'R' | 'C'; justification: string; cid?: string }): Promise<{ success: boolean; message: string }> => {
 const response = await axios.post(`${apiUrl}/sisreg/reply-returned`, payload, {
 headers: { Authorization: `Bearer ${token}` }
 });
 return response.data;
 },
 onSuccess: (data) => {
 toast.success(data.message);
 },
 onError: (error: any) => {
 toast.error(error.response?.data?.message || 'Erro ao responder solicitação no SISREG.');
 },
 });

 const syncCanceled = useMutation({
 mutationFn: async ({ startDate, endDate }: { startDate: string; endDate: string }): Promise<SyncResult[]> => {
 const response = await axios.post(`${apiUrl}/sisreg/sync-canceled`, { startDate, endDate }, {
 headers: { Authorization: `Bearer ${token}` }
 });
 return response.data;
 },
 onSuccess: (data) => {
 const successes = data.filter(d => d.syncStatus === 'Sucesso').length;
 if (successes > 0) {
 toast.success(`${successes} solicitação(ões) atualizadas para Canceladas!`);
 } else {
 toast.info('Sincronização concluída. Nenhuma solicitação precisou ser atualizada.');
 }
 },
 onError: (error: any) => {
 toast.error(error.response?.data?.message || 'Erro ao sincronizar solicitações canceladas.');
 },
 });

 const syncReRequested = useMutation({
 mutationFn: async ({ startDate, endDate }: { startDate: string; endDate: string }): Promise<SyncResult[]> => {
 const response = await axios.post(`${apiUrl}/sisreg/sync-rerequested`, { startDate, endDate }, {
 headers: { Authorization: `Bearer ${token}` }
 });
 return response.data;
 },
 onSuccess: (data) => {
 const successes = data.filter(d => d.syncStatus === 'Sucesso').length;
 if (successes > 0) {
 toast.success(`${successes} solicitação(ões) atualizadas para Reenviadas!`);
 } else {
 toast.info('Sincronização concluída. Nenhuma solicitação precisou ser atualizada.');
 }
 },
 onError: (error: any) => {
 toast.error(error.response?.data?.message || 'Erro ao sincronizar solicitações reenviadas.');
 },
 });

 const syncDenied = useMutation({
 mutationFn: async ({ startDate, endDate }: { startDate: string; endDate: string }): Promise<SyncResult[]> => {
 const response = await axios.post(`${apiUrl}/sisreg/sync-denied`, { startDate, endDate }, {
 headers: { Authorization: `Bearer ${token}` }
 });
 return response.data;
 },
 onSuccess: (data) => {
 const successes = data.filter(d => d.syncStatus === 'Sucesso').length;
 if (successes > 0) {
 toast.success(`${successes} solicitação(ões) atualizadas para Negadas!`);
 } else {
 toast.info('Sincronização concluída. Nenhuma solicitação precisou ser atualizada.');
 }
 },
 onError: (error: any) => {
 toast.error(error.response?.data?.message || 'Erro ao sincronizar solicitações negadas.');
 },
 });

 return {
 syncReturned,
 syncCanceled,
 syncReRequested,
 syncDenied,
 replyReturned,
 };
};
