import axios from 'axios';
import { useAuthStore } from '../store/useAuthStore';

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const getHeaders = () => {
  const token = useAuthStore.getState().token;
  return { Authorization: `Bearer ${token}` };
};

export const reportsService = {
  getEpidemiological: async () => {
    const { data } = await axios.get(`${apiUrl}/reports/epidemiological`, { headers: getHeaders() });
    return data;
  },
  getOperational: async () => {
    const { data } = await axios.get(`${apiUrl}/reports/operational`, { headers: getHeaders() });
    return data;
  },
  getProcedures: async () => {
    const { data } = await axios.get(`${apiUrl}/reports/procedures`, { headers: getHeaders() });
    return data;
  },
  getPharmacy: async () => {
    const { data } = await axios.get(`${apiUrl}/reports/pharmacy`, { headers: getHeaders() });
    return data;
  },
  getRegulation: async (params?: any) => {
    const { data } = await axios.get(`${apiUrl}/reports/regulation`, {
      headers: getHeaders(),
      params,
    });
    return data;
  },
  getSolicitor: async (params?: any) => {
    const { data } = await axios.get(`${apiUrl}/reports/solicitor`, {
      headers: getHeaders(),
      params,
    });
    return data;
  },
  getUnitOperational: async (params?: any) => {
    const { data } = await axios.get(`${apiUrl}/reports/unit-operational`, {
      headers: getHeaders(),
      params,
    });
    return data;
  },
  getDoctorProduction: async (params?: any) => {
    const { data } = await axios.get(`${apiUrl}/reports/doctor-production`, {
      headers: getHeaders(),
      params,
    });
    return data;
  },
  getReceptionAttendance: async (params?: any) => {
    const { data } = await axios.get(`${apiUrl}/reports/reception-attendance`, {
      headers: getHeaders(),
      params,
    });
    return data;
  },
};
