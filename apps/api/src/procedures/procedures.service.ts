import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../database/schema';
import { eq, ilike, or, and, asc, sql } from 'drizzle-orm';
import * as crypto from 'crypto';

@Injectable()
export class ProceduresService {
  constructor(
    @Inject('DATABASE_CONNECTION')
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async findAll(params: any) {
    const { page = 1, limit = 10, search = '', includeInactive = 'false' } = params;
    
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

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    
    const items = await this.db.query.procedures.findMany({
      where: whereClause,
      limit: Number(limit),
      offset: (Number(page) - 1) * Number(limit),
      with: {
        procedureGroup: true,
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
        minAge: data.minAge || 0,
        maxAge: data.maxAge || 130,
        updatedAt: new Date().toISOString(),
      })
      .returning();
    return newItem;
  }

  async update(id: string, data: any) {
    await this.findOne(id);
    const [updated] = await this.db.update(schema.procedures)
      .set({
        ...data,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(schema.procedures.id, id))
      .returning();
    return updated;
  }

  async remove(id: string) {
    await this.findOne(id);
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
}
