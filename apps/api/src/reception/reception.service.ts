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

  async getEsusSchedule(date: string, cnes: string, includeMeta = false): Promise<any> {
    let records: any[] = [];
    const normalizedCnes = (cnes || '2606712').replace(/\D/g, '');
    const normalizeSpecKey = (name?: string | null) => (name || 'GERAL').trim().toUpperCase();

    let resolvedExecutingUnit: { name: string; cnes: string } | null = null;
    try {
      if (normalizedCnes) {
        const unit = await this.db.query.healthCenters?.findFirst({
          where: eq(schema.healthCenters.cnes, normalizedCnes),
        });
        if (unit) {
          resolvedExecutingUnit = { name: unit.name, cnes: unit.cnes || normalizedCnes };
        }
      }
    } catch {
      // Fallback silencioso caso o query builder não esteja mockado em testes
    }

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
                      "coCnesEstabelecimentoExecutante": normalizedCnes || "2606712"
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
        records = hits.map((hit: any) => ({
          ...hit._source,
          source: 'ESUS',
        }));

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

    const existingProtocols = new Set(records.map((r) => r.coSolicitacao).filter(Boolean));
    const existingRegulationRequestIds = new Set<string>();

    // Metadados de escalas nativas do SINPeP por especialidade/procedimento normalizado
    const sinpepMetaBySpec: Record<
      string,
      {
        availableSlots: number;
        bookedSlots: number;
        totalSlots: number;
        schedulesMap: Map<
          string,
          {
            scheduleId: string;
            doctorName: string;
            startTime: string;
            endTime: string;
            scheduleType: string;
          }
        >;
      }
    > = {};

    const ensureSinpepMeta = (specKey: string) => {
      if (!sinpepMetaBySpec[specKey]) {
        sinpepMetaBySpec[specKey] = {
          availableSlots: 0,
          bookedSlots: 0,
          totalSlots: 0,
          schedulesMap: new Map(),
        };
      }
      return sinpepMetaBySpec[specKey];
    };

    // 2. Consulta escalas e vagas (agendadas e disponíveis) nativas do SINPeP na data e unidade executante
    try {
      const localSlots = await this.db.query.scheduleSlots.findMany({
        where: and(
          eq(schema.scheduleSlots.date, date),
          inArray(schema.scheduleSlots.status, ['AGENDADO', 'DISPONIVEL']),
        ),
        with: {
          patient: true,
          regulationRequest: {
            with: {
              requestingHealthCenter: true,
              procedure: true,
              procedureGroup: true,
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

      // Filtra apenas escalas ativas e pertencentes ao CNES da unidade executante
      const filteredSlots = localSlots.filter((s) => {
        if (!s.schedule || s.schedule.isActive === false) return false;
        if (!normalizedCnes) return true;
        const slotCnes = (s.schedule.executingHealthCenter?.cnes || '').replace(/\D/g, '');
        return !slotCnes || slotCnes === normalizedCnes;
      });

      for (const slot of filteredSlots) {
        const scheduleSpecRaw =
          slot.schedule?.procedure?.name ||
          slot.schedule?.procedureGroup?.name ||
          'CONSULTA GERAL';
        const scheduleSpecKey = normalizeSpecKey(scheduleSpecRaw);

        const doctorName = (slot.schedule as any)?.doctor?.user?.name || 'Profissional';
        const unitName = slot.schedule?.executingHealthCenter?.name || resolvedExecutingUnit?.name || 'Unidade Executante';
        const unitCnes = (slot.schedule?.executingHealthCenter?.cnes || normalizedCnes || '2606712').replace(/\D/g, '');

        if (!resolvedExecutingUnit && (unitName || unitCnes)) {
          resolvedExecutingUnit = { name: unitName, cnes: unitCnes };
        }

        const meta = ensureSinpepMeta(scheduleSpecKey);
        meta.totalSlots += 1;
        if (slot.status === 'DISPONIVEL') {
          meta.availableSlots += 1;
        } else if (slot.status === 'AGENDADO') {
          meta.bookedSlots += 1;
        }

        if (slot.schedule?.id && !meta.schedulesMap.has(slot.schedule.id)) {
          meta.schedulesMap.set(slot.schedule.id, {
            scheduleId: slot.schedule.id,
            doctorName,
            startTime: slot.schedule.startTime || '',
            endTime: slot.schedule.endTime || '',
            scheduleType: slot.schedule.scheduleType || 'CONSULTA',
          });
        }

        if (slot.status !== 'AGENDADO') {
          continue;
        }

        const protocolNumber = slot.regulationRequest?.protocolNumber || `SINPEP-${slot.id.slice(0, 8)}`;
        if (existingProtocols.has(protocolNumber)) {
          continue; // Evita duplicações caso já tenha vindo do e-SUS
        }
        existingProtocols.add(protocolNumber);
        if (slot.regulationRequestId) {
          existingRegulationRequestIds.add(slot.regulationRequestId);
        }

        const bookedSpecName =
          slot.regulationRequest?.procedure?.name ||
          scheduleSpecRaw;

        records.push({
          coSolicitacao: protocolNumber,
          hrMarcacao: slot.time || 'Sem horário',
          dtMarcacao: slot.date,
          noProcedimentoInterno: normalizeSpecKey(bookedSpecName),
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
          slotType: slot.slotType,
          source: 'SINPEP',
          patientId: slot.patientId,
        });
      }
    } catch (localErr) {
      console.error('[Reception] Erro ao carregar escalas e agendamentos nativos do SINPeP:', localErr);
    }

    // 3. Consulta solicitações de regulação do SINPeP agendadas diretamente (sem slot vinculado)
    try {
      const scheduledRequests = await this.db.query.regulationRequests?.findMany({
        where: and(
          eq(schema.regulationRequests.scheduledDate, date),
          eq(schema.regulationRequests.status, 'AGENDADA'),
        ),
        with: {
          patient: true,
          executingHealthCenter: true,
          procedure: true,
          procedureGroup: true,
          specialty: true,
          attendingDoctor: true,
        },
        orderBy: [asc(schema.regulationRequests.scheduledTime)],
      });

      for (const req of scheduledRequests || []) {
        if (existingRegulationRequestIds.has(req.id)) continue;
        const protocolNumber = req.protocolNumber || `SINPEP-REQ-${req.id.slice(0, 8)}`;
        if (existingProtocols.has(protocolNumber)) continue;

        const reqCnes = (req.executingHealthCenter?.cnes || '').replace(/\D/g, '');
        if (normalizedCnes && reqCnes && reqCnes !== normalizedCnes) continue;

        existingProtocols.add(protocolNumber);
        existingRegulationRequestIds.add(req.id);

        const specName =
          req.procedure?.name ||
          req.procedureGroup?.name ||
          req.specialty?.name ||
          'CONSULTA GERAL';
        const specKey = normalizeSpecKey(specName);
        const unitName = req.executingHealthCenter?.name || resolvedExecutingUnit?.name || 'Unidade Executante';
        const unitCnes = reqCnes || normalizedCnes || '2606712';

        if (!resolvedExecutingUnit && (unitName || unitCnes)) {
          resolvedExecutingUnit = { name: unitName, cnes: unitCnes };
        }

        const meta = ensureSinpepMeta(specKey);
        meta.bookedSlots += 1;
        meta.totalSlots += 1;

        records.push({
          coSolicitacao: protocolNumber,
          hrMarcacao: req.scheduledTime || 'Sem horário',
          dtMarcacao: req.scheduledDate || date,
          noProcedimentoInterno: specKey,
          pacienteNome: req.patient?.name || 'Paciente',
          pacienteNuCpf: req.patient?.cpf || '',
          pacienteNuCns: req.patient?.cns || '',
          pacienteNoMunicipioResidencia: 'São Bento',
          noEstabelecimentoExecutante: unitName,
          coCnesEstabelecimentoExecutante: unitCnes,
          noProfissionalExecutante: req.attendingDoctor?.name || 'Profissional',
          nuCnsProfissionalExecutante: '',
          nuCpfProfissionalExecutante: '',
          confirmationToken: req.confirmationToken || null,
          regulationRequestId: req.id,
          slotId: null,
          source: 'SINPEP',
          patientId: req.patientId,
        });
      }
    } catch (reqErr) {
      console.error('[Reception] Erro ao carregar solicitações agendadas do SINPeP:', reqErr);
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

    // Mapear o horário marcado (hrMarcacao) de cada agendamento
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
      const groupKey = `${normalizeSpecKey(q.specialtyName)}___${time}`;
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
      const spec = normalizeSpecKey(record.noProcedimentoInterno);
      if (!groupedBySpecialty[spec]) {
        groupedBySpecialty[spec] = [];
      }

      const patientId = record.patientId || (record.pacienteNuCpf ? localPatients[record.pacienteNuCpf] : null);
      const qItem = queueItems.find(q => q.esusSolicitacaoId === record.coSolicitacao);
      const calculatedOrder = qItem ? orderMap.get(qItem.id) || qItem.queueOrder : null;

      groupedBySpecialty[spec].push({
        ...record,
        source: record.source || 'ESUS',
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

    if (!includeMeta) {
      return groupedBySpecialty;
    }

    const specialtyMeta: Record<
      string,
      {
        sources: Array<'ESUS' | 'SINPEP'>;
        esusCount: number;
        sinpepBookedCount: number;
        sinpepAvailableSlots: number;
        sinpepTotalSlots: number;
        sinpepSchedules: Array<{
          scheduleId: string;
          doctorName: string;
          startTime: string;
          endTime: string;
          scheduleType: string;
        }>;
      }
    > = {};

    for (const [specKey, list] of Object.entries(groupedBySpecialty)) {
      const esusCount = list.filter((item) => item.source !== 'SINPEP').length;
      const sinpepRecordsCount = list.filter((item) => item.source === 'SINPEP').length;
      const sinpepInfo = sinpepMetaBySpec[specKey];
      const sinpepAvailableSlots = sinpepInfo?.availableSlots || 0;
      const sinpepTotalSlots = sinpepInfo?.totalSlots || sinpepRecordsCount;
      const sinpepSchedules = sinpepInfo ? Array.from(sinpepInfo.schedulesMap.values()) : [];

      const sources: Array<'ESUS' | 'SINPEP'> = [];
      if (esusCount > 0) sources.push('ESUS');
      if (sinpepRecordsCount > 0 || sinpepTotalSlots > 0 || sinpepSchedules.length > 0) {
        sources.push('SINPEP');
      }

      specialtyMeta[specKey] = {
        sources,
        esusCount,
        sinpepBookedCount: sinpepRecordsCount,
        sinpepAvailableSlots,
        sinpepTotalSlots,
        sinpepSchedules,
      };
    }

    if (!resolvedExecutingUnit) {
      for (const list of Object.values(groupedBySpecialty)) {
        const itemWithUnit = list.find(
          (item: any) => item.noEstabelecimentoExecutante || item.coCnesEstabelecimentoExecutante,
        );
        if (itemWithUnit) {
          resolvedExecutingUnit = {
            name: itemWithUnit.noEstabelecimentoExecutante || '',
            cnes: itemWithUnit.coCnesEstabelecimentoExecutante || normalizedCnes,
          };
          break;
        }
      }
    }

    return {
      specialties: groupedBySpecialty,
      meta: {
        executingUnit: resolvedExecutingUnit,
        specialtyMeta,
      },
    };
  }

  async enqueuePatient(
    patientId: string,
    specialtyName: string,
    date: string,
    esusSolicitacaoId: string,
    esusData?: any,
    priority: string = 'CONVENCIONAL'
  ) {
    if (esusData && esusData.source !== 'SINPEP') {
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
            const rawProc = (esusData.noProcedimentoInterno || '')
              .normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '')
              .toUpperCase();

            let targetCbo: string | null = null;
            if (rawProc.includes('CARDIOLOG')) targetCbo = '225120';
            else if (rawProc.includes('ORTOPED') || rawProc.includes('TRAUMATO')) targetCbo = '225270';
            else if (rawProc.includes('PEDIAT') || rawProc.includes('INFANTIL')) targetCbo = '225124';
            else if (rawProc.includes('PSIQUIAT') || rawProc.includes('MENTAL')) targetCbo = '225133';
            else if (rawProc.includes('DERMATO')) targetCbo = '225135';
            else if (rawProc.includes('GINECO') || rawProc.includes('OBSTETR')) targetCbo = '225250';
            else if (rawProc.includes('UROLOG')) targetCbo = '225285';
            else if (rawProc.includes('OFTALMO')) targetCbo = '225265';
            else if (rawProc.includes('OTORRINO')) targetCbo = '225275';
            else if (rawProc.includes('ENDOCRINO') || rawProc.includes('METABOL')) targetCbo = '225155';
            else if (rawProc.includes('NEUROCIRURG')) targetCbo = '225260';
            else if (rawProc.includes('NEUROLOG')) targetCbo = '225112';
            else if (rawProc.includes('GASTRO')) targetCbo = '225165';
            else if (rawProc.includes('REUMATO')) targetCbo = '225136';
            else if (rawProc.includes('ANGIOLOG') || rawProc.includes('VASCULAR')) targetCbo = '225203';
            else if (rawProc.includes('INFECTO')) targetCbo = '225103';
            else if (rawProc.includes('PNEUMO')) targetCbo = '225127';
            else if (rawProc.includes('NEFROLOG')) targetCbo = '225109';
            else if (rawProc.includes('GERIAT')) targetCbo = '225180';
            else if (rawProc.includes('HEMATO')) targetCbo = '225185';
            else if (rawProc.includes('MASTOLOG')) targetCbo = '225255';
            else if (rawProc.includes('COLOPROCTO')) targetCbo = '225280';
            else if (rawProc.includes('ALERG') || rawProc.includes('IMUNO')) targetCbo = '225110';
            else if (rawProc.includes('ONCOLOG') || rawProc.includes('CANCER')) targetCbo = '225121';
            else if (rawProc.includes('CIRURGIA GERAL')) targetCbo = '225225';
            else if (rawProc.includes('ENDOSCOP')) targetCbo = '225310';
            else if (rawProc.includes('ULTRASS') || rawProc.includes('TOMOGRAF') || rawProc.includes('RESSON') || rawProc.includes('RADIOLOG') || rawProc.includes('MAMOGRAF')) targetCbo = '225320';
            else if (rawProc.includes('CITOPATOL')) targetCbo = '225305';
            else if (rawProc.includes('ANATOMOPATOL') || rawProc.includes('BIOPSIA')) targetCbo = '225148';
            else if (rawProc.includes('FAMILIA') || rawProc.includes('ESF')) targetCbo = '225130';
            else if (rawProc.includes('GENERALISTA')) targetCbo = '225170';
            else if (rawProc.includes('CLINIC') || rawProc.includes('CONSULTA')) targetCbo = '225125';

            if (targetCbo) {
              const specs = await this.db.select().from(schema.specialties).where(eq(schema.specialties.cbo, targetCbo)).limit(1);
              if (specs.length > 0) specialtyId = specs[0].id;
            }

            if (!specialtyId) {
              const procName = esusData.noProcedimentoInterno.replace(/^CONSULTA\s+(EM|DE)\s+/i, '').trim().split(' ')[0];
              if (procName.length > 3) {
                const specs = await this.db.select().from(schema.specialties).where(ilike(schema.specialties.name, `%${procName}%`));
                if (specs.length > 0) specialtyId = specs[0].id;
              }
            }
          }

          if (!specialtyId) {
             const specs = await this.db.select().from(schema.specialties).where(or(eq(schema.specialties.cbo, '225125'), ilike(schema.specialties.name, `%CLINIC%`))).limit(1);
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

