import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../database/schema';
import { eq, asc } from 'drizzle-orm';
import * as crypto from 'crypto';

@Injectable()
export class ProcedureGroupsService {
  constructor(
    @Inject('DATABASE_CONNECTION')
    private readonly db: NodePgDatabase<typeof schema>,
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

  async create(data: { name: string }) {
    const [newGroup] = await this.db.insert(schema.procedureGroups)
      .values({
        id: crypto.randomUUID(),
        name: data.name,
        updatedAt: new Date().toISOString(),
      })
      .returning();
    return newGroup;
  }

  async update(id: string, data: { name: string }) {
    await this.findOne(id);
    const [updated] = await this.db.update(schema.procedureGroups)
      .set({
        name: data.name,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(schema.procedureGroups.id, id))
      .returning();
    return updated;
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.db.delete(schema.procedureGroups)
      .where(eq(schema.procedureGroups.id, id));
  }

  async toggleActive(id: string) {
    const group = await this.findOne(id);
    const [updated] = await this.db.update(schema.procedureGroups)
      .set({
        isActive: !group.isActive,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(schema.procedureGroups.id, id))
      .returning();
    return updated;
  }
}
