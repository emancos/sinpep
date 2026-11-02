import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../database/schema';
import { eq, asc } from 'drizzle-orm';
import * as crypto from 'crypto';
import { IntegraSusService } from '../integra-sus/integra-sus.service';

@Injectable()
export class ProcedureGroupsService {
  constructor(
    @Inject('DATABASE_CONNECTION')
    private readonly db: NodePgDatabase<typeof schema>,
    private readonly integraSusService: IntegraSusService,
  ) {}

  async findAll(includeInactive: boolean = false) {
    let whereClause = undefined;
    if (!includeInactive) {
      whereClause = eq(schema.procedureGroups.isActive, true);
    }
    
    return this.db.query.procedureGroups.findMany({
      where: whereClause,
      orderBy: [asc(schema.procedureGroups.name)],
    });
  }

  async findOne(id: string) {
    const group = await this.db.query.procedureGroups.findFirst({
      where: eq(schema.procedureGroups.id, id),
    });
    if (!group) throw new NotFoundException('Group not found');
    return group;
  }

  async create(data: { name: string; groupCode?: string; subgroupCode?: string }) {
    const [newGroup] = await this.db.insert(schema.procedureGroups)
      .values({
        id: crypto.randomUUID(),
        name: data.name,
        groupCode: data.groupCode || null,
        subgroupCode: data.subgroupCode || null,
        updatedAt: new Date().toISOString(),
      })
      .returning();
    return newGroup;
  }

  async update(id: string, data: { name: string; groupCode?: string; subgroupCode?: string }) {
    await this.findOne(id);
    const [updated] = await this.db.update(schema.procedureGroups)
      .set({
        name: data.name,
        groupCode: data.groupCode !== undefined ? data.groupCode : undefined,
        subgroupCode: data.subgroupCode !== undefined ? data.subgroupCode : undefined,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(schema.procedureGroups.id, id))
      .returning();
    return updated;
  }

  // Regra: Um grupo pode ser excluído junto com todos os seus procedimentos
  async remove(id: string) {
    await this.findOne(id);

    // 1. Identifica os procedimentos vinculados a este grupo
    const procs = await this.db.query.procedures.findMany({
      where: eq(schema.procedures.procedureGroupId, id),
    });

    // 2. Remove registros dependentes dos procedimentos vinculados
    for (const p of procs) {
      await this.db.delete(schema.procedurePreparations).where(eq(schema.procedurePreparations.procedureId, p.id));
      await this.db.delete(schema.healthCenterProcedures).where(eq(schema.healthCenterProcedures.procedureId, p.id));
      await this.db.delete(schema.procedureSolicitorQuotas).where(eq(schema.procedureSolicitorQuotas.procedureId, p.id));
      await this.db.delete(schema.procedures).where(eq(schema.procedures.id, p.id));
    }

    // 3. Remove o grupo de procedimentos
    await this.db.delete(schema.procedureGroups)
      .where(eq(schema.procedureGroups.id, id));
  }

  // Regra: Um grupo pode ser desativado junto com todos os seus procedimentos
  async toggleActive(id: string) {
    const group = await this.findOne(id);
    const nextStatus = !group.isActive;

    const [updated] = await this.db.update(schema.procedureGroups)
      .set({
        isActive: nextStatus,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(schema.procedureGroups.id, id))
      .returning();

    // Ao desativar o grupo, desativa em cascata todos os procedimentos vinculados
    if (!nextStatus) {
      await this.db.update(schema.procedures)
        .set({
          isActive: false,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(schema.procedures.procedureGroupId, id));
    }

    return updated;
  }

  // --- MÉTODOS INTEGRA SUS API ---
  async searchSubgroups(search?: string, grupo?: string) {
    return this.integraSusService.searchSubgroups(search, grupo);
  }

  async getGroups(search?: string, arvore?: boolean) {
    return this.integraSusService.getGroups(search, arvore);
  }

  async getGroupSubgroups(grupoCodigo: string, search?: string) {
    return this.integraSusService.getGroupSubgroups(grupoCodigo, search);
  }

  async getSubgroupProcedures(grupoCodigo: string, subgrupoCodigo: string, page: number = 1, limit: number = 200) {
    return this.integraSusService.getSubgroupProcedures(grupoCodigo, subgrupoCodigo, page, limit);
  }

  // Importa grupo do INTEGRA SUS e automaticamente adiciona todos os procedimentos vinculados
  async importGroupFromIntegraSus(dto: {
    name?: string;
    groupCode: string;
    subgroupCode: string;
    groupName?: string;
    subgroupName?: string;
    autoImportProcedures?: boolean;
  }) {
    const groupName = dto.name || (dto.subgroupName ? `${dto.groupCode}.${dto.subgroupCode} - ${dto.subgroupName}` : `Subgrupo ${dto.groupCode}.${dto.subgroupCode}`);

    // Cria o grupo de procedimentos
    const [newGroup] = await this.db.insert(schema.procedureGroups)
      .values({
        id: crypto.randomUUID(),
        name: groupName.trim().toUpperCase(),
        groupCode: dto.groupCode,
        subgroupCode: dto.subgroupCode,
        updatedAt: new Date().toISOString(),
      })
      .returning();

    let importedCount = 0;

    // Importa automaticamente os procedimentos vinculados se solicitado
    if (dto.autoImportProcedures !== false) {
      const procs = await this.integraSusService.getSubgroupProcedures(dto.groupCode, dto.subgroupCode, 1, 300);

      for (const item of procs) {
        const code = item.co_procedimento || item.codigo || item.code;
        const name = item.no_procedimento || item.nome || item.name;
        if (!name) continue;

        const cleanCode = code ? String(code).trim() : null;
        const minAgeYears = item.nu_idade_minima !== undefined ? Math.floor(Number(item.nu_idade_minima) / 12) : 0;
        const maxAgeYears = item.nu_idade_maxima !== undefined ? Math.floor(Number(item.nu_idade_maxima) / 12) : 130;
        const gender = item.tp_sexo === 'M' ? 'MASCULINO' : item.tp_sexo === 'F' ? 'FEMININO' : 'AMBOS';
        const sigtapVal = item.vl_sa ? Number(item.vl_sa).toFixed(2) : '0.00';

        // Verifica se já existe procedimento com esse código
        let existing = null;
        if (cleanCode) {
          existing = await this.db.query.procedures.findFirst({
            where: eq(schema.procedures.code, cleanCode),
          });
        }

        if (existing) {
          await this.db.update(schema.procedures)
            .set({
              procedureGroupId: newGroup.id,
              name: String(name).trim(),
              minAge: minAgeYears,
              maxAge: maxAgeYears,
              genderAllowed: gender,
              sigtapValue: sigtapVal,
              isActive: true,
              updatedAt: new Date().toISOString(),
            })
            .where(eq(schema.procedures.id, existing.id));
        } else {
          await this.db.insert(schema.procedures).values({
            id: crypto.randomUUID(),
            code: cleanCode,
            name: String(name).trim(),
            procedureGroupId: newGroup.id,
            genderAllowed: gender,
            minAge: minAgeYears,
            maxAge: maxAgeYears,
            requiresRegulation: true,
            maxReturns: 1,
            requestIntervalDays: 30,
            consumptionType: 'POR_PACIENTE',
            sigtapValue: sigtapVal,
            regulatorRespectsQuota: true,
            viewScheduleFirstTimeDays: 10,
            viewScheduleReturnDays: 15,
            viewScheduleRegulatorDays: 60,
            viewScheduleAutoDays: 30,
            releaseScheduleFirstTimeDays: 1,
            releaseScheduleReturnDays: 10,
            releaseScheduleRegulatorDays: 0,
            releaseScheduleAutoDays: 15,
            isActive: true,
            updatedAt: new Date().toISOString(),
          });
        }
        importedCount++;
      }
    }

    return {
      group: newGroup,
      importedCount,
    };
  }
}
