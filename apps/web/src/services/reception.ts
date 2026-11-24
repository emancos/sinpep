import axios from 'axios';

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export interface SinpepScheduleSummary {
  scheduleId: string;
  doctorName: string;
  startTime: string;
  endTime: string;
  scheduleType: string;
}

export interface SpecialtyScheduleMeta {
  sources: Array<'ESUS' | 'SINPEP'>;
  esusCount: number;
  sinpepBookedCount: number;
  sinpepAvailableSlots: number;
  sinpepTotalSlots: number;
  sinpepSchedules: SinpepScheduleSummary[];
}

export interface ReceptionScheduleWithMeta {
  specialties: Record<string, any[]>;
  meta: {
    executingUnit: { name: string; cnes: string } | null;
    specialtyMeta: Record<string, SpecialtyScheduleMeta>;
  };
}

export const getReceptionSchedule = async (date: string, cnes: string, token: string) => {
  const response = await axios.get(`${apiUrl}/reception/schedule`, {
    params: { date, cnes },
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.data;
};

export const getReceptionScheduleWithMeta = async (
  date: string,
  cnes: string,
  token: string
): Promise<ReceptionScheduleWithMeta> => {
  const response = await axios.get(`${apiUrl}/reception/schedule`, {
    params: { date, cnes, includeMeta: 'true' },
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = response.data;
  if (data && typeof data === 'object' && 'specialties' in data && 'meta' in data) {
    return data as ReceptionScheduleWithMeta;
  }
  return {
    specialties: (data || {}) as Record<string, any[]>,
    meta: {
      executingUnit: null,
      specialtyMeta: {},
    },
  };
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

