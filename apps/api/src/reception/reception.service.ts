import { Injectable, Inject, HttpException, HttpStatus } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, inArray, and } from 'drizzle-orm';
import * as schema from '../database/schema';
import axios from 'axios';
import * as crypto from 'crypto';

@Injectable()
export class ReceptionService {
  constructor(
    @Inject('DATABASE_CONNECTION') private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async getEsusSchedule(date: string, cnes: string) {
    if (!process.env.ESUS_API_SECRET) {
      throw new HttpException('ESUS_API_SECRET não configurado.', HttpStatus.INTERNAL_SERVER_ERROR);
    }

    try {
      const response = await axios.post(
        'https://regulacao-api.saude.gov.br/regulacao-producao/_search',
        {
          size: 500,
          sort: [
            {
              "hrMarcacao.keyword": {
                "order": "asc"
              }
            }
          ],
          query: {
            bool: {
              must: [
                {
                  term: {
                    "coCnesEstabelecimentoExecutante": cnes || "2606712"
                  }
                },
                {
                  range: {
                    dtMarcacao: {
                      gte: date,
                      lte: date,
                      format: "yyyy-MM-dd"
                    }
                  }
                }
              ]
            }
          }
        },
        {
          headers: {
            'Authorization': `Basic ${process.env.ESUS_API_SECRET}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const hits = response.data?.hits?.hits || [];
      const records = hits.map((hit: any) => hit._source);

      // Extract CPFs
      const cpfs = Array.from(new Set(records.map((r: any) => r.pacienteNuCpf).filter(Boolean))) as string[];
      let localPatients: Record<string, string> = {};
      
      if (cpfs.length > 0) {
        const patients = await this.db.select({ id: schema.patients.id, cpf: schema.patients.cpf }).from(schema.patients).where(inArray(schema.patients.cpf, cpfs));
        localPatients = patients.reduce((acc, p) => {
          acc[p.cpf] = p.id;
          return acc;
        }, {} as Record<string, string>);
      }

      // Check attendance queue for today
      const queueItems = await this.db.select().from(schema.attendanceQueue).where(eq(schema.attendanceQueue.date, date));
      const queueSet = new Set(queueItems.map(q => q.esusSolicitacaoId));

      const groupedBySpecialty: Record<string, any[]> = {};

      for (const record of records) {
        const spec = record.noProcedimentoInterno || 'GERAL';
        if (!groupedBySpecialty[spec]) {
          groupedBySpecialty[spec] = [];
        }

        const patientId = record.pacienteNuCpf ? localPatients[record.pacienteNuCpf] : null;
        const isQueued = queueSet.has(record.coSolicitacao);

        groupedBySpecialty[spec].push({
          ...record,
          isRegistered: !!patientId,
          patientId: patientId || null,
          isQueued: isQueued
        });
      }

      return groupedBySpecialty;
    } catch (error) {
      console.error("Erro na API E-SUS:", error.response?.data || error.message);
      throw new HttpException('Falha ao buscar agenda do e-SUS', HttpStatus.BAD_GATEWAY);
    }
  }

  async enqueuePatient(patientId: string, specialtyName: string, date: string, esusSolicitacaoId: string) {
    const existing = await this.db.select().from(schema.attendanceQueue).where(and(eq(schema.attendanceQueue.patientId, patientId), eq(schema.attendanceQueue.date, date), eq(schema.attendanceQueue.specialtyName, specialtyName)));
    
    if (existing.length > 0) {
      return existing[0];
    }

    const allInSpec = await this.db.select().from(schema.attendanceQueue).where(and(eq(schema.attendanceQueue.specialtyName, specialtyName), eq(schema.attendanceQueue.date, date)));
    const queueOrder = allInSpec.length + 1;

    const [newItem] = await this.db.insert(schema.attendanceQueue).values({
      id: crypto.randomUUID(),
      patientId,
      specialtyName,
      date,
      esusSolicitacaoId,
      queueOrder,
      updatedAt: new Date().toISOString()
    }).returning();

    return newItem;
  }

  async createPatientFromEsus(payload: any) {
    const { esusData, healthCenterId, healthAgentId, phones } = payload;
    
    const patientId = crypto.randomUUID();
    
    // Create Patient
    await this.db.insert(schema.patients).values({
      id: patientId,
      name: esusData.pacienteNome,
      cpf: esusData.pacienteNuCpf,
      cns: esusData.pacienteNuCns,
      birthDate: esusData.pacienteDtNascimento ? new Date(esusData.pacienteDtNascimento).toISOString() : new Date().toISOString(),
      gender: esusData.pacienteCoSexo === 'F' ? 'Feminino' : esusData.pacienteCoSexo === 'M' ? 'Masculino' : 'Outro',
      healthCenterId: healthCenterId,
      healthAgentId: healthAgentId || null,
      address: esusData.pacienteEndereco ? `${esusData.pacienteEndereco} - ${esusData.pacienteBairro} - CEP: ${esusData.pacienteCep}` : null,
      isActive: true,
      updatedAt: new Date().toISOString()
    });

    // Create Base Anamnesis
    await this.db.insert(schema.patientAnamnesis).values({
      id: crypto.randomUUID(),
      patientId,
      updatedAt: new Date().toISOString()
    });

    // Add Phones
    if (phones && Array.isArray(phones)) {
      for (const p of phones) {
        if (p.number) {
          await this.db.insert(schema.patientPhones).values({
            id: crypto.randomUUID(),
            patientId,
            phoneNumber: p.number,
            isWhatsapp: p.isWhatsapp || false,
            updatedAt: new Date().toISOString()
          });
        }
      }
    }

    // Auto enqueue
    await this.enqueuePatient(patientId, esusData.noProcedimentoInterno || 'GERAL', esusData.dtMarcacao || new Date().toISOString().split('T')[0], esusData.coSolicitacao);

    return { patientId };
  }
}
