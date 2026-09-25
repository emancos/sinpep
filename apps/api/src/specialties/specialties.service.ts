// @ts-nocheck
import { Temporal } from '@js-temporal/polyfill';
globalThis.Temporal = Temporal;
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSpecialtyDto } from './dto/create-specialty.dto';
import { UpdateSpecialtyDto } from './dto/update-specialty.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import * as crypto from 'crypto';

@Injectable()
export class SpecialtiesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createSpecialtyDto: CreateSpecialtyDto) {
    return this.prisma.db.orm.public.Specialties.create({
      id: crypto.randomUUID(),
      name: createSpecialtyDto.name,
      description: createSpecialtyDto.description ?? null,
      isActive: true,
      createdAt: Temporal.Now.plainDateTimeISO(),
      updatedAt: Temporal.Now.plainDateTimeISO(),
    });
  }

  async findAll(query: PaginationQueryDto) {
    const { page = 1, limit = 10, sortBy, sortOrder = 'asc', search } = query;
    const skip = (page - 1) * limit;

    let q = this.prisma.db.orm.public.Specialties;

    if (query.includeInactive !== 'true') {
      q = q.where({ isActive: true });
    }

    if (search) {
      q = q.where(s => s.name.ilike(`%${search}%`) || s.description.ilike(`%${search}%`));
    }

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
    const specialty = await this.prisma.db.orm.public.Specialties.where({ id }).first();

    if (!specialty) {
      throw new NotFoundException(`Specialty with ID ${id} not found`);
    }
    return specialty;
  }

  async update(id: string, updateSpecialtyDto: UpdateSpecialtyDto) {
    await this.findOne(id);
    
    const dataToUpdate = { ...updateSpecialtyDto, updatedAt: Temporal.Now.plainDateTimeISO() };
    if (dataToUpdate.active !== undefined) {
      dataToUpdate.isActive = dataToUpdate.active;
      delete dataToUpdate.active;
    }

    return this.prisma.db.orm.public.Specialties.where({ id }).update(dataToUpdate);
  }

  async toggleActive(id: string) {
    const specialty = await this.findOne(id);
    return this.prisma.db.orm.public.Specialties.where({ id }).update({
      isActive: !specialty.isActive,
      updatedAt: Temporal.Now.plainDateTimeISO(),
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.db.orm.public.Specialties.where({ id }).delete();
  }
}
