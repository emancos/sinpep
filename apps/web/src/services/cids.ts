import axios from 'axios';
import { useAuthStore } from '../store/useAuthStore';

const apiUrl = (import.meta.env.VITE_API_URL as string) || 'http://localhost:3000';

export interface Cid10Data {
  code: string;
  description: string;
}

export const searchCids = async (term: string): Promise<Cid10Data[]> => {
  const token = useAuthStore.getState().token;
  const response = await axios.get(`${apiUrl}/cids`, {
    params: { search: term },
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.data;
};
