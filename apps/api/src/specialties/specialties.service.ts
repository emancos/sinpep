import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { DATABASE_CONNECTION } from '../database/database.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../database/schema';
import { CreateSpecialtyDto } from './dto/create-specialty.dto';
import { UpdateSpecialtyDto } from './dto/update-specialty.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { eq, ilike, or, and, asc, desc } from 'drizzle-orm';
import * as crypto from 'crypto';

@Injectable()
export class SpecialtiesService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async create(createSpecialtyDto: CreateSpecialtyDto) {
    const [newSpecialty] = await this.db.insert(schema.specialties).values({
      id: crypto.randomUUID(),
      name: createSpecialtyDto.name,
      description: createSpecialtyDto.description ?? null,
      cbo: createSpecialtyDto.cbo ?? null,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }).returning();
    return newSpecialty;
  }

  async findAll(query: PaginationQueryDto) {
    const { page = 1, limit = 10, sortBy, sortOrder = 'asc', search } = query;
    const skip = (page - 1) * limit;

    const conditions = [];

    if (query.includeInactive !== 'true') {
      conditions.push(eq(schema.specialties.isActive, true));
    }

    if (search) {
      conditions.push(
        or(
          ilike(schema.specialties.name, `%${search}%`),
          ilike(schema.specialties.description, `%${search}%`),
          ilike(schema.specialties.cbo, `%${search}%`),
        )
      );
    }

    let orderByField: any = schema.specialties.name;
    if (sortBy === 'name') orderByField = schema.specialties.name;
    if (sortBy === 'cbo') orderByField = schema.specialties.cbo;

    let sortFn = sortOrder === 'desc' ? desc : asc;

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const allData = await this.db.select().from(schema.specialties).where(whereClause);
    const total = allData.length; 

    const data = await this.db.select().from(schema.specialties)
      .where(whereClause)
      .orderBy(sortFn(orderByField))
      .limit(limit)
      .offset(skip);

    return { data, total };
  }

  async findOne(id: string) {
    const [specialty] = await this.db.select().from(schema.specialties).where(eq(schema.specialties.id, id)).limit(1);

    if (!specialty) {
      throw new NotFoundException(`Specialty with ID ${id} not found`);
    }
    return specialty;
  }

  async update(id: string, updateSpecialtyDto: UpdateSpecialtyDto) {
    await this.findOne(id);
    
    const dataToUpdate: any = { ...updateSpecialtyDto, updatedAt: new Date().toISOString() };
    if (dataToUpdate.active !== undefined) {
      dataToUpdate.isActive = dataToUpdate.active;
      delete dataToUpdate.active;
    }

    const [updated] = await this.db.update(schema.specialties)
      .set(dataToUpdate)
      .where(eq(schema.specialties.id, id))
      .returning();
      
    return updated;
  }

  async toggleActive(id: string) {
    const specialty = await this.findOne(id);
    const [updated] = await this.db.update(schema.specialties)
      .set({
        isActive: !specialty.isActive,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(schema.specialties.id, id))
      .returning();
      
    return updated;
  }

  async remove(id: string) {
    await this.findOne(id);
    const [deleted] = await this.db.delete(schema.specialties)
      .where(eq(schema.specialties.id, id))
      .returning();
    return deleted;
  }
}
