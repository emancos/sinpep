import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useAuthStore } from '../store/useAuthStore';

const apiUrl = (import.meta.env.VITE_API_URL as string) || 'http://localhost:3000';

export interface ProcedureGroupItem {
  id: string;
  name: string;
  groupCode?: string | null;
  label: string;
  procedures: { id: string; code: string; name: string; label: string }[];
}

export interface ScheduleDependencies {
  healthCenters: { id: string; name: string; cnes: string; label: string }[];
  procedureGroups: ProcedureGroupItem[];
  procedures: { id: string; code: string; name: string; procedureGroupId?: string; label: string }[];
  doctors: { id: string; name: string; crm: string; label: string }[];
  cbos: { cbo: string; specialtyId: string; name: string; label: string }[];
}

export interface ScheduleSlot {
  id: string;
  scheduleId: string;
  date: string;
  time: string;
  slotType: 'PRIMEIRA_VEZ' | 'RETORNO' | 'RESERVA_REGULADOR';
  status: 'DISPONIVEL' | 'AGENDADO' | 'CANCELADO' | 'BLOQUEADO';
  regulationRequestId?: string | null;
  patientId?: string | null;
  bookedByUserId?: string | null;
  bookedAt?: string | null;
  isProcedureDisabled?: boolean;
  disabledReason?: string | null;
  patient?: { id: string; name: string; cpf?: string; cns?: string };
  regulationRequest?: { id: string; protocolNumber: string };
  bookedByUser?: { id: string; name: string };
  schedule?: {
    id: string;
    scheduleType?: 'CONSULTA' | 'EXAME' | 'PROCEDIMENTO';
    procedureGroupId?: string | null;
    enabledProcedureIds?: string[];
    executingHealthCenter?: { id: string; name: string; cnes: string };
    procedure?: { id: string; code: string; name: string };
    procedureGroup?: { id: string; name: string; groupCode?: string | null };
    doctor?: { id: string; user?: { name: string } };
  };
}

export interface Schedule {
  id: string;
  executingHealthCenterId: string;
  scheduleType?: 'CONSULTA' | 'EXAME' | 'PROCEDIMENTO';
  procedureId?: string | null;
  procedureGroupId?: string | null;
  doctorId: string;
  cbo: string;
  enabledProcedureIds?: string[];
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  daysOfWeek: string[];
  firstTimeQuantity: number;
  firstTimeMinutes: number;
  returnQuantity: number;
  returnMinutes: number;
  regulatorReservedQuantity: number;
  regulatorReservedMinutes: number;
  autoSlotSplit: boolean;
  isLocalSchedule: boolean;
  isActive: boolean;
  notes?: string | null;
  blockedDates?: string[];
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
  executingHealthCenter?: { id: string; name: string; cnes: string };
  procedure?: { id: string; code: string; name: string };
  procedureGroup?: { id: string; name: string; groupCode?: string | null; procedures?: { id: string; name: string; code: string }[] };
  doctor?: { id: string; crm: string; crmState: string; user?: { name: string } };
  createdByUser?: { id: string; name: string };
  slots?: ScheduleSlot[];
  totalSlots?: number;
  bookedSlots?: number;
  availableSlots?: number;
}

export function useScheduleDependencies(filters: {
  healthCenterId?: string;
  procedureId?: string;
  procedureGroupId?: string;
  doctorId?: string;
  cbo?: string;
  scheduleType?: 'CONSULTA' | 'EXAME' | 'PROCEDIMENTO';
}) {
  const token = useAuthStore((state) => state.token);

  return useQuery<ScheduleDependencies>({
    queryKey: ['schedule-dependencies', filters],
    queryFn: async () => {
      const res = await axios.get(`${apiUrl}/schedules/dependencies`, {
        headers: { Authorization: `Bearer ${token}` },
        params: filters,
      });
      return res.data;
    },
    enabled: !!token,
    staleTime: 30 * 1000,
  });
}

export function useSchedules(query?: {
  healthCenterId?: string;
  procedureId?: string;
  doctorId?: string;
  activeOnly?: string;
}) {
  const token = useAuthStore((state) => state.token);

  return useQuery<Schedule[]>({
    queryKey: ['schedules', query],
    queryFn: async () => {
      const res = await axios.get(`${apiUrl}/schedules`, {
        headers: { Authorization: `Bearer ${token}` },
        params: query,
      });
      return res.data;
    },
    enabled: !!token,
  });
}

export function useSchedule(id: string) {
  const token = useAuthStore((state) => state.token);

  return useQuery<Schedule>({
    queryKey: ['schedule', id],
    queryFn: async () => {
      const res = await axios.get(`${apiUrl}/schedules/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.data;
    },
    enabled: !!token && !!id,
  });
}

export function useCreateSchedule() {
  const queryClient = useQueryClient();
  const token = useAuthStore((state) => state.token);

  return useMutation({
    mutationFn: async (data: any) => {
      const res = await axios.post(`${apiUrl}/schedules`, data, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
    },
  });
}

export function useUpdateSchedule() {
  const queryClient = useQueryClient();
  const token = useAuthStore((state) => state.token);

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await axios.put(`${apiUrl}/schedules/${id}`, data, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      queryClient.invalidateQueries({ queryKey: ['schedule', variables.id] });
    },
  });
}

export function useToggleScheduleActive() {
  const queryClient = useQueryClient();
  const token = useAuthStore((state) => state.token);

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await axios.patch(`${apiUrl}/schedules/${id}/toggle-active`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.data;
    },
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      queryClient.invalidateQueries({ queryKey: ['schedule', id] });
    },
  });
}

export function useToggleBlockDate() {
  const queryClient = useQueryClient();
  const token = useAuthStore((state) => state.token);

  return useMutation({
    mutationFn: async ({ id, date }: { id: string; date: string }) => {
      const res = await axios.patch(
        `${apiUrl}/schedules/${id}/toggle-block-date`,
        { date },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      return res.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      queryClient.invalidateQueries({ queryKey: ['schedule', variables.id] });
    },
  });
}

export function useDeleteSchedule() {
  const queryClient = useQueryClient();
  const token = useAuthStore((state) => state.token);

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await axios.delete(`${apiUrl}/schedules/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      queryClient.invalidateQueries({ queryKey: ['regulation-inbox'] });
      queryClient.invalidateQueries({ queryKey: ['regulation-solicitor'] });
    },
  });
}

export function useAvailableSlots(
  procedureId?: string,
  filters?: {
    procedureGroupId?: string;
    executingHealthCenterId?: string;
    date?: string;
  },
) {
  const token = useAuthStore((state) => state.token);

  return useQuery<ScheduleSlot[]>({
    queryKey: ['available-slots', procedureId, filters],
    queryFn: async () => {
      if (!procedureId && !filters?.procedureGroupId) return [];
      const res = await axios.get(`${apiUrl}/schedules/available-slots`, {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          procedureId: procedureId || undefined,
          procedureGroupId: filters?.procedureGroupId || undefined,
          executingHealthCenterId: filters?.executingHealthCenterId || undefined,
          date: filters?.date || undefined,
        },
      });
      return res.data;
    },
    enabled: !!token && (!!procedureId || !!filters?.procedureGroupId),
  });
}

export function useBookSlot() {
  const queryClient = useQueryClient();
  const token = useAuthStore((state) => state.token);

  return useMutation({
    mutationFn: async ({ slotId, regulationRequestId }: { slotId: string; regulationRequestId: string }) => {
      const res = await axios.post(
        `${apiUrl}/schedules/book-slot`,
        { slotId, regulationRequestId },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      queryClient.invalidateQueries({ queryKey: ['available-slots'] });
      queryClient.invalidateQueries({ queryKey: ['regulation-inbox'] });
      queryClient.invalidateQueries({ queryKey: ['regulation-solicitor'] });
    },
  });
}

export interface ScheduleConflictItem {
  source: 'SINPEP' | 'ESUS';
  severity: 'BLOCKING' | 'WARNING';
  title: string;
  message: string;
  details?: any;
}

export interface ScheduleConflictCheckResult {
  hasBlockingConflict: boolean;
  hasWarning: boolean;
  conflicts: ScheduleConflictItem[];
}

export function useCheckScheduleConflicts(params: {
  doctorId?: string;
  startDate?: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  daysOfWeek?: string[];
  excludeScheduleId?: string;
}) {
  const token = useAuthStore((state) => state.token);
  const isEnabled =
    Boolean(token) &&
    Boolean(params.doctorId) &&
    Boolean(params.startDate) &&
    Boolean(params.endDate) &&
    Boolean(params.startTime) &&
    Boolean(params.endTime) &&
    Boolean(params.daysOfWeek && params.daysOfWeek.length > 0);

  return useQuery<ScheduleConflictCheckResult>({
    queryKey: ['schedule-conflicts', params],
    queryFn: async () => {
      const res = await axios.get(`${apiUrl}/schedules/check-conflicts`, {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          doctorId: params.doctorId,
          startDate: params.startDate,
          endDate: params.endDate,
          startTime: params.startTime,
          endTime: params.endTime,
          daysOfWeek: params.daysOfWeek?.join(','),
          excludeScheduleId: params.excludeScheduleId,
        },
      });
      return res.data;
    },
    enabled: isEnabled,
    staleTime: 5 * 1000,
  });
}
