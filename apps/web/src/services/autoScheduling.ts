import api from './api';
import type { RegulationRequest } from './regulation';
import type { ScheduleSlot } from '../hooks/useSchedules';

export interface ScoreBreakdown {
  waitingDays: number;
  waitingPoints: number;
  priority: string;
  priorityPoints: number;
  age: number;
  elderlyPoints: number;
  pcdPoints: number;
  totalScore: number;
}

export interface WaitingListRequest extends RegulationRequest {
  queuePosition: number;
  waitingDays: number;
  age: number;
  score: number;
  scoreBreakdown: ScoreBreakdown;
}

export interface WaitingListKPIs {
  totalWaiting: number;
  averageWaitingDays: number;
  urgencyCount: number;
  priorityCount: number;
  availableSlotsCount: number;
}

export interface WaitingListResponse {
  items: WaitingListRequest[];
  total: number;
  page?: number;
  limit?: number;
  kpis: WaitingListKPIs;
}

export interface AutoSchedulingRule {
  id: string;
  procedureId?: string | null;
  procedureGroupId?: string | null;
  ruleName: string;
  isActive: boolean;
  weightWaitingDays: number;
  weightPriorityUrgency: number;
  weightPriorityPriority: number;
  weightElderly80Plus: number;
  weightElderly60Plus: number;
  weightPcd: number;
  minLeadTimeDays: number;
  maxScheduleHorizonDays: number;
  respectHealthCenterQuotas: boolean;
  allowAutoExecution: boolean;
  createdAt: string;
  updatedAt: string;
  procedure?: { id: string; code: string; name: string } | null;
  procedureGroup?: { id: string; name: string } | null;
}

export interface SimulationMatch {
  matchId: string;
  regulationRequestId: string;
  scheduleSlotId: string;
  request: WaitingListRequest;
  slot: ScheduleSlot;
  score: number;
  scoreBreakdown: ScoreBreakdown;
  status: 'PENDENTE_APROVACAO';
}

export interface SimulationUnmatched {
  requestId: string;
  protocolNumber: string;
  patientName?: string;
  procedureName?: string;
  reason: string;
}

export interface SimulationResponse {
  summary: {
    totalRequestsEvaluated: number;
    totalSlotsAvailable: number;
    totalMatchesProposed: number;
    totalUnmatched: number;
    minDateConsidered: string;
    maxDateConsidered: string;
  };
  matches: SimulationMatch[];
  unmatched: SimulationUnmatched[];
}

export interface ExecuteAutoSchedulingDto {
  mode: 'EFETIVO_MANUAL' | 'EFETIVO_AUTOMATICO_CRON';
  matches: Array<{
    regulationRequestId: string;
    scheduleSlotId: string;
    calculatedScore: number;
    scoreBreakdownJson?: string;
  }>;
  notes?: string;
}

export interface ExecuteAutoSchedulingResponse {
  runId: string;
  totalRequested: number;
  totalConfirmed: number;
  totalFailed: number;
  successes: Array<{ requestId: string; slotId: string; confirmationToken: string }>;
  failures: Array<{ regulationRequestId: string; scheduleSlotId: string; reason: string }>;
}

export interface AutoSchedulingRun {
  id: string;
  executedAt: string;
  mode: string;
  triggeredByUserId?: string | null;
  totalRequestsEvaluated: number;
  totalSlotsAvailable: number;
  totalMatchesCreated: number;
  status: string;
  notes?: string | null;
  createdAt: string;
  triggeredByUser?: { id: string; name: string } | null;
  matches?: any[];
}

export const autoSchedulingService = {
  async getWaitingList(params?: {
    page?: number;
    limit?: number;
    procedureId?: string;
    procedureGroupId?: string;
    specialtyId?: string;
    priority?: string;
    requestingHealthCenterId?: string;
    search?: string;
    minWaitingDays?: number;
    maxWaitingDays?: number;
  }): Promise<WaitingListResponse> {
    const res = await api.get('/regulation/waiting-list', { params });
    return res.data;
  },

  async getRules(): Promise<AutoSchedulingRule[]> {
    const res = await api.get('/regulation/auto-scheduling/rules');
    return res.data;
  },

  async createRule(dto: Partial<AutoSchedulingRule>): Promise<AutoSchedulingRule> {
    const res = await api.post('/regulation/auto-scheduling/rules', dto);
    return res.data;
  },

  async updateRule(id: string, dto: Partial<AutoSchedulingRule>): Promise<AutoSchedulingRule> {
    const res = await api.put(`/regulation/auto-scheduling/rules/${id}`, dto);
    return res.data;
  },

  async deleteRule(id: string): Promise<{ success: boolean }> {
    const res = await api.delete(`/regulation/auto-scheduling/rules/${id}`);
    return res.data;
  },

  async simulate(params: {
    procedureId?: string;
    procedureGroupId?: string;
    requestingHealthCenterId?: string;
  }): Promise<SimulationResponse> {
    const res = await api.post('/regulation/auto-scheduling/simulate', params);
    return res.data;
  },

  async execute(dto: ExecuteAutoSchedulingDto): Promise<ExecuteAutoSchedulingResponse> {
    const res = await api.post('/regulation/auto-scheduling/execute', dto);
    return res.data;
  },

  async getRuns(): Promise<AutoSchedulingRun[]> {
    const res = await api.get('/regulation/auto-scheduling/runs');
    return res.data;
  },
};
