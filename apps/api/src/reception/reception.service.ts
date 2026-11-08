import { Injectable, Inject, HttpException, HttpStatus } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, inArray, and, ilike, or, asc } from 'drizzle-orm';
import * as schema from '../database/schema';
import axios from 'axios';
import * as crypto from 'crypto';
import { DoctorsService } from '../doctors/doctors.service';
import { HealthCentersService } from '../health-centers/health-centers.service';
import { EventsGateway } from '../events/events.gateway';

@Injectable()
export class ReceptionService {
  constructor(
    @Inject('DATABASE_CONNECTION') private readonly db: NodePgDatabase<typeof schema>,
    private readonly doctorsService: DoctorsService,
    private readonly healthCentersService: HealthCentersService,
    private readonly eventsGateway: EventsGateway,
  ) {}

  async getEsusSchedule(date: string, cnes: string) {
    let records: any[] = [];

    // 1. Consulta registros remotos na API do e-SUS Regulação (se configurado)
    if (process.env.ESUS_API_SECRET) {
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
              'User-Agent': 'SINPeP-Regulacao/1.0',
            },
            timeout: 7000,
          }
        );

        const hits = response.data?.hits?.hits || [];
        records = hits.map((hit: any) => hit._source);

        // Sincroniza / atualiza CPF e credenciais dos médicos do e-SUS
        for (const record of records) {
          if (record.nuCnsProfissionalSolicitante && record.nuCpfProfissionalSolicitante) {
            try {
              await this.doctorsService.updateDoctorCpfAndCredentialsByCns(
                record.nuCnsProfissionalSolicitante,
                record.nuCpfProfissionalSolicitante
              );
            } catch (syncErr) {
              console.error('[Auto-Doctor-Sync] Erro ao sincronizar CPF do médico solicitante:', syncErr);
            }
          }
          if (record.nuCnsProfissionalExecutante && record.nuCpfProfissionalExecutante) {
            try {
              await this.doctorsService.updateDoctorCpfAndCredentialsByCns(
                record.nuCnsProfissionalExecutante,
                record.nuCpfProfissionalExecutante
              );
            } catch (syncErr) {
              console.error('[Auto-Doctor-Sync] Erro ao sincronizar CPF do médico executante:', syncErr);
            }
          }
        }
      } catch (esusError: any) {
        console.warn('[Reception] Aviso na comunicação com a API remota do e-SUS:', esusError?.message || esusError);
      }
    }

    // 2. Consulta agendamentos nativos do SINPeP na data e estabelecimento executante
    try {
      const localSlots = await this.db.query.scheduleSlots.findMany({
        where: and(
          eq(schema.scheduleSlots.date, date),
          eq(schema.scheduleSlots.status, 'AGENDADO'),
        ),
        with: {
          patient: true,
          regulationRequest: {
            with: {
              requestingHealthCenter: true,
            },
          },
          schedule: {
            with: {
              executingHealthCenter: true,
              procedure: true,
              procedureGroup: true,
              doctor: {
                with: { user: true },
              },
            },
          },
        },
        orderBy: [asc(schema.scheduleSlots.time)],
      });

      // Filtra pelo CNES da unidade executante (se cnes informado)
      const filteredSlots = cnes
        ? localSlots.filter((s) => !s.schedule?.executingHealthCenter?.cnes || s.schedule?.executingHealthCenter?.cnes === cnes)
        : localSlots;

      const existingProtocols = new Set(records.map((r) => r.coSolicitacao).filter(Boolean));

      for (const slot of filteredSlots) {
        const protocolNumber = slot.regulationRequest?.protocolNumber || `SINPEP-${slot.id.slice(0, 8)}`;
        if (existingProtocols.has(protocolNumber)) {
          continue; // Evita duplicações caso já tenha vindo do e-SUS
        }

        const specName =
          slot.schedule?.procedure?.name ||
          slot.schedule?.procedureGroup?.name ||
          'CONSULTA GERAL';

        const doctorName = (slot.schedule as any)?.doctor?.user?.name || 'Profissional';
        const unitName = slot.schedule?.executingHealthCenter?.name || 'Unidade Executante';
        const unitCnes = slot.schedule?.executingHealthCenter?.cnes || cnes || '2606712';

        records.push({
          coSolicitacao: protocolNumber,
          hrMarcacao: slot.time || 'Sem horário',
          dtMarcacao: slot.date,
          noProcedimentoInterno: specName,
          pacienteNome: slot.patient?.name || 'Paciente',
          pacienteNuCpf: slot.patient?.cpf || '',
          pacienteNuCns: slot.patient?.cns || '',
          pacienteNoMunicipioResidencia: 'São Bento',
          noEstabelecimentoExecutante: unitName,
          coCnesEstabelecimentoExecutante: unitCnes,
          noProfissionalExecutante: doctorName,
          nuCnsProfissionalExecutante: slot.schedule?.doctor?.cns || '',
          nuCpfProfissionalExecutante: slot.schedule?.doctor?.cpf || '',
          confirmationToken: slot.regulationRequest?.confirmationToken || null,
          regulationRequestId: slot.regulationRequestId || null,
          slotId: slot.id,
          source: 'SINPEP',
          patientId: slot.patientId,
        });
      }
    } catch (localErr) {
      console.error('[Reception] Erro ao carregar agendamentos nativos do SINPeP:', localErr);
    }

    // Extract CPFs
    const cpfs = Array.from(new Set(records.map((r: any) => r.pacienteNuCpf).filter(Boolean))) as string[];
    let localPatients: Record<string, string> = {};
    
    if (cpfs.length > 0) {
      const patients = await this.db.select({ id: schema.patients.id, cpf: schema.patients.cpf }).from(schema.patients).where(inArray(schema.patients.cpf, cpfs));
      localPatients = patients.reduce((acc, p) => {
        if (p.cpf) acc[p.cpf] = p.id;
        return acc;
      }, {} as Record<string, string>);
    }

    // Check attendance queue and queue settings for today
    const setting = await this.db.select().from(schema.queueSettings).where(eq(schema.queueSettings.id, 'priority_rule'));
    const priorityRule = (setting[0]?.value as 'PRIORITY_FIRST' | 'INTERLEAVED') || 'PRIORITY_FIRST';

    const queueItems = await this.db.select().from(schema.attendanceQueue).where(eq(schema.attendanceQueue.date, date));

    // Mapear o horário marcado (hrMarcacao) de cada agendamento do e-SUS
    const timeByEsusId = new Map<string, string>();
    for (const record of records) {
      if (record.coSolicitacao) {
        timeByEsusId.set(record.coSolicitacao, record.hrMarcacao || 'Sem horário');
      }
    }

    // Agrupar itens da fila separadamente por Especialidade E Horário (ex: "CONSULTA EM UROLOGIA___11:00", "CONSULTA EM UROLOGIA___15:00")
    const queueBySpecAndTime: Record<string, typeof queueItems> = {};
    for (const q of queueItems) {
      const time = (q.esusSolicitacaoId && timeByEsusId.get(q.esusSolicitacaoId)) || 'Sem horário';
      const groupKey = `${q.specialtyName}___${time}`;
      if (!queueBySpecAndTime[groupKey]) {
        queueBySpecAndTime[groupKey] = [];
      }
      queueBySpecAndTime[groupKey].push(q);
    }

    // Para cada grupo (especialidade + horário), calcular a ordem de 1 até N separadamente
    const orderMap = new Map<string, number>();
    for (const groupItems of Object.values(queueBySpecAndTime)) {
      const aguardando = groupItems.filter(i => i.status === 'AGUARDANDO');
      const others = groupItems.filter(i => i.status !== 'AGUARDANDO');

      const prioritarios = aguardando
        .filter(i => i.priority === 'PRIORITARIO')
        .sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));

      const convencionais = aguardando
        .filter(i => i.priority !== 'PRIORITARIO')
        .sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));

      let orderedAguardando: typeof queueItems = [];
      if (priorityRule === 'INTERLEAVED') {
        const maxLen = Math.max(prioritarios.length, convencionais.length);
        for (let i = 0; i < maxLen; i++) {
          if (i < prioritarios.length) orderedAguardando.push(prioritarios[i]);
          if (i < convencionais.length) orderedAguardando.push(convencionais[i]);
        }
      } else {
        orderedAguardando = [...prioritarios, ...convencionais];
      }

      const finalOrdered = [...orderedAguardando, ...others];
      finalOrdered.forEach((item, index) => {
        orderMap.set(item.id, index + 1);
      });
    }

    const groupedBySpecialty: Record<string, any[]> = {};

    for (const record of records) {
      const spec = record.noProcedimentoInterno || 'GERAL';
      if (!groupedBySpecialty[spec]) {
        groupedBySpecialty[spec] = [];
      }

      const patientId = record.patientId || (record.pacienteNuCpf ? localPatients[record.pacienteNuCpf] : null);
      const qItem = queueItems.find(q => q.esusSolicitacaoId === record.coSolicitacao);
      const calculatedOrder = qItem ? orderMap.get(qItem.id) || qItem.queueOrder : null;

      groupedBySpecialty[spec].push({
        ...record,
        isRegistered: !!patientId,
        patientId: patientId || null,
        isQueued: !!qItem,
        queueId: qItem ? qItem.id : null,
        queueStatus: qItem ? qItem.status : null,
        queueOrder: calculatedOrder,
        attendanceOrder: calculatedOrder,
        priority: qItem ? qItem.priority : null,
        priorityRule,
      });
    }

    return groupedBySpecialty;
  }

  async enqueuePatient(
    patientId: string,
    specialtyName: string,
    date: string,
    esusSolicitacaoId: string,
    esusData?: any,
    priority: string = 'CONVENCIONAL'
  ) {
    if (esusData) {
      await this.autoRegisterDoctor(esusData);
    }

    const priorityVal = priority === 'PRIORITARIO' ? 'PRIORITARIO' : 'CONVENCIONAL';
    
    const existing = await this.db.select().from(schema.attendanceQueue).where(and(eq(schema.attendanceQueue.patientId, patientId), eq(schema.attendanceQueue.date, date), eq(schema.attendanceQueue.specialtyName, specialtyName)));
    
    if (existing.length > 0) {
      if (existing[0].priority !== priorityVal) {
        const [updated] = await this.db.update(schema.attendanceQueue)
          .set({ priority: priorityVal, updatedAt: new Date().toISOString() })
          .where(eq(schema.attendanceQueue.id, existing[0].id))
          .returning();

        this.eventsGateway.server?.emit('queue_updated', {
          type: 'PRIORITY_UPDATED',
          patientId,
          specialtyName,
          date,
          queueId: existing[0].id,
          priority: priorityVal,
        });

        return updated;
      }
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
      priority: priorityVal,
      updatedAt: new Date().toISOString()
    }).returning();

    // Emite evento em tempo real via WebSocket para todos os clientes conectados
    this.eventsGateway.server?.emit('queue_updated', {
      type: 'PATIENT_ENQUEUED',
      patientId,
      specialtyName,
      date,
      esusSolicitacaoId,
      priority: priorityVal,
      queueId: newItem.id,
    });

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
      esusData,
      payload.priority || 'CONVENCIONAL'
    );

    return { patientId };
  }

  async autoRegisterDoctor(esusData: any) {
    if (!esusData) return;

    // Sincroniza CPF e credenciais caso o médico já esteja cadastrado com CPF mascarado (XXX.DDD.DDD.XX)
    if (esusData.nuCnsProfissionalSolicitante && esusData.nuCpfProfissionalSolicitante) {
      try {
        await this.doctorsService.updateDoctorCpfAndCredentialsByCns(
          esusData.nuCnsProfissionalSolicitante,
          esusData.nuCpfProfissionalSolicitante
        );
      } catch (e) {}
    }
    if (esusData.nuCnsProfissionalExecutante && esusData.nuCpfProfissionalExecutante) {
      try {
        await this.doctorsService.updateDoctorCpfAndCredentialsByCns(
          esusData.nuCnsProfissionalExecutante,
          esusData.nuCpfProfissionalExecutante
        );
      } catch (e) {}
    }

    if (!esusData.nuCpfProfissionalExecutante) return;
    console.log("[Auto-Doctor] Iniciando para CPF:", esusData.nuCpfProfissionalExecutante);
    const docCpf = esusData.nuCpfProfissionalExecutante;
    const docCnes = esusData.coCnesEstabelecimentoExecutante;
    const formattedDocCpf = docCpf.includes('.') ? docCpf : docCpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
    
    const existingConditions = [
      eq(schema.doctors.cpf, docCpf),
      eq(schema.doctors.cpf, formattedDocCpf),
    ];
    if (esusData.nuCnsProfissionalExecutante) {
      existingConditions.push(eq(schema.doctors.cns, esusData.nuCnsProfissionalExecutante));
    }

    const existingDocs = await this.db.select().from(schema.doctors).where(or(...existingConditions));
    console.log("[Auto-Doctor] Médicos existentes com esse CPF ou CNS:", existingDocs.length);
    
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
          if (esusData.noProcedimentoInterno) {
            console.log("[Auto-Doctor] Buscando procedimento específico:", esusData.noProcedimentoInterno);
            // 1. Busca por correspondência exata do nome
            let procs = await this.db.select()
              .from(schema.procedures)
              .where(ilike(schema.procedures.name, esusData.noProcedimentoInterno.trim()))
              .limit(1);

            // 2. Se não achou exato, busca contendo o nome do procedimento interno
            if (procs.length === 0) {
              procs = await this.db.select()
                .from(schema.procedures)
                .where(ilike(schema.procedures.name, `%${esusData.noProcedimentoInterno.trim()}%`))
                .limit(1);
            }

            // 3. Se ainda não achou, busca pela palavra-chave da especialidade (ex: "UROLOGIA", "NEUROLOGIA")
            if (procs.length === 0) {
              const procTerm = esusData.noProcedimentoInterno
                .replace(/^CONSULTA\s+(EM|DE)\s+/i, '')
                .trim()
                .split(' ')[0];
              if (procTerm.length > 3) {
                procs = await this.db.select()
                  .from(schema.procedures)
                  .where(ilike(schema.procedures.name, `%${procTerm}%`))
                  .limit(1);
              }
            }

            if (procs.length > 0) {
              procedureId = procs[0].id;
              console.log("[Auto-Doctor] Procedimento vinculado com sucesso:", procs[0].name);
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

  async getQueueSettings() {
    const setting = await this.db.select().from(schema.queueSettings).where(eq(schema.queueSettings.id, 'priority_rule'));
    return {
      rule: (setting[0]?.value as 'PRIORITY_FIRST' | 'INTERLEAVED') || 'PRIORITY_FIRST',
    };
  }

  async updateQueueSettings(rule: 'PRIORITY_FIRST' | 'INTERLEAVED') {
    const validRule = rule === 'INTERLEAVED' ? 'INTERLEAVED' : 'PRIORITY_FIRST';
    await this.db.insert(schema.queueSettings).values({
      id: 'priority_rule',
      value: validRule,
      updatedAt: new Date().toISOString(),
    }).onConflictDoUpdate({
      target: schema.queueSettings.id,
      set: {
        value: validRule,
        updatedAt: new Date().toISOString(),
      },
    });

    this.eventsGateway.server?.emit('queue_updated', {
      type: 'SETTINGS_UPDATED',
      rule: validRule,
    });

    return { rule: validRule };
  }

  async updateQueuePriority(queueId: string, priority: 'PRIORITARIO' | 'CONVENCIONAL') {
    const priorityVal = priority === 'PRIORITARIO' ? 'PRIORITARIO' : 'CONVENCIONAL';
    const [updated] = await this.db.update(schema.attendanceQueue)
      .set({ priority: priorityVal, updatedAt: new Date().toISOString() })
      .where(eq(schema.attendanceQueue.id, queueId))
      .returning();

    this.eventsGateway.server?.emit('queue_updated', {
      type: 'PRIORITY_UPDATED',
      queueId,
      priority: priorityVal,
    });

    return updated;
  }

  async updateQueueStatus(queueId: string, status: 'AGUARDANDO' | 'ATENDIDO' | 'CANCELADO') {
    const [updated] = await this.db.update(schema.attendanceQueue)
      .set({ status, updatedAt: new Date().toISOString() })
      .where(eq(schema.attendanceQueue.id, queueId))
      .returning();

    this.eventsGateway.server?.emit('queue_updated', {
      type: 'STATUS_UPDATED',
      queueId,
      status,
    });

    return updated;
  }
}

