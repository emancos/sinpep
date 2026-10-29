import axios from 'axios';

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export interface Medication {
  id: string;
  name: string;
  processNumber?: string;
  registrationNumber?: string;
  laboratoryId?: string;
  laboratory?: string;
  laboratoryCnpj?: string;
  category?: string;
  referenceMedicine?: string;
  stripe?: string;
  status: string;
  isActive: boolean;
  substanceDescription?: string;
  dosage?: string;
  substanceWithDosage?: string;
  complement?: string;
  atcCode?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MedicationStats {
  total: number;
  active: number;
  inactive: number;
  withDosage: number;
  laboratories: number;
  substances: number;
}

export interface MedicationsResponse {
  data: Medication[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface GetMedicationsParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  includeInactive?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export const getMedications = async (
  params: GetMedicationsParams,
  token: string
): Promise<MedicationsResponse> => {
  const res = await axios.get(`${apiUrl}/medications`, {
    params,
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
};

export const getMedicationStats = async (token: string): Promise<MedicationStats> => {
  const res = await axios.get(`${apiUrl}/medications/stats`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
};

export const getMedicationById = async (id: string, token: string): Promise<Medication> => {
  const res = await axios.get(`${apiUrl}/medications/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
};

export const createMedication = async (
  data: Partial<Medication> & { laboratoryName?: string },
  token: string
): Promise<Medication> => {
  const res = await axios.post(`${apiUrl}/medications`, data, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
};

export const updateMedication = async (
  id: string,
  data: Partial<Medication>,
  token: string
): Promise<Medication> => {
  const res = await axios.put(`${apiUrl}/medications/${id}`, data, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
};

export const toggleMedicationActive = async (
  id: string,
  token: string
): Promise<{ id: string; isActive: boolean; status: string }> => {
  const res = await axios.patch(
    `${apiUrl}/medications/${id}/toggle-active`,
    {},
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  return res.data;
};

export const deleteMedication = async (
  id: string,
  token: string
): Promise<{ success: boolean; id: string }> => {
  const res = await axios.delete(`${apiUrl}/medications/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
};

export interface ImportCsvResponse {
  success: boolean;
  totalProcessed: number;
  totalActive: number;
  totalWithDosage: number;
  durationMs: number;
  laboratoriesCount: number;
  substancesCount: number;
}

export const importMedicationsCsv = async (
  file: File,
  token: string,
  onUploadProgress?: (progressEvent: any) => void
): Promise<ImportCsvResponse> => {
  const formData = new FormData();
  formData.append('file', file);

  const res = await axios.post(`${apiUrl}/medications/import-csv`, formData, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'multipart/form-data',
    },
    timeout: 300000, // 5 minutes timeout for huge CSV files
    onUploadProgress,
  });
  return res.data;
};

export const syncLocalMedicationsCsv = async (token: string): Promise<ImportCsvResponse> => {
  const res = await axios.post(
    `${apiUrl}/medications/sync-local-csv`,
    {},
    {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 300000,
    }
  );
  return res.data;
};

