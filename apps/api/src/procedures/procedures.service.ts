import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../database/schema';
import { eq, ilike, or, and, asc, sql, notInArray } from 'drizzle-orm';
import * as crypto from 'crypto';
import { IntegraSusService } from '../integra-sus/integra-sus.service';

@Injectable()
export class ProceduresService {
  constructor(
    @Inject('DATABASE_CONNECTION')
    private readonly db: NodePgDatabase<typeof schema>,
    private readonly integraSusService: IntegraSusService,
  ) {}

  async findAll(params: any) {
    const { page = 1, limit = 50, search = '', includeInactive = 'false', requestingHealthCenterId } = params;

    const conditions = [];
    if (includeInactive !== 'true') {
      conditions.push(eq(schema.procedures.isActive, true));
    }
    if (params.procedureGroupId) {
      conditions.push(eq(schema.procedures.procedureGroupId, params.procedureGroupId));
    }
    if (search) {
      const cleanSearch = search.trim();
      const formattedSearch = cleanSearch.replace(/\./g, '');

      conditions.push(
        or(
          ilike(schema.procedures.name, `%${cleanSearch}%`),
          ilike(schema.procedures.code, `%${cleanSearch}%`),
          sql`REPLACE(${schema.procedures.code}, '.', '') ILIKE ${'%' + formattedSearch + '%'}`
        )
      );
    }

    // Regra da Cota 0 para Unidade Solicitante
    if (requestingHealthCenterId) {
      conditions.push(
        sql`${schema.procedures.id} NOT IN (
          SELECT procedure_id 
          FROM procedure_solicitor_quotas 
          WHERE soliciting_health_center_id = ${requestingHealthCenterId}::uuid 
            AND monthly_quota <= 0
        )`
      );
      // Regra da Cota 0 para o Grupo de Procedimento
      conditions.push(
        sql`${schema.procedures.procedureGroupId} NOT IN (
          SELECT procedure_group_id 
          FROM procedure_group_solicitor_quotas 
          WHERE soliciting_health_center_id = ${requestingHealthCenterId}::uuid 
            AND monthly_quota <= 0
        )`
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const items = await this.db.query.procedures.findMany({
      where: whereClause,
      limit: Number(limit),
      offset: (Number(page) - 1) * Number(limit),
      with: {
        procedureGroup: true,
        preparation: true,
      },
      orderBy: [asc(schema.procedures.name)],
    });

    const allItems = await this.db.query.procedures.findMany({
      where: whereClause,
    });

    return {
      data: items,
      total: allItems.length,
    };
  }

  async findOne(id: string) {
    const item = await this.db.query.procedures.findFirst({
      where: eq(schema.procedures.id, id),
      with: {
        procedureGroup: true,
        variants: true,
        preparation: true,
      }
    });
    if (!item) throw new NotFoundException('Procedure not found');
    return item;
  }

  async create(data: any) {
    const [newItem] = await this.db.insert(schema.procedures)
      .values({
        id: crypto.randomUUID(),
        code: data.code,
        name: data.name,
        procedureGroupId: data.procedureGroupId,
        genderAllowed: data.genderAllowed || 'AMBOS',
        minAge: data.minAge !== undefined ? Number(data.minAge) : 0,
        maxAge: data.maxAge !== undefined ? Number(data.maxAge) : 120,

        requiresRegulation: data.requiresRegulation !== undefined ? Boolean(data.requiresRegulation) : true,
        maxReturns: data.maxReturns !== undefined ? Number(data.maxReturns) : 1,
        requestIntervalDays: data.requestIntervalDays !== undefined ? Number(data.requestIntervalDays) : 30,
        consumptionType: data.consumptionType || 'POR_PACIENTE',
        sigtapValue: data.sigtapValue !== undefined ? String(data.sigtapValue) : '0.00',
        regulatorRespectsQuota: data.regulatorRespectsQuota !== undefined ? Boolean(data.regulatorRespectsQuota) : true,

        viewScheduleFirstTimeDays: data.viewScheduleFirstTimeDays !== undefined ? Number(data.viewScheduleFirstTimeDays) : 10,
        viewScheduleReturnDays: data.viewScheduleReturnDays !== undefined ? Number(data.viewScheduleReturnDays) : 15,
        viewScheduleRegulatorDays: data.viewScheduleRegulatorDays !== undefined ? Number(data.viewScheduleRegulatorDays) : 60,
        viewScheduleAutoDays: data.viewScheduleAutoDays !== undefined ? Number(data.viewScheduleAutoDays) : 30,

        releaseScheduleFirstTimeDays: data.releaseScheduleFirstTimeDays !== undefined ? Number(data.releaseScheduleFirstTimeDays) : 1,
        releaseScheduleReturnDays: data.releaseScheduleReturnDays !== undefined ? Number(data.releaseScheduleReturnDays) : 10,
        releaseScheduleRegulatorDays: data.releaseScheduleRegulatorDays !== undefined ? Number(data.releaseScheduleRegulatorDays) : 0,
        releaseScheduleAutoDays: data.releaseScheduleAutoDays !== undefined ? Number(data.releaseScheduleAutoDays) : 15,

        updatedAt: new Date().toISOString(),
      })
      .returning();
    return newItem;
  }

  async update(id: string, data: any) {
    await this.findOne(id);
    const updateData: any = {
      ...data,
      updatedAt: new Date().toISOString(),
    };
    if (data.minAge !== undefined) updateData.minAge = Number(data.minAge);
    if (data.maxAge !== undefined) updateData.maxAge = Number(data.maxAge);
    if (data.maxReturns !== undefined) updateData.maxReturns = Number(data.maxReturns);
    if (data.requestIntervalDays !== undefined) updateData.requestIntervalDays = Number(data.requestIntervalDays);
    if (data.sigtapValue !== undefined) updateData.sigtapValue = String(data.sigtapValue);
    if (data.viewScheduleFirstTimeDays !== undefined) updateData.viewScheduleFirstTimeDays = Number(data.viewScheduleFirstTimeDays);
    if (data.viewScheduleReturnDays !== undefined) updateData.viewScheduleReturnDays = Number(data.viewScheduleReturnDays);
    if (data.viewScheduleRegulatorDays !== undefined) updateData.viewScheduleRegulatorDays = Number(data.viewScheduleRegulatorDays);
    if (data.viewScheduleAutoDays !== undefined) updateData.viewScheduleAutoDays = Number(data.viewScheduleAutoDays);
    if (data.releaseScheduleFirstTimeDays !== undefined) updateData.releaseScheduleFirstTimeDays = Number(data.releaseScheduleFirstTimeDays);
    if (data.releaseScheduleReturnDays !== undefined) updateData.releaseScheduleReturnDays = Number(data.releaseScheduleReturnDays);
    if (data.releaseScheduleRegulatorDays !== undefined) updateData.releaseScheduleRegulatorDays = Number(data.releaseScheduleRegulatorDays);
    if (data.releaseScheduleAutoDays !== undefined) updateData.releaseScheduleAutoDays = Number(data.releaseScheduleAutoDays);

    const [updated] = await this.db.update(schema.procedures)
      .set(updateData)
      .where(eq(schema.procedures.id, id))
      .returning();
    return updated;
  }

  async remove(id: string) {
    const proc = await this.findOne(id);
    if (proc.procedureGroupId) {
      throw new BadRequestException('Procedimentos vinculados a um grupo não podem ser excluídos, apenas desativados.');
    }
    await this.db.delete(schema.procedures)
      .where(eq(schema.procedures.id, id));
  }

  async toggleActive(id: string) {
    const item = await this.findOne(id);
    const [updated] = await this.db.update(schema.procedures)
      .set({
        isActive: !item.isActive,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(schema.procedures.id, id))
      .returning();
    return updated;
  }

  // --- INTEGRA SUS API ---
  async searchIntegraSus(query: string) {
    return this.integraSusService.searchProcedures(query);
  }

  // --- Preparo de Procedimentos ---
  async getPreparation(procedureId: string) {
    const prep = await this.db.query.procedurePreparations.findFirst({
      where: eq(schema.procedurePreparations.procedureId, procedureId),
    });
    return prep || null;
  }

  async savePreparation(procedureId: string, data: any) {
    await this.findOne(procedureId);
    const existing = await this.getPreparation(procedureId);

    if (existing) {
      const [updated] = await this.db.update(schema.procedurePreparations)
        .set({
          title: data.title || existing.title,
          contentHtml: data.contentHtml || '',
          fastingHours: data.fastingHours !== undefined ? Number(data.fastingHours) : 0,
          requiresCompanion: data.requiresCompanion !== undefined ? Boolean(data.requiresCompanion) : false,
          medicationInstructions: data.medicationInstructions ?? null,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(schema.procedurePreparations.id, existing.id))
        .returning();
      return updated;
    } else {
      const [created] = await this.db.insert(schema.procedurePreparations)
        .values({
          id: crypto.randomUUID(),
          procedureId,
          title: data.title || 'Instruções de Preparo Clínico',
          contentHtml: data.contentHtml || '',
          fastingHours: data.fastingHours !== undefined ? Number(data.fastingHours) : 0,
          requiresCompanion: data.requiresCompanion !== undefined ? Boolean(data.requiresCompanion) : false,
          medicationInstructions: data.medicationInstructions ?? null,
          updatedAt: new Date().toISOString(),
        })
        .returning();
      return created;
    }
  }

  // --- Ofertas da Unidade Executante (Item 2 e 5) ---
  async getExecutingOffers(healthCenterId: string, groupId?: string, includeInactive: boolean = false) {
    const conditions = [];
    if (!includeInactive) {
      conditions.push(eq(schema.procedures.isActive, true));
    }
    if (groupId) {
      conditions.push(eq(schema.procedures.procedureGroupId, groupId));
    }

    const procs = await this.db.query.procedures.findMany({
      where: conditions.length > 0 ? and(...conditions) : undefined,
      with: {
        procedureGroup: true,
      },
      orderBy: [asc(schema.procedures.name)],
    });

    const offers = await this.db.query.healthCenterProcedures.findMany({
      where: eq(schema.healthCenterProcedures.healthCenterId, healthCenterId),
    });

    const offerMap = new Map(offers.map(o => [o.procedureId, o]));

    return procs.map(p => {
      const off = offerMap.get(p.id);
      return {
        ...p,
        monthlyQuantity: off?.monthlyQuantity ?? 0,
        isOffered: off ? off.isOffered : true,
        healthCenterProcedureId: off?.id,
      };
    });
  }

  async updateExecutingOffer(healthCenterId: string, procedureId: string, monthlyQuantity: number, isOffered: boolean) {
    const existing = await this.db.query.healthCenterProcedures.findFirst({
      where: and(
        eq(schema.healthCenterProcedures.healthCenterId, healthCenterId),
        eq(schema.healthCenterProcedures.procedureId, procedureId)
      ),
    });

    if (existing) {
      const [updated] = await this.db.update(schema.healthCenterProcedures)
        .set({
          monthlyQuantity: Number(monthlyQuantity),
          isOffered: Boolean(isOffered),
          updatedAt: new Date().toISOString(),
        })
        .where(eq(schema.healthCenterProcedures.id, existing.id))
        .returning();
      return updated;
    } else {
      const [created] = await this.db.insert(schema.healthCenterProcedures)
        .values({
          id: crypto.randomUUID(),
          healthCenterId,
          procedureId,
          monthlyQuantity: Number(monthlyQuantity),
          isOffered: Boolean(isOffered),
          updatedAt: new Date().toISOString(),
        })
        .returning();
      return created;
    }
  }

  // --- Cotas das Unidades Solicitantes (Item 3) ---
  async getProcedureQuotasMatrix(executingHealthCenterId: string, procedureId: string) {
    const executingHc = await this.db.query.healthCenters.findFirst({
      where: eq(schema.healthCenters.id, executingHealthCenterId),
    });
    const offer = await this.db.query.healthCenterProcedures.findFirst({
      where: and(
        eq(schema.healthCenterProcedures.healthCenterId, executingHealthCenterId),
        eq(schema.healthCenterProcedures.procedureId, procedureId)
      ),
    });
    const totalCapacity = offer?.monthlyQuantity ?? 0;

    const solicitors = await this.db.query.healthCenters.findMany({
      where: and(
        eq(schema.healthCenters.isActive, true),
        eq(schema.healthCenters.stSolicitante, true)
      ),
      orderBy: [asc(schema.healthCenters.name)],
    });

    const quotas = await this.db.query.procedureSolicitorQuotas.findMany({
      where: and(
        eq(schema.procedureSolicitorQuotas.executingHealthCenterId, executingHealthCenterId),
        eq(schema.procedureSolicitorQuotas.procedureId, procedureId)
      ),
    });
    const quotaMap = new Map(quotas.map(q => [q.solicitingHealthCenterId, q]));

    const matrix = solicitors.map(s => {
      const q = quotaMap.get(s.id);
      return {
        solicitingHealthCenterId: s.id,
        solicitingHealthCenterName: s.name,
        solicitingHealthCenterCnes: s.cnes,
        monthlyQuota: q?.monthlyQuota ?? 0,
        usedQuota: q?.usedQuota ?? 0,
        isManualAdjustment: q?.isManualAdjustment ?? false,
      };
    });

    const allocatedTotal = matrix.reduce((acc, curr) => acc + curr.monthlyQuota, 0);

    return {
      executingHealthCenterId,
      executingHealthCenterName: executingHc?.name,
      procedureId,
      totalCapacity,
      allocatedTotal,
      unallocated: totalCapacity - allocatedTotal,
      isOffered: offer ? offer.isOffered : true,
      solicitors: matrix,
    };
  }

  async autoDistributeQuotas(executingHealthCenterId: string, procedureId: string, totalCapacityOverride?: number) {
    let total = totalCapacityOverride;
    if (total === undefined) {
      const offer = await this.db.query.healthCenterProcedures.findFirst({
        where: and(
          eq(schema.healthCenterProcedures.healthCenterId, executingHealthCenterId),
          eq(schema.healthCenterProcedures.procedureId, procedureId)
        ),
      });
      total = offer?.monthlyQuantity ?? 0;
    } else {
      await this.updateExecutingOffer(executingHealthCenterId, procedureId, total, true);
    }

    const solicitors = await this.db.query.healthCenters.findMany({
      where: and(
        eq(schema.healthCenters.isActive, true),
        eq(schema.healthCenters.stSolicitante, true)
      ),
      orderBy: [asc(schema.healthCenters.name)],
    });

    if (solicitors.length === 0) {
      return this.getProcedureQuotasMatrix(executingHealthCenterId, procedureId);
    }

    const count = solicitors.length;
    const baseQuota = Math.floor(total / count);
    const remainder = total % count;

    for (let i = 0; i < count; i++) {
      const s = solicitors[i];
      const quotaValue = baseQuota + (i < remainder ? 1 : 0);

      const existing = await this.db.query.procedureSolicitorQuotas.findFirst({
        where: and(
          eq(schema.procedureSolicitorQuotas.executingHealthCenterId, executingHealthCenterId),
          eq(schema.procedureSolicitorQuotas.solicitingHealthCenterId, s.id),
          eq(schema.procedureSolicitorQuotas.procedureId, procedureId)
        ),
      });

      if (existing) {
        await this.db.update(schema.procedureSolicitorQuotas)
          .set({
            monthlyQuota: quotaValue,
            isManualAdjustment: false,
            updatedAt: new Date().toISOString(),
          })
          .where(eq(schema.procedureSolicitorQuotas.id, existing.id));
      } else {
        await this.db.insert(schema.procedureSolicitorQuotas)
          .values({
            id: crypto.randomUUID(),
            executingHealthCenterId,
            solicitingHealthCenterId: s.id,
            procedureId,
            monthlyQuota: quotaValue,
            usedQuota: 0,
            isManualAdjustment: false,
            updatedAt: new Date().toISOString(),
          });
      }
    }

    return this.getProcedureQuotasMatrix(executingHealthCenterId, procedureId);
  }

  // --- Ofertas e Capacidade Mensal por Grupo ---
  async updateExecutingGroupOffer(
    healthCenterId: string,
    procedureGroupId: string,
    monthlyQuantity: number,
    isOffered: boolean,
    applyToAllProcedures: boolean = false
  ) {
    const existing = await this.db.query.healthCenterProcedureGroups.findFirst({
      where: and(
        eq(schema.healthCenterProcedureGroups.healthCenterId, healthCenterId),
        eq(schema.healthCenterProcedureGroups.procedureGroupId, procedureGroupId)
      ),
    });

    let groupOffer;
    if (existing) {
      const [updated] = await this.db.update(schema.healthCenterProcedureGroups)
        .set({
          monthlyQuantity: Number(monthlyQuantity),
          isOffered: Boolean(isOffered),
          updatedAt: new Date().toISOString(),
        })
        .where(eq(schema.healthCenterProcedureGroups.id, existing.id))
        .returning();
      groupOffer = updated;
    } else {
      const [created] = await this.db.insert(schema.healthCenterProcedureGroups)
        .values({
          id: crypto.randomUUID(),
          healthCenterId,
          procedureGroupId,
          monthlyQuantity: Number(monthlyQuantity),
          isOffered: Boolean(isOffered),
          updatedAt: new Date().toISOString(),
        })
        .returning();
      groupOffer = created;
    }

    if (applyToAllProcedures) {
      const procs = await this.db.query.procedures.findMany({
        where: eq(schema.procedures.procedureGroupId, procedureGroupId),
      });
      for (const p of procs) {
        await this.updateExecutingOffer(healthCenterId, p.id, monthlyQuantity, isOffered);
      }
    }

    return groupOffer;
  }

  // --- Matriz de Cotas por Grupo ---
  async getGroupQuotasMatrix(executingHealthCenterId: string, procedureGroupId: string) {
    const executingHc = await this.db.query.healthCenters.findFirst({
      where: eq(schema.healthCenters.id, executingHealthCenterId),
    });
    const group = await this.db.query.procedureGroups.findFirst({
      where: eq(schema.procedureGroups.id, procedureGroupId),
    });
    const groupProcs = await this.db.query.procedures.findMany({
      where: eq(schema.procedures.procedureGroupId, procedureGroupId),
    });
    const offer = await this.db.query.healthCenterProcedureGroups.findFirst({
      where: and(
        eq(schema.healthCenterProcedureGroups.healthCenterId, executingHealthCenterId),
        eq(schema.healthCenterProcedureGroups.procedureGroupId, procedureGroupId)
      ),
    });
    const totalCapacity = offer?.monthlyQuantity ?? 0;

    const solicitors = await this.db.query.healthCenters.findMany({
      where: and(
        eq(schema.healthCenters.isActive, true),
        eq(schema.healthCenters.stSolicitante, true)
      ),
      orderBy: [asc(schema.healthCenters.name)],
    });

    const quotas = await this.db.query.procedureGroupSolicitorQuotas.findMany({
      where: and(
        eq(schema.procedureGroupSolicitorQuotas.executingHealthCenterId, executingHealthCenterId),
        eq(schema.procedureGroupSolicitorQuotas.procedureGroupId, procedureGroupId)
      ),
    });
    const quotaMap = new Map(quotas.map(q => [q.solicitingHealthCenterId, q]));

    const matrix = solicitors.map(s => {
      const q = quotaMap.get(s.id);
      return {
        solicitingHealthCenterId: s.id,
        solicitingHealthCenterName: s.name,
        solicitingHealthCenterCnes: s.cnes,
        monthlyQuota: q?.monthlyQuota ?? 0,
        usedQuota: q?.usedQuota ?? 0,
        isManualAdjustment: q?.isManualAdjustment ?? false,
      };
    });

    const allocatedTotal = matrix.reduce((acc, curr) => acc + curr.monthlyQuota, 0);

    return {
      executingHealthCenterId,
      executingHealthCenterName: executingHc?.name,
      procedureGroupId,
      procedureGroupName: group?.name,
      proceduresCount: groupProcs.length,
      totalCapacity,
      allocatedTotal,
      unallocated: totalCapacity - allocatedTotal,
      isOffered: offer ? offer.isOffered : true,
      solicitors: matrix,
    };
  }

  // --- Distribuição Automática de Cotas por Grupo ---
  async autoDistributeGroupQuotas(
    executingHealthCenterId: string,
    procedureGroupId: string,
    totalCapacityOverride?: number,
    applyToAllProcedures: boolean = false
  ) {
    let total = totalCapacityOverride;
    if (total === undefined) {
      const offer = await this.db.query.healthCenterProcedureGroups.findFirst({
        where: and(
          eq(schema.healthCenterProcedureGroups.healthCenterId, executingHealthCenterId),
          eq(schema.healthCenterProcedureGroups.procedureGroupId, procedureGroupId)
        ),
      });
      total = offer?.monthlyQuantity ?? 0;
    } else {
      await this.updateExecutingGroupOffer(executingHealthCenterId, procedureGroupId, total, true, applyToAllProcedures);
    }

    const solicitors = await this.db.query.healthCenters.findMany({
      where: and(
        eq(schema.healthCenters.isActive, true),
        eq(schema.healthCenters.stSolicitante, true)
      ),
      orderBy: [asc(schema.healthCenters.name)],
    });

    if (solicitors.length === 0) {
      return this.getGroupQuotasMatrix(executingHealthCenterId, procedureGroupId);
    }

    const count = solicitors.length;
    const baseQuota = Math.floor(total / count);
    const remainder = total % count;

    for (let i = 0; i < count; i++) {
      const s = solicitors[i];
      const quotaValue = baseQuota + (i < remainder ? 1 : 0);

      const existing = await this.db.query.procedureGroupSolicitorQuotas.findFirst({
        where: and(
          eq(schema.procedureGroupSolicitorQuotas.executingHealthCenterId, executingHealthCenterId),
          eq(schema.procedureGroupSolicitorQuotas.solicitingHealthCenterId, s.id),
          eq(schema.procedureGroupSolicitorQuotas.procedureGroupId, procedureGroupId)
        ),
      });

      if (existing) {
        await this.db.update(schema.procedureGroupSolicitorQuotas)
          .set({
            monthlyQuota: quotaValue,
            isManualAdjustment: false,
            updatedAt: new Date().toISOString(),
          })
          .where(eq(schema.procedureGroupSolicitorQuotas.id, existing.id));
      } else {
        await this.db.insert(schema.procedureGroupSolicitorQuotas)
          .values({
            id: crypto.randomUUID(),
            executingHealthCenterId,
            solicitingHealthCenterId: s.id,
            procedureGroupId,
            monthlyQuota: quotaValue,
            usedQuota: 0,
            isManualAdjustment: false,
            updatedAt: new Date().toISOString(),
          });
      }
    }

    if (applyToAllProcedures) {
      const procs = await this.db.query.procedures.findMany({
        where: eq(schema.procedures.procedureGroupId, procedureGroupId),
      });
      for (const p of procs) {
        await this.autoDistributeQuotas(executingHealthCenterId, p.id, total);
      }
    }

    return this.getGroupQuotasMatrix(executingHealthCenterId, procedureGroupId);
  }

  // --- Rebalanceamento de Cotas por Grupo ---
  async rebalanceGroupQuotas(
    executingHealthCenterId: string,
    procedureGroupId: string,
    changedSolicitingId: string,
    newManualQuota: number,
    applyToAllProcedures: boolean = false
  ) {
    const offer = await this.db.query.healthCenterProcedureGroups.findFirst({
      where: and(
        eq(schema.healthCenterProcedureGroups.healthCenterId, executingHealthCenterId),
        eq(schema.healthCenterProcedureGroups.procedureGroupId, procedureGroupId)
      ),
    });
    const totalCapacity = offer?.monthlyQuantity ?? 0;

    const solicitors = await this.db.query.healthCenters.findMany({
      where: and(
        eq(schema.healthCenters.isActive, true),
        eq(schema.healthCenters.stSolicitante, true)
      ),
      orderBy: [asc(schema.healthCenters.name)],
    });

    const otherSolicitors = solicitors.filter(s => s.id !== changedSolicitingId);
    const clampedVal = Math.min(Math.max(0, newManualQuota), totalCapacity);
    const remainingToDistribute = Math.max(0, totalCapacity - clampedVal);

    const existingChanged = await this.db.query.procedureGroupSolicitorQuotas.findFirst({
      where: and(
        eq(schema.procedureGroupSolicitorQuotas.executingHealthCenterId, executingHealthCenterId),
        eq(schema.procedureGroupSolicitorQuotas.solicitingHealthCenterId, changedSolicitingId),
        eq(schema.procedureGroupSolicitorQuotas.procedureGroupId, procedureGroupId)
      ),
    });

    if (existingChanged) {
      await this.db.update(schema.procedureGroupSolicitorQuotas)
        .set({
          monthlyQuota: clampedVal,
          isManualAdjustment: true,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(schema.procedureGroupSolicitorQuotas.id, existingChanged.id));
    } else {
      await this.db.insert(schema.procedureGroupSolicitorQuotas)
        .values({
          id: crypto.randomUUID(),
          executingHealthCenterId,
          solicitingHealthCenterId: changedSolicitingId,
          procedureGroupId,
          monthlyQuota: clampedVal,
          usedQuota: 0,
          isManualAdjustment: true,
          updatedAt: new Date().toISOString(),
        });
    }

    if (otherSolicitors.length > 0) {
      const otherCount = otherSolicitors.length;
      const baseOther = Math.floor(remainingToDistribute / otherCount);
      const remainderOther = remainingToDistribute % otherCount;

      for (let i = 0; i < otherCount; i++) {
        const s = otherSolicitors[i];
        const assignedQuota = Math.max(0, baseOther + (i < remainderOther ? 1 : 0));

        const ex = await this.db.query.procedureGroupSolicitorQuotas.findFirst({
          where: and(
            eq(schema.procedureGroupSolicitorQuotas.executingHealthCenterId, executingHealthCenterId),
            eq(schema.procedureGroupSolicitorQuotas.solicitingHealthCenterId, s.id),
            eq(schema.procedureGroupSolicitorQuotas.procedureGroupId, procedureGroupId)
          ),
        });

        if (ex) {
          await this.db.update(schema.procedureGroupSolicitorQuotas)
            .set({
              monthlyQuota: assignedQuota,
              updatedAt: new Date().toISOString(),
            })
            .where(eq(schema.procedureGroupSolicitorQuotas.id, ex.id));
        } else {
          await this.db.insert(schema.procedureGroupSolicitorQuotas)
            .values({
              id: crypto.randomUUID(),
              executingHealthCenterId,
              solicitingHealthCenterId: s.id,
              procedureGroupId,
              monthlyQuota: assignedQuota,
              usedQuota: 0,
              isManualAdjustment: false,
              updatedAt: new Date().toISOString(),
            });
        }
      }
    }

    if (applyToAllProcedures) {
      const procs = await this.db.query.procedures.findMany({
        where: eq(schema.procedures.procedureGroupId, procedureGroupId),
      });
      for (const p of procs) {
        await this.rebalanceQuotas(executingHealthCenterId, p.id, changedSolicitingId, clampedVal);
      }
    }

    return this.getGroupQuotasMatrix(executingHealthCenterId, procedureGroupId);
  }

  async rebalanceQuotas(executingHealthCenterId: string, procedureId: string, changedSolicitingId: string, newManualQuota: number) {
    const val = Math.max(0, Number(newManualQuota));

    const offer = await this.db.query.healthCenterProcedures.findFirst({
      where: and(
        eq(schema.healthCenterProcedures.healthCenterId, executingHealthCenterId),
        eq(schema.healthCenterProcedures.procedureId, procedureId)
      ),
    });
    const totalCapacity = offer?.monthlyQuantity ?? 0;

    const solicitors = await this.db.query.healthCenters.findMany({
      where: and(
        eq(schema.healthCenters.isActive, true),
        eq(schema.healthCenters.stSolicitante, true)
      ),
      orderBy: [asc(schema.healthCenters.name)],
    });

    const otherSolicitors = solicitors.filter(s => s.id !== changedSolicitingId);
    const clampedVal = Math.min(val, totalCapacity);
    const remainingToDistribute = Math.max(0, totalCapacity - clampedVal);

    // Atualiza a unidade modificada
    const existingChanged = await this.db.query.procedureSolicitorQuotas.findFirst({
      where: and(
        eq(schema.procedureSolicitorQuotas.executingHealthCenterId, executingHealthCenterId),
        eq(schema.procedureSolicitorQuotas.solicitingHealthCenterId, changedSolicitingId),
        eq(schema.procedureSolicitorQuotas.procedureId, procedureId)
      ),
    });
    if (existingChanged) {
      await this.db.update(schema.procedureSolicitorQuotas)
        .set({
          monthlyQuota: clampedVal,
          isManualAdjustment: true,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(schema.procedureSolicitorQuotas.id, existingChanged.id));
    } else {
      await this.db.insert(schema.procedureSolicitorQuotas)
        .values({
          id: crypto.randomUUID(),
          executingHealthCenterId,
          solicitingHealthCenterId: changedSolicitingId,
          procedureId,
          monthlyQuota: clampedVal,
          usedQuota: 0,
          isManualAdjustment: true,
          updatedAt: new Date().toISOString(),
        });
    }

    // Rateio automático entre as demais unidades
    if (otherSolicitors.length > 0) {
      const otherCount = otherSolicitors.length;
      const baseOther = Math.floor(remainingToDistribute / otherCount);
      const remainderOther = remainingToDistribute % otherCount;

      for (let i = 0; i < otherCount; i++) {
        const s = otherSolicitors[i];
        const assignedQuota = Math.max(0, baseOther + (i < remainderOther ? 1 : 0));

        const ex = await this.db.query.procedureSolicitorQuotas.findFirst({
          where: and(
            eq(schema.procedureSolicitorQuotas.executingHealthCenterId, executingHealthCenterId),
            eq(schema.procedureSolicitorQuotas.solicitingHealthCenterId, s.id),
            eq(schema.procedureSolicitorQuotas.procedureId, procedureId)
          ),
        });

        if (ex) {
          await this.db.update(schema.procedureSolicitorQuotas)
            .set({
              monthlyQuota: assignedQuota,
              updatedAt: new Date().toISOString(),
            })
            .where(eq(schema.procedureSolicitorQuotas.id, ex.id));
        } else {
          await this.db.insert(schema.procedureSolicitorQuotas)
            .values({
              id: crypto.randomUUID(),
              executingHealthCenterId,
              solicitingHealthCenterId: s.id,
              procedureId,
              monthlyQuota: assignedQuota,
              usedQuota: 0,
              isManualAdjustment: false,
              updatedAt: new Date().toISOString(),
            });
        }
      }
    }

    return this.getProcedureQuotasMatrix(executingHealthCenterId, procedureId);
  }
}
