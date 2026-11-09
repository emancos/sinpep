import axios from 'axios';
import { useAuthStore } from '../store/useAuthStore';

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const getHeaders = () => {
  const token = useAuthStore.getState().token;
  return { Authorization: `Bearer ${token}` };
};

const downloadBlob = (blob: Blob, defaultFilename: string) => {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = defaultFilename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }, 100);
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

  /**
   * Exporta o relatório oficial em PDF ou CSV com download direto
   */
  exportReport: async (reportType: string, params: Record<string, any> = {}, defaultFilename: string) => {
    const res = await axios.get(`${apiUrl}/reports/${reportType}/export`, {
      headers: getHeaders(),
      params,
      responseType: 'blob',
    });

    let filename = defaultFilename;
    const disposition = res.headers['content-disposition'];
    if (disposition && disposition.includes('filename=')) {
      const match = disposition.match(/filename="?([^"]+)"?/);
      if (match && match[1]) filename = match[1];
    }

    downloadBlob(new Blob([res.data]), filename);
  },
};
