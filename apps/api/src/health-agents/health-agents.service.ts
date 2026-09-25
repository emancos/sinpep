import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { DATABASE_CONNECTION } from '../database/database.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../database/schema';
import { CreateHealthAgentDto } from './dto/create-health-agent.dto';
import { UpdateHealthAgentDto } from './dto/update-health-agent.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { eq, ilike, or, and, asc, desc } from 'drizzle-orm';
import * as crypto from 'crypto';

@Injectable()
export class HealthAgentsService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async create(createHealthAgentDto: CreateHealthAgentDto) {
    const [healthAgent] = await this.db.insert(schema.healthAgents).values({
      id: crypto.randomUUID(),
      name: createHealthAgentDto.name,
      phone: createHealthAgentDto.phone ?? null,
      microArea: createHealthAgentDto.microArea ?? null,
      healthCenterId: createHealthAgentDto.healthCenterId,
      userId: createHealthAgentDto.userId ?? null,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }).returning();
    
    return this.findOne(healthAgent.id);
  }

  async findAll(query: PaginationQueryDto) {
    const { page = 1, limit = 10, sortBy, sortOrder = 'asc', search } = query;
    const skip = (page - 1) * limit;

    const conditions = [];

    if (query.includeInactive !== 'true') {
      conditions.push(eq(schema.healthAgents.isActive, true));
    }

    if (search) {
      conditions.push(
        or(
          ilike(schema.healthAgents.name, `%${search}%`),
          ilike(schema.healthAgents.phone, `%${search}%`),
          ilike(schema.healthAgents.microArea, `%${search}%`)
        )
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const allData = await this.db.query.healthAgents.findMany({
      where: whereClause,
      with: { healthCenter: true }
    });

    let data = allData;

    if (sortBy) {
      data = data.sort((a, b) => {
        let valA: any = (a as any)[sortBy];
        let valB: any = (b as any)[sortBy];
        
        if (sortBy === 'healthCenter') {
          valA = (a as any).healthCenter?.name;
          valB = (b as any).healthCenter?.name;
        }

        if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
        if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
    }

    const total = data.length;
    data = data.slice(skip, skip + limit);

    return { data, total };
  }

  async findOne(id: string) {
    const healthAgent = await this.db.query.healthAgents.findFirst({
      where: eq(schema.healthAgents.id, id),
      with: {
        healthCenter: true
      }
    });

    if (!healthAgent) {
      throw new NotFoundException(`HealthAgent with ID ${id} not found`);
    }
    return healthAgent;
  }

  async update(id: string, updateHealthAgentDto: UpdateHealthAgentDto) {
    await this.findOne(id);
    
    const dataToUpdate: any = { ...updateHealthAgentDto, updatedAt: new Date().toISOString() };
    if (dataToUpdate.active !== undefined) {
      dataToUpdate.isActive = dataToUpdate.active;
      delete dataToUpdate.active;
    }

    if (Object.keys(dataToUpdate).length > 0) {
      await this.db.update(schema.healthAgents)
        .set(dataToUpdate)
        .where(eq(schema.healthAgents.id, id));
    }
      
    return this.findOne(id);
  }

  async toggleActive(id: string) {
    const healthAgent = await this.findOne(id);
    await this.db.update(schema.healthAgents)
      .set({
        isActive: !healthAgent.isActive,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(schema.healthAgents.id, id));
      
    return this.findOne(id);
  }

  async remove(id: string) {
    await this.findOne(id);
    const [deleted] = await this.db.delete(schema.healthAgents)
      .where(eq(schema.healthAgents.id, id))
      .returning();
    return deleted;
  }
}
