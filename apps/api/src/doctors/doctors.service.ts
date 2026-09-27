import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { DATABASE_CONNECTION } from '../database/database.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../database';
import { CreateDoctorDto } from './dto/create-doctor.dto';
import { UpdateDoctorDto } from './dto/update-doctor.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { eq, ilike, or, and, asc, desc, inArray } from 'drizzle-orm';
import * as crypto from 'crypto';

@Injectable()
export class DoctorsService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async create(createDoctorDto: CreateDoctorDto) {
    const doctorId = await this.db.transaction(async (tx) => {
      const [doctor] = await tx.insert(schema.doctors).values({
        id: crypto.randomUUID(),
        crm: createDoctorDto.crm,
        crmState: createDoctorDto.crmState,
        attendanceType: createDoctorDto.attendanceType || 'AMBOS',
        userId: createDoctorDto.userId,
        isActive: true,
        cpf: createDoctorDto.cpf ?? null,
        cns: createDoctorDto.cns ?? null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }).returning();

      if (createDoctorDto.specialties && createDoctorDto.specialties.length > 0) {
        for (const specId of createDoctorDto.specialties) {
          await tx.insert(schema.doctorSpecialties).values({
            doctorId: doctor.id,
            specialtyId: specId,
            createdAt: new Date().toISOString(),
          });
        }
      }

      if (createDoctorDto.procedures && createDoctorDto.procedures.length > 0) {
        for (const procId of createDoctorDto.procedures) {
          await tx.insert(schema.doctorProcedures).values({
            doctorId: doctor.id,
            procedureId: procId,
            createdAt: new Date().toISOString(),
          });
        }
      }

      if (createDoctorDto.procedureGroups && createDoctorDto.procedureGroups.length > 0) {
        for (const groupId of createDoctorDto.procedureGroups) {
          await tx.insert(schema.doctorProcedureGroups).values({
            doctorId: doctor.id,
            procedureGroupId: groupId,
            createdAt: new Date().toISOString(),
          });
        }
      }

      return doctor.id;
    });
    return this.findOne(doctorId);
  }

  async findAll(query: PaginationQueryDto) {
    const { page = 1, limit = 10, sortBy, sortOrder = 'asc', search } = query;
    const skip = (page - 1) * limit;

    const conditions = [];

    if (query.includeInactive !== 'true') {
      conditions.push(eq(schema.doctors.isActive, true));
    }

    if (search) {
      conditions.push(
        or(
          inArray(
            schema.doctors.userId,
            this.db.select({ id: schema.users.id }).from(schema.users).where(ilike(schema.users.name, `%${search}%`))
          ),
          ilike(schema.doctors.crm, `%${search}%`),
          ilike(schema.doctors.cpf, `%${search}%`)
        )
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    let orderByField: any = schema.doctors.createdAt;
    if (sortBy === 'crm') orderByField = schema.doctors.crm;
    // Sorting by name is complex without joins, defaulting to createdAt

    let sortFn = sortOrder === 'desc' ? desc : asc;

    const allData = await this.db.query.doctors.findMany({
      where: whereClause,
    });
    const total = allData.length;

    const data = await this.db.query.doctors.findMany({
      where: whereClause,
      with: {
        user: true,
        doctorSpecialties: {
          with: {
            specialty: true
          }
        },
        doctorProcedures: {
          with: {
            procedure: true
          }
        },
        doctorProcedureGroups: {
          with: {
            procedureGroup: true
          }
        }
      },
      orderBy: [sortFn(orderByField)],
      limit: limit,
      offset: skip
    });

    // Remap response to include user's name at the root for easier frontend handling if needed,
    // though the frontend can just read doctor.user.name
    const mappedData = data.map(doc => ({
      ...doc,
      name: doc.user?.name || 'Desconhecido',
    }));

    return { data: mappedData, total };
  }

  async findOne(id: string) {
    const doctor = await this.db.query.doctors.findFirst({
      where: eq(schema.doctors.id, id),
      with: {
        user: true,
        doctorSpecialties: {
          with: {
            specialty: true
          }
        },
        doctorProcedures: {
          with: {
            procedure: true
          }
        },
        doctorProcedureGroups: {
          with: {
            procedureGroup: true
          }
        }
      }
    });

    if (!doctor) {
      throw new NotFoundException(`Doctor with ID ${id} not found`);
    }
    
    return {
      ...doctor,
      name: doctor.user?.name || 'Desconhecido',
    };
  }

  async update(id: string, updateDoctorDto: UpdateDoctorDto) {
    const existing = await this.findOne(id);
    
    return await this.db.transaction(async (tx) => {
      const dataToUpdate: any = { ...updateDoctorDto, updatedAt: new Date().toISOString() };
      
      if (dataToUpdate.active !== undefined) {
        dataToUpdate.isActive = dataToUpdate.active;
        delete dataToUpdate.active;
      }
      
      const specialties = dataToUpdate.specialties;
      delete dataToUpdate.specialties;

      const procedures = dataToUpdate.procedures;
      delete dataToUpdate.procedures;
      
      const procedureGroups = dataToUpdate.procedureGroups;
      delete dataToUpdate.procedureGroups;
      
      delete dataToUpdate.name; // ensure name is not in update payload if accidentally sent

      if (Object.keys(dataToUpdate).length > 0 && Object.keys(dataToUpdate).some(k => k !== 'updatedAt')) {
        await tx.update(schema.doctors).set(dataToUpdate).where(eq(schema.doctors.id, id));
      }

      if (specialties !== undefined) {
        await tx.delete(schema.doctorSpecialties).where(eq(schema.doctorSpecialties.doctorId, id));
        for (const specId of specialties) {
          await tx.insert(schema.doctorSpecialties).values({
            doctorId: id,
            specialtyId: specId,
            createdAt: new Date().toISOString(),
          });
        }
      }

      if (procedures !== undefined) {
        await tx.delete(schema.doctorProcedures).where(eq(schema.doctorProcedures.doctorId, id));
        for (const procId of procedures) {
          await tx.insert(schema.doctorProcedures).values({
            doctorId: id,
            procedureId: procId,
            createdAt: new Date().toISOString(),
          });
        }
      }

      if (procedureGroups !== undefined) {
        await tx.delete(schema.doctorProcedureGroups).where(eq(schema.doctorProcedureGroups.doctorId, id));
        for (const groupId of procedureGroups) {
          await tx.insert(schema.doctorProcedureGroups).values({
            doctorId: id,
            procedureGroupId: groupId,
            createdAt: new Date().toISOString(),
          });
        }
      }
    });

    return this.findOne(id);
  }

  async toggleActive(id: string) {
    const doctor = await this.findOne(id);
    await this.db.update(schema.doctors)
      .set({
        isActive: !doctor.isActive,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(schema.doctors.id, id));
      
    return this.findOne(id);
  }

  async remove(id: string) {
    await this.findOne(id);
    const [deleted] = await this.db.delete(schema.doctors)
      .where(eq(schema.doctors.id, id))
      .returning();
    return deleted;
  }
}
