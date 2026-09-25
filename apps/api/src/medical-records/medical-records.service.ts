import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../database/schema';
import { eq, desc } from 'drizzle-orm';
import * as crypto from 'crypto';

@Injectable()
export class MedicalRecordsService {
  constructor(
    @Inject('DATABASE_CONNECTION')
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async create(patientId: string, doctorId: string, data: any, files: Express.Multer.File[]) {
    // Valida paciente
    const patient = await this.db.query.patients.findFirst({ where: eq(schema.patients.id, patientId) });
    if (!patient) throw new NotFoundException('Patient not found');

    const recordId = crypto.randomUUID();

    const medications = data.medications ? JSON.parse(data.medications) : [];
    const requestedExams = data.requestedExams ? JSON.parse(data.requestedExams) : [];

    await this.db.insert(schema.medicalRecords).values({
      id: recordId,
      patientId,
      doctorId,
      observation: data.observation,
      cid10: data.cid10 || null,
      returnRequestedValue: data.returnRequestedValue ? Number(data.returnRequestedValue) : null,
      returnRequestedUnit: data.returnRequestedUnit || null,
      medications,
      requestedExams,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    if (files && files.length > 0) {
      const attachments = files.map(file => ({
        id: crypto.randomUUID(),
        medicalRecordId: recordId,
        fileName: file.originalname,
        fileType: file.mimetype,
        fileUrl: `/uploads/${file.filename}`,
        fileSize: file.size,
        uploadedAt: new Date().toISOString(),
      }));
      await this.db.insert(schema.medicalRecordAttachments).values(attachments);
    }

    return this.findOne(recordId);
  }

  async findAllByPatient(patientId: string) {
    const items = await this.db.query.medicalRecords.findMany({
      where: eq(schema.medicalRecords.patientId, patientId),
      with: {
        doctor: {
          columns: {
            id: true,
            name: true,
            avatar: true,
          }
        },
        attachments: true,
      },
      orderBy: [desc(schema.medicalRecords.recordDate)],
    });

    return { data: items, total: items.length };
  }

  async findOne(id: string) {
    const record = await this.db.query.medicalRecords.findFirst({
      where: eq(schema.medicalRecords.id, id),
      with: {
        doctor: {
          columns: { id: true, name: true, avatar: true }
        },
        attachments: true,
      }
    });
    if (!record) throw new NotFoundException('Medical Record not found');
    return record;
  }
}
