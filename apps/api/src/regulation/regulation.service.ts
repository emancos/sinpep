import { Injectable, Inject, NotFoundException, BadRequestException, ForbiddenException, OnModuleInit } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../database';
import { eq, desc, asc, and, or, ilike, inArray, sql } from 'drizzle-orm';
import * as crypto from 'crypto';
import { StorageService } from '../storage/storage.service';
import { EventsGateway } from '../events/events.gateway';
import { extractLinkedHealthCenterIds } from '../auth/utils/role-scope.util';
import {
  buildAnamnesisChanges,
  PatientEditOrigin,
  recordPatientEditHistory,
} from '../patients/patient-history.helper';
import {
  getEffectiveReturnEditableFields,
  normalizeReturnEditableFields,
  RETURN_EDITABLE_FIELD_LABELS,
  ReturnEditableField,
} from './regulation-return-fields';

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
export class RegulationService implements OnModuleInit {
  constructor(
    @Inject('DATABASE_CONNECTION')
    private readonly db: NodePgDatabase<typeof schema>,
    private readonly storageService: StorageService,
    private readonly eventsGateway: EventsGateway,
  ) {}

  async onModuleInit() {
    try {
      // Reconciliação automática de slots presos com solicitações canceladas ou não-agendadas
      await this.db.execute(sql`
        UPDATE schedule_slots
        SET status = 'DISPONIVEL',
            regulation_request_id = NULL,
            patient_id = NULL,
            booked_by_user_id = NULL,
            booked_at = NULL,
            updated_at = NOW()
        WHERE status = 'AGENDADO'
          AND regulation_request_id IS NOT NULL
          AND regulation_request_id NOT IN (
            SELECT id FROM regulation_requests WHERE status = 'AGENDADA'
          );
      `);
    } catch (err) {
      console.warn('[RegulationService] Aviso na reconciliação automática de slots:', err);
    }
  }

  private async syncPatientAnamnesisWithHistory(
    patientId: string,
    rawAnamnesis: unknown,
    user: any,
    origin: PatientEditOrigin,
    now: Date,
  ) {
    const anamnesis = typeof rawAnamnesis === 'string' ? JSON.parse(rawAnamnesis) : (rawAnamnesis as any);
    if (!anamnesis || typeof anamnesis !== 'object') return;

    const existingAnamnesis = await this.db.query.patientAnamnesis.findFirst({
      where: eq(schema.patientAnamnesis.patientId, patientId),
    });

    const anamnesisValues = {
      isHypertensive: anamnesis.isHypertensive ?? false,
      isDiabetic: anamnesis.isDiabetic ?? false,
      isSmoker: anamnesis.isSmoker ?? false,
      otherDiseases: anamnesis.otherDiseases ?? null,
      isOncological: anamnesis.isOncological ?? false,
      oncologicalStage: anamnesis.oncologicalStage ?? null,
      allergies: anamnesis.allergies ?? null,
      isPcd: anamnesis.isPcd ?? false,
      pcdDescription: anamnesis.pcdDescription ?? null,
      continuousMedications: Array.isArray(anamnesis.continuousMedications)
        ? anamnesis.continuousMedications
        : [],
      bloodPressure: anamnesis.bloodPressure ?? null,
      glycemia: anamnesis.glycemia ?? null,
      weight: anamnesis.weight ?? null,
      height: anamnesis.height ?? null,
      updatedAt: now.toISOString(),
    };

    if (existingAnamnesis) {
      await this.db.update(schema.patientAnamnesis)
        .set(anamnesisValues)
        .where(eq(schema.patientAnamnesis.patientId, patientId));
    } else {
      await this.db.insert(schema.patientAnamnesis).values({
        id: crypto.randomUUID(),
        patientId,
        ...anamnesisValues,
        createdAt: now.toISOString(),
      });
    }

    const changes = buildAnamnesisChanges(existingAnamnesis, anamnesisValues);
    await recordPatientEditHistory(this.db, {
      patientId,
      user,
      origin,
      changes,
    });
  }

  private parseIdList(input: unknown): string[] {
    if (!input) return [];
    let raw = input;
    if (typeof input === 'string') {
      const trimmed = input.trim();
      if (!trimmed) return [];
      try {
        raw = JSON.parse(trimmed);
      } catch {
        raw = trimmed.split(',').map((s) => s.trim()).filter(Boolean);
      }
    }
    return Array.isArray(raw) ? Array.from(new Set(raw.filter((id): id is string => typeof id === 'string' && id.trim().length > 0))) : [];
  }

  private async resolveGroupProceduresPayload(
    rawGroupProcedures: unknown,
    rawProcedureIds: unknown,
  ): Promise<Array<{ procedureId?: string; code: string; sigtapCode?: string; name: string }>> {
    type GroupProcEntry = { procedureId?: string; code: string; sigtapCode?: string; name: string };

    let candidates: Array<Partial<GroupProcEntry>> = [];
    if (rawGroupProcedures !== undefined) {
      let parsed: unknown = rawGroupProcedures;
      if (typeof rawGroupProcedures === 'string') {
        const trimmed = rawGroupProcedures.trim();
        if (!trimmed) {
          parsed = [];
        } else {
          try {
            parsed = JSON.parse(trimmed);
          } catch {
            throw new BadRequestException('Lista de procedimentos do grupo inválida');
          }
        }
      }
      if (!Array.isArray(parsed)) {
        throw new BadRequestException('Lista de procedimentos do grupo inválida');
      }
      candidates = parsed
        .filter((item): item is Record<string, any> => Boolean(item && typeof item === 'object'))
        .map((item) => ({
          ...(typeof item.procedureId === 'string' && item.procedureId.trim()
            ? { procedureId: item.procedureId.trim() }
            : {}),
          code: typeof item.code === 'string' ? item.code.trim() : '',
          ...(typeof item.sigtapCode === 'string' && item.sigtapCode.trim()
            ? { sigtapCode: item.sigtapCode.trim() }
            : {}),
          name: typeof item.name === 'string' ? item.name.trim() : '',
        }));
    } else if (rawProcedureIds !== undefined) {
      const ids = this.parseIdList(rawProcedureIds);
      candidates = ids.map((procedureId) => ({
        procedureId,
        code: '',
        name: '',
      }));
    }

    const lookupIds = Array.from(
      new Set(candidates.map((item) => item.procedureId).filter((pid): pid is string => Boolean(pid))),
    );

    const dbProcMap = new Map<string, { id: string; code: string | null; name: string }>();
    if (lookupIds.length > 0) {
      const dbRows = await this.db
        .select({
          id: schema.procedures.id,
          code: schema.procedures.code,
          name: schema.procedures.name,
        })
        .from(schema.procedures)
        .where(inArray(schema.procedures.id, lookupIds));

      for (const row of dbRows) {
        dbProcMap.set(row.id, row);
      }
    }

    const resolved: GroupProcEntry[] = [];
    const seenKeys = new Set<string>();
    for (const candidate of candidates) {
      const dbRow = candidate.procedureId ? dbProcMap.get(candidate.procedureId) : undefined;
      const code = candidate.code || dbRow?.code || '';
      const name = candidate.name || dbRow?.name || '';
      if (!candidate.procedureId && !code && !name) continue;

      const dedupeKey = candidate.procedureId
        ? `id:${candidate.procedureId}`
        : `text:${code.toUpperCase()}::${name.toUpperCase()}`;
      if (seenKeys.has(dedupeKey)) continue;
      seenKeys.add(dedupeKey);

      resolved.push({
        ...(candidate.procedureId ? { procedureId: candidate.procedureId } : {}),
        code,
        ...(candidate.sigtapCode ? { sigtapCode: candidate.sigtapCode } : {}),
        name,
      });
    }

    return resolved;
  }

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

    // Atualiza ou insere anamnese de qualquer paciente do município ao criar solicitação
    if (data.anamnesis) {
      try {
        await this.syncPatientAnamnesisWithHistory(data.patientId, data.anamnesis, user, 'REGULATION_CREATE', now);
      } catch (e) {
        console.error('Erro ao sincronizar anamnese na regulação:', e);
      }
    }

    // Prepara anexos clínicos caso existam (upload uma única vez no storage)
    const uploadedAttachments: Array<{
      fileName: string;
      fileType: string;
      fileUrl: string;
      fileSize: number;
    }> = [];

    if (files && files.length > 0) {
      for (const file of files) {
        const fileId = await this.storageService.uploadFile(file, data.patientId);
        uploadedAttachments.push({
          fileName: file.originalname,
          fileType: file.mimetype,
          fileUrl: `/storage/file/${fileId}`,
          fileSize: file.size,
        });
      }
    }

    // Parsing dos procedimentos enviados (suporte a múltiplos exames/procedimentos do mesmo grupo)
    let procedureIds: string[] = [];
    if (data.procedureIds) {
      try {
        const parsed = typeof data.procedureIds === 'string' ? JSON.parse(data.procedureIds) : data.procedureIds;
        if (Array.isArray(parsed)) {
          procedureIds = parsed.filter(Boolean);
        }
      } catch (e) {
        procedureIds = [];
      }
    }
    if (procedureIds.length === 0 && data.procedureId) {
      procedureIds = [data.procedureId];
    }

    // Se múltiplos procedimentos foram selecionados para o mesmo grupo
    if (procedureIds.length > 1) {
      const createdRequests: any[] = [];

      for (let i = 0; i < procedureIds.length; i++) {
        const currentProcId = procedureIds[i];
        const currentReqId = crypto.randomUUID();
        const itemProtocol = `${protocolNumber}/${String(i + 1).padStart(2, '0')}`;

        const [created] = await this.db.insert(schema.regulationRequests).values({
          id: currentReqId,
          protocolNumber: itemProtocol,
          patientId: data.patientId,
          requestingHealthCenterId: healthCenterId,
          requestingUserId: user.id,
          attendingDoctorId: data.attendingDoctorId || null,

          type: data.type,
          specialtyId: data.specialtyId || null,
          procedureId: currentProcId,
          procedureGroupId: data.procedureGroupId || null,

          cid10: data.cid10.trim(),
          clinicalJustification: data.clinicalJustification.trim(),
          clinicalHistory: data.clinicalHistory ? data.clinicalHistory.trim() : null,
          priority: data.priority || 'ELETIVO',
          status: 'PENDENTE_REGULACAO',

          createdAt: now.toISOString(),
          updatedAt: now.toISOString(),
        }).returning();

        // Registra histórico inicial
        await this.db.insert(schema.regulationStatusHistory).values({
          id: crypto.randomUUID(),
          requestId: currentReqId,
          previousStatus: null,
          newStatus: 'PENDENTE_REGULACAO',
          justification: `Solicitação emitida na Atenção Primária (${i + 1}/${procedureIds.length} do protocolo ${protocolNumber})`,
          actionByUserId: user.id,
          createdAt: now.toISOString(),
        });

        // Associa os anexos pré-armazenados
        if (uploadedAttachments.length > 0) {
          const attachments = uploadedAttachments.map((att) => ({
            id: crypto.randomUUID(),
            requestId: currentReqId,
            ...att,
            createdAt: now.toISOString(),
          }));
          await this.db.insert(schema.regulationRequestAttachments).values(attachments);
        }

        // Evento WebSocket por solicitação
        this.eventsGateway.server?.emit('regulation_updated', {
          type: 'REQUEST_CREATED',
          requestId: currentReqId,
          protocolNumber: itemProtocol,
          patientId: data.patientId,
          healthCenterId,
        });

        createdRequests.push(created);
      }

      return this.findOne(createdRequests[0].id);
    }

    // Caso de procedimento único ou consulta médica
    const singleProcedureId = procedureIds.length === 1 ? procedureIds[0] : (data.procedureId || null);

    const [newRequest] = await this.db.insert(schema.regulationRequests).values({
      id: requestId,
      protocolNumber,
      patientId: data.patientId,
      requestingHealthCenterId: healthCenterId,
      requestingUserId: user.id,
      attendingDoctorId: data.attendingDoctorId || null,

      type: data.type,
      specialtyId: data.specialtyId || null,
      procedureId: singleProcedureId,
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
    if (uploadedAttachments.length > 0) {
      const attachments = uploadedAttachments.map((att) => ({
        id: crypto.randomUUID(),
        requestId,
        ...att,
        createdAt: now.toISOString(),
      }));
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

    const isAdmin = Array.isArray(user?.permissions) && user.permissions.includes('admin:access');
    if (!isAdmin) {
      const linkedCenterIds = extractLinkedHealthCenterIds(user);
      if (!linkedCenterIds.includes(existing.requestingHealthCenterId)) {
        throw new ForbiddenException(
          'Você só pode corrigir e reenviar solicitações vinculadas às suas Unidades de Saúde.',
        );
      }
    }

    if (!data.justification || data.justification.trim().length < 5) {
      throw new BadRequestException('Justificativa das alterações e correções é obrigatória');
    }

    const allowedFields = new Set<ReturnEditableField>(
      getEffectiveReturnEditableFields((existing as any).returnEditableFields),
    );
    const removeAttachmentIds = this.parseIdList(data.removeAttachmentIds);

    const attemptedForbidden: ReturnEditableField[] = [];
    if (
      (data.type !== undefined ||
        data.specialtyId !== undefined ||
        data.procedureId !== undefined ||
        data.procedureGroupId !== undefined ||
        data.procedureIds !== undefined ||
        data.groupProcedures !== undefined) &&
      !allowedFields.has('PROCEDURE')
    ) {
      attemptedForbidden.push('PROCEDURE');
    }
    if (data.priority !== undefined && !allowedFields.has('PRIORITY')) {
      attemptedForbidden.push('PRIORITY');
    }
    if (data.cid10 !== undefined && !allowedFields.has('CID10')) {
      attemptedForbidden.push('CID10');
    }
    if (data.clinicalJustification !== undefined && !allowedFields.has('CLINICAL_JUSTIFICATION')) {
      attemptedForbidden.push('CLINICAL_JUSTIFICATION');
    }
    if (data.clinicalHistory !== undefined && !allowedFields.has('CLINICAL_HISTORY')) {
      attemptedForbidden.push('CLINICAL_HISTORY');
    }
    if (data.anamnesis !== undefined && !allowedFields.has('ANAMNESIS')) {
      attemptedForbidden.push('ANAMNESIS');
    }
    if (((files && files.length > 0) || removeAttachmentIds.length > 0) && !allowedFields.has('ATTACHMENTS')) {
      attemptedForbidden.push('ATTACHMENTS');
    }

    if (attemptedForbidden.length > 0) {
      const labels = attemptedForbidden.map((f) => RETURN_EDITABLE_FIELD_LABELS[f]).join(', ');
      throw new ForbiddenException(
        `Edição não permitida para o(s) bloco(s) não indicado(s) na devolução: ${labels}.`,
      );
    }

    const now = new Date();
    const updateValues: Record<string, any> = {
      status: 'PENDENTE_REGULACAO',
      returnEditableFields: [],
      updatedAt: now.toISOString(),
    };

    if (allowedFields.has('PROCEDURE')) {
      if (data.type !== undefined) updateValues.type = data.type;
      if (data.specialtyId !== undefined) updateValues.specialtyId = data.specialtyId || null;
      if (data.procedureId !== undefined) updateValues.procedureId = data.procedureId || null;
      if (data.procedureGroupId !== undefined) updateValues.procedureGroupId = data.procedureGroupId || null;
      if (data.groupProcedures !== undefined || data.procedureIds !== undefined) {
        const resolvedGroupProcedures = await this.resolveGroupProceduresPayload(
          data.groupProcedures,
          data.procedureIds,
        );
        updateValues.groupProcedures = resolvedGroupProcedures;
        if (resolvedGroupProcedures.length > 0) {
          const primaryProcedureId =
            resolvedGroupProcedures.find((entry) => entry.procedureId)?.procedureId ||
            data.procedureId ||
            null;
          updateValues.procedureId = primaryProcedureId;
        }
      }
    }

    if (allowedFields.has('PRIORITY') && data.priority !== undefined) {
      updateValues.priority = data.priority;
    }

    if (allowedFields.has('CID10') && data.cid10 !== undefined) {
      const trimmedCid = String(data.cid10).trim();
      if (!trimmedCid) {
        throw new BadRequestException('CID-10 é obrigatório');
      }
      updateValues.cid10 = trimmedCid;
    }

    if (allowedFields.has('CLINICAL_JUSTIFICATION') && data.clinicalJustification !== undefined) {
      const trimmedJustification = String(data.clinicalJustification).trim();
      if (trimmedJustification.length < 5) {
        throw new BadRequestException('Justificativa clínica detalhada é obrigatória');
      }
      updateValues.clinicalJustification = trimmedJustification;
    }

    if (allowedFields.has('CLINICAL_HISTORY') && data.clinicalHistory !== undefined) {
      updateValues.clinicalHistory = String(data.clinicalHistory).trim() || null;
    }

    await this.db.update(schema.regulationRequests)
      .set(updateValues)
      .where(eq(schema.regulationRequests.id, id));

    if (allowedFields.has('ANAMNESIS') && data.anamnesis !== undefined) {
      await this.syncPatientAnamnesisWithHistory(
        existing.patientId,
        data.anamnesis,
        user,
        'REGULATION_RESUBMIT',
        now,
      );
    }

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

    if (allowedFields.has('ATTACHMENTS')) {
      if (removeAttachmentIds.length > 0) {
        await this.db
          .delete(schema.regulationRequestAttachments)
          .where(
            and(
              eq(schema.regulationRequestAttachments.requestId, id),
              inArray(schema.regulationRequestAttachments.id, removeAttachmentIds),
            ),
          );
      }

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

  /**
   * Identifica o escopo regulatório do usuário:
   * - Administradores e Reguladores Centrais Gerais possuem acesso irrestrito a todo o município.
   * - Reguladores locais são estritamente limitados aos procedimentos e grupos ofertados
   *   pela sua Unidade de Saúde ativa vinculada.
   */
  async checkRegulatorScope(user: any, activeHealthCenterId?: string) {
    if (!user) {
      return { isUnlimited: false, targetCenterId: null, offeredProcedureIds: [], offeredGroupIds: [] };
    }

    const isAdmin =
      user.profile?.name === 'Administrador' ||
      user.profile?.profilePermissions?.some((pp: any) => pp.permission?.name === 'admin:access') ||
      user.userProfiles?.some(
        (up: any) =>
          up.profile?.name === 'Administrador' ||
          up.profile?.profilePermissions?.some((pp: any) => pp.permission?.name === 'admin:access'),
      );

    if (isAdmin || user.isMunicipalRegulator) {
      return { isUnlimited: true, targetCenterId: null, offeredProcedureIds: [], offeredGroupIds: [] };
    }

    const targetCenterId = activeHealthCenterId || user.activeHealthCenterId || user.healthCenterId;
    if (!targetCenterId) {
      return { isUnlimited: false, targetCenterId: null, offeredProcedureIds: [], offeredGroupIds: [] };
    }

    const [procs, groups] = await Promise.all([
      this.db.query.healthCenterProcedures.findMany({
        where: and(
          eq(schema.healthCenterProcedures.healthCenterId, targetCenterId),
          eq(schema.healthCenterProcedures.isOffered, true),
        ),
        columns: { procedureId: true },
      }),
      this.db.query.healthCenterProcedureGroups.findMany({
        where: and(
          eq(schema.healthCenterProcedureGroups.healthCenterId, targetCenterId),
          eq(schema.healthCenterProcedureGroups.isOffered, true),
        ),
        columns: { procedureGroupId: true },
      }),
    ]);

    return {
      isUnlimited: false,
      targetCenterId,
      offeredProcedureIds: procs.map((p) => p.procedureId),
      offeredGroupIds: groups.map((g) => g.procedureGroupId),
    };
  }

  async assertRegulatorCanManageRequest(request: any, user: any, activeHealthCenterId?: string) {
    const scope = await this.checkRegulatorScope(user, activeHealthCenterId);
    if (scope.isUnlimited) return;

    if (!scope.targetCenterId) {
      throw new ForbiddenException(
        'Acesso negado: Usuário regulador não possui nenhuma unidade de saúde ativa vinculada.',
      );
    }

    const isExecuting = request.executingHealthCenterId && request.executingHealthCenterId === scope.targetCenterId;
    const isProcedureOffered = request.procedureId && scope.offeredProcedureIds.includes(request.procedureId);
    const isGroupOffered = request.procedureGroupId && scope.offeredGroupIds.includes(request.procedureGroupId);

    if (!isExecuting && !isProcedureOffered && !isGroupOffered) {
      throw new ForbiddenException(
        'Acesso negado: Este procedimento/exame não é ofertado pela sua unidade de saúde executante vinculada ativa.',
      );
    }
  }

  async getMyScope(user: any, requestedCenterId?: string) {
    const isAdmin =
      user?.profile?.name === 'Administrador' ||
      user?.profile?.profilePermissions?.some((pp: any) => pp.permission?.name === 'admin:access') ||
      user?.userProfiles?.some(
        (up: any) =>
          up.profile?.name === 'Administrador' ||
          up.profile?.profilePermissions?.some((pp: any) => pp.permission?.name === 'admin:access'),
      );

    const isMunicipalRegulator = Boolean(user?.isMunicipalRegulator);
    const activeCenterId = requestedCenterId || user?.activeHealthCenterId || user?.healthCenterId;

    let activeHealthCenter = null;
    let offeredProceduresCount = 0;
    let offeredProcedureGroupsCount = 0;

    if (activeCenterId) {
      const [hc, procs, groups] = await Promise.all([
        this.db.query.healthCenters.findFirst({
          where: eq(schema.healthCenters.id, activeCenterId),
          columns: { id: true, name: true, cnes: true },
        }),
        this.db.query.healthCenterProcedures.findMany({
          where: and(
            eq(schema.healthCenterProcedures.healthCenterId, activeCenterId),
            eq(schema.healthCenterProcedures.isOffered, true),
          ),
          columns: { procedureId: true },
        }),
        this.db.query.healthCenterProcedureGroups.findMany({
          where: and(
            eq(schema.healthCenterProcedureGroups.healthCenterId, activeCenterId),
            eq(schema.healthCenterProcedureGroups.isOffered, true),
          ),
          columns: { procedureGroupId: true },
        }),
      ]);
      activeHealthCenter = hc || null;
      offeredProceduresCount = procs.length;
      offeredProcedureGroupsCount = groups.length;
    }

    return {
      isMunicipalRegulator,
      isAdmin,
      activeHealthCenter,
      offeredProceduresCount,
      offeredProcedureGroupsCount,
    };
  }

  async findInbox(query: any, user?: any) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(query.limit) || 20));
    const offset = (page - 1) * limit;

    const conditions: any[] = [];

    // Escopo de Unidade vs Regulador Municipal
    const scope = await this.checkRegulatorScope(user, query.activeHealthCenterId);
    if (!scope.isUnlimited) {
      if (!scope.targetCenterId) {
        // Regulador sem unidade vinculada não visualiza solicitações
        conditions.push(sql`1 = 0`);
      } else {
        const scopeOr = [];
        if (scope.offeredProcedureIds.length > 0) {
          scopeOr.push(inArray(schema.regulationRequests.procedureId, scope.offeredProcedureIds));
        }
        if (scope.offeredGroupIds.length > 0) {
          scopeOr.push(inArray(schema.regulationRequests.procedureGroupId, scope.offeredGroupIds));
        }
        scopeOr.push(eq(schema.regulationRequests.executingHealthCenterId, scope.targetCenterId));

        if (scopeOr.length === 1) {
          conditions.push(scopeOr[0]);
        } else {
          conditions.push(or(...scopeOr));
        }
      }
    }

    if (query.status && query.status !== 'ALL') {
      conditions.push(eq(schema.regulationRequests.status, query.status));
    }
    if (query.type && query.type !== 'ALL') {
      conditions.push(eq(schema.regulationRequests.type, query.type));
    }
    if (query.priority && query.priority !== 'ALL') {
      conditions.push(eq(schema.regulationRequests.priority, query.priority));
    }
    if (query.requestingHealthCenterId && query.requestingHealthCenterId !== 'ALL') {
      conditions.push(eq(schema.regulationRequests.requestingHealthCenterId, query.requestingHealthCenterId));
    }
    if (query.executingHealthCenterId && query.executingHealthCenterId !== 'ALL') {
      conditions.push(eq(schema.regulationRequests.executingHealthCenterId, query.executingHealthCenterId));
    }

    // Busca SQL nativa abrangente (protocolo, paciente, CPF, CNS, procedimentos e grupos)
    if (query.search && query.search.trim()) {
      const s = `%${query.search.trim().toLowerCase()}%`;
      const cleanDigits = query.search.trim().replace(/\D/g, '');
      conditions.push(
        sql`(
          ${schema.regulationRequests.protocolNumber} ILIKE ${s}
          OR ${schema.regulationRequests.confirmationToken} ILIKE ${s}
          OR EXISTS (
            SELECT 1 FROM ${schema.patients} p 
            WHERE p.id = ${schema.regulationRequests.patientId} 
            AND (
              p.name ILIKE ${s}
              OR p.cpf ILIKE ${s}
              ${cleanDigits.length > 2 ? sql`OR regexp_replace(p.cpf, '\D', '', 'g') ILIKE ${'%' + cleanDigits + '%'}` : sql``}
              OR p.cns ILIKE ${s}
              ${cleanDigits.length > 2 ? sql`OR regexp_replace(p.cns, '\D', '', 'g') ILIKE ${'%' + cleanDigits + '%'}` : sql``}
            )
          )
          OR EXISTS (
            SELECT 1 FROM ${schema.procedures} pr 
            WHERE pr.id = ${schema.regulationRequests.procedureId} 
            AND (pr.name ILIKE ${s} OR pr.code ILIKE ${s})
          )
          OR EXISTS (
            SELECT 1 FROM ${schema.procedureGroups} pg 
            WHERE pg.id = ${schema.regulationRequests.procedureGroupId} 
            AND pg.name ILIKE ${s}
          )
          OR ${schema.regulationRequests.groupProcedures}::text ILIKE ${s}
        )`
      );
    }

    // Ordenação configurável por coluna
    const isAsc = query.sortOrder === 'asc';
    let orderClause = isAsc ? asc(schema.regulationRequests.createdAt) : desc(schema.regulationRequests.createdAt);
    if (query.sortBy === 'protocolNumber') {
      orderClause = isAsc ? asc(schema.regulationRequests.protocolNumber) : desc(schema.regulationRequests.protocolNumber);
    } else if (query.sortBy === 'priority') {
      orderClause = isAsc ? asc(schema.regulationRequests.priority) : desc(schema.regulationRequests.priority);
    } else if (query.sortBy === 'status') {
      orderClause = isAsc ? asc(schema.regulationRequests.status) : desc(schema.regulationRequests.status);
    } else if (query.sortBy === 'token') {
      orderClause = isAsc ? asc(schema.regulationRequests.confirmationToken) : desc(schema.regulationRequests.confirmationToken);
    }

    // Condições de base para o cálculo dos contadores das abas
    const countConditions: any[] = [];
    if (!scope.isUnlimited) {
      if (!scope.targetCenterId) {
        countConditions.push(sql`1 = 0`);
      } else {
        const scopeOr = [];
        if (scope.offeredProcedureIds.length > 0) {
          scopeOr.push(inArray(schema.regulationRequests.procedureId, scope.offeredProcedureIds));
        }
        if (scope.offeredGroupIds.length > 0) {
          scopeOr.push(inArray(schema.regulationRequests.procedureGroupId, scope.offeredGroupIds));
        }
        scopeOr.push(eq(schema.regulationRequests.executingHealthCenterId, scope.targetCenterId));

        if (scopeOr.length === 1) countConditions.push(scopeOr[0]);
        else countConditions.push(or(...scopeOr));
      }
    }
    if (query.requestingHealthCenterId && query.requestingHealthCenterId !== 'ALL') {
      countConditions.push(eq(schema.regulationRequests.requestingHealthCenterId, query.requestingHealthCenterId));
    }

    const [items, [totalRow], [countsRow]] = await Promise.all([
      this.db.query.regulationRequests.findMany({
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
        },
        orderBy: [orderClause],
        limit,
        offset,
      }),

      this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(schema.regulationRequests)
        .where(conditions.length > 0 ? and(...conditions) : undefined),

      this.db
        .select({
          total_all: sql<number>`count(*)::int`,
          to_evaluate: sql<number>`count(*) FILTER (WHERE ${schema.regulationRequests.status} = 'PENDENTE_REGULACAO')::int`,
          to_schedule: sql<number>`count(*) FILTER (WHERE ${schema.regulationRequests.status} = 'PENDENTE_AGENDAMENTO')::int`,
          scheduled: sql<number>`count(*) FILTER (WHERE ${schema.regulationRequests.status} = 'AGENDADA')::int`,
          returned: sql<number>`count(*) FILTER (WHERE ${schema.regulationRequests.status} = 'DEVOLVIDA')::int`,
          denied: sql<number>`count(*) FILTER (WHERE ${schema.regulationRequests.status} = 'NEGADA')::int`,
        })
        .from(schema.regulationRequests)
        .where(countConditions.length > 0 ? and(...countConditions) : undefined),
    ]);

    const c: any = countsRow || {};
    return {
      data: items,
      total: totalRow?.count || 0,
      page,
      limit,
      counts: {
        all: Number(c.total_all || 0),
        toEvaluate: Number(c.to_evaluate || 0),
        toSchedule: Number(c.to_schedule || 0),
        scheduled: Number(c.scheduled || 0),
        returned: Number(c.returned || 0),
        denied: Number(c.denied || 0),
      },
    };
  }

  async evaluateRequest(
    id: string,
    decision: 'AUTORIZAR' | 'DEVOLVER' | 'NEGAR',
    justification: string,
    adjustedPriority: any,
    user: any,
    activeHealthCenterId?: string,
    rawReturnEditableFields?: unknown,
  ) {
    if (!justification || justification.trim().length < 5) {
      throw new BadRequestException('A justificativa da avaliação é estritamente obrigatória');
    }

    let editableFields: ReturnEditableField[] = [];
    if (decision === 'DEVOLVER') {
      editableFields = normalizeReturnEditableFields(rawReturnEditableFields);
      if (editableFields.length === 0) {
        throw new BadRequestException(
          'Selecione pelo menos um campo/parte da solicitação que o solicitante deve corrigir.',
        );
      }
    }

    const existing = await this.findOne(id);
    if (!existing) throw new NotFoundException('Solicitação não encontrada');
    await this.assertRegulatorCanManageRequest(existing, user, activeHealthCenterId);

    if (existing.status !== 'PENDENTE_REGULACAO') {
      throw new BadRequestException(`Esta solicitação está com status ${existing.status} e não pode ser avaliada`);
    }

    let newStatus: any = 'PENDENTE_AGENDAMENTO';
    if (decision === 'DEVOLVER') newStatus = 'DEVOLVIDA';
    else if (decision === 'NEGAR') newStatus = 'NEGADA';

    const now = new Date();
    const finalPriority = adjustedPriority || existing.priority;

    let clinicalScore = (existing as any).clinicalScore || 0;
    let scoreBreakdown = (existing as any).scoreBreakdown;

    // Se aprovada para a fila de espera, calcula o Score Clínico imediatamente
    if (newStatus === 'PENDENTE_AGENDAMENTO') {
      const createdAt = new Date(existing.createdAt);
      const waitingDays = Math.max(0, Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24)));
      const waitingPoints = waitingDays * 1;
      const priorityPoints =
        finalPriority === 'URGENCIA' || (finalPriority as string) === 'URGENTE'
          ? 500
          : finalPriority === 'PRIORITARIO'
          ? 200
          : 0;

      let age = 0;
      if (existing.patient?.birthDate) {
        const birthDate = new Date(existing.patient.birthDate);
        age = Math.max(0, Math.floor((now.getTime() - birthDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25)));
      }
      const elderlyPoints = age >= 80 ? 300 : age >= 60 ? 100 : 0;
      clinicalScore = waitingPoints + priorityPoints + elderlyPoints;
      scoreBreakdown = {
        waitingDays,
        waitingPoints,
        priority: finalPriority,
        priorityPoints,
        age,
        elderlyPoints,
        pcdPoints: 0,
        totalScore: clinicalScore,
      };
    }

    await this.db.update(schema.regulationRequests)
      .set({
        status: newStatus,
        priority: finalPriority,
        returnEditableFields: decision === 'DEVOLVER' ? editableFields : [],
        clinicalScore,
        scoreBreakdown,
        updatedAt: now.toISOString(),
      })
      .where(eq(schema.regulationRequests.id, id));

    await this.db.insert(schema.regulationStatusHistory).values({
      id: crypto.randomUUID(),
      requestId: id,
      previousStatus: 'PENDENTE_REGULACAO',
      newStatus,
      justification: justification.trim(),
      editableFields: decision === 'DEVOLVER' ? editableFields : null,
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

  async changeProcedure(
    id: string,
    body: {
      newProcedureId?: string;
      newProcedureGroupId?: string;
      newType?: 'CONSULTA' | 'EXAME' | 'PROCEDIMENTO';
      newSpecialtyId?: string;
      justification: string;
      adjustedPriority?: any;
      adjustedCid10?: string;
    },
    user: any,
  ) {
    if (!body.justification || body.justification.trim().length < 5) {
      throw new BadRequestException('A justificativa da alteração de procedimento é obrigatória (mínimo de 5 caracteres).');
    }
    if (!body.newProcedureId && !body.newProcedureGroupId && !body.newSpecialtyId) {
      throw new BadRequestException('Informe o novo procedimento, grupo de procedimentos ou especialidade.');
    }

    const existing = await this.findOne(id);
    if (!existing) {
      throw new NotFoundException('Solicitação de regulação não encontrada');
    }
    await this.assertRegulatorCanManageRequest(existing, user, (body as any)?.activeHealthCenterId);

    if (existing.status === 'NEGADA' || existing.status === 'CANCELADA') {
      throw new BadRequestException(`Não é possível alterar o procedimento de uma solicitação com status ${existing.status}.`);
    }

    // Busca detalhes do novo procedimento para descrição no histórico
    let newProcName = 'Procedimento não especificado';
    let newProcCode = '';
    let procedureGroupId = body.newProcedureGroupId || null;

    if (body.newProcedureId) {
      const newProc = await this.db.query.procedures.findFirst({
        where: eq(schema.procedures.id, body.newProcedureId),
      });
      if (newProc) {
        newProcName = newProc.name;
        newProcCode = newProc.code || '';
        procedureGroupId = procedureGroupId || newProc.procedureGroupId || null;
      }
    } else if (body.newProcedureGroupId) {
      const group = await this.db.query.procedureGroups.findFirst({
        where: eq(schema.procedureGroups.id, body.newProcedureGroupId),
      });
      if (group) {
        newProcName = `[GRUPO] ${group.name}`;
      }
    } else if (body.newSpecialtyId) {
      const specialty = await this.db.query.specialties.findFirst({
        where: eq(schema.specialties.id, body.newSpecialtyId),
      });
      if (specialty) {
        newProcName = `[ESPECIALIDADE] ${specialty.name}`;
      }
    }

    // Descrição do procedimento anterior
    const prevProcDesc = existing.procedure
      ? `${existing.procedure.code ? existing.procedure.code + ' - ' : ''}${existing.procedure.name}`
      : existing.procedureGroup
      ? `[GRUPO] ${existing.procedureGroup.name}`
      : existing.specialty
      ? `[ESPECIALIDADE] ${existing.specialty.name}`
      : 'Não especificado';

    const newProcDesc = `${newProcCode ? newProcCode + ' - ' : ''}${newProcName}`;

    const now = new Date();

    // Se já estava agendada na escala, desfaz agendamento para evitar inconsistência clínica de agendamento em procedimento antigo
    let newStatus = existing.status;
    let scheduledWarning = '';
    if (existing.status === 'AGENDADA') {
      newStatus = 'PENDENTE_REGULACAO';
      scheduledWarning = ' (Atenção: O agendamento prévio na escala foi liberado/cancelado devido à substituição do procedimento)';

      // Libera vaga na escala
      await this.db
        .update(schema.scheduleSlots)
        .set({
          status: 'DISPONIVEL',
          regulationRequestId: null,
          patientId: null,
          bookedByUserId: null,
          bookedAt: null,
          updatedAt: now.toISOString(),
        })
        .where(eq(schema.scheduleSlots.regulationRequestId, existing.id));
    }

    // Atualiza a solicitação
    await this.db
      .update(schema.regulationRequests)
      .set({
        type: body.newType || existing.type,
        procedureId: body.newProcedureId || null,
        procedureGroupId: procedureGroupId,
        specialtyId: body.newSpecialtyId || existing.specialtyId,
        priority: body.adjustedPriority || existing.priority,
        cid10: body.adjustedCid10 ? body.adjustedCid10.trim() : existing.cid10,
        status: newStatus,
        scheduledDate: existing.status === 'AGENDADA' ? null : existing.scheduledDate,
        scheduledTime: existing.status === 'AGENDADA' ? null : existing.scheduledTime,
        confirmationToken: existing.status === 'AGENDADA' ? null : existing.confirmationToken,
        updatedAt: now.toISOString(),
      })
      .where(eq(schema.regulationRequests.id, id));

    // Formata o registro do histórico de auditoria
    const historyText = `ALTERAÇÃO DE PROCEDIMENTO: De "${prevProcDesc}" para "${newProcDesc}". Justificativa do Regulador: ${body.justification.trim()}${scheduledWarning}`;

    await this.db.insert(schema.regulationStatusHistory).values({
      id: crypto.randomUUID(),
      requestId: id,
      previousStatus: existing.status,
      newStatus: newStatus,
      justification: historyText,
      actionByUserId: user.id,
      createdAt: now.toISOString(),
    });

    // Notificação em tempo real via WebSocket
    this.eventsGateway.server?.emit('regulation_updated', {
      type: 'PROCEDURE_CHANGED',
      requestId: id,
      protocolNumber: existing.protocolNumber,
      previousProcedure: prevProcDesc,
      newProcedure: newProcDesc,
      justification: body.justification.trim(),
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
    await this.assertRegulatorCanManageRequest(existing, user, payload?.activeHealthCenterId);

    const scope = await this.checkRegulatorScope(user, payload?.activeHealthCenterId);
    if (!scope.isUnlimited && scope.targetCenterId && executingHealthCenterId !== scope.targetCenterId) {
      throw new ForbiddenException(
        'Acesso negado: Um regulador de unidade só pode agendar vagas para sua própria unidade executante vinculada ativa.',
      );
    }

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

    // Atualiza cota consumida da unidade solicitante (por procedimento ou grupo)
    if (existing.procedureId && executingHealthCenterId && existing.requestingHealthCenterId) {
      await this.db.update(schema.procedureSolicitorQuotas)
        .set({ usedQuota: sql`${schema.procedureSolicitorQuotas.usedQuota} + 1` })
        .where(
          and(
            eq(schema.procedureSolicitorQuotas.procedureId, existing.procedureId),
            eq(schema.procedureSolicitorQuotas.executingHealthCenterId, executingHealthCenterId),
            eq(schema.procedureSolicitorQuotas.solicitingHealthCenterId, existing.requestingHealthCenterId),
          ),
        );
    }

    if (existing.procedureGroupId && executingHealthCenterId && existing.requestingHealthCenterId) {
      await this.db.update(schema.procedureGroupSolicitorQuotas)
        .set({ usedQuota: sql`${schema.procedureGroupSolicitorQuotas.usedQuota} + 1` })
        .where(
          and(
            eq(schema.procedureGroupSolicitorQuotas.procedureGroupId, existing.procedureGroupId),
            eq(schema.procedureGroupSolicitorQuotas.executingHealthCenterId, executingHealthCenterId),
            eq(schema.procedureGroupSolicitorQuotas.solicitingHealthCenterId, existing.requestingHealthCenterId),
          ),
        );
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

    // Estorna cota consumida da unidade solicitante (por procedimento ou grupo)
    if (existing.procedureId && existing.executingHealthCenterId && existing.requestingHealthCenterId) {
      await this.db.update(schema.procedureSolicitorQuotas)
        .set({ usedQuota: sql`GREATEST(0, ${schema.procedureSolicitorQuotas.usedQuota} - 1)` })
        .where(
          and(
            eq(schema.procedureSolicitorQuotas.procedureId, existing.procedureId),
            eq(schema.procedureSolicitorQuotas.executingHealthCenterId, existing.executingHealthCenterId),
            eq(schema.procedureSolicitorQuotas.solicitingHealthCenterId, existing.requestingHealthCenterId),
          ),
        );
    }

    if (existing.procedureGroupId && existing.executingHealthCenterId && existing.requestingHealthCenterId) {
      await this.db.update(schema.procedureGroupSolicitorQuotas)
        .set({ usedQuota: sql`GREATEST(0, ${schema.procedureGroupSolicitorQuotas.usedQuota} - 1)` })
        .where(
          and(
            eq(schema.procedureGroupSolicitorQuotas.procedureGroupId, existing.procedureGroupId),
            eq(schema.procedureGroupSolicitorQuotas.executingHealthCenterId, existing.executingHealthCenterId),
            eq(schema.procedureGroupSolicitorQuotas.solicitingHealthCenterId, existing.requestingHealthCenterId),
          ),
        );
    }

    // Libera a vaga correspondente na tabela de slots da escala, caso exista
    await this.db
      .update(schema.scheduleSlots)
      .set({
        status: 'DISPONIVEL',
        regulationRequestId: null,
        patientId: null,
        bookedByUserId: null,
        bookedAt: null,
        updatedAt: now.toISOString(),
      })
      .where(eq(schema.scheduleSlots.regulationRequestId, id));

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

    this.eventsGateway.server?.emit('schedule_updated', {
      type: 'SLOT_FREED',
      requestId: id,
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
          with: { patientAnamnesis: true },
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
