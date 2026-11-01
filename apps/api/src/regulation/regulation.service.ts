import { Injectable, Inject, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../database';
import { eq, desc, and, or, ilike, inArray, sql } from 'drizzle-orm';
import * as crypto from 'crypto';
import { StorageService } from '../storage/storage.service';
import { EventsGateway } from '../events/events.gateway';

// Gerador de Token Alfanumérico Único com formato SB-XXXX-YYYY
function generateConfirmationToken(): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // Exclui 0, 1, I, O para evitar confusão
  let part1 = '';
  let part2 = '';
  for (let i = 0; i < 4; i++) {
    part1 += chars.charAt(crypto.randomInt(0, chars.length));
    part2 += chars.charAt(crypto.randomInt(0, chars.length));
  }
  return `SB-${part1}-${part2}`;
}

@Injectable()
export class RegulationService {
  constructor(
    @Inject('DATABASE_CONNECTION')
    private readonly db: NodePgDatabase<typeof schema>,
    private readonly storageService: StorageService,
    private readonly eventsGateway: EventsGateway,
  ) {}

  // =========================================================================
  // MÓDULO SOLICITANTE (UBS)
  // =========================================================================

  async createRequest(data: any, files: Express.Multer.File[], user: any) {
    if (!data.patientId) throw new BadRequestException('Paciente é obrigatório');
    if (!data.type) throw new BadRequestException('Tipo de solicitação é obrigatório (CONSULTA, EXAME, PROCEDIMENTO)');
    if (!data.cid10) throw new BadRequestException('CID-10 é obrigatório');
    if (!data.clinicalJustification || data.clinicalJustification.trim().length < 5) {
      throw new BadRequestException('Justificativa clínica detalhada é obrigatória');
    }

    // Health center do solicitante
    let healthCenterId = data.requestingHealthCenterId || user.healthCenterId;
    if (!healthCenterId) {
      const firstCenter = await this.db.query.healthCenters.findFirst();
      if (firstCenter) {
        healthCenterId = firstCenter.id;
      }
    }
    if (!healthCenterId) {
      throw new BadRequestException('Unidade de Saúde Solicitante não identificada');
    }

    const requestId = crypto.randomUUID();
    const now = new Date();
    const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const randomSuffix = crypto.randomInt(1000, 9999);
    const protocolNumber = `SOL-${yearMonth}-${randomSuffix}`;

    const [newRequest] = await this.db.insert(schema.regulationRequests).values({
      id: requestId,
      protocolNumber,
      patientId: data.patientId,
      requestingHealthCenterId: healthCenterId,
      requestingUserId: user.id,
      attendingDoctorId: data.attendingDoctorId || null,

      type: data.type,
      specialtyId: data.specialtyId || null,
      procedureId: data.procedureId || null,
      procedureGroupId: data.procedureGroupId || null,

      cid10: data.cid10.trim(),
      clinicalJustification: data.clinicalJustification.trim(),
      clinicalHistory: data.clinicalHistory ? data.clinicalHistory.trim() : null,
      priority: data.priority || 'ELETIVO',
      status: 'PENDENTE_REGULACAO',

      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    }).returning();

    // Registra evento inicial no histórico de auditoria
    await this.db.insert(schema.regulationStatusHistory).values({
      id: crypto.randomUUID(),
      requestId,
      previousStatus: null,
      newStatus: 'PENDENTE_REGULACAO',
      justification: 'Solicitação emitida na Unidade de Saúde da Atenção Primária',
      actionByUserId: user.id,
      createdAt: now.toISOString(),
    });

    // Salva anexos clínicos caso existam
    if (files && files.length > 0) {
      const attachments = [];
      for (const file of files) {
        const fileId = await this.storageService.uploadFile(file, data.patientId);
        attachments.push({
          id: crypto.randomUUID(),
          requestId,
          fileName: file.originalname,
          fileType: file.mimetype,
          fileUrl: `/storage/file/${fileId}`,
          fileSize: file.size,
          createdAt: now.toISOString(),
        });
      }
      await this.db.insert(schema.regulationRequestAttachments).values(attachments);
    }

    // Notificação em tempo real via WebSocket
    this.eventsGateway.server?.emit('regulation_updated', {
      type: 'REQUEST_CREATED',
      requestId,
      protocolNumber,
      patientId: data.patientId,
      healthCenterId,
    });

    return this.findOne(requestId);
  }

  async findRequestsByHealthCenter(healthCenterId: string | null | undefined, query: any) {
    const conditions = [];

    if (healthCenterId) {
      conditions.push(eq(schema.regulationRequests.requestingHealthCenterId, healthCenterId));
    }

    if (query.status) {
      conditions.push(eq(schema.regulationRequests.status, query.status));
    }
    if (query.type) {
      conditions.push(eq(schema.regulationRequests.type, query.type));
    }

    const items = await this.db.query.regulationRequests.findMany({
      where: conditions.length > 0 ? and(...conditions) : undefined,
      with: {
        patient: {
          columns: { id: true, name: true, cpf: true, cns: true, birthDate: true, gender: true },
        },
        specialty: { columns: { id: true, name: true } },
        procedure: { columns: { id: true, code: true, name: true } },
        procedureGroup: { columns: { id: true, name: true } },
        executingHealthCenter: { columns: { id: true, name: true, cnes: true } },
        attachments: true,
        statusHistory: {
          with: { actionByUser: { columns: { id: true, name: true } } },
          orderBy: [desc(schema.regulationStatusHistory.createdAt)],
        },
      },
      orderBy: [desc(schema.regulationRequests.createdAt)],
    });

    return { data: items, total: items.length };
  }

  async resubmitReturnedRequest(id: string, data: any, files: Express.Multer.File[], user: any) {
    const existing = await this.findOne(id);
    if (!existing) throw new NotFoundException('Solicitação não encontrada');
    if (existing.status !== 'DEVOLVIDA') {
      throw new BadRequestException('Apenas solicitações com status DEVOLVIDA podem ser reenviadas para reavaliação');
    }
    if (!data.justification || data.justification.trim().length < 5) {
      throw new BadRequestException('Justificativa das alterações e correções é obrigatória');
    }

    const now = new Date();

    await this.db.update(schema.regulationRequests)
      .set({
        clinicalJustification: data.clinicalJustification ? data.clinicalJustification.trim() : existing.clinicalJustification,
        clinicalHistory: data.clinicalHistory ? data.clinicalHistory.trim() : existing.clinicalHistory,
        cid10: data.cid10 ? data.cid10.trim() : existing.cid10,
        priority: data.priority || existing.priority,
        specialtyId: data.specialtyId || existing.specialtyId,
        procedureId: data.procedureId || existing.procedureId,
        procedureGroupId: data.procedureGroupId || existing.procedureGroupId,
        status: 'PENDENTE_REGULACAO',
        updatedAt: now.toISOString(),
      })
      .where(eq(schema.regulationRequests.id, id));

    // Grava histórico de auditoria
    await this.db.insert(schema.regulationStatusHistory).values({
      id: crypto.randomUUID(),
      requestId: id,
      previousStatus: 'DEVOLVIDA',
      newStatus: 'PENDENTE_REGULACAO',
      justification: data.justification.trim(),
      actionByUserId: user.id,
      createdAt: now.toISOString(),
    });

    // Anexa novos arquivos caso enviados
    if (files && files.length > 0) {
      const attachments = [];
      for (const file of files) {
        const fileId = await this.storageService.uploadFile(file, existing.patientId);
        attachments.push({
          id: crypto.randomUUID(),
          requestId: id,
          fileName: file.originalname,
          fileType: file.mimetype,
          fileUrl: `/storage/file/${fileId}`,
          fileSize: file.size,
          createdAt: now.toISOString(),
        });
      }
      await this.db.insert(schema.regulationRequestAttachments).values(attachments);
    }

    this.eventsGateway.server?.emit('regulation_updated', {
      type: 'REQUEST_RESUBMITTED',
      requestId: id,
      status: 'PENDENTE_REGULACAO',
    });

    return this.findOne(id);
  }

  async cancelBySolicitor(id: string, justification: string, user: any) {
    if (!justification || justification.trim().length < 5) {
      throw new BadRequestException('Justificativa do cancelamento é obrigatória');
    }

    const existing = await this.findOne(id);
    if (!existing) throw new NotFoundException('Solicitação não encontrada');
    if (existing.status === 'CANCELADA' || existing.status === 'NEGADA') {
      throw new BadRequestException('Esta solicitação já se encontra encerrada');
    }

    const now = new Date();

    await this.db.update(schema.regulationRequests)
      .set({
        status: 'CANCELADA',
        updatedAt: now.toISOString(),
      })
      .where(eq(schema.regulationRequests.id, id));

    await this.db.insert(schema.regulationStatusHistory).values({
      id: crypto.randomUUID(),
      requestId: id,
      previousStatus: existing.status,
      newStatus: 'CANCELADA',
      justification: justification.trim(),
      actionByUserId: user.id,
      createdAt: now.toISOString(),
    });

    this.eventsGateway.server?.emit('regulation_updated', {
      type: 'REQUEST_CANCELLED',
      requestId: id,
      status: 'CANCELADA',
    });

    return { message: 'Solicitação cancelada com sucesso' };
  }

  // =========================================================================
  // MÓDULO CENTRAL DE REGULAÇÃO MUNICIPAL (REGULADOR)
  // =========================================================================

  async findInbox(query: any) {
    const conditions: any[] = [];

    if (query.status) {
      conditions.push(eq(schema.regulationRequests.status, query.status));
    }
    if (query.type) {
      conditions.push(eq(schema.regulationRequests.type, query.type));
    }
    if (query.priority) {
      conditions.push(eq(schema.regulationRequests.priority, query.priority));
    }
    if (query.requestingHealthCenterId) {
      conditions.push(eq(schema.regulationRequests.requestingHealthCenterId, query.requestingHealthCenterId));
    }
    if (query.executingHealthCenterId) {
      conditions.push(eq(schema.regulationRequests.executingHealthCenterId, query.executingHealthCenterId));
    }

    const items = await this.db.query.regulationRequests.findMany({
      where: conditions.length > 0 ? and(...conditions) : undefined,
      with: {
        patient: {
          columns: { id: true, name: true, cpf: true, cns: true, birthDate: true, gender: true },
        },
        requestingHealthCenter: { columns: { id: true, name: true, cnes: true } },
        requestingUser: { columns: { id: true, name: true } },
        specialty: { columns: { id: true, name: true } },
        procedure: { columns: { id: true, code: true, name: true } },
        procedureGroup: { columns: { id: true, name: true } },
        executingHealthCenter: { columns: { id: true, name: true, cnes: true } },
        scheduledByUser: { columns: { id: true, name: true } },
        attachments: true,
        statusHistory: {
          with: { actionByUser: { columns: { id: true, name: true } } },
          orderBy: [desc(schema.regulationStatusHistory.createdAt)],
        },
      },
      orderBy: [desc(schema.regulationRequests.createdAt)],
    });

    // Se houver busca por texto (protocolo, nome ou cpf do paciente)
    let filtered = items;
    if (query.search && query.search.trim()) {
      const s = query.search.trim().toLowerCase();
      filtered = items.filter((item: any) =>
        (item.protocolNumber || '').toLowerCase().includes(s) ||
        (item.confirmationToken || '').toLowerCase().includes(s) ||
        (item.patient?.name || '').toLowerCase().includes(s) ||
        (item.patient?.cpf || '').includes(s) ||
        (item.patient?.cns || '').includes(s)
      );
    }

    return { data: filtered, total: filtered.length };
  }

  async evaluateRequest(
    id: string,
    decision: 'AUTORIZAR' | 'DEVOLVER' | 'NEGAR',
    justification: string,
    adjustedPriority: any,
    user: any
  ) {
    if (!justification || justification.trim().length < 5) {
      throw new BadRequestException('A justificativa da avaliação é estritamente obrigatória');
    }

    const existing = await this.findOne(id);
    if (!existing) throw new NotFoundException('Solicitação não encontrada');
    if (existing.status !== 'PENDENTE_REGULACAO') {
      throw new BadRequestException(`Esta solicitação está com status ${existing.status} e não pode ser avaliada`);
    }

    let newStatus: any = 'PENDENTE_AGENDAMENTO';
    if (decision === 'DEVOLVER') newStatus = 'DEVOLVIDA';
    else if (decision === 'NEGAR') newStatus = 'NEGADA';

    const now = new Date();

    await this.db.update(schema.regulationRequests)
      .set({
        status: newStatus,
        priority: adjustedPriority || existing.priority,
        updatedAt: now.toISOString(),
      })
      .where(eq(schema.regulationRequests.id, id));

    await this.db.insert(schema.regulationStatusHistory).values({
      id: crypto.randomUUID(),
      requestId: id,
      previousStatus: 'PENDENTE_REGULACAO',
      newStatus,
      justification: justification.trim(),
      actionByUserId: user.id,
      createdAt: now.toISOString(),
    });

    this.eventsGateway.server?.emit('regulation_updated', {
      type: 'REQUEST_EVALUATED',
      requestId: id,
      decision,
      newStatus,
    });

    return this.findOne(id);
  }

  async scheduleRequest(id: string, payload: any, user: any) {
    const { executingHealthCenterId, targetDate, targetTime, quotaId, justification } = payload;

    if (!executingHealthCenterId) throw new BadRequestException('Unidade executante é obrigatória');
    if (!targetDate) throw new BadRequestException('Data do agendamento é obrigatória');
    if (!justification || justification.trim().length < 5) {
      throw new BadRequestException('Justificativa do agendamento é obrigatória');
    }

    const existing = await this.findOne(id);
    if (!existing) throw new NotFoundException('Solicitação não encontrada');
    if (existing.status !== 'PENDENTE_AGENDAMENTO' && existing.status !== 'AGENDAMENTO_CANCELADO') {
      throw new BadRequestException(`Apenas solicitações autorizadas podem ser agendadas (status atual: ${existing.status})`);
    }

    // Gera token alfanumérico único para confirmação
    let confirmationToken = generateConfirmationToken();
    let isUnique = false;
    while (!isUnique) {
      const collision = await this.db.select().from(schema.regulationRequests).where(eq(schema.regulationRequests.confirmationToken, confirmationToken));
      if (collision.length === 0) isUnique = true;
      else confirmationToken = generateConfirmationToken();
    }

    const now = new Date();

    // Se vinculado a uma cota de vagas, incrementa vagas reservadas
    if (quotaId) {
      await this.db.update(schema.regulationQuotas)
        .set({ reservedSlots: sql`${schema.regulationQuotas.reservedSlots} + 1` })
        .where(eq(schema.regulationQuotas.id, quotaId));
    }

    await this.db.update(schema.regulationRequests)
      .set({
        executingHealthCenterId,
        scheduledDate: targetDate,
        scheduledTime: targetTime || '08:00',
        confirmationToken,
        scheduledByUserId: user.id,
        status: 'AGENDADA',
        updatedAt: now.toISOString(),
      })
      .where(eq(schema.regulationRequests.id, id));

    await this.db.insert(schema.regulationStatusHistory).values({
      id: crypto.randomUUID(),
      requestId: id,
      previousStatus: existing.status,
      newStatus: 'AGENDADA',
      justification: `${justification.trim()} (Chave de Confirmação: ${confirmationToken})`,
      actionByUserId: user.id,
      createdAt: now.toISOString(),
    });

    this.eventsGateway.server?.emit('regulation_updated', {
      type: 'REQUEST_SCHEDULED',
      requestId: id,
      confirmationToken,
      targetDate,
      executingHealthCenterId,
    });

    return this.findOne(id);
  }

  async cancelSchedule(id: string, payload: any, user: any) {
    const { justification, returnToQueue } = payload;
    if (!justification || justification.trim().length < 5) {
      throw new BadRequestException('Justificativa para cancelamento do agendamento é obrigatória');
    }

    const existing = await this.findOne(id);
    if (!existing) throw new NotFoundException('Solicitação não encontrada');
    if (existing.status !== 'AGENDADA') {
      throw new BadRequestException('Apenas solicitações agendadas podem ter o agendamento cancelado');
    }

    const now = new Date();
    const newStatus = returnToQueue ? 'PENDENTE_AGENDAMENTO' : 'AGENDAMENTO_CANCELADO';

    await this.db.update(schema.regulationRequests)
      .set({
        status: newStatus,
        confirmationToken: null,
        scheduledDate: null,
        scheduledTime: null,
        updatedAt: now.toISOString(),
      })
      .where(eq(schema.regulationRequests.id, id));

    await this.db.insert(schema.regulationStatusHistory).values({
      id: crypto.randomUUID(),
      requestId: id,
      previousStatus: 'AGENDADA',
      newStatus,
      justification: justification.trim(),
      actionByUserId: user.id,
      createdAt: now.toISOString(),
    });

    this.eventsGateway.server?.emit('regulation_updated', {
      type: 'SCHEDULE_CANCELLED',
      requestId: id,
      newStatus,
    });

    return this.findOne(id);
  }

  // =========================================================================
  // VALIDAÇÃO DA CHAVE DE CONFIRMAÇÃO (MÓDULO EXECUTANTE)
  // =========================================================================

  async validateToken(token: string, executingHealthCenterId: string, user: any) {
    const cleanToken = (token || '').trim().toUpperCase();
    if (!cleanToken) throw new BadRequestException('Chave de confirmação é obrigatória');

    const [request] = await this.db.select().from(schema.regulationRequests).where(eq(schema.regulationRequests.confirmationToken, cleanToken));
    if (!request) {
      throw new NotFoundException('Chave de confirmação não encontrada ou inválida');
    }

    if (request.status !== 'AGENDADA') {
      throw new BadRequestException(`Esta solicitação não está mais ativa para atendimento (status: ${request.status})`);
    }

    const now = new Date();

    // Marca a chave como validada
    await this.db.update(schema.regulationRequests)
      .set({
        tokenValidatedAt: now.toISOString(),
        tokenValidatedByUserId: user.id,
        updatedAt: now.toISOString(),
      })
      .where(eq(schema.regulationRequests.id, request.id));

    this.eventsGateway.server?.emit('regulation_updated', {
      type: 'TOKEN_VALIDATED',
      requestId: request.id,
      token: cleanToken,
    });

    return this.findOne(request.id);
  }

  // =========================================================================
  // GESTÃO DE COTAS DAS EXECUTANTES
  // =========================================================================

  async findQuotas(query: any) {
    const conditions: any[] = [];
    if (query.executingHealthCenterId) {
      conditions.push(eq(schema.regulationQuotas.executingHealthCenterId, query.executingHealthCenterId));
    }
    if (query.targetDate) {
      conditions.push(eq(schema.regulationQuotas.targetDate, query.targetDate));
    }

    const items = await this.db.query.regulationQuotas.findMany({
      where: conditions.length > 0 ? and(...conditions) : undefined,
      with: {
        executingHealthCenter: { columns: { id: true, name: true, cnes: true } },
        specialty: { columns: { id: true, name: true } },
        procedure: { columns: { id: true, code: true, name: true } },
        doctor: { columns: { id: true, name: true } },
      },
      orderBy: [desc(schema.regulationQuotas.targetDate)],
    });

    return items;
  }

  async createQuota(data: any) {
    if (!data.executingHealthCenterId) throw new BadRequestException('Unidade executante é obrigatória');
    if (!data.type) throw new BadRequestException('Tipo é obrigatório');
    if (!data.targetDate) throw new BadRequestException('Data alvo é obrigatória');
    if (!data.startTime) throw new BadRequestException('Horário inicial é obrigatório');

    const [newQuota] = await this.db.insert(schema.regulationQuotas).values({
      id: crypto.randomUUID(),
      executingHealthCenterId: data.executingHealthCenterId,
      type: data.type,
      specialtyId: data.specialtyId || null,
      procedureId: data.procedureId || null,
      doctorId: data.doctorId || null,
      targetDate: data.targetDate,
      startTime: data.startTime,
      endTime: data.endTime || null,
      intervalMinutes: data.intervalMinutes || 20,
      totalSlots: data.totalSlots || 10,
      reservedSlots: 0,
      isActive: true,
      createdAt: new Date().toISOString(),
    }).returning();

    return newQuota;
  }

  // =========================================================================
  // CONSULTA DETALHADA
  // =========================================================================

  async findOne(id: string) {
    const item = await this.db.query.regulationRequests.findFirst({
      where: eq(schema.regulationRequests.id, id),
      with: {
        patient: {
          columns: { id: true, name: true, cpf: true, cns: true, birthDate: true, gender: true, address: true },
        },
        requestingHealthCenter: { columns: { id: true, name: true, cnes: true } },
        requestingUser: { columns: { id: true, name: true, email: true } },
        attendingDoctor: { columns: { id: true, name: true } },
        specialty: { columns: { id: true, name: true } },
        procedure: { columns: { id: true, code: true, name: true } },
        procedureGroup: { columns: { id: true, name: true } },
        executingHealthCenter: { columns: { id: true, name: true, cnes: true } },
        scheduledByUser: { columns: { id: true, name: true } },
        tokenValidatedByUser: { columns: { id: true, name: true } },
        attachments: true,
        statusHistory: {
          with: { actionByUser: { columns: { id: true, name: true } } },
          orderBy: [desc(schema.regulationStatusHistory.createdAt)],
        },
      },
    });

    if (!item) throw new NotFoundException('Solicitação de regulação não encontrada');
    return item;
  }
}
