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
  medications: any[];
  requestedExams: any[];
  attachments: MedicalRecordAttachment[];
  doctor: {
    id: string;
    name: string;
    avatar?: string;
  };
}

export const useMedicalRecords = (patientId: string) => {
  const token = useAuthStore((state) => state.token);

  return useQuery<{ data: MedicalRecord[], total: number }>({
    queryKey: ['medical-records', patientId],
    queryFn: async () => {
      const response = await axios.get(`${apiUrl}/patients/${patientId}/medical-records`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data;
    },
    enabled: !!token && !!patientId,
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
    },
  });
};
