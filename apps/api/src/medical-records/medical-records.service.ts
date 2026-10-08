import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../database/schema';
import { eq, desc } from 'drizzle-orm';
import * as crypto from 'crypto';
import { StorageService } from '../storage/storage.service';

@Injectable()
export class MedicalRecordsService {
  constructor(
    @Inject('DATABASE_CONNECTION')
    private readonly db: NodePgDatabase<typeof schema>,
    private readonly storageService: StorageService,
  ) {}

  async countAll() {
    const allRecords = await this.db.select({ id: schema.medicalRecords.id }).from(schema.medicalRecords);
    return { total: allRecords.length };
  }

  async create(patientId: string, doctorId: string, data: any, files: Express.Multer.File[]) {
    // Valida paciente
    const patient = await this.db.query.patients.findFirst({ where: eq(schema.patients.id, patientId) });
    if (!patient) throw new NotFoundException('Patient not found');

    const recordId = crypto.randomUUID();

    const medications = data.medications ? (typeof data.medications === 'string' ? JSON.parse(data.medications) : data.medications) : [];
    const requestedExams = data.requestedExams ? (typeof data.requestedExams === 'string' ? JSON.parse(data.requestedExams) : data.requestedExams) : [];

    const clinicalDataReviewed = String(data.clinicalDataReviewed) === 'true';
    if (!clinicalDataReviewed) {
      throw new BadRequestException('A revisão dos dados clínicos do paciente é obrigatória para salvar o prontuário.');
    }

    if (data.anamnesis) {
      const anamnesis = typeof data.anamnesis === 'string' ? JSON.parse(data.anamnesis) : data.anamnesis;
      
      const existingAnamnesis = await this.db.query.patientAnamnesis.findFirst({
        where: eq(schema.patientAnamnesis.patientId, patientId),
      });

      if (existingAnamnesis) {
        await this.db.update(schema.patientAnamnesis)
          .set({
            isHypertensive: anamnesis.isHypertensive ?? existingAnamnesis.isHypertensive,
            isDiabetic: anamnesis.isDiabetic ?? existingAnamnesis.isDiabetic,
            isSmoker: anamnesis.isSmoker ?? existingAnamnesis.isSmoker,
            otherDiseases: anamnesis.otherDiseases ?? existingAnamnesis.otherDiseases,
            isOncological: anamnesis.isOncological ?? existingAnamnesis.isOncological,
            oncologicalStage: anamnesis.oncologicalStage ?? existingAnamnesis.oncologicalStage,
            allergies: anamnesis.allergies ?? existingAnamnesis.allergies,
            isPcd: anamnesis.isPcd ?? existingAnamnesis.isPcd,
            pcdDescription: anamnesis.pcdDescription ?? existingAnamnesis.pcdDescription,
            continuousMedications: anamnesis.continuousMedications ?? existingAnamnesis.continuousMedications,
            bloodPressure: anamnesis.bloodPressure ?? existingAnamnesis.bloodPressure,
            glycemia: anamnesis.glycemia ?? existingAnamnesis.glycemia,
            weight: anamnesis.weight ?? existingAnamnesis.weight,
            height: anamnesis.height ?? existingAnamnesis.height,
            updatedAt: new Date().toISOString(),
          })
          .where(eq(schema.patientAnamnesis.patientId, patientId));
      } else {
        await this.db.insert(schema.patientAnamnesis).values({
          id: crypto.randomUUID(),
          patientId: patientId,
          isHypertensive: anamnesis.isHypertensive ?? false,
          isDiabetic: anamnesis.isDiabetic ?? false,
          isSmoker: anamnesis.isSmoker ?? false,
          otherDiseases: anamnesis.otherDiseases ?? null,
          isOncological: anamnesis.isOncological ?? false,
          oncologicalStage: anamnesis.oncologicalStage ?? null,
          allergies: anamnesis.allergies ?? null,
          isPcd: anamnesis.isPcd ?? false,
          pcdDescription: anamnesis.pcdDescription ?? null,
          continuousMedications: anamnesis.continuousMedications ?? [],
          bloodPressure: anamnesis.bloodPressure ?? null,
          glycemia: anamnesis.glycemia ?? null,
          weight: anamnesis.weight ?? null,
          height: anamnesis.height ?? null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
    }

    await this.db.insert(schema.medicalRecords).values({
      id: recordId,
      patientId,
      doctorId,
      observation: data.observation,
      cid10: data.cid10 || null,
      cid10Secondary: data.cid10Secondary || null,
      cid10AssociatedCauses: data.cid10AssociatedCauses || null,
      returnRequestedValue: data.returnRequestedValue ? Number(data.returnRequestedValue) : null,
      returnRequestedUnit: data.returnRequestedUnit || null,
      isOci: String(data.isOci) === 'true',
      medicationsJustification: data.medicationsJustification || null,
      examsJustification: data.examsJustification || null,
      medications,
      requestedExams,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    if (files && files.length > 0) {
      const attachments = [];
      for (const file of files) {
        // Envia para o Google Drive e obtém o fileId
        const fileId = await this.storageService.uploadFile(file, patientId);
        
        attachments.push({
          id: crypto.randomUUID(),
          medicalRecordId: recordId,
          fileName: file.originalname,
          fileType: file.mimetype,
          fileUrl: `/storage/file/${fileId}`, // Rota para download através do backend
          fileSize: file.size,
          uploadedAt: new Date().toISOString(),
        });
      }
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
          },
          with: {
            doctors: {
              columns: { crm: true, crmState: true, cns: true },
              with: {
                doctorSpecialties: {
                  with: { specialty: { columns: { name: true } } }
                }
              }
            }
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
          columns: { id: true, name: true, avatar: true },
          with: {
            doctors: {
              columns: { crm: true, crmState: true, cns: true },
              with: {
                doctorSpecialties: {
                  with: { specialty: { columns: { name: true } } }
                }
              }
            }
          }
        },
        attachments: true,
      }
    });
    if (!record) throw new NotFoundException('Medical Record not found');
    return record;
  }

  async toggleStatus(id: string) {
    const record = await this.db.query.medicalRecords.findFirst({
      where: eq(schema.medicalRecords.id, id),
    });

    if (!record) {
      throw new NotFoundException('Medical record not found');
    }

    await this.db.update(schema.medicalRecords)
      .set({
        isActive: !record.isActive,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(schema.medicalRecords.id, id));

    return { message: 'Status updated successfully', isActive: !record.isActive };
  }

  async delete(id: string) {
    const record = await this.db.query.medicalRecords.findFirst({
      where: eq(schema.medicalRecords.id, id),
    });

    if (!record) {
      throw new NotFoundException('Medical record not found');
    }

    await this.db.delete(schema.medicalRecords).where(eq(schema.medicalRecords.id, id));
    return { message: 'Medical record deleted successfully' };
  }
}
