import axios from 'axios';

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const getReceptionSchedule = async (date: string, cnes: string, token: string) => {
  const response = await axios.get(`${apiUrl}/reception/schedule`, {
    params: { date, cnes },
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.data;
};

export const enqueuePatient = async (
  patientId: string,
  specialtyName: string,
  date: string,
  esusSolicitacaoId: string,
  esusData: any,
  token: string,
  priority: 'PRIORITARIO' | 'CONVENCIONAL' = 'CONVENCIONAL'
) => {
  const response = await axios.post(`${apiUrl}/reception/enqueue`, {
    patientId, specialtyName, date, esusSolicitacaoId, esusData, priority
  }, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.data;
};

export const createPatientFromEsus = async (payload: any, token: string) => {
  const response = await axios.post(`${apiUrl}/reception/patient-from-esus`, payload, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.data;
};

export const getQueueSettings = async (token: string) => {
  const response = await axios.get<{ rule: 'PRIORITY_FIRST' | 'INTERLEAVED' }>(`${apiUrl}/reception/queue-settings`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.data;
};

export const updateQueueSettings = async (rule: 'PRIORITY_FIRST' | 'INTERLEAVED', token: string) => {
  const response = await axios.post(`${apiUrl}/reception/queue-settings`, { rule }, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.data;
};

export const updateQueuePriority = async (queueId: string, priority: 'PRIORITARIO' | 'CONVENCIONAL', token: string) => {
  const response = await axios.patch(`${apiUrl}/reception/queue-priority`, { queueId, priority }, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.data;
};

