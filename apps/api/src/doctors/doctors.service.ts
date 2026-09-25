// @ts-nocheck
import { Temporal } from '@js-temporal/polyfill';
globalThis.Temporal = Temporal;
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDoctorDto } from './dto/create-doctor.dto';
import { UpdateDoctorDto } from './dto/update-doctor.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import * as crypto from 'crypto';

@Injectable()
export class DoctorsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createDoctorDto: CreateDoctorDto) {
    const doctor = await this.prisma.db.orm.public.Doctors.create({
      id: crypto.randomUUID(),
      name: createDoctorDto.name,
      crm: createDoctorDto.crm,
      crmState: createDoctorDto.crmState,
      userId: createDoctorDto.userId ?? null,
      isActive: true,
      createdAt: Temporal.Now.plainDateTimeISO(),
      updatedAt: Temporal.Now.plainDateTimeISO(),
    });

    if (createDoctorDto.specialties && createDoctorDto.specialties.length > 0) {
      for (const specId of createDoctorDto.specialties) {
        await this.prisma.db.orm.public.DoctorSpecialties.create({
          doctorId: doctor.id,
          specialtyId: specId,
          createdAt: Temporal.Now.plainDateTimeISO(),
        });
      }
    }

    return this.findOne(doctor.id);
  }

  async findAll(query: PaginationQueryDto) {
    const { page = 1, limit = 10, sortBy, sortOrder = 'asc', search } = query;
    const skip = (page - 1) * limit;

    let q = this.prisma.db.orm.public.Doctors
      .include('user')
      .include('doctorSpecialties', ds => ds.include('specialty'));

    if (query.includeInactive !== 'true') {
      q = q.where({ isActive: true });
    }

    if (search) {
      q = q.where(d => d.name.ilike(`%${search}%`) || d.crm.ilike(`%${search}%`));
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
    const doctor = await this.prisma.db.orm.public.Doctors.where({ id })
      .include('user')
      .include('doctorSpecialties', ds => ds.include('specialty'))
      .first();

    if (!doctor) {
      throw new NotFoundException(`Doctor with ID ${id} not found`);
    }
    return doctor;
  }

  async update(id: string, updateDoctorDto: UpdateDoctorDto) {
    await this.findOne(id);
    
    const dataToUpdate = { ...updateDoctorDto, updatedAt: Temporal.Now.plainDateTimeISO() };
    if (dataToUpdate.active !== undefined) {
      dataToUpdate.isActive = dataToUpdate.active;
      delete dataToUpdate.active;
    }
    
    const specialties = dataToUpdate.specialties;
    delete dataToUpdate.specialties;

    await this.prisma.db.orm.public.Doctors.where({ id }).update(dataToUpdate);

    if (specialties !== undefined) {
      await this.prisma.db.orm.public.DoctorSpecialties.where({ doctorId: id }).delete();
      for (const specId of specialties) {
        await this.prisma.db.orm.public.DoctorSpecialties.create({
          doctorId: id,
          specialtyId: specId,
          createdAt: Temporal.Now.plainDateTimeISO(),
        });
      }
    }

    return this.findOne(id);
  }

  async toggleActive(id: string) {
    const doctor = await this.findOne(id);
    return this.prisma.db.orm.public.Doctors.where({ id }).update({
      isActive: !doctor.isActive,
      updatedAt: Temporal.Now.plainDateTimeISO(),
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.db.orm.public.Doctors.where({ id }).delete();
  }
}
