import { Injectable, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import { DATABASE_CONNECTION } from '../database/database.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../database/schema';
import { CreateSpecialtyDto } from './dto/create-specialty.dto';
import { UpdateSpecialtyDto } from './dto/update-specialty.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { eq, ilike, or, and, asc, desc, sql } from 'drizzle-orm';
import * as crypto from 'crypto';

@Injectable()
export class SpecialtiesService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async create(createSpecialtyDto: CreateSpecialtyDto) {
    const trimmedName = createSpecialtyDto.name?.trim();
    if (!trimmedName) {
      throw new BadRequestException('O nome da especialidade é obrigatório.');
    }

    const cleanCbo = createSpecialtyDto.cbo?.trim() ? createSpecialtyDto.cbo.trim() : null;

    // Verifica unicidade do nome
    const [existingByName] = await this.db
      .select({ id: schema.specialties.id })
      .from(schema.specialties)
      .where(ilike(schema.specialties.name, trimmedName))
      .limit(1);

    if (existingByName) {
      throw new BadRequestException(`Já existe uma especialidade com o nome "${trimmedName}".`);
    }

    // Verifica unicidade do CBO se informado
    if (cleanCbo) {
      const [existingByCbo] = await this.db
        .select({ id: schema.specialties.id })
        .from(schema.specialties)
        .where(eq(schema.specialties.cbo, cleanCbo))
        .limit(1);

      if (existingByCbo) {
        throw new BadRequestException(`Já existe uma especialidade com o CBO "${cleanCbo}".`);
      }
    }

    const [newSpecialty] = await this.db.insert(schema.specialties).values({
      id: crypto.randomUUID(),
      name: trimmedName,
      description: createSpecialtyDto.description?.trim() ?? null,
      cbo: cleanCbo,
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
    
    const dataToUpdate: any = { updatedAt: new Date().toISOString() };

    if (updateSpecialtyDto.name !== undefined) {
      const trimmedName = updateSpecialtyDto.name.trim();
      if (!trimmedName) {
        throw new BadRequestException('O nome da especialidade não pode ser vazio.');
      }
      const [existingByName] = await this.db
        .select({ id: schema.specialties.id })
        .from(schema.specialties)
        .where(and(ilike(schema.specialties.name, trimmedName), sql`${schema.specialties.id} != ${id}`))
        .limit(1);

      if (existingByName) {
        throw new BadRequestException(`Já existe outra especialidade com o nome "${trimmedName}".`);
      }
      dataToUpdate.name = trimmedName;
    }

    if (updateSpecialtyDto.cbo !== undefined) {
      const cleanCbo = updateSpecialtyDto.cbo?.trim() ? updateSpecialtyDto.cbo.trim() : null;
      if (cleanCbo) {
        const [existingByCbo] = await this.db
          .select({ id: schema.specialties.id })
          .from(schema.specialties)
          .where(and(eq(schema.specialties.cbo, cleanCbo), sql`${schema.specialties.id} != ${id}`))
          .limit(1);

        if (existingByCbo) {
          throw new BadRequestException(`Já existe outra especialidade com o CBO "${cleanCbo}".`);
        }
      }
      dataToUpdate.cbo = cleanCbo;
    }

    if (updateSpecialtyDto.description !== undefined) {
      dataToUpdate.description = updateSpecialtyDto.description?.trim() ?? null;
    }

    if (updateSpecialtyDto.active !== undefined) {
      dataToUpdate.isActive = updateSpecialtyDto.active;
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
