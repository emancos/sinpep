import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { DATABASE_CONNECTION } from '../database/database.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../database/schema';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { UpdateAttentionDto } from './dto/update-attention.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { eq, ilike, or, and, asc, desc, sql } from 'drizzle-orm';
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
    const { page = 1, limit = 10, sortBy, sortOrder = 'asc', search } = query;
    const skip = (page - 1) * limit;

    const conditions = [];

    if (query.includeInactive !== 'true') {
      conditions.push(eq(schema.patients.isActive, true));
    }

    if (search) {
      const trimmedSearch = search.trim();
      const cleanDigits = trimmedSearch.replace(/\D/g, '');

      const searchConditions = [
        ilike(schema.patients.name, `%${trimmedSearch}%`),
        ilike(schema.patients.cpf, `%${trimmedSearch}%`),
        ilike(schema.patients.cns, `%${trimmedSearch}%`),
      ];

      if (cleanDigits.length > 0) {
        searchConditions.push(ilike(schema.patients.cpf, `%${cleanDigits}%`));
        searchConditions.push(ilike(schema.patients.cns, `%${cleanDigits}%`));
      }

      conditions.push(or(...searchConditions));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // 1. Contagem total executada diretamente no banco de dados
    const totalResult = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.patients)
      .where(whereClause);
    const total = totalResult[0]?.count || 0;

    // 2. Cláusula de ordenação SQL
    let orderClause = [sortOrder === 'desc' ? desc(schema.patients.name) : asc(schema.patients.name)];
    if (sortBy === 'cpf') {
      orderClause = [sortOrder === 'desc' ? desc(schema.patients.cpf) : asc(schema.patients.cpf)];
    } else if (sortBy === 'cns') {
      orderClause = [sortOrder === 'desc' ? desc(schema.patients.cns) : asc(schema.patients.cns)];
    } else if (sortBy === 'createdAt') {
      orderClause = [sortOrder === 'desc' ? desc(schema.patients.createdAt) : asc(schema.patients.createdAt)];
    }

    // 3. Consulta paginada e enxuta (sem anamnese pesada na listagem de tabela)
    const patients = await this.db.query.patients.findMany({
      where: whereClause,
      with: {
        healthCenter: {
          columns: { id: true, name: true, cnes: true },
        },
        healthAgent: {
          columns: { id: true, name: true },
        },
        patientPhones: true,
      },
      orderBy: orderClause,
      limit,
      offset: skip,
    });

    return { data: patients.map((p) => ({ ...p, phones: p.patientPhones })), total };
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
