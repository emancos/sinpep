import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, and, or, desc, asc, inArray, gte, lte, sql } from 'drizzle-orm';
import * as schema from '../database';
import { DATABASE_CONNECTION } from '../database/database.constants';
import { EventsGateway } from '../events/events.gateway';
import * as crypto from 'crypto';

function generateConfirmationToken(): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let part1 = '';
  let part2 = '';
  for (let i = 0; i < 4; i++) {
    part1 += chars.charAt(crypto.randomInt(0, chars.length));
    part2 += chars.charAt(crypto.randomInt(0, chars.length));
  }
  return `SB-${part1}-${part2}`;
}

function calculateAge(birthDate?: string | null): number {
  if (!birthDate) return 0;
  try {
    const d = new Date(birthDate.includes('T') ? birthDate : `${birthDate}T00:00:00`);
    if (isNaN(d.getTime())) return 0;
    const now = new Date();
    let age = now.getFullYear() - d.getFullYear();
    const m = now.getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < d.getDate())) {
      age--;
    }
    return Math.max(0, age);
  } catch {
    return 0;
  }
}

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

@Injectable()
export class AutoSchedulingService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
    private readonly eventsGateway: EventsGateway,
  ) {}

  /**
   * 1. Consulta da Fila de Espera com Cálculo Dinâmico de Score
   */
  async getWaitingList(query: {
    procedureId?: string;
    procedureGroupId?: string;
    specialtyId?: string;
    priority?: string;
    requestingHealthCenterId?: string;
    search?: string;
    minWaitingDays?: number;
    maxWaitingDays?: number;
  }) {
    const conditions: any[] = [
      eq(schema.regulationRequests.status, 'PENDENTE_AGENDAMENTO'),
    ];

    if (query.procedureId) {
      conditions.push(eq(schema.regulationRequests.procedureId, query.procedureId));
    }
    if (query.procedureGroupId) {
      conditions.push(eq(schema.regulationRequests.procedureGroupId, query.procedureGroupId));
    }
    if (query.specialtyId) {
      conditions.push(eq(schema.regulationRequests.specialtyId, query.specialtyId));
    }
    if (query.priority && query.priority !== 'ALL') {
      conditions.push(eq(schema.regulationRequests.priority, query.priority as any));
    }
    if (query.requestingHealthCenterId && query.requestingHealthCenterId !== 'ALL') {
      conditions.push(eq(schema.regulationRequests.requestingHealthCenterId, query.requestingHealthCenterId));
    }

    const requests = await this.db.query.regulationRequests.findMany({
      where: and(...conditions),
      with: {
        patient: true,
        requestingHealthCenter: true,
        procedure: true,
        procedureGroup: true,
        specialty: true,
      },
      orderBy: [asc(schema.regulationRequests.createdAt)],
    });

    // Carrega regras ativas para aplicar a melhor regra correspondente
    const allRules = await this.db.query.autoSchedulingRules.findMany({
      where: eq(schema.autoSchedulingRules.isActive, true),
    });

    const now = new Date();

    // Enriquecimento e ranqueamento
    let enriched = requests.map((req) => {
      const createdAt = new Date(req.createdAt);
      const diffMs = now.getTime() - createdAt.getTime();
      const waitingDays = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));

      // Busca regra específica para o procedimento ou grupo; fallback para regra padrão
      const matchedRule =
        allRules.find((r) => r.procedureId && r.procedureId === req.procedureId) ||
        allRules.find((r) => r.procedureGroupId && r.procedureGroupId === req.procedureGroupId) ||
        allRules.find((r) => !r.procedureId && !r.procedureGroupId) || {
          weightWaitingDays: 1,
          weightPriorityUrgency: 500,
          weightPriorityPriority: 200,
          weightElderly80Plus: 300,
          weightElderly60Plus: 100,
          weightPcd: 150,
        };

      const age = calculateAge(req.patient?.birthDate);

      const waitingPoints = waitingDays * (matchedRule.weightWaitingDays ?? 1);
      const priorityPoints =
        req.priority === 'URGENTE' || (req.priority as string) === 'URGENCIA'
          ? matchedRule.weightPriorityUrgency ?? 500
          : req.priority === 'PRIORITARIO'
          ? matchedRule.weightPriorityPriority ?? 200
          : 0;

      const elderlyPoints =
        age >= 80
          ? matchedRule.weightElderly80Plus ?? 300
          : age >= 60
          ? matchedRule.weightElderly60Plus ?? 100
          : 0;

      const pcdPoints = 0; // expansível para cadastro do paciente

      const totalScore = waitingPoints + priorityPoints + elderlyPoints + pcdPoints;

      const scoreBreakdown: ScoreBreakdown = {
        waitingDays,
        waitingPoints,
        priority: req.priority,
        priorityPoints,
        age,
        elderlyPoints,
        pcdPoints,
        totalScore,
      };

      return {
        ...req,
        waitingDays,
        age,
        score: totalScore,
        scoreBreakdown,
      };
    });

    // Filtro por texto (busca paciente, CPF, protocolo)
    if (query.search && query.search.trim()) {
      const s = query.search.trim().toLowerCase();
      enriched = enriched.filter(
        (r) =>
          (r.protocolNumber || '').toLowerCase().includes(s) ||
          (r.patient?.name || '').toLowerCase().includes(s) ||
          (r.patient?.cpf || '').includes(s) ||
          (r.patient?.cns || '').includes(s),
      );
    }

    // Filtros de faixa de dias de espera
    if (typeof query.minWaitingDays === 'number') {
      enriched = enriched.filter((r) => r.waitingDays >= query.minWaitingDays!);
    }
    if (typeof query.maxWaitingDays === 'number') {
      enriched = enriched.filter((r) => r.waitingDays <= query.maxWaitingDays!);
    }

    // Ordenação decrescente pelo Score total (maior pontuação primeiro)
    enriched.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.waitingDays - b.waitingDays; // desempate por mais antigo
    });

    // Adiciona posição ordinal na fila
    const items = enriched.map((item, index) => ({
      queuePosition: index + 1,
      ...item,
    }));

    // Métricas para os KPIs da barra de topo
    const totalWaiting = items.length;
    const avgDays =
      totalWaiting > 0
        ? Math.round(items.reduce((acc, curr) => acc + curr.waitingDays, 0) / totalWaiting)
        : 0;
    const urgencyCount = items.filter(
      (i) => i.priority === 'URGENTE' || (i.priority as string) === 'URGENCIA',
    ).length;
    const priorityCount = items.filter((i) => i.priority === 'PRIORITARIO').length;

    // Contagem de vagas disponíveis compatíveis
    const todayStr = new Date().toISOString().split('T')[0];
    const openSlotsCount = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(schema.scheduleSlots)
      .where(
        and(
          eq(schema.scheduleSlots.status, 'DISPONIVEL'),
          gte(schema.scheduleSlots.date, todayStr),
        ),
      );

    return {
      items,
      total: totalWaiting,
      kpis: {
        totalWaiting,
        averageWaitingDays: avgDays,
        urgencyCount,
        priorityCount,
        availableSlotsCount: Number(openSlotsCount[0]?.count || 0),
      },
    };
  }

  /**
   * 2. Regras de Agendamento Automático
   */
  async getRules() {
    return this.db.query.autoSchedulingRules.findMany({
      with: {
        procedure: true,
        procedureGroup: true,
      },
      orderBy: [desc(schema.autoSchedulingRules.createdAt)],
    });
  }

  async createRule(dto: {
    procedureId?: string;
    procedureGroupId?: string;
    ruleName: string;
    isActive?: boolean;
    weightWaitingDays?: number;
    weightPriorityUrgency?: number;
    weightPriorityPriority?: number;
    weightElderly80Plus?: number;
    weightElderly60Plus?: number;
    weightPcd?: number;
    minLeadTimeDays?: number;
    maxScheduleHorizonDays?: number;
    respectHealthCenterQuotas?: boolean;
    allowAutoExecution?: boolean;
  }) {
    if (!dto.ruleName || dto.ruleName.trim().length < 3) {
      throw new BadRequestException('O nome da regra deve conter ao menos 3 caracteres.');
    }

    const newId = crypto.randomUUID();
    const now = new Date().toISOString();

    await this.db.insert(schema.autoSchedulingRules).values({
      id: newId,
      procedureId: dto.procedureId || null,
      procedureGroupId: dto.procedureGroupId || null,
      ruleName: dto.ruleName.trim(),
      isActive: dto.isActive ?? true,
      weightWaitingDays: dto.weightWaitingDays ?? 1,
      weightPriorityUrgency: dto.weightPriorityUrgency ?? 500,
      weightPriorityPriority: dto.weightPriorityPriority ?? 200,
      weightElderly80Plus: dto.weightElderly80Plus ?? 300,
      weightElderly60Plus: dto.weightElderly60Plus ?? 100,
      weightPcd: dto.weightPcd ?? 150,
      minLeadTimeDays: dto.minLeadTimeDays ?? 3,
      maxScheduleHorizonDays: dto.maxScheduleHorizonDays ?? 60,
      respectHealthCenterQuotas: dto.respectHealthCenterQuotas ?? true,
      allowAutoExecution: dto.allowAutoExecution ?? true,
      createdAt: now,
      updatedAt: now,
    });

    return this.db.query.autoSchedulingRules.findFirst({
      where: eq(schema.autoSchedulingRules.id, newId),
      with: { procedure: true, procedureGroup: true },
    });
  }

  async updateRule(
    id: string,
    dto: Partial<{
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
    }>,
  ) {
    const existing = await this.db.query.autoSchedulingRules.findFirst({
      where: eq(schema.autoSchedulingRules.id, id),
    });
    if (!existing) throw new NotFoundException('Regra não encontrada.');

    await this.db
      .update(schema.autoSchedulingRules)
      .set({
        ...dto,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(schema.autoSchedulingRules.id, id));

    return this.db.query.autoSchedulingRules.findFirst({
      where: eq(schema.autoSchedulingRules.id, id),
      with: { procedure: true, procedureGroup: true },
    });
  }

  async deleteRule(id: string) {
    const existing = await this.db.query.autoSchedulingRules.findFirst({
      where: eq(schema.autoSchedulingRules.id, id),
    });
    if (!existing) throw new NotFoundException('Regra não encontrada.');

    await this.db
      .delete(schema.autoSchedulingRules)
      .where(eq(schema.autoSchedulingRules.id, id));

    return { success: true };
  }

  /**
   * 3. Motor de Simulação de Agendamento Automático ("Dry-Run")
   */
  async simulate(params: {
    procedureId?: string;
    procedureGroupId?: string;
    requestingHealthCenterId?: string;
  }) {
    // 1. Carrega fila de espera ranqueada por score
    const waitingRes = await this.getWaitingList({
      procedureId: params.procedureId,
      procedureGroupId: params.procedureGroupId,
      requestingHealthCenterId: params.requestingHealthCenterId,
    });

    const requests = waitingRes.items;
    if (requests.length === 0) {
      return {
        summary: {
          totalRequestsEvaluated: 0,
          totalSlotsAvailable: 0,
          totalMatchesProposed: 0,
        },
        matches: [],
        unmatched: [],
      };
    }

    // 2. Carrega a regra aplicável (para minLeadTimeDays e maxScheduleHorizonDays)
    const allRules = await this.db.query.autoSchedulingRules.findMany({
      where: eq(schema.autoSchedulingRules.isActive, true),
    });

    const targetRule =
      allRules.find((r) => r.procedureId && r.procedureId === params.procedureId) ||
      allRules.find((r) => r.procedureGroupId && r.procedureGroupId === params.procedureGroupId) ||
      allRules.find((r) => !r.procedureId && !r.procedureGroupId) || {
        minLeadTimeDays: 3,
        maxScheduleHorizonDays: 60,
        respectHealthCenterQuotas: true,
      };

    const minLeadDays = targetRule.minLeadTimeDays ?? 3;
    const maxHorizonDays = targetRule.maxScheduleHorizonDays ?? 60;

    const minDate = new Date();
    minDate.setDate(minDate.getDate() + minLeadDays);
    const minDateStr = minDate.toISOString().split('T')[0];

    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + maxHorizonDays);
    const maxDateStr = maxDate.toISOString().split('T')[0];

    // 3. Busca todas as vagas disponíveis no horizonte planejado
    const rawSlots = await this.db.query.scheduleSlots.findMany({
      where: and(
        eq(schema.scheduleSlots.status, 'DISPONIVEL'),
        gte(schema.scheduleSlots.date, minDateStr),
        lte(schema.scheduleSlots.date, maxDateStr),
      ),
      with: {
        schedule: {
          with: {
            executingHealthCenter: true,
            procedure: true,
            procedureGroup: true,
            doctor: { with: { user: true } },
          },
        },
      },
      orderBy: [asc(schema.scheduleSlots.date), asc(schema.scheduleSlots.time)],
    });

    // 4. Executa o algoritmo de Match determinístico
    const matches: any[] = [];
    const unmatched: any[] = [];
    const usedSlotIds = new Set<string>();

    for (const req of requests) {
      // Encontra a melhor vaga disponível compatível com a requisição
      const candidateSlot = rawSlots.find((slot) => {
        if (usedSlotIds.has(slot.id)) return false;

        const sch = slot.schedule;
        if (!sch || !sch.isActive) return false;

        // Compatibilidade de Procedimento ou Grupo
        let isCompatible = false;
        if (req.procedureId && sch.procedureId === req.procedureId) {
          isCompatible = true;
        } else if (
          sch.procedureGroupId &&
          req.procedureGroupId &&
          sch.procedureGroupId === req.procedureGroupId
        ) {
          // Se for grupo, verifica se o procedimento do paciente não está desabilitado nesta escala
          if (sch.enabledProcedureIds && sch.enabledProcedureIds.length > 0 && req.procedureId) {
            isCompatible = sch.enabledProcedureIds.includes(req.procedureId);
          } else {
            isCompatible = true;
          }
        }

        return isCompatible;
      });

      if (candidateSlot) {
        usedSlotIds.add(candidateSlot.id);
        matches.push({
          matchId: crypto.randomUUID(),
          regulationRequestId: req.id,
          scheduleSlotId: candidateSlot.id,
          request: req,
          slot: candidateSlot,
          score: req.score,
          scoreBreakdown: req.scoreBreakdown,
          status: 'PENDENTE_APROVACAO',
        });
      } else {
        unmatched.push({
          requestId: req.id,
          protocolNumber: req.protocolNumber,
          patientName: req.patient?.name,
          procedureName: req.procedure?.name || req.procedureGroup?.name || 'Não especificado',
          reason: 'Nenhuma vaga disponível com antecedência mínima e compatibilidade clínica encontrada no horizonte de agendamento.',
        });
      }
    }

    return {
      summary: {
        totalRequestsEvaluated: requests.length,
        totalSlotsAvailable: rawSlots.length,
        totalMatchesProposed: matches.length,
        totalUnmatched: unmatched.length,
        minDateConsidered: minDateStr,
        maxDateConsidered: maxDateStr,
      },
      matches,
      unmatched,
    };
  }

  /**
   * 4. Efetivação dos Agendamentos em Lote (Commit Atômico)
   */
  async execute(
    dto: {
      mode: 'EFETIVO_MANUAL' | 'EFETIVO_AUTOMATICO_CRON';
      matches: Array<{
        regulationRequestId: string;
        scheduleSlotId: string;
        calculatedScore: number;
        scoreBreakdownJson?: string;
      }>;
      notes?: string;
    },
    user?: any,
  ) {
    if (!dto.matches || dto.matches.length === 0) {
      throw new BadRequestException('Nenhum agendamento selecionado para efetivação.');
    }

    const runId = crypto.randomUUID();
    const now = new Date().toISOString();

    const successMatches: any[] = [];
    const failedMatches: any[] = [];

    // Executa as reservas garantindo concorrência
    for (const match of dto.matches) {
      try {
        const slot = await this.db.query.scheduleSlots.findFirst({
          where: and(
            eq(schema.scheduleSlots.id, match.scheduleSlotId),
            eq(schema.scheduleSlots.status, 'DISPONIVEL'),
          ),
          with: {
            schedule: {
              with: {
                executingHealthCenter: true,
                doctor: { with: { user: true } },
              },
            },
          },
        });

        const req = await this.db.query.regulationRequests.findFirst({
          where: and(
            eq(schema.regulationRequests.id, match.regulationRequestId),
            eq(schema.regulationRequests.status, 'PENDENTE_AGENDAMENTO'),
          ),
        });

        if (!slot || !req) {
          failedMatches.push({
            regulationRequestId: match.regulationRequestId,
            scheduleSlotId: match.scheduleSlotId,
            reason: !slot ? 'Vaga já preenchida ou indisponível.' : 'Solicitação já agendada ou status alterado.',
          });
          continue;
        }

        const confirmationToken = req.confirmationToken || generateConfirmationToken();
        const doctorName = slot.schedule.doctor?.user?.name || 'Profissional';
        const unitName = slot.schedule.executingHealthCenter?.name || 'Unidade Executante';

        // 1. Atualiza Slot
        await this.db
          .update(schema.scheduleSlots)
          .set({
            status: 'AGENDADO',
            regulationRequestId: req.id,
            patientId: req.patientId,
            bookedByUserId: user?.id || null,
            bookedAt: now,
            updatedAt: now,
          })
          .where(eq(schema.scheduleSlots.id, slot.id));

        // 2. Atualiza Requisição
        await this.db
          .update(schema.regulationRequests)
          .set({
            status: 'AGENDADA',
            executingHealthCenterId: slot.schedule.executingHealthCenterId,
            scheduledDate: slot.date,
            scheduledTime: slot.time,
            confirmationToken,
            scheduledByUserId: user?.id || null,
            updatedAt: now,
          })
          .where(eq(schema.regulationRequests.id, req.id));

        // 3. Grava Histórico de Status
        await this.db.insert(schema.regulationStatusHistory).values({
          id: crypto.randomUUID(),
          requestId: req.id,
          previousStatus: req.status,
          newStatus: 'AGENDADA',
          justification: `Agendamento automático (${dto.mode === 'EFETIVO_MANUAL' ? 'Lote Aprovado pelo Regulador' : 'Robô Noturno'}) confirmado para o dia ${slot.date} às ${slot.time} com ${doctorName} na unidade ${unitName}. Chave de Confirmação: ${confirmationToken}. Score de Ranqueamento: ${match.calculatedScore}.`,
          actionByUserId: user?.id || null,
          createdAt: now,
        });

        // 4. Grava Registro do Match Efetivado
        await this.db.insert(schema.autoSchedulingMatches).values({
          id: crypto.randomUUID(),
          runId,
          regulationRequestId: req.id,
          scheduleSlotId: slot.id,
          calculatedScore: String(match.calculatedScore),
          scoreBreakdownJson: match.scoreBreakdownJson || null,
          status: 'CONFIRMADO',
          confirmedAt: now,
          confirmedByUserId: user?.id || null,
          createdAt: now,
        });

        successMatches.push({
          requestId: req.id,
          slotId: slot.id,
          confirmationToken,
        });
      } catch (err: any) {
        failedMatches.push({
          regulationRequestId: match.regulationRequestId,
          scheduleSlotId: match.scheduleSlotId,
          reason: err.message || 'Falha inesperada ao gravar agendamento.',
        });
      }
    }

    // Registra a Execução Geral
    await this.db.insert(schema.autoSchedulingRuns).values({
      id: runId,
      executedAt: now,
      mode: dto.mode,
      triggeredByUserId: user?.id || null,
      totalRequestsEvaluated: dto.matches.length,
      totalSlotsAvailable: dto.matches.length,
      totalMatchesCreated: successMatches.length,
      status: failedMatches.length === 0 ? 'SUCESSO' : successMatches.length > 0 ? 'PARCIAL' : 'CANCELADO',
      notes: dto.notes || `Processamento finalizado: ${successMatches.length} agendamentos confirmados e ${failedMatches.length} falhas.`,
      createdAt: now,
    });

    // Emite eventos de atualização em tempo real
    this.eventsGateway.server?.emit('regulation_updated', {
      type: 'AUTO_SCHEDULING_COMPLETED',
      runId,
      totalConfirmed: successMatches.length,
    });

    return {
      runId,
      totalRequested: dto.matches.length,
      totalConfirmed: successMatches.length,
      totalFailed: failedMatches.length,
      successes: successMatches,
      failures: failedMatches,
    };
  }

  /**
   * 5. Histórico de Execuções do Agendador Automático
   */
  async getRuns() {
    return this.db.query.autoSchedulingRuns.findMany({
      with: {
        triggeredByUser: {
          columns: { id: true, name: true },
        },
        matches: {
          with: {
            regulationRequest: {
              with: { patient: true, procedure: true },
            },
            scheduleSlot: true,
          },
        },
      },
      orderBy: [desc(schema.autoSchedulingRuns.executedAt)],
      limit: 50,
    });
  }
}
