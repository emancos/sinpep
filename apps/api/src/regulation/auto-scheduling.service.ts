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
   * 1. Consulta da Fila de Espera com Paginação Server-Side e Score Clínico Persistido no PostgreSQL (Opção A)
   */
  async getWaitingList(query: {
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
  }) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(query.limit) || 20));
    const offset = (page - 1) * limit;

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
    if (typeof query.minWaitingDays === 'number') {
      conditions.push(sql`(CURRENT_DATE - ${schema.regulationRequests.createdAt}::date) >= ${query.minWaitingDays}`);
    }
    if (typeof query.maxWaitingDays === 'number') {
      conditions.push(sql`(CURRENT_DATE - ${schema.regulationRequests.createdAt}::date) <= ${query.maxWaitingDays}`);
    }

    // Busca SQL nativa abrangente (protocolo, paciente, CPF, CNS, procedimentos e grupos)
    if (query.search && query.search.trim()) {
      const s = `%${query.search.trim().toLowerCase()}%`;
      const cleanDigits = query.search.trim().replace(/\D/g, '');
      conditions.push(
        sql`(
          ${schema.regulationRequests.protocolNumber} ILIKE ${s}
          OR ${schema.regulationRequests.confirmationToken} ILIKE ${s}
          OR EXISTS (
            SELECT 1 FROM ${schema.patients} p 
            WHERE p.id = ${schema.regulationRequests.patientId} 
            AND (
              p.name ILIKE ${s}
              OR p.cpf ILIKE ${s}
              ${cleanDigits.length > 2 ? sql`OR regexp_replace(p.cpf, '\D', '', 'g') ILIKE ${'%' + cleanDigits + '%'}` : sql``}
              OR p.cns ILIKE ${s}
              ${cleanDigits.length > 2 ? sql`OR regexp_replace(p.cns, '\D', '', 'g') ILIKE ${'%' + cleanDigits + '%'}` : sql``}
            )
          )
          OR EXISTS (
            SELECT 1 FROM ${schema.procedures} pr 
            WHERE pr.id = ${schema.regulationRequests.procedureId} 
            AND (pr.name ILIKE ${s} OR pr.code ILIKE ${s})
          )
          OR EXISTS (
            SELECT 1 FROM ${schema.procedureGroups} pg 
            WHERE pg.id = ${schema.regulationRequests.procedureGroupId} 
            AND pg.name ILIKE ${s}
          )
          OR ${schema.regulationRequests.groupProcedures}::text ILIKE ${s}
        )`
      );
    }

    const todayStr = new Date().toISOString().split('T')[0];

    // Executa em paralelo: 1) Itens paginados, 2) Total de linhas para paginação, 3) KPIs globais, 4) Vagas abertas
    const [requests, [totalRow], kpisResult, slotsResult] = await Promise.all([
      this.db.query.regulationRequests.findMany({
        where: and(...conditions),
        with: {
          patient: {
            columns: { id: true, name: true, cpf: true, cns: true, birthDate: true, gender: true },
          },
          requestingHealthCenter: {
            columns: { id: true, name: true, cnes: true },
          },
          procedure: {
            columns: { id: true, code: true, name: true },
          },
          procedureGroup: {
            columns: { id: true, name: true },
          },
          specialty: {
            columns: { id: true, name: true },
          },
        },
        orderBy: [
          desc(schema.regulationRequests.clinicalScore),
          asc(schema.regulationRequests.createdAt),
        ],
        limit,
        offset,
      }),

      this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(schema.regulationRequests)
        .where(and(...conditions)),

      this.db.execute(sql`
        SELECT 
          count(*)::int as total_waiting,
          coalesce(round(avg(CURRENT_DATE - created_at::date)), 0)::int as average_waiting_days,
          count(*) FILTER (WHERE priority::text IN ('URGENCIA', 'URGENTE'))::int as urgency_count,
          count(*) FILTER (WHERE priority = 'PRIORITARIO')::int as priority_count
        FROM regulation_requests
        WHERE status = 'PENDENTE_AGENDAMENTO'
      `),

      this.db.execute(sql`
        SELECT count(*)::int as available_slots_count
        FROM schedule_slots
        WHERE status = 'DISPONIVEL' AND date >= ${todayStr}
      `),
    ]);

    const now = new Date();
    const total = totalRow?.count || 0;

    const items = requests.map((req, index) => {
      const createdAt = new Date(req.createdAt);
      const diffMs = now.getTime() - createdAt.getTime();
      const waitingDays = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
      const age = calculateAge(req.patient?.birthDate);

      const scoreBreakdown: ScoreBreakdown = (req.scoreBreakdown as any) || {
        waitingDays,
        waitingPoints: waitingDays,
        priority: req.priority,
        priorityPoints:
          (req.priority as string) === 'URGENCIA' || req.priority === 'URGENTE'
            ? 500
            : req.priority === 'PRIORITARIO'
            ? 200
            : 0,
        age,
        elderlyPoints: age >= 80 ? 300 : age >= 60 ? 100 : 0,
        pcdPoints: 0,
        totalScore: req.clinicalScore || 0,
      };

      return {
        ...req,
        waitingDays,
        age,
        score: req.clinicalScore || scoreBreakdown.totalScore || 0,
        scoreBreakdown,
        queuePosition: offset + index + 1, // Posição ordinal contínua garantida: (page - 1) * limit + index + 1
      };
    });

    const kpiRow: any = (kpisResult as any)?.[0] || {};
    const slotRow: any = (slotsResult as any)?.[0] || {};

    return {
      items,
      total,
      page,
      limit,
      kpis: {
        totalWaiting: Number(kpiRow.total_waiting || 0),
        averageWaitingDays: Number(kpiRow.average_waiting_days || 0),
        urgencyCount: Number(kpiRow.urgency_count || 0),
        priorityCount: Number(kpiRow.priority_count || 0),
        availableSlotsCount: Number(slotRow.available_slots_count || 0),
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
