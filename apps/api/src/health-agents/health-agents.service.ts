// @ts-nocheck
import { Temporal } from '@js-temporal/polyfill';
globalThis.Temporal = Temporal;
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateHealthAgentDto } from './dto/create-health-agent.dto';
import { UpdateHealthAgentDto } from './dto/update-health-agent.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import * as crypto from 'crypto';

@Injectable()
export class HealthAgentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createHealthAgentDto: CreateHealthAgentDto) {
    const created = await this.prisma.db.orm.public.HealthAgents.create({
      id: crypto.randomUUID(),
      name: createHealthAgentDto.name,
      phone: createHealthAgentDto.phone ?? null,
      microArea: createHealthAgentDto.microArea ?? null,
      healthCenterId: createHealthAgentDto.healthCenterId,
      userId: createHealthAgentDto.userId ?? null,
      isActive: true,
      createdAt: Temporal.Now.plainDateTimeISO(),
      updatedAt: Temporal.Now.plainDateTimeISO(),
    });
    
    // In Prisma 8, to return relations immediately we can just query it again or rely on the query builder
    return this.prisma.db.orm.public.HealthAgents.where({ id: created.id }).include('healthCenter').first();
  }

  async findAll(query: PaginationQueryDto) {
    const { page = 1, limit = 10, sortBy, sortOrder = 'asc', search } = query;
    const skip = (page - 1) * limit;

    let q = this.prisma.db.orm.public.HealthAgents.include('healthCenter');

    if (query.includeInactive !== 'true') {
      q = q.where({ isActive: true });
    }

    if (search) {
      q = q.where(ha => ha.name.ilike(`%${search}%`) || ha.phone.ilike(`%${search}%`) || ha.microArea.ilike(`%${search}%`));
    }

    const allData = await q.all();
    
    let data = allData;
    if (sortBy) {
      data = data.sort((a, b) => {
        let valA = a[sortBy];
        let valB = b[sortBy];
        
        if (sortBy === 'healthCenter') {
          valA = a.healthCenter?.name;
          valB = b.healthCenter?.name;
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
    const healthAgent = await this.prisma.db.orm.public.HealthAgents.where({ id })
      .include('healthCenter')
      .first();

    if (!healthAgent) {
      throw new NotFoundException(`HealthAgent with ID ${id} not found`);
    }
    return healthAgent;
  }

  async update(id: string, updateHealthAgentDto: UpdateHealthAgentDto) {
    await this.findOne(id);
    
    const dataToUpdate = { ...updateHealthAgentDto, updatedAt: Temporal.Now.plainDateTimeISO() };
    if (dataToUpdate.active !== undefined) {
      dataToUpdate.isActive = dataToUpdate.active;
      delete dataToUpdate.active;
    }

    await this.prisma.db.orm.public.HealthAgents.where({ id }).update(dataToUpdate);
    return this.prisma.db.orm.public.HealthAgents.where({ id }).include('healthCenter').first();
  }

  async toggleActive(id: string) {
    const healthAgent = await this.findOne(id);
    return this.prisma.db.orm.public.HealthAgents.where({ id }).update({
      isActive: !healthAgent.isActive,
      updatedAt: Temporal.Now.plainDateTimeISO(),
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.db.orm.public.HealthAgents.where({ id }).delete();
  }
}
