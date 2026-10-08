import axios from 'axios';

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const getReceptionSchedule = async (date: string, cnes: string, token: string) => {
  const response = await axios.get(`${apiUrl}/reception/schedule`, {
    params: { date, cnes },
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.data;
};

export const enqueuePatient = async (patientId: string, specialtyName: string, date: string, esusSolicitacaoId: string, token: string) => {
  const response = await axios.post(`${apiUrl}/reception/enqueue`, {
    patientId, specialtyName, date, esusSolicitacaoId
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
