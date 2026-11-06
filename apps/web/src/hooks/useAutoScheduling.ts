import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  autoSchedulingService,
  type WaitingListResponse,
  type WaitingListRequest,
  type AutoSchedulingRule,
  type SimulationResponse,
  type SimulationMatch,
  type ExecuteAutoSchedulingDto,
  type ExecuteAutoSchedulingResponse,
  type AutoSchedulingRun,
} from '../services/autoScheduling';
import { toast } from 'sonner';

export type {
  WaitingListResponse,
  WaitingListRequest,
  AutoSchedulingRule,
  SimulationResponse,
  SimulationMatch,
  ExecuteAutoSchedulingDto,
  ExecuteAutoSchedulingResponse,
  AutoSchedulingRun,
};

export const useWaitingList = (params?: {
  procedureId?: string;
  procedureGroupId?: string;
  specialtyId?: string;
  priority?: string;
  requestingHealthCenterId?: string;
  search?: string;
  minWaitingDays?: number;
  maxWaitingDays?: number;
}) => {
  return useQuery<WaitingListResponse>({
    queryKey: ['regulation', 'waiting-list', params],
    queryFn: () => autoSchedulingService.getWaitingList(params),
    staleTime: 1000 * 60 * 2, // 2 minutos
    gcTime: 1000 * 60 * 10,
  });
};

export const useAutoSchedulingRules = () => {
  return useQuery<AutoSchedulingRule[]>({
    queryKey: ['regulation', 'auto-scheduling-rules'],
    queryFn: () => autoSchedulingService.getRules(),
  });
};

export const useCreateAutoSchedulingRule = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: Partial<AutoSchedulingRule>) => autoSchedulingService.createRule(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['regulation', 'auto-scheduling-rules'] });
      toast.success('Regra de agendamento automático salva com sucesso!');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Erro ao criar regra.');
    },
  });
};

export const useUpdateAutoSchedulingRule = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: Partial<AutoSchedulingRule> }) =>
      autoSchedulingService.updateRule(id, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['regulation', 'auto-scheduling-rules'] });
      toast.success('Regra atualizada com sucesso!');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Erro ao atualizar regra.');
    },
  });
};

export const useDeleteAutoSchedulingRule = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => autoSchedulingService.deleteRule(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['regulation', 'auto-scheduling-rules'] });
      toast.success('Regra excluída com sucesso.');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Erro ao excluir regra.');
    },
  });
};

export const useSimulateAutoScheduling = () => {
  return useMutation<SimulationResponse, any, { procedureId?: string; procedureGroupId?: string; requestingHealthCenterId?: string }>({
    mutationFn: (params) => autoSchedulingService.simulate(params),
  });
};

export const useExecuteAutoScheduling = () => {
  const queryClient = useQueryClient();
  return useMutation<ExecuteAutoSchedulingResponse, any, ExecuteAutoSchedulingDto>({
    mutationFn: (dto) => autoSchedulingService.execute(dto),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['regulation', 'waiting-list'] });
      queryClient.invalidateQueries({ queryKey: ['regulation', 'inbox'] });
      queryClient.invalidateQueries({ queryKey: ['available-slots'] });
      queryClient.invalidateQueries({ queryKey: ['regulation', 'auto-scheduling-runs'] });
      toast.success(
        `Agendamento em lote concluído com sucesso! ${data.totalConfirmed} paciente(s) agendado(s).`,
      );
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Erro ao executar agendamento em lote.');
    },
  });
};

export const useAutoSchedulingRuns = () => {
  return useQuery<AutoSchedulingRun[]>({
    queryKey: ['regulation', 'auto-scheduling-runs'],
    queryFn: () => autoSchedulingService.getRuns(),
  });
};
