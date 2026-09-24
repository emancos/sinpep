// @ts-nocheck
import { Temporal } from '@js-temporal/polyfill';
globalThis.Temporal = Temporal;
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateHealthCenterDto } from './dto/create-health-center.dto';
import { UpdateHealthCenterDto } from './dto/update-health-center.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import * as crypto from 'crypto';

@Injectable()
export class HealthCentersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createHealthCenterDto: CreateHealthCenterDto) {
    return this.prisma.db.orm.public.HealthCenters.create({
      id: crypto.randomUUID(),
      name: createHealthCenterDto.name,
      cnes: createHealthCenterDto.cnes ?? null,
      address: createHealthCenterDto.address ?? null,
      nurseName: createHealthCenterDto.nurseName ?? null,
      isActive: true,
      createdAt: Temporal.Now.plainDateTimeISO(),
      updatedAt: Temporal.Now.plainDateTimeISO(),
    });
  }

  async findAll(query: PaginationQueryDto) {
    const { page = 1, limit = 10, sortBy, sortOrder = 'asc', search } = query;
    const skip = (page - 1) * limit;

    let q = this.prisma.db.orm.public.HealthCenters.include('healthAgents');

    if (query.includeInactive !== 'true') {
      q = q.where({ isActive: true });
    }

    if (search) {
      q = q.where(hc => hc.name.contains(search) || hc.cnes.contains(search) || hc.address.contains(search));
    }

    // TODO: implement order by and pagination for Prisma 8
    // For now we just return all matching or paginated manually
    const allData = await q.all();
    
    let data = allData;
    if (sortBy) {
      data = data.sort((a, b) => {
        if (a[sortBy] < b[sortBy]) return sortOrder === 'asc' ? -1 : 1;
        if (a[sortBy] > b[sortBy]) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
    }

    const total = data.length;
    data = data.slice(skip, skip + limit);

    return { data, total };
  }

  async findOne(id: string) {
    const healthCenter = await this.prisma.db.orm.public.HealthCenters.where({ id })
      .include('healthAgents')
      .include('patients')
      .first();

    if (!healthCenter) {
      throw new NotFoundException(`HealthCenter with ID ${id} not found`);
    }
    return healthCenter;
  }

  async update(id: string, updateHealthCenterDto: UpdateHealthCenterDto) {
    await this.findOne(id);
    
    const dataToUpdate = { ...updateHealthCenterDto, updatedAt: Temporal.Now.plainDateTimeISO() };
    if (dataToUpdate.active !== undefined) {
      dataToUpdate.isActive = dataToUpdate.active;
      delete dataToUpdate.active;
    }

    return this.prisma.db.orm.public.HealthCenters.where({ id }).update(dataToUpdate);
  }

  async toggleActive(id: string) {
    const healthCenter = await this.findOne(id);
    return this.prisma.db.orm.public.HealthCenters.where({ id }).update({
      isActive: !healthCenter.isActive,
      updatedAt: Temporal.Now.plainDateTimeISO(),
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.db.orm.public.HealthCenters.where({ id }).delete();
  }
}
