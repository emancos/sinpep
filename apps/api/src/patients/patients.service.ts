import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { DATABASE_CONNECTION } from '../database/database.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../database/schema';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { UpdateAttentionDto } from './dto/update-attention.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { eq, ilike, or, and, asc, desc, sql, inArray } from 'drizzle-orm';
import * as crypto from 'crypto';

@Injectable()
export class PatientsService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async checkUnique(cpf?: string, cns?: string, excludeId?: string) {
    if (!cpf && !cns) {
      return { isUnique: true };
    }

    const conditions = [];
    if (cpf && cns) {
      conditions.push(or(eq(schema.patients.cpf, cpf), eq(schema.patients.cns, cns)));
    } else if (cpf) {
      conditions.push(eq(schema.patients.cpf, cpf));
    } else if (cns) {
      conditions.push(eq(schema.patients.cns, cns));
    }

    const whereClause = and(...conditions);
    let existingPatients = await this.db.select().from(schema.patients).where(whereClause);

    if (excludeId) {
      existingPatients = existingPatients.filter((p) => p.id !== excludeId);
    }

    if (existingPatients.length === 0) {
      return { isUnique: true };
    }

    const duplicates = [];
    if (cpf && existingPatients.some((p) => p.cpf === cpf)) duplicates.push('CPF');
    if (cns && existingPatients.some((p) => p.cns === cns)) duplicates.push('CNS');

    return {
      isUnique: false,
      message: `Este ${duplicates.join(' e ')} já está cadastrado no sistema.`,
      patientId: existingPatients[0].id,
    };
  }

  async create(createPatientDto: CreatePatientDto) {
    const { phones, birthDate, anamnesis, ...rest } = createPatientDto;
    const patientId = crypto.randomUUID();

    await this.db.insert(schema.patients).values({
      id: patientId,
      name: rest.name,
      cpf: rest.cpf,
      cns: rest.cns ?? null,
      birthDate: new Date(birthDate).toISOString().split('T')[0] + 'T00:00:00.000Z',
      gender: rest.gender,
      healthCenterId: rest.healthCenterId,
      healthAgentId: rest.healthAgentId ?? null,
      address: rest.address ?? null,
      attentionLevel: (rest as any).attentionLevel ?? 1,
      attentionNotes: (rest as any).attentionNotes ?? null,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    if (phones && phones.length > 0) {
      for (const p of phones) {
        await this.db.insert(schema.patientPhones).values({
          id: crypto.randomUUID(),
          patientId: patientId,
          phoneNumber: p.phoneNumber,
          isWhatsapp: p.isWhatsapp ?? false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
    }

    if (anamnesis) {
      await this.db.insert(schema.patientAnamnesis).values({
        id: crypto.randomUUID(),
        patientId: patientId,
        isHypertensive: anamnesis.isHypertensive ?? false,
        isDiabetic: anamnesis.isDiabetic ?? false,
        otherDiseases: anamnesis.otherDiseases ?? null,
        isOncological: anamnesis.isOncological ?? false,
        oncologicalStage: anamnesis.oncologicalStage ?? null,
        allergies: anamnesis.allergies ?? null,
        isPcd: anamnesis.isPcd ?? false,
        pcdDescription: anamnesis.pcdDescription ?? null,
        continuousMedications: anamnesis.continuousMedications ?? [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    return this.findOne(patientId);
  }

  async findAll(query: PaginationQueryDto) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(query.limit) || 20));
    const sortBy = query.sortBy || 'name';
    const sortOrder = query.sortOrder === 'desc' ? 'desc' : 'asc';
    const skip = (page - 1) * limit;

    const conditions = [];

    if (query.includeInactive !== 'true') {
      conditions.push(eq(schema.patients.isActive, true));
    }

    if (query.healthCenterId && query.healthCenterId !== 'ALL') {
      conditions.push(eq(schema.patients.healthCenterId, query.healthCenterId));
    }

    if (query.search && query.search.trim()) {
      const trimmedSearch = query.search.trim();
      const cleanDigits = trimmedSearch.replace(/\D/g, '');

      const searchConditions = [
        ilike(schema.patients.name, `%${trimmedSearch}%`),
        ilike(schema.patients.cpf, `%${trimmedSearch}%`),
        ilike(schema.patients.cns, `%${trimmedSearch}%`),
      ];

      if (cleanDigits.length >= 2) {
        searchConditions.push(ilike(schema.patients.cpf, `%${cleanDigits}%`));
        searchConditions.push(ilike(schema.patients.cns, `%${cleanDigits}%`));
      }

      conditions.push(or(...searchConditions));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    const isDesc = sortOrder === 'desc';

    let orderClause = [isDesc ? desc(schema.patients.name) : asc(schema.patients.name)];
    if (sortBy === 'healthCenter') {
      orderClause = [
        isDesc
          ? sql`${schema.healthCenters.name} DESC NULLS LAST`
          : sql`${schema.healthCenters.name} ASC NULLS LAST`,
        asc(schema.patients.name),
      ];
    } else if (sortBy === 'cpf') {
      orderClause = [isDesc ? desc(schema.patients.cpf) : asc(schema.patients.cpf), asc(schema.patients.name)];
    } else if (sortBy === 'cns') {
      orderClause = [isDesc ? desc(schema.patients.cns) : asc(schema.patients.cns), asc(schema.patients.name)];
    } else if (sortBy === 'createdAt') {
      orderClause = [isDesc ? desc(schema.patients.createdAt) : asc(schema.patients.createdAt)];
    }

    // 1. Executa contagem e consulta paginada via LEFT JOIN direto em paralelo (evita LATERAL N×M antes do LIMIT)
    const [totalResult, rows] = await Promise.all([
      this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(schema.patients)
        .where(whereClause),
      this.db
        .select({
          id: schema.patients.id,
          name: schema.patients.name,
          cpf: schema.patients.cpf,
          cns: schema.patients.cns,
          email: schema.patients.email,
          birthDate: schema.patients.birthDate,
          gender: schema.patients.gender,
          createdAt: schema.patients.createdAt,
          updatedAt: schema.patients.updatedAt,
          healthCenterId: schema.patients.healthCenterId,
          healthAgentId: schema.patients.healthAgentId,
          attentionLevel: schema.patients.attentionLevel,
          attentionNotes: schema.patients.attentionNotes,
          address: schema.patients.address,
          isActive: schema.patients.isActive,
          healthCenter: {
            id: schema.healthCenters.id,
            name: schema.healthCenters.name,
            cnes: schema.healthCenters.cnes,
          },
          healthAgent: {
            id: schema.healthAgents.id,
            name: schema.healthAgents.name,
          },
        })
        .from(schema.patients)
        .leftJoin(schema.healthCenters, eq(schema.patients.healthCenterId, schema.healthCenters.id))
        .leftJoin(schema.healthAgents, eq(schema.patients.healthAgentId, schema.healthAgents.id))
        .where(whereClause)
        .orderBy(...orderClause)
        .limit(limit)
        .offset(skip),
    ]);

    const total = totalResult[0]?.count || 0;

    // 2. Carrega telefones em lote apenas para os registros retornados na página
    const patientIds = rows.map((r) => r.id);
    const phonesByPatientId = new Map<string, (typeof schema.patientPhones.$inferSelect)[]>();

    if (patientIds.length > 0) {
      const phones = await this.db
        .select()
        .from(schema.patientPhones)
        .where(inArray(schema.patientPhones.patientId, patientIds));

      for (const phone of phones) {
        const list = phonesByPatientId.get(phone.patientId) || [];
        list.push(phone);
        phonesByPatientId.set(phone.patientId, list);
      }
    }

    const data = rows.map((row) => {
      const patientPhones = phonesByPatientId.get(row.id) || [];
      return {
        ...row,
        healthCenter: row.healthCenter?.id ? row.healthCenter : null,
        healthAgent: row.healthAgent?.id ? row.healthAgent : null,
        patientPhones,
        phones: patientPhones,
      };
    });

    return { data, total, page, limit };
  }

  async findOne(id: string) {
    const patient = await this.db.query.patients.findFirst({
      where: eq(schema.patients.id, id),
      with: {
        patientPhones: true,
        healthCenter: true,
        healthAgent: true,
        patientAnamnesis: true,
      }
    });

    if (!patient) {
      throw new NotFoundException(`Patient with ID ${id} not found`);
    }
    return { ...patient, phones: patient.patientPhones };
  }

  async update(id: string, updatePatientDto: UpdatePatientDto) {
    await this.findOne(id);
    const { phones, birthDate, anamnesis, ...rest } = updatePatientDto;

    const dataToUpdate: any = { ...rest, updatedAt: new Date().toISOString() };
    if (birthDate) {
      dataToUpdate.birthDate = new Date(birthDate).toISOString().split('T')[0] + 'T00:00:00.000Z';
    }
    if (dataToUpdate.active !== undefined) {
      dataToUpdate.isActive = dataToUpdate.active;
      delete dataToUpdate.active;
    }

    if (Object.keys(dataToUpdate).length > 0) {
      await this.db.update(schema.patients)
        .set(dataToUpdate)
        .where(eq(schema.patients.id, id));
    }

    if (phones) {
      await this.db.delete(schema.patientPhones).where(eq(schema.patientPhones.patientId, id));
      for (const p of phones) {
        await this.db.insert(schema.patientPhones).values({
          id: crypto.randomUUID(),
          patientId: id,
          phoneNumber: p.phoneNumber,
          isWhatsapp: p.isWhatsapp ?? false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
    }

    if (anamnesis) {
      const existingAnamnesis = await this.db.query.patientAnamnesis.findFirst({
        where: eq(schema.patientAnamnesis.patientId, id),
      });

      if (existingAnamnesis) {
        await this.db.update(schema.patientAnamnesis)
          .set({
            isHypertensive: anamnesis.isHypertensive ?? existingAnamnesis.isHypertensive,
            isDiabetic: anamnesis.isDiabetic ?? existingAnamnesis.isDiabetic,
            otherDiseases: anamnesis.otherDiseases ?? existingAnamnesis.otherDiseases,
            isOncological: anamnesis.isOncological ?? existingAnamnesis.isOncological,
            oncologicalStage: anamnesis.oncologicalStage ?? existingAnamnesis.oncologicalStage,
            allergies: anamnesis.allergies ?? existingAnamnesis.allergies,
            isPcd: anamnesis.isPcd ?? existingAnamnesis.isPcd,
            pcdDescription: anamnesis.pcdDescription ?? existingAnamnesis.pcdDescription,
            continuousMedications: anamnesis.continuousMedications ?? existingAnamnesis.continuousMedications,
            updatedAt: new Date().toISOString(),
          })
          .where(eq(schema.patientAnamnesis.patientId, id));
      } else {
        await this.db.insert(schema.patientAnamnesis).values({
          id: crypto.randomUUID(),
          patientId: id,
          isHypertensive: anamnesis.isHypertensive ?? false,
          isDiabetic: anamnesis.isDiabetic ?? false,
          otherDiseases: anamnesis.otherDiseases ?? null,
          isOncological: anamnesis.isOncological ?? false,
          oncologicalStage: anamnesis.oncologicalStage ?? null,
          allergies: anamnesis.allergies ?? null,
          isPcd: anamnesis.isPcd ?? false,
          pcdDescription: anamnesis.pcdDescription ?? null,
          continuousMedications: anamnesis.continuousMedications ?? [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
    }

    return this.findOne(id);
  }

  async toggleActive(id: string) {
    const patient = await this.findOne(id);
    await this.db.update(schema.patients)
      .set({
        isActive: !patient.isActive,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(schema.patients.id, id));
      
    return this.findOne(id);
  }

  async remove(id: string) {
    await this.findOne(id);
    const [deleted] = await this.db.delete(schema.patients)
      .where(eq(schema.patients.id, id))
      .returning();
    return deleted;
  }

  async updateAttention(id: string, updateAttentionDto: UpdateAttentionDto) {
    await this.findOne(id);

    await this.db.update(schema.patients)
      .set({
        attentionLevel: updateAttentionDto.attentionLevel,
        attentionNotes: updateAttentionDto.attentionNotes,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(schema.patients.id, id));

    return this.findOne(id);
  }
}
