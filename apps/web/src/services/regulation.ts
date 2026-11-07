import api from './api';

export type RegulationRequestType = 'CONSULTA' | 'EXAME' | 'PROCEDIMENTO';
export type RegulationRequestPriority = 'ELETIVO' | 'URGENCIA' | 'PRIORITARIO';
export type RegulationRequestStatus =
  | 'PENDENTE_REGULACAO'
  | 'PENDENTE_AGENDAMENTO'
  | 'AGENDADA'
  | 'DEVOLVIDA'
  | 'NEGADA'
  | 'AGENDAMENTO_CANCELADO'
  | 'CANCELADA';

export interface RegulationAttachment {
  id: string;
  fileName: string;
  fileType: string;
  fileUrl: string;
  fileSize: number;
  createdAt: string;
}

export interface RegulationStatusHistory {
  id: string;
  previousStatus: RegulationRequestStatus | null;
  newStatus: RegulationRequestStatus;
  justification: string;
  createdAt: string;
  actionByUser?: {
    id: string;
    name: string;
  };
}

export interface RegulationRequest {
  id: string;
  protocolNumber: string;
  confirmationToken?: string | null;
  patientId: string;
  requestingHealthCenterId: string;
  requestingUserId: string;
  attendingDoctorId?: string | null;
  type: RegulationRequestType;
  specialtyId?: string | null;
  procedureId?: string | null;
  procedureGroupId?: string | null;
  cid10: string;
  clinicalJustification: string;
  clinicalHistory?: string | null;
  priority: RegulationRequestPriority;
  status: RegulationRequestStatus;
  executingHealthCenterId?: string | null;
  scheduledDate?: string | null;
  scheduledTime?: string | null;
  tokenValidatedAt?: string | null;
  tokenValidatedByUserId?: string | null;
  groupProcedures?: Array<{
    procedureId?: string;
    code: string;
    sigtapCode?: string;
    name: string;
  }> | null;
  createdAt: string;
  updatedAt: string;

  patient?: {
    id: string;
    name: string;
    cpf?: string;
    cns?: string;
    birthDate?: string;
    gender?: string;
    address?: string;
  };
  requestingHealthCenter?: {
    id: string;
    name: string;
    cnes?: string;
  };
  requestingUser?: {
    id: string;
    name: string;
    email?: string;
  };
  attendingDoctor?: {
    id: string;
    name: string;
  };
  specialty?: {
    id: string;
    name: string;
  };
  procedure?: {
    id: string;
    code: string;
    name: string;
    requiresRegulation?: boolean;
  };
  procedureGroup?: {
    id: string;
    name: string;
  };
  executingHealthCenter?: {
    id: string;
    name: string;
    cnes?: string;
  };
  scheduledByUser?: {
    id: string;
    name: string;
  };
  tokenValidatedByUser?: {
    id: string;
    name: string;
  };
  attachments?: RegulationAttachment[];
  statusHistory?: RegulationStatusHistory[];
}

export interface RegulationQuota {
  id: string;
  executingHealthCenterId: string;
  type: RegulationRequestType;
  specialtyId?: string | null;
  procedureId?: string | null;
  doctorId?: string | null;
  targetDate: string;
  startTime: string;
  endTime?: string | null;
  intervalMinutes: number;
  totalSlots: number;
  reservedSlots: number;
  isActive: boolean;
  createdAt: string;
  executingHealthCenter?: { id: string; name: string; cnes?: string };
  specialty?: { id: string; name: string };
  procedure?: { id: string; code: string; name: string };
  doctor?: { id: string; name: string };
}

// =========================================================================
// API CALLS
// =========================================================================

export const regulationService = {
  // Módulo Solicitante (UBS)
  async createRequest(formData: FormData): Promise<RegulationRequest> {
    const { data } = await api.post<RegulationRequest>('/regulation/requests', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  async getMyCenterRequests(params?: {
    status?: RegulationRequestStatus;
    type?: RegulationRequestType;
    healthCenterId?: string;
  }): Promise<{ data: RegulationRequest[]; total: number }> {
    const { data } = await api.get<{ data: RegulationRequest[]; total: number }>('/regulation/requests/my-center', {
      params,
    });
    return data;
  },

  async getRequestById(id: string): Promise<RegulationRequest> {
    const { data } = await api.get<RegulationRequest>(`/regulation/requests/${id}`);
    return data;
  },

  async resubmitReturnedRequest(id: string, formData: FormData): Promise<RegulationRequest> {
    const { data } = await api.patch<RegulationRequest>(`/regulation/requests/${id}/resubmit`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  async cancelBySolicitor(id: string, justification: string): Promise<{ message: string }> {
    const { data } = await api.patch<{ message: string }>(`/regulation/requests/${id}/cancel-by-solicitor`, {
      justification,
    });
    return data;
  },

  // Módulo Central de Regulação (Operador / Médico Regulador)
  async getInbox(params?: {
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
  }): Promise<{
    data: RegulationRequest[];
    total: number;
    page: number;
    limit: number;
    counts: {
      all: number;
      toEvaluate: number;
      toSchedule: number;
      scheduled: number;
      returned: number;
      denied: number;
    };
  }> {
    const { data } = await api.get<{
      data: RegulationRequest[];
      total: number;
      page: number;
      limit: number;
      counts: {
        all: number;
        toEvaluate: number;
        toSchedule: number;
        scheduled: number;
        returned: number;
        denied: number;
      };
    }>('/regulation/inbox', {
      params,
    });
    return data;
  },

  async evaluateRequest(
    id: string,
    decision: 'AUTORIZAR' | 'DEVOLVER' | 'NEGAR',
    justification: string,
    adjustedPriority?: RegulationRequestPriority,
  ): Promise<RegulationRequest> {
    const { data } = await api.post<RegulationRequest>(`/regulation/requests/${id}/evaluate`, {
      decision,
      justification,
      adjustedPriority,
    });
    return data;
  },

  async changeProcedure(
    id: string,
    payload: {
      newProcedureId?: string;
      newProcedureGroupId?: string;
      newType?: RegulationRequestType;
      newSpecialtyId?: string;
      justification: string;
      adjustedPriority?: RegulationRequestPriority;
      adjustedCid10?: string;
    },
  ): Promise<RegulationRequest> {
    const { data } = await api.patch<RegulationRequest>(`/regulation/requests/${id}/change-procedure`, payload);
    return data;
  },

  async scheduleRequest(
    id: string,
    payload: {
      executingHealthCenterId: string;
      targetDate: string;
      targetTime?: string;
      quotaId?: string;
      justification: string;
    },
  ): Promise<RegulationRequest> {
    const { data } = await api.post<RegulationRequest>(`/regulation/requests/${id}/schedule`, payload);
    return data;
  },

  async cancelSchedule(
    id: string,
    payload: {
      justification: string;
      returnToQueue?: boolean;
    },
  ): Promise<RegulationRequest> {
    const { data } = await api.post<RegulationRequest>(`/regulation/requests/${id}/cancel-schedule`, payload);
    return data;
  },

  // Módulo Executante - Validação de Chave
  async validateConfirmationToken(
    token: string,
    executingHealthCenterId?: string,
  ): Promise<RegulationRequest> {
    const { data } = await api.post<RegulationRequest>('/regulation/validate-token', {
      token,
      executingHealthCenterId,
    });
    return data;
  },

  // Cotas
  async getQuotas(params?: { executingHealthCenterId?: string; targetDate?: string }): Promise<RegulationQuota[]> {
    const { data } = await api.get<RegulationQuota[]>('/regulation/quotas', { params });
    return data;
  },

  async createQuota(payload: Partial<RegulationQuota>): Promise<RegulationQuota> {
    const { data } = await api.post<RegulationQuota>('/regulation/quotas', payload);
    return data;
  },
};
