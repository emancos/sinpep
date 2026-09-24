// @ts-nocheck
import { Temporal } from '@js-temporal/polyfill';
globalThis.Temporal = Temporal;
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { UpdateAttentionDto } from './dto/update-attention.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import * as crypto from 'crypto';

@Injectable()
export class PatientsService {
  constructor(private readonly prisma: PrismaService) { }

  async checkUnique(cpf?: string, cns?: string, excludeId?: string) {
    if (!cpf && !cns) {
      return { isUnique: true };
    }

    let existingPatients = await this.prisma.db.orm.public.Patients.where(p => {
      if (cpf && cns) return p.cpf.eq(cpf).or(p.cns.eq(cns));
      if (cpf) return p.cpf.eq(cpf);
      return p.cns.eq(cns);
    }).all();

    if (excludeId) {
      existingPatients = existingPatients.filter((p) => p.id !== excludeId);
    }

    if (existingPatients.length === 0) {
      return { isUnique: true };
    }

    const duplicates = [];
    if (cpf && existingPatients.some((p) => p.cpf === cpf))
      duplicates.push('CPF');
    if (cns && existingPatients.some((p) => p.cns === cns))
      duplicates.push('CNS');

    return {
      isUnique: false,
      message: `Este ${duplicates.join(' e ')} já está cadastrado no sistema.`,
      patientId: existingPatients[0].id,
    };
  }

  async create(createPatientDto: CreatePatientDto) {
    const { phones, birthDate, ...rest } = createPatientDto;

    // In prisma 8 we can't easily nest create for relations like in prisma 6 unless supported by contract.
    // So we use a transaction or simply create sequentially.
    const patientId = crypto.randomUUID();

    const patient = await this.prisma.db.orm.public.Patients.create({
      id: patientId,
      name: rest.name,
      cpf: rest.cpf,
      cns: rest.cns ?? null,
      birthDate: Temporal.PlainDateTime.from(new Date(birthDate).toISOString().split('T')[0] + 'T00:00:00'),
      gender: rest.gender,
      healthCenterId: rest.healthCenterId,
      healthAgentId: rest.healthAgentId ?? null,
      address: rest.address ?? null,
      attentionLevel: rest.attentionLevel ?? 1,
      attentionNotes: rest.attentionNotes ?? null,
      isActive: true,
      createdAt: Temporal.Now.plainDateTimeISO(),
      updatedAt: Temporal.Now.plainDateTimeISO(),
    });

    if (phones && phones.length > 0) {
      for (const p of phones) {
        await this.prisma.db.orm.public.PatientPhones.create({
          id: crypto.randomUUID(),
          patientId: patientId,
          phoneNumber: p.phoneNumber,
          isWhatsapp: p.isWhatsapp ?? false,
          createdAt: Temporal.Now.plainDateTimeISO(),
          updatedAt: Temporal.Now.plainDateTimeISO(),
        });
      }
    }

    return this.findOne(patientId);
  }

  async findAll(query: PaginationQueryDto) {
    const { page = 1, limit = 10, sortBy, sortOrder = 'asc', search } = query;
    const skip = (page - 1) * limit;

    let q = this.prisma.db.orm.public.Patients
      .include('healthCenter')
      .include('healthAgent')
      .include('patientPhones');

    if (query.includeInactive !== 'true') {
      q = q.where({ isActive: true });
    }

    if (search) {
      q = q.where(p => p.name.contains(search, 'insensitive').or(p.cpf.contains(search)).or(p.cns.contains(search)));
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
        } else if (sortBy === 'healthAgent') {
          valA = a.healthAgent?.name;
          valB = b.healthAgent?.name;
        }

        if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
        if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
    } else {
      data = data.sort((a, b) => a.name.localeCompare(b.name));
    }

    const total = data.length;
    data = data.slice(skip, skip + limit);

    return { data: data.map(p => ({ ...p, phones: p.patientPhones })), total };
  }

  async findOne(id: string) {
    const patient = await this.prisma.db.orm.public.Patients.where({ id })
      .include('patientPhones')
      .include('healthCenter')
      .include('healthAgent')
      .first();

    if (!patient) {
      throw new NotFoundException(`Patient with ID ${id} not found`);
    }
    return { ...patient, phones: patient.patientPhones };
  }

  async update(id: string, updatePatientDto: UpdatePatientDto) {
    await this.findOne(id);
    const { phones, birthDate, ...rest } = updatePatientDto;

    const dataToUpdate = { ...rest, updatedAt: Temporal.Now.plainDateTimeISO() };
    if (birthDate) {
      dataToUpdate.birthDate = Temporal.PlainDateTime.from(new Date(birthDate).toISOString().split('T')[0] + 'T00:00:00');
    }
    if (dataToUpdate.active !== undefined) {
      dataToUpdate.isActive = dataToUpdate.active;
      delete dataToUpdate.active;
    }

    await this.prisma.db.orm.public.Patients.where({ id }).update(dataToUpdate);

    if (phones) {
      await this.prisma.db.orm.public.PatientPhones.where({ patientId: id }).delete();
      for (const p of phones) {
        await this.prisma.db.orm.public.PatientPhones.create({
          id: crypto.randomUUID(),
          patientId: id,
          phoneNumber: p.phoneNumber,
          isWhatsapp: p.isWhatsapp ?? false,
          createdAt: Temporal.Now.plainDateTimeISO(),
          updatedAt: Temporal.Now.plainDateTimeISO(),
        });
      }
    }

    return this.findOne(id);
  }

  async toggleActive(id: string) {
    const patient = await this.findOne(id);
    return this.prisma.db.orm.public.Patients.where({ id }).update({
      isActive: !patient.isActive,
      updatedAt: Temporal.Now.plainDateTimeISO(),
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.db.orm.public.Patients.where({ id }).delete();
  }

  async updateAttention(id: string, updateAttentionDto: UpdateAttentionDto) {
    await this.findOne(id);

    await this.prisma.db.orm.public.Patients.where({ id }).update({
      attentionLevel: updateAttentionDto.attentionLevel,
      attentionNotes: updateAttentionDto.attentionNotes,
      updatedAt: Temporal.Now.plainDateTimeISO(),
    });

    return this.findOne(id);
  }
}
