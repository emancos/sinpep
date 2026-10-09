import { Injectable, Inject, HttpException, HttpStatus } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, inArray, and, ilike, or } from 'drizzle-orm';
import * as schema from '../database/schema';
import axios from 'axios';
import * as crypto from 'crypto';
import { DoctorsService } from '../doctors/doctors.service';
import { HealthCentersService } from '../health-centers/health-centers.service';

@Injectable()
export class ReceptionService {
  constructor(
    @Inject('DATABASE_CONNECTION') private readonly db: NodePgDatabase<typeof schema>,
    private readonly doctorsService: DoctorsService,
    private readonly healthCentersService: HealthCentersService,
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

  async enqueuePatient(patientId: string, specialtyName: string, date: string, esusSolicitacaoId: string, esusData?: any) {
    if (esusData) {
      await this.autoRegisterDoctor(esusData);
    }
    
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

    // Auto enqueue and doctor register
    await this.enqueuePatient(
      patientId, 
      esusData.noProcedimentoInterno || 'GERAL', 
      esusData.dtMarcacao || new Date().toISOString().split('T')[0], 
      esusData.coSolicitacao, 
      esusData
    );

    return { patientId };
  }

  async autoRegisterDoctor(esusData: any) {
    if (!esusData || !esusData.nuCpfProfissionalExecutante) return;
      console.log("[Auto-Doctor] Iniciando para CPF:", esusData.nuCpfProfissionalExecutante);
      const docCpf = esusData.nuCpfProfissionalExecutante;
      const docCnes = esusData.coCnesEstabelecimentoExecutante;
      
      const existingDocs = await this.db.select().from(schema.doctors).where(eq(schema.doctors.cpf, docCpf));
      console.log("[Auto-Doctor] Médicos existentes com esse CPF:", existingDocs.length);
      
      if (existingDocs.length === 0) {
        try {
          console.log("[Auto-Doctor] Buscando no CNES para CNES:", docCnes, "Nome:", esusData.noProfissionalExecutante);
          const cnesData = await this.healthCentersService.searchProfessionals({ 
             nome: esusData.noProfissionalExecutante, 
             cnes: docCnes,
             profissao: 'MEDICO'
          });
          
          const profs = Array.isArray(cnesData) ? cnesData : cnesData?.data;
          const prof = profs && Array.isArray(profs) && profs.length > 0 ? profs[0] : null;
          console.log("[Auto-Doctor] Profissional retornado do CNES:", !!prof);
          
          let specialtyId = null;
          if (prof && prof.unidades) {
             const unitCbos = prof.unidades
                .filter((u: any) => u.codigo === docCnes && u.cbo)
                .map((u: any) => u.cbo);
                
             for (const cbo of unitCbos) {
                console.log("[Auto-Doctor] Buscando especialidade para CBO:", cbo.codigo, "ou Desc:", cbo.nome);
                const specs = await this.db.select().from(schema.specialties).where(or(eq(schema.specialties.cbo, cbo.codigo), ilike(schema.specialties.name, `%${cbo.nome}%`)));
                console.log("[Auto-Doctor] Especialidades encontradas no DB:", specs.length);
                if (specs.length > 0) {
                   specialtyId = specs[0].id;
                   break;
                }
             }
          }

          if (!specialtyId && esusData.noProcedimentoInterno) {
            const procName = esusData.noProcedimentoInterno.replace('CONSULTA EM ', '').replace('CONSULTA DE ', '').split(' ')[0];
            if (procName.length > 3) {
              const specs = await this.db.select().from(schema.specialties).where(ilike(schema.specialties.name, `%${procName}%`));
              if (specs.length > 0) specialtyId = specs[0].id;
            }
          }

          if (!specialtyId) {
             const specs = await this.db.select().from(schema.specialties).where(ilike(schema.specialties.name, `%CLINIC%`)).limit(1);
             if (specs.length > 0) specialtyId = specs[0].id;
             else {
               const firstSpec = await this.db.select().from(schema.specialties).limit(1);
               if (firstSpec.length > 0) specialtyId = firstSpec[0].id;
             }
          }

          let procedureId = null;
          if (esusData.coProcedimentoSigtap || esusData.noProcedimentoInterno) {
            console.log("[Auto-Doctor] Buscando procedimento SIGTAP:", esusData.coProcedimentoSigtap);
            const procConditions = [];
            if (esusData.coProcedimentoSigtap) procConditions.push(eq(schema.procedures.code, esusData.coProcedimentoSigtap));
            if (esusData.noProcedimentoInterno) procConditions.push(ilike(schema.procedures.name, `%${esusData.noProcedimentoInterno}%`));
            
            if (procConditions.length > 0) {
              const procs = await this.db.select().from(schema.procedures).where(or(...procConditions)).limit(1);
              console.log("[Auto-Doctor] Procedimentos encontrados no DB:", procs.length);
              if (procs.length > 0) procedureId = procs[0].id;
            }
          }

          if (specialtyId) {
             console.log("[Auto-Doctor] Especialidade encontrada. Criando médico...");
             
             const formattedCpf = docCpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
             
             let hcPayload = null;
             if (docCnes) {
                try {
                   const hcRes = await this.healthCentersService.searchCnes({ cnes: docCnes });
                   if (hcRes && hcRes.estabelecimentos && hcRes.estabelecimentos.length > 0) {
                      hcPayload = hcRes.estabelecimentos[0];
                   }
                } catch(e) {
                   console.log("[Auto-Doctor] Falha ao buscar unidade no integra-sus, usando fallback...");
                }
             }
             
             if (!hcPayload && docCnes) {
                hcPayload = {
                   coCnes: docCnes,
                   noFantasia: esusData.noEstabelecimentoExecutante || "UNIDADE DE SAÚDE"
                };
             }

             await this.doctorsService.create({
                name: esusData.noProfissionalExecutante,
                cpf: formattedCpf,
                cns: esusData.nuCnsProfissionalExecutante,
                attendanceType: esusData.coModulo === 4 ? 'AMBULATORIAL' : 'AMBOS',
                specialties: [specialtyId],
                procedures: procedureId ? [procedureId] : [],
                healthCenter: hcPayload
             });
             console.log("[Auto-Doctor] Médico criado com sucesso!");
          } else {
             console.log("[Auto-Doctor] Abortado: specialtyId não encontrada. O médico não pode ser salvo sem uma especialidade.");
          }
        } catch (e) {
          console.error('[Auto-Doctor] Falhou:', e.message, e.stack);
        }
      }
  }
}
