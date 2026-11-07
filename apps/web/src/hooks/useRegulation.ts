import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import {
  regulationService,
} from '../services/regulation';
import type {
  RegulationRequestStatus,
  RegulationRequestType,
  RegulationRequestPriority,
  RegulationQuota,
} from '../services/regulation';
import { toast } from 'sonner';

export const useRegulationMyCenter = (params?: {
  status?: RegulationRequestStatus;
  type?: RegulationRequestType;
  healthCenterId?: string;
}) => {
  return useQuery({
    queryKey: ['regulation', 'my-center', params],
    queryFn: () => regulationService.getMyCenterRequests(params),
    staleTime: 1000 * 60 * 2, // 2 minutos
    gcTime: 1000 * 60 * 10,
  });
};

export const useRegulationInbox = (params?: {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  status?: string;
  type?: string;
  priority?: string;
  requestingHealthCenterId?: string;
  executingHealthCenterId?: string;
  search?: string;
}) => {
  return useQuery({
    queryKey: ['regulation', 'inbox', params],
    queryFn: () => regulationService.getInbox(params),
    staleTime: 1000 * 60 * 2, // 2 minutos
    gcTime: 1000 * 60 * 10,
    placeholderData: keepPreviousData,
  });
};

export const useRegulationRequest = (id: string | null) => {
  return useQuery({
    queryKey: ['regulation', 'request', id],
    queryFn: () => (id ? regulationService.getRequestById(id) : null),
    enabled: !!id,
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 10,
  });
};

export const useCreateRegulationRequest = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (formData: FormData) => regulationService.createRequest(formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['regulation'] });
      toast.success('Solicitação encaminhada para a Regulação Municipal com sucesso!');
    },
    onError: (error: any) => {
      const msg = error.response?.data?.message || 'Erro ao criar solicitação';
      toast.error(msg);
    },
  });
};

export const useResubmitRegulationRequest = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, formData }: { id: string; formData: FormData }) =>
      regulationService.resubmitReturnedRequest(id, formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['regulation'] });
      toast.success('Solicitação reenviada para a Regulação Municipal com sucesso!');
    },
    onError: (error: any) => {
      const msg = error.response?.data?.message || 'Erro ao reenviar solicitação';
      toast.error(msg);
    },
  });
};

export const useCancelBySolicitor = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, justification }: { id: string; justification: string }) =>
      regulationService.cancelBySolicitor(id, justification),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['regulation'] });
      toast.success('Solicitação cancelada com sucesso.');
    },
    onError: (error: any) => {
      const msg = error.response?.data?.message || 'Erro ao cancelar solicitação';
      toast.error(msg);
    },
  });
};

export const useEvaluateRegulationRequest = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      decision,
      justification,
      adjustedPriority,
    }: {
      id: string;
      decision: 'AUTORIZAR' | 'DEVOLVER' | 'NEGAR';
      justification: string;
      adjustedPriority?: RegulationRequestPriority;
    }) => regulationService.evaluateRequest(id, decision, justification, adjustedPriority),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['regulation'] });
      const actions = {
        AUTORIZAR: 'Solicitação autorizada e encaminhada para a fila de agendamento.',
        DEVOLVER: 'Solicitação devolvida à unidade de origem para correção.',
        NEGAR: 'Solicitação indeferida/negada com parecer registrado.',
      };
      toast.success(actions[variables.decision]);
    },
    onError: (error: any) => {
      const msg = error.response?.data?.message || 'Erro ao avaliar solicitação';
      toast.error(msg);
    },
  });
};

export const useChangeRegulationProcedure = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: {
        newProcedureId?: string;
        newProcedureGroupId?: string;
        newType?: RegulationRequestType;
        newSpecialtyId?: string;
        justification: string;
        adjustedPriority?: RegulationRequestPriority;
        adjustedCid10?: string;
      };
    }) => regulationService.changeProcedure(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['regulation'] });
      toast.success('Procedimento alterado com sucesso! A alteração foi gravada no histórico da requisição.');
    },
    onError: (error: any) => {
      const msg = error.response?.data?.message || 'Erro ao alterar procedimento da solicitação';
      toast.error(msg);
    },
  });
};

export const useScheduleRegulationRequest = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: {
        executingHealthCenterId: string;
        targetDate: string;
        targetTime?: string;
        quotaId?: string;
        justification: string;
      };
    }) => regulationService.scheduleRequest(id, payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['regulation'] });
      toast.success(`Agendado com sucesso! Chave de Confirmação: ${data.confirmationToken}`);
    },
    onError: (error: any) => {
      const msg = error.response?.data?.message || 'Erro ao agendar solicitação';
      toast.error(msg);
    },
  });
};

export const useCancelRegulationSchedule = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: {
        justification: string;
        returnToQueue?: boolean;
      };
    }) => regulationService.cancelSchedule(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['regulation'] });
      toast.success('Agendamento cancelado com sucesso.');
    },
    onError: (error: any) => {
      const msg = error.response?.data?.message || 'Erro ao cancelar agendamento';
      toast.error(msg);
    },
  });
};

export const useValidateRegulationToken = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ token, executingHealthCenterId }: { token: string; executingHealthCenterId?: string }) =>
      regulationService.validateConfirmationToken(token, executingHealthCenterId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['regulation'] });
      toast.success(`Chave ${data.confirmationToken} validada com sucesso! Paciente autorizado para atendimento.`);
    },
    onError: (error: any) => {
      const msg = error.response?.data?.message || 'Chave de confirmação inválida ou não encontrada';
      toast.error(msg);
    },
  });
};

export const useRegulationQuotas = (params?: { executingHealthCenterId?: string; targetDate?: string }) => {
  return useQuery({
    queryKey: ['regulation', 'quotas', params],
    queryFn: () => regulationService.getQuotas(params),
  });
};

export const useCreateRegulationQuota = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<RegulationQuota>) => regulationService.createQuota(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['regulation', 'quotas'] });
      toast.success('Cota de vagas cadastrada com sucesso!');
    },
    onError: (error: any) => {
      const msg = error.response?.data?.message || 'Erro ao cadastrar cota de vagas';
      toast.error(msg);
    },
  });
};
