import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useAuthStore } from '../store/useAuthStore';

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export interface MedicalRecordAttachment {
  id: string;
  fileName: string;
  fileType: string;
  fileUrl: string;
  fileSize: number;
}

export interface MedicalRecord {
  id: string;
  patientId: string;
  doctorId: string;
  recordDate: string;
  observation: string;
  cid10?: string;
  returnRequestedValue?: number;
  returnRequestedUnit?: string;
  isActive?: boolean;
  medications: any[];
  medicationsJustification?: string;
  requestedExams: any[];
  examsJustification?: string;
  attachments: MedicalRecordAttachment[];
  doctor: {
    id: string;
    name: string;
    avatar?: string;
    doctors?: {
      crm: string;
      crmState: string;
      cns?: string;
      doctorSpecialties?: {
        specialty: {
          name: string;
        }
      }[];
    }[];
  };
}

export const useMedicalRecords = (patientId: string, options?: { enabled?: boolean }) => {
  const token = useAuthStore((state) => state.token);

  return useQuery<{ data: MedicalRecord[], total: number }>({
    queryKey: ['medical-records', patientId],
    queryFn: async () => {
      const response = await axios.get(`${apiUrl}/patients/${patientId}/medical-records`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data;
    },
    enabled: !!token && !!patientId && (options?.enabled !== false),
  });
};

export const useCreateMedicalRecord = () => {
  const queryClient = useQueryClient();
  const token = useAuthStore((state) => state.token);

  return useMutation({
    mutationFn: async ({ patientId, formData }: { patientId: string, formData: FormData }) => {
      const response = await axios.post(`${apiUrl}/patients/${patientId}/medical-records`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['medical-records', variables.patientId] });
      queryClient.invalidateQueries({ queryKey: ['medical-records', 'recent'] });
      queryClient.invalidateQueries({ queryKey: ['reception-schedule'] });
    },
  });
};

export interface RecentMedicalRecordItem {
  id: string;
  patientId: string;
  doctorId: string;
  recordDate: string;
  observation?: string;
  cid10?: string;
  createdAt: string;
  patient: {
    id: string;
    name: string;
    cpf: string;
    healthCenter?: {
      id: string;
      name: string;
    };
  };
  doctor: {
    id: string;
    name: string;
    avatar?: string;
    doctors?: {
      crm: string;
      crmState: string;
      doctorSpecialties?: {
        specialty: {
          name: string;
        };
      }[];
    }[];
  };
}

export interface RecentMedicalRecordsResponse {
  isDoctor: boolean;
  specialties: string[];
  total: number;
  data: RecentMedicalRecordItem[];
}

export const useRecentMedicalRecords = () => {
  const token = useAuthStore((state) => state.token);

  return useQuery<RecentMedicalRecordsResponse>({
    queryKey: ['medical-records', 'recent'],
    queryFn: async () => {
      const response = await axios.get(`${apiUrl}/medical-records/recent`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data;
    },
    enabled: !!token,
  });
};

