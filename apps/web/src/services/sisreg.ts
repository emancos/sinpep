import axios from 'axios';
import { useAuthStore } from '../store/useAuthStore';

const apiUrl = (import.meta.env.VITE_API_URL as string) || 'http://localhost:3000';

export interface SisregPatientData {
 nome: string;
 cns: string;
 cpf?: string;
 dataNascimento: string; // usually DD/MM/YYYY
 gender?: string;
 address?: {
 zipCode?: string;
 street?: string;
 number?: string;
 complement?: string;
 neighborhood?: string;
 city?: string;
 state?: string;
 };
}

export const fetchPatientFromSisreg = async (cpf: string): Promise<SisregPatientData> => {
 const token = useAuthStore.getState().token;
 const response = await axios.get(`${apiUrl}/sisreg/patients/${cpf}`, {
 headers: { Authorization: `Bearer ${token}` }
 });
 return response.data;
};

export const fetchProcedimentos = async (cns: string) => {
 const token = useAuthStore.getState().token;
 const response = await axios.get(`${apiUrl}/sisreg/procedimentos`, {
 params: { cns },
 headers: { Authorization: `Bearer ${token}` }
 });
 return response.data;
};

export const fetchCentrais = async (pa: string) => {
 const token = useAuthStore.getState().token;
 const response = await axios.get(`${apiUrl}/sisreg/centrais`, {
 params: { pa },
 headers: { Authorization: `Bearer ${token}` }
 });
 return response.data;
};

export const fetchItensGrupo = async (payload: any) => {
 const token = useAuthStore.getState().token;
 const response = await axios.post(`${apiUrl}/sisreg/itens-grupo`, payload, {
 headers: { Authorization: `Bearer ${token}` }
 });
 return response.data;
};

export const verificarVagas = async (payload: any) => {
 const token = useAuthStore.getState().token;
 const response = await axios.post(`${apiUrl}/sisreg/verificar-vagas`, payload, {
 headers: { Authorization: `Bearer ${token}` }
 });
 return response.data;
};

export const confirmarSolicitacao = async (payload: any) => {
 const token = useAuthStore.getState().token;
 const response = await axios.post(`${apiUrl}/sisreg/confirmar`, payload, {
 headers: { Authorization: `Bearer ${token}` }
 });
 return response.data;
};
