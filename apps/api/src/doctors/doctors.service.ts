import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { DATABASE_CONNECTION } from '../database/database.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../database/schema';
import { CreateDoctorDto } from './dto/create-doctor.dto';
import { UpdateDoctorDto } from './dto/update-doctor.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { eq, ilike, or, and, asc, desc } from 'drizzle-orm';
import * as crypto from 'crypto';

@Injectable()
export class DoctorsService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async create(createDoctorDto: CreateDoctorDto) {
    const [doctor] = await this.db.insert(schema.doctors).values({
      id: crypto.randomUUID(),
      name: createDoctorDto.name,
      crm: createDoctorDto.crm,
      crmState: createDoctorDto.crmState,
      userId: createDoctorDto.userId ?? null,
      isActive: true,
      cpf: createDoctorDto.cpf ?? null,
      cns: createDoctorDto.cns ?? null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }).returning();

    if (createDoctorDto.specialties && createDoctorDto.specialties.length > 0) {
      for (const specId of createDoctorDto.specialties) {
        await this.db.insert(schema.doctorSpecialties).values({
          doctorId: doctor.id,
          specialtyId: specId,
          createdAt: new Date().toISOString(),
        });
      }
    }

    return this.findOne(doctor.id);
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
          ilike(schema.doctors.name, `%${search}%`),
          ilike(schema.doctors.crm, `%${search}%`),
          ilike(schema.doctors.cpf, `%${search}%`)
        )
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    let orderByField: any = schema.doctors.name;
    if (sortBy === 'name') orderByField = schema.doctors.name;
    if (sortBy === 'crm') orderByField = schema.doctors.crm;

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
        }
      },
      orderBy: [sortFn(orderByField)],
      limit: limit,
      offset: skip
    });

    return { data, total };
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
        }
      }
    });

    if (!doctor) {
      throw new NotFoundException(`Doctor with ID ${id} not found`);
    }
    return doctor;
  }

  async update(id: string, updateDoctorDto: UpdateDoctorDto) {
    await this.findOne(id);
    
    const dataToUpdate: any = { ...updateDoctorDto, updatedAt: new Date().toISOString() };
    if (dataToUpdate.active !== undefined) {
      dataToUpdate.isActive = dataToUpdate.active;
      delete dataToUpdate.active;
    }
    
    const specialties = dataToUpdate.specialties;
    delete dataToUpdate.specialties;

    if (Object.keys(dataToUpdate).length > 0) {
      await this.db.update(schema.doctors).set(dataToUpdate).where(eq(schema.doctors.id, id));
    }

    if (specialties !== undefined) {
      await this.db.delete(schema.doctorSpecialties).where(eq(schema.doctorSpecialties.doctorId, id));
      for (const specId of specialties) {
        await this.db.insert(schema.doctorSpecialties).values({
          doctorId: id,
          specialtyId: specId,
          createdAt: new Date().toISOString(),
        });
      }
    }

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
