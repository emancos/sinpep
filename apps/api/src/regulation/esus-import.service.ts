import { Injectable, Inject, Logger, NotFoundException } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../database';
import { DATABASE_CONNECTION } from '../database/database.constants';
import { eq, desc, sql, and, ilike, or } from 'drizzle-orm';
import * as crypto from 'crypto';

export interface EsusDocSource {
  coSolicitacao: string;
  coModulo?: number;
  noModulo?: string;
  dtIndexacao?: string;
  coProcedimentoInterno?: string;
  noProcedimentoInterno?: string;
  coProcedimentoSigtap?: string;
  coMunicipioCentralSolicitante?: string;
  noCentralSolicitante?: string;
  coUfCentralSolicitante?: number;
  sgUfCentralSolicitante?: string;
  coCnesEstabelecimentoSolicitante?: string;
  noEstabelecimentoSolicitante?: string;
  coClassificacaoRisco?: number;
  noClassificacaoRisco?: string;
  coSolicitacaoStatus?: number;
  noSolicitacaoStatus?: string;
  coCid?: string;
  noCid?: string;
  nuCpfProfissionalSolicitante?: string;
  nuCnsProfissionalSolicitante?: string;
  noProfissionalSolicitante?: string;
  nuCrmSolicitante?: string;
  stVisualizado?: boolean;
  stOncologico?: boolean;
  stIdoso?: boolean;
  stInfantil?: boolean;
  stJudicial?: boolean;
  dsDadosJudiciais?: string;
  stDiabetes?: boolean;
  stHipertenso?: boolean;
  stDeficiente?: boolean;
  stAlergico?: boolean;
  dsDeficiencia?: string;
  dsAlergia?: string;
  stTelessaude?: boolean;
  dsTelessaude?: string;
  dtAutorizacao?: string;
  dtConfirmacao?: string;
  dtCancelamento?: string;
  dtFalta?: string;
  dtPedidoMedico?: string;
  dtSolicitacao?: string;
  dtAgendamento?: string;
  dtMarcacao?: string;
  hrMarcacao?: string;
  pacienteNuCpf?: string;
  pacienteNuCns?: string;
  pacienteNome?: string;
  pacienteDtNascimento?: string;
  pacienteCoSexo?: string;
  pacienteNoMae?: string;
  pacienteNoPai?: string;
  pacienteEndereco?: string;
  pacienteBairro?: string;
  pacienteEnderecoComplemento?: string;
  pacienteCep?: string;
  pacienteNuLogradouro?: string;
  pacienteVivo?: boolean;
  pacienteDtObito?: string | null;
  pacienteNoMunicipioResidencia?: string;
  pacienteUfResidencia?: string;
  pacienteCartoes?: Array<{ tpCns?: string; nuCns?: string }>;
  pacienteTelefones?: Array<{
    nuDdd?: string;
    nuTelefone?: string;
    nuDdi?: string;
  }>;
  pacienteEmails?: Array<string | { dsEmail?: string; email?: string; noEmail?: string }>;
  procedimentos?: Array<{
    coProcedimentoInterno?: string;
    noProcedimentoInterno?: string;
    coProcedimentoSigtap?: string;
  }>;
  historicoStatus?: Array<{
    nuCpfOperador?: string;
    noOperador?: string;
    coSolicitacaoStatus?: number;
    noSolicitacaoStatus?: string;
    dsJustificativa?: string;
    dtHistorico?: string;
  }>;
}

export interface CreateImportJobDto {
  dateRangeStart?: string;
  dateRangeEnd?: string;
  totalRecordsFound?: number;
}

export interface ProcessBatchDto {
  jobId?: string;
  hits: Array<{ _id: string; _source: EsusDocSource }>;
}

/**
 * Retorna string ISO com data/hora local de São Paulo / Brasil (UTC-3)
 */
function getBrazilLocalIso(): string {
  const now = new Date();
  const spTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
  const yyyy = spTime.getFullYear();
  const mm = String(spTime.getMonth() + 1).padStart(2, '0');
  const dd = String(spTime.getDate()).padStart(2, '0');
  const hh = String(spTime.getHours()).padStart(2, '0');
  const min = String(spTime.getMinutes()).padStart(2, '0');
  const ss = String(spTime.getSeconds()).padStart(2, '0');
  const ms = String(spTime.getMilliseconds()).padStart(3, '0');
  return `${yyyy}-${mm}-${dd}T${hh}:${min}:${ss}.${ms}`;
}

/**
 * Formata número de telefone brasileiro nos formatos (XX) XXXXX-XXXX ou (XX) XXXX-XXXX
 */
function formatPhoneNumber(nuDdd?: string, nuTelefone?: string): string | null {
  const ddd = String(nuDdd || '').replace(/\D/g, '');
  const num = String(nuTelefone || '').replace(/\D/g, '');
  if (!num) return null;

  if (ddd) {
    if (num.length === 9) {
      return `(${ddd}) ${num.slice(0, 5)}-${num.slice(5)}`;
    }
    if (num.length === 8) {
      return `(${ddd}) ${num.slice(0, 4)}-${num.slice(4)}`;
    }
  }

  if (num.length === 11) {
    return `(${num.slice(0, 2)}) ${num.slice(2, 7)}-${num.slice(7)}`;
  }
  if (num.length === 10) {
    return `(${num.slice(0, 2)}) ${num.slice(2, 6)}-${num.slice(6)}`;
  }

  if (ddd && num) {
    return `(${ddd}) ${num}`;
  }

  return num;
}

/**
 * Extrai o primeiro endereço de e-mail válido da lista do e-SUS
 */
function extractEmail(pacienteEmails?: any[]): string | null {
  if (!Array.isArray(pacienteEmails) || pacienteEmails.length === 0) return null;
  for (const item of pacienteEmails) {
    if (typeof item === 'string' && item.includes('@')) {
      return item.trim().toLowerCase();
    }
    if (item && typeof item === 'object') {
      const email = item.dsEmail || item.email || item.noEmail;
      if (typeof email === 'string' && email.includes('@')) {
        return email.trim().toLowerCase();
      }
    }
  }
  return null;
}

@Injectable()
export class EsusImportService {
  private readonly logger = new Logger(EsusImportService.name);

  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  /**
   * Obtém as configurações e credenciais para o cliente frontend
   */
  getConfig() {
    const rawUrl = process.env.BASIC_URL || process.env.ESUS_API_URL || 'https://regulacao-api.saude.gov.br/regulacao-producao/_search';
    const rawAuth = process.env.BASIC_AUTHENTICATION || process.env.ESUS_API_SECRET || '';

    // Normaliza o cabeçalho Authorization
    const authorizationHeader = rawAuth.startsWith('Basic ') ? rawAuth : `Basic ${rawAuth}`;

    return {
      apiUrl: rawUrl,
      authorizationHeader,
      defaultStartDate: '2025-05-01',
      defaultEndDate: '2026-11-03',
      cityCode: '251390', // São Bento - PB
      cityName: 'SÃO BENTO',
    };
  }

  /**
   * Lista histórico de jobs de importação
   */
  async getJobs() {
    return this.db.query.esusImportJobs.findMany({
      orderBy: [desc(schema.esusImportJobs.startedAt)],
      with: {
        createdByUser: {
          columns: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  /**
   * Cria novo registro de job de importação
   */
  async createJob(dto: CreateImportJobDto, userId?: string) {
    const jobId = crypto.randomUUID();
    const [job] = await this.db
      .insert(schema.esusImportJobs)
      .values({
        id: jobId,
        status: 'RUNNING',
        dateRangeStart: dto.dateRangeStart || '2025-05-01',
        dateRangeEnd: dto.dateRangeEnd || '2026-11-03',
        totalRecordsFound: dto.totalRecordsFound || 0,
        totalRecordsProcessed: 0,
        patientsCreated: 0,
        patientsUpdated: 0,
        patientsDeceasedSkipped: 0,
        requestsCreated: 0,
        requestsUpdated: 0,
        requestsSkippedStatus: 0,
        createdByUserId: userId || null,
      })
      .returning();

    return job;
  }

  /**
   * Finaliza um job de importação
   */
  async completeJob(jobId: string, summary?: Partial<typeof schema.esusImportJobs.$inferInsert>) {
    const [existing] = await this.db
      .select()
      .from(schema.esusImportJobs)
      .where(eq(schema.esusImportJobs.id, jobId));

    if (!existing) {
      throw new NotFoundException('Job de importação não encontrado.');
    }

    const [updated] = await this.db
      .update(schema.esusImportJobs)
      .set({
        status: 'COMPLETED',
        finishedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ...(summary || {}),
      })
      .where(eq(schema.esusImportJobs.id, jobId))
      .returning();

    return updated;
  }

  /**
   * Registra falha no job
   */
  async failJob(jobId: string, errorMessage: string) {
    const [updated] = await this.db
      .update(schema.esusImportJobs)
      .set({
        status: 'FAILED',
        finishedAt: new Date().toISOString(),
        errorMessage,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(schema.esusImportJobs.id, jobId))
      .returning();

    return updated;
  }

  /**
   * Processa em lote as requisições e pacientes recebidos do frontend
   */
  async processBatch(dto: ProcessBatchDto, userId: string) {
    const hits = dto.hits || [];
    if (hits.length === 0) {
      return {
        processed: 0,
        patientsCreated: 0,
        patientsUpdated: 0,
        patientsDeceasedSkipped: 0,
        requestsCreated: 0,
        requestsUpdated: 0,
        requestsSkippedStatus: 0,
      };
    }

    let patientsCreated = 0;
    let patientsUpdated = 0;
    let patientsDeceasedSkipped = 0;
    let requestsCreated = 0;
    let requestsUpdated = 0;
    let requestsSkippedStatus = 0;

    // Cache local de unidades de saúde, procedimentos e grupos durante este lote
    const healthCenterCache = new Map<string, string>(); // cnes -> id
    const procedureCache = new Map<string, { id: string; groupId: string }>(); // code/name -> { id, groupId }
    const procedureGroupCache = new Map<string, string>(); // groupCode.subgroupCode -> id

    // Data/hora local brasileira para auditoria e timestamps do lote
    const nowTz = getBrazilLocalIso();

    // Busca unidade padrão municipal caso CNES venha vazio
    const defaultCenter = await this.db.query.healthCenters.findFirst();
    const defaultCenterId = defaultCenter?.id || crypto.randomUUID();

    // Executa em transação atômica do banco de dados
    await this.db.transaction(async (tx: any) => {
      for (const hit of hits) {
        const src = hit._source || hit;
        if (!src) continue;

        // ---------------------------------------------------------
        // 1. REGRA DE ÓBITO: Descartar paciente e requisição se houver indicativo de óbito
        // ---------------------------------------------------------
        const isDeceased = src.pacienteVivo === false || !!src.pacienteDtObito;
        if (isDeceased) {
          patientsDeceasedSkipped++;
          continue;
        }

        // ---------------------------------------------------------
        // 2. UNIDADE DE SAÚDE (CNES): Buscar ou Auto-Provisionar
        // ---------------------------------------------------------
        const cnes = (src.coCnesEstabelecimentoSolicitante || '').trim();
        let healthCenterId = defaultCenterId;

        if (cnes) {
          if (healthCenterCache.has(cnes)) {
            healthCenterId = healthCenterCache.get(cnes)!;
          } else {
            const [foundCenter] = await tx
              .select({ id: schema.healthCenters.id })
              .from(schema.healthCenters)
              .where(eq(schema.healthCenters.cnes, cnes))
              .limit(1);

            if (foundCenter) {
              healthCenterId = foundCenter.id;
              healthCenterCache.set(cnes, healthCenterId);
            } else {
              // Auto-provisiona a unidade de saúde a partir dos dados do e-SUS
              const newCenterId = crypto.randomUUID();
              const centerName = (src.noEstabelecimentoSolicitante || `UNIDADE CNES ${cnes}`).trim().toUpperCase();

              await tx.insert(schema.healthCenters).values({
                id: newCenterId,
                cnes,
                name: centerName,
                noFantasia: centerName,
                coUf: String(src.coUfCentralSolicitante || '25'),
                sgUf: src.sgUfCentralSolicitante || 'PB',
                tpGestao: 'MUNICIPAL',
                createdAt: nowTz,
                updatedAt: nowTz,
              });

              healthCenterId = newCenterId;
              healthCenterCache.set(cnes, healthCenterId);
            }
          }
        }

        // ---------------------------------------------------------
        // 3. PACIENTE: Deduplicação e Ingestão (Telefones, E-mail, CPF Limpo)
        // ---------------------------------------------------------
        const rawCpf = String(src.pacienteNuCpf || (src as any).nuCpf || (src as any).cpf || '').replace(/\D/g, '');
        const validCpf = rawCpf.length === 11 ? rawCpf : null;
        const rawCns = String(src.pacienteNuCns || (src as any).nuCns || (src as any).cns || src.pacienteCartoes?.[0]?.nuCns || '').replace(/\D/g, '');
        const patientName = (src.pacienteNome || 'NÃO INFORMADO').trim().toUpperCase();
        const emailToSave = extractEmail(src.pacienteEmails);

        let patientId: string = crypto.randomUUID();
        let existingPatient: typeof schema.patients.$inferSelect | null = null;

        if (validCpf) {
          const [found] = await tx
            .select()
            .from(schema.patients)
            .where(eq(schema.patients.cpf, validCpf))
            .limit(1);
          if (found) existingPatient = found;
        }

        if (!existingPatient && rawCns && rawCns.length >= 10) {
          const [found] = await tx
            .select()
            .from(schema.patients)
            .where(eq(schema.patients.cns, rawCns))
            .limit(1);
          if (found) existingPatient = found;
        }

        const fullAddress = [
          src.pacienteEndereco,
          src.pacienteNuLogradouro ? `nº ${src.pacienteNuLogradouro}` : null,
          src.pacienteBairro,
          src.pacienteNoMunicipioResidencia,
          src.pacienteCep ? `CEP ${src.pacienteCep}` : null,
        ]
          .filter(Boolean)
          .join(', ');

        if (existingPatient) {
          patientId = existingPatient.id;
          // Atualiza dados faltantes se disponíveis
          const updates: Partial<typeof schema.patients.$inferInsert> = {};
          if (!existingPatient.cns && rawCns) updates.cns = rawCns;
          if (!existingPatient.address && fullAddress) updates.address = fullAddress;
          if (!existingPatient.cpf && validCpf) updates.cpf = validCpf;
          if (!(existingPatient as any).email && emailToSave) (updates as any).email = emailToSave;

          if (Object.keys(updates).length > 0) {
            updates.updatedAt = nowTz;
            await tx
              .update(schema.patients)
              .set(updates)
              .where(eq(schema.patients.id, patientId));
            patientsUpdated++;
          }
        } else {
          // Cria novo paciente no SINPeP (CPF pode ser nulo se paciente só possuir CNS)
          let birthDateStr = '1980-01-01T00:00:00.000Z';
          if (src.pacienteDtNascimento) {
            const parsed = new Date(src.pacienteDtNascimento);
            if (!isNaN(parsed.getTime())) birthDateStr = parsed.toISOString();
          }

          await tx.insert(schema.patients).values({
            id: patientId,
            name: patientName,
            cpf: validCpf,
            cns: rawCns || null,
            email: emailToSave,
            birthDate: birthDateStr,
            gender: src.pacienteCoSexo === 'F' ? 'F' : 'M',
            address: fullAddress || null,
            healthCenterId,
            attentionLevel: 1,
            isActive: true,
            createdAt: nowTz,
            updatedAt: nowTz,
          } as any);
          patientsCreated++;
        }

        // 3.1 IMPORTAÇÃO DE TELEFONES DO PACIENTE (com máscara (XX) XXXXX-XXXX / (XX) XXXX-XXXX)
        const existingPhones = await tx
          .select({ phoneNumber: schema.patientPhones.phoneNumber })
          .from(schema.patientPhones)
          .where(eq(schema.patientPhones.patientId, patientId));
        const existingPhoneSet = new Set(existingPhones.map((p: any) => p.phoneNumber));

        if (Array.isArray(src.pacienteTelefones) && src.pacienteTelefones.length > 0) {
          for (const tel of src.pacienteTelefones) {
            const formatted = formatPhoneNumber(tel.nuDdd, tel.nuTelefone);
            if (formatted && !existingPhoneSet.has(formatted)) {
              const cleanDigits = formatted.replace(/\D/g, '');
              const isMobile = cleanDigits.length === 11 || (cleanDigits.length === 9 && cleanDigits.startsWith('9'));
              try {
                await tx.insert(schema.patientPhones).values({
                  id: crypto.randomUUID(),
                  patientId,
                  phoneNumber: formatted,
                  isWhatsapp: isMobile,
                  createdAt: nowTz,
                  updatedAt: nowTz,
                });
                existingPhoneSet.add(formatted);
              } catch {
                // Silencia duplicatas eventuais de telefone
              }
            }
          }
        }

        // ---------------------------------------------------------
        // 4. REQUISIÇÃO REGULATÓRIA: Checagem de Status Alvo
        // ---------------------------------------------------------
        // Códigos e-SUS aceitos para requisições pendentes:
        // 1 = Pendente de Agendamento / Em lista de espera
        // 2 = Pendente na Regulação / Aguardando autorização
        // 3 = Devolvido pela Regulação / Devolvida
        // 8 = Agendamento Cancelado
        const statusCode = Number(src.coSolicitacaoStatus);
        const statusName = (src.noSolicitacaoStatus || '').toLowerCase();

        let mappedStatus: 'PENDENTE_AGENDAMENTO' | 'PENDENTE_REGULACAO' | 'DEVOLVIDA' | 'AGENDAMENTO_CANCELADO' | null = null;

        if (statusCode === 1 || statusName.includes('lista de espera') || statusName.includes('pendente de agendamento')) {
          mappedStatus = 'PENDENTE_AGENDAMENTO';
        } else if (statusCode === 2 || statusName.includes('aguardando autorização') || statusName.includes('pendente na regulação')) {
          mappedStatus = 'PENDENTE_REGULACAO';
        } else if (statusCode === 3 || statusName.includes('devolvida') || statusName.includes('devolvido')) {
          mappedStatus = 'DEVOLVIDA';
        } else if (statusCode === 8 || statusName.includes('agendamento cancelado')) {
          mappedStatus = 'AGENDAMENTO_CANCELADO';
        }

        if (!mappedStatus) {
          // Status finalizado (Atendida, Confirmada, etc.) -> Apenas paciente foi importado
          requestsSkippedStatus++;
          continue;
        }

        // ---------------------------------------------------------
        // 5. PROCEDIMENTO / GRUPO: Resolução Precisa de Procedimentos de Grupo
        // ---------------------------------------------------------
        // Quando a requisição faz parte de um grupo (ex: GRUPO - ULTRASSONOGRAFIA),
        // o e-SUS envia as informações do grupo em coProcedimentoInterno / noProcedimentoInterno,
        // e o procedimento real solicitado no array aninhado "procedimentos".
        const hasProceduresArray = Array.isArray(src.procedimentos) && src.procedimentos.length > 0;
        const rawGroupCode = String(src.coProcedimentoInterno || '').trim();
        const rawGroupName = String(src.noProcedimentoInterno || '').trim().toUpperCase();

        let procName: string;
        let sigtapCode: string;

        if (hasProceduresArray) {
          const specific = src.procedimentos![0];
          procName = (specific.noProcedimentoInterno || rawGroupName || 'PROCEDIMENTO REGULADO').trim().toUpperCase();
          sigtapCode = (specific.coProcedimentoSigtap || specific.coProcedimentoInterno || src.coProcedimentoSigtap || rawGroupCode || '').trim();
        } else {
          procName = (rawGroupName || 'PROCEDIMENTO REGULADO').trim().toUpperCase();
          sigtapCode = (src.coProcedimentoSigtap || rawGroupCode || '').trim();
        }

        const mod = (src.noModulo || '').toUpperCase();
        let extGroup = '00';
        let extSubgroup = '00';

        // 5.1 Extração de códigos de grupo/subgrupo SIGTAP
        if (sigtapCode && sigtapCode.replace(/\D/g, '').length >= 4) {
          const digits = sigtapCode.replace(/\D/g, '');
          extGroup = digits.slice(0, 2);
          extSubgroup = digits.slice(2, 4);
        }

        // Tratamento de códigos internos de grupos com 8 dígitos (ex: 20500000 -> Grupo 02, Subgrupo 05)
        if (extGroup === '00' && rawGroupCode && rawGroupCode.replace(/\D/g, '').length === 8) {
          const digits = rawGroupCode.replace(/\D/g, '');
          if (digits.startsWith('2')) {
            extGroup = '02';
            extSubgroup = digits.slice(1, 3);
          } else if (digits.startsWith('3')) {
            extGroup = '03';
            extSubgroup = digits.slice(1, 3);
          }
        }

        // 5.2 Identificação semântica de palavras-chave
        let semanticKeyword: string | null = null;
        const combinedNames = `${rawGroupName} ${procName}`.toUpperCase();
        if (combinedNames.includes('ULTRASS')) {
          semanticKeyword = 'ULTRASS';
          if (extGroup === '00') { extGroup = '02'; extSubgroup = '05'; }
        } else if (combinedNames.includes('TOMOGRAFIA')) {
          semanticKeyword = 'TOMOGRAFIA';
          if (extGroup === '00') { extGroup = '02'; extSubgroup = '06'; }
        } else if (combinedNames.includes('RESSON')) {
          semanticKeyword = 'RESSON';
          if (extGroup === '00') { extGroup = '02'; extSubgroup = '07'; }
        } else if (combinedNames.includes('RADIOLOG') || combinedNames.includes('RAIO-X') || combinedNames.includes('RADIOGRAFIA')) {
          semanticKeyword = 'RADIOLOG';
          if (extGroup === '00') { extGroup = '02'; extSubgroup = '04'; }
        } else if (combinedNames.includes('MAMOGRAF')) {
          semanticKeyword = 'MAMOGRAF';
          if (extGroup === '00') { extGroup = '02'; extSubgroup = '04'; }
        } else if (combinedNames.includes('ENDOSCOP')) {
          semanticKeyword = 'ENDOSCOP';
          if (extGroup === '00') { extGroup = '02'; extSubgroup = '09'; }
        } else if (combinedNames.includes('COLONOSCOP')) {
          semanticKeyword = 'COLONOSCOP';
          if (extGroup === '00') { extGroup = '02'; extSubgroup = '09'; }
        } else if (combinedNames.includes('CONSULTA') || mod.includes('CONSULTA')) {
          semanticKeyword = 'CONSULTA';
          if (extGroup === '00') { extGroup = '03'; extSubgroup = '01'; }
        }

        // 5.3 Resolução do Grupo de Procedimentos
        const groupKey = `${extGroup}.${extSubgroup}_${semanticKeyword || rawGroupName || mod}`;
        let targetGroupId: string | null = null;

        if (procedureGroupCache.has(groupKey)) {
          targetGroupId = procedureGroupCache.get(groupKey)!;
        } else {
          // A. Busca por groupCode e subgroupCode exatos
          if (extGroup !== '00' && extSubgroup !== '00') {
            const [foundByCode] = await tx
              .select({ id: schema.procedureGroups.id })
              .from(schema.procedureGroups)
              .where(and(
                eq(schema.procedureGroups.groupCode, extGroup),
                eq(schema.procedureGroups.subgroupCode, extSubgroup)
              ))
              .limit(1);
            if (foundByCode) targetGroupId = foundByCode.id;
          }

          // B. Busca por palavra-chave semântica (ex: ULTRASS)
          if (!targetGroupId && semanticKeyword) {
            const [foundByKeyword] = await tx
              .select({ id: schema.procedureGroups.id })
              .from(schema.procedureGroups)
              .where(ilike(schema.procedureGroups.name, `%${semanticKeyword}%`))
              .limit(1);
            if (foundByKeyword) targetGroupId = foundByKeyword.id;
          }

          // C. Busca por nome do grupo
          if (!targetGroupId && rawGroupName) {
            const cleanName = rawGroupName.replace(/^GRUPO\s*[-–]\s*/i, '').replace(/\s*[-–]\s*GERAL$/i, '').trim();
            const [foundByName] = await tx
              .select({ id: schema.procedureGroups.id })
              .from(schema.procedureGroups)
              .where(or(
                ilike(schema.procedureGroups.name, `%${cleanName}%`),
                ilike(schema.procedureGroups.name, `%${rawGroupName}%`)
              ))
              .limit(1);
            if (foundByName) targetGroupId = foundByName.id;
          }

          // D. Se ainda não existir, cria o grupo de procedimentos correto
          if (!targetGroupId) {
            const newGroupId = crypto.randomUUID();
            let groupNameToCreate = rawGroupName;
            if (!groupNameToCreate || groupNameToCreate === 'PROCEDIMENTO REGULADO') {
              groupNameToCreate = extGroup !== '00'
                ? `SUBGRUPO ${extGroup}.${extSubgroup} - ${mod || 'PROCEDIMENTOS'}`
                : `GRUPO E-SUS - ${mod || 'GERAL'}`;
            }

            const [createdGroup] = await tx
              .insert(schema.procedureGroups)
              .values({
                id: newGroupId,
                name: groupNameToCreate,
                groupCode: extGroup !== '00' ? extGroup : '00',
                subgroupCode: extSubgroup !== '00' ? extSubgroup : '00',
                isActive: true,
                createdAt: nowTz,
                updatedAt: nowTz,
              })
              .returning({ id: schema.procedureGroups.id });

            targetGroupId = createdGroup.id;
          }

          procedureGroupCache.set(groupKey, targetGroupId!);
        }

        // 5.4 Resolução do Procedimento Específico
        let procedureId: string | null = null;
        let procedureGroupId: string | null = null;

        if (sigtapCode && procedureCache.has(sigtapCode)) {
          const cached = procedureCache.get(sigtapCode)!;
          procedureId = cached.id;
          procedureGroupId = cached.groupId;
        } else if (procName && procedureCache.has(procName)) {
          const cached = procedureCache.get(procName)!;
          procedureId = cached.id;
          procedureGroupId = cached.groupId;
        } else {
          // Busca procedimento por código SIGTAP
          if (sigtapCode) {
            const [foundProc] = await tx
              .select({ id: schema.procedures.id, procedureGroupId: schema.procedures.procedureGroupId })
              .from(schema.procedures)
              .where(eq(schema.procedures.code, sigtapCode))
              .limit(1);
            if (foundProc) {
              procedureId = foundProc.id;
              procedureGroupId = foundProc.procedureGroupId;
            }
          }

          // Se não encontrou por código, busca por nome exato
          if (!procedureId && procName) {
            const [foundProc] = await tx
              .select({ id: schema.procedures.id, procedureGroupId: schema.procedures.procedureGroupId })
              .from(schema.procedures)
              .where(eq(schema.procedures.name, procName))
              .limit(1);
            if (foundProc) {
              procedureId = foundProc.id;
              procedureGroupId = foundProc.procedureGroupId;
            }
          }

          // Se o procedimento existia mas estava com grupo incorreto (ex: Ultrassonografia ligada a Tomografia), atualiza
          if (procedureId && targetGroupId && procedureGroupId !== targetGroupId && semanticKeyword) {
            await tx
              .update(schema.procedures)
              .set({ procedureGroupId: targetGroupId, updatedAt: nowTz })
              .where(eq(schema.procedures.id, procedureId));
            procedureGroupId = targetGroupId;
          }

          // Se não existir, provisiona o procedimento com o grupo correto
          if (!procedureId) {
            const newProcId = crypto.randomUUID();
            const finalGroupId: string = targetGroupId!;

            await tx.insert(schema.procedures).values({
              id: newProcId,
              code: sigtapCode || `INT-${newProcId.slice(0, 8)}`,
              name: procName,
              procedureGroupId: finalGroupId,
              requiresRegulation: true,
              isActive: true,
              createdAt: nowTz,
              updatedAt: nowTz,
            });

            procedureId = newProcId;
            procedureGroupId = finalGroupId;
          }

          const cachedObj = { id: procedureId, groupId: procedureGroupId || targetGroupId! };
          if (sigtapCode) procedureCache.set(sigtapCode, cachedObj);
          procedureCache.set(procName, cachedObj);
        }

        // ---------------------------------------------------------
        // 6. PRIORIDADE, TIPO E HISTÓRICO CLÍNICO
        // ---------------------------------------------------------
        const riskName = (src.noClassificacaoRisco || '').toLowerCase();
        let priority: 'URGENTE' | 'PRIORITARIO' | 'ELETIVO' = 'ELETIVO';
        if (riskName.includes('alta') || riskName.includes('urgente')) {
          priority = 'URGENTE';
        } else if (riskName.includes('média') || riskName.includes('media') || riskName.includes('intermediária')) {
          priority = 'PRIORITARIO';
        }

        const modName = (src.noModulo || '').toUpperCase();
        const reqType: 'CONSULTA' | 'EXAME' | 'PROCEDIMENTO' =
          modName.includes('CONSULTA') ? 'CONSULTA' : modName.includes('EXAME') ? 'EXAME' : 'PROCEDIMENTO';

        // Compilação dos sinalizadores clínicos
        const flags: string[] = [];
        if (src.stOncologico) flags.push('Oncológico');
        if (src.stDiabetes) flags.push('Diabetes');
        if (src.stHipertenso) flags.push('Hipertenso');
        if (src.stDeficiente) flags.push(`Deficiência (${src.dsDeficiencia || 'Sim'})`);
        if (src.stAlergico) flags.push(`Alergia (${src.dsAlergia || 'Sim'})`);
        if (src.stJudicial) flags.push(`Judicial (${src.dsDadosJudiciais || 'Sim'})`);
        if (src.stIdoso) flags.push('Idoso');
        if (src.stInfantil) flags.push('Infantil');
        if (src.stTelessaude) flags.push(`Telessaúde (${src.dsTelessaude || 'Sim'})`);

        const clinicalHistoryText = flags.length > 0
          ? `Sinalizadores e-SUS: ${flags.join(' • ')}`
          : 'Sem sinalizadores de risco prévios no e-SUS.';

        // Justificativa clínica (última manifestação no histórico ou padrão)
        const latestHistory = src.historicoStatus?.[0];
        const justificationText =
          latestHistory?.dsJustificativa ||
          `Solicitação importada do e-SUS Regulação (Protocolo Original: ${src.coSolicitacao}).`;

        // CID-10
        const cidText = src.coCid
          ? `${src.coCid}${src.noCid ? ` - ${src.noCid}` : ''}`
          : 'R69 - Causas desconhecidas e não especificadas de morbidade';

        // Data de criação preservando timezone local
        let createdAtDate = nowTz;
        if (src.dtSolicitacao) {
          const cleanDt = src.dtSolicitacao.trim().replace(' ', 'T');
          if (!isNaN(new Date(cleanDt).getTime())) {
            createdAtDate = cleanDt.includes('T') ? cleanDt : `${cleanDt}T00:00:00`;
          }
        }

        const protocol = String(src.coSolicitacao).trim();

        // ---------------------------------------------------------
        // 7. GRAVAÇÃO DA SOLICITAÇÃO REGULATÓRIA (Upsert Idempotente)
        // ---------------------------------------------------------
        const [existingReq] = await tx
          .select({ id: schema.regulationRequests.id })
          .from(schema.regulationRequests)
          .where(eq(schema.regulationRequests.protocolNumber, protocol))
          .limit(1);

        let finalRequestId: string;

        if (existingReq) {
          finalRequestId = existingReq.id;
          await tx
            .update(schema.regulationRequests)
            .set({
              patientId,
              requestingHealthCenterId: healthCenterId,
              procedureId,
              procedureGroupId: procedureGroupId || targetGroupId!,
              priority,
              status: mappedStatus,
              type: reqType,
              cid10: cidText,
              clinicalJustification: justificationText,
              clinicalHistory: clinicalHistoryText,
              updatedAt: nowTz,
            })
            .where(eq(schema.regulationRequests.id, finalRequestId));
          requestsUpdated++;
        } else {
          finalRequestId = crypto.randomUUID();
          await tx.insert(schema.regulationRequests).values({
            id: finalRequestId,
            protocolNumber: protocol,
            patientId,
            requestingHealthCenterId: healthCenterId,
            requestingUserId: userId,
            procedureId,
            procedureGroupId: procedureGroupId || targetGroupId!,
            type: reqType,
            cid10: cidText,
            clinicalJustification: justificationText,
            clinicalHistory: clinicalHistoryText,
            priority,
            status: mappedStatus,
            createdAt: createdAtDate,
            updatedAt: nowTz,
          });
          requestsCreated++;
        }

        // ---------------------------------------------------------
        // 8. HISTÓRICO DE STATUS / PARECERES
        // ---------------------------------------------------------
        if (src.historicoStatus && src.historicoStatus.length > 0) {
          for (const hist of src.historicoStatus) {
            if (!hist.dsJustificativa) continue;
            try {
              let histDate = nowTz;
              if (hist.dtHistorico) {
                const cleanDt = hist.dtHistorico.trim().replace(' ', 'T');
                if (!isNaN(new Date(cleanDt).getTime())) {
                  histDate = cleanDt.includes('T') ? cleanDt : `${cleanDt}T00:00:00`;
                }
              }

              await tx.insert(schema.regulationStatusHistory).values({
                id: crypto.randomUUID(),
                requestId: finalRequestId,
                newStatus: mappedStatus,
                justification: `[e-SUS ${hist.noOperador || 'Regulador'}]: ${hist.dsJustificativa}`,
                actionByUserId: userId,
                createdAt: histDate,
              });
            } catch {
              // Silencia erros secundários de inserção no histórico para não quebrar a requisição principal
            }
          }
        }
      }

      // Atualiza os contadores no Job de Auditoria se houver jobId
      if (dto.jobId) {
        await tx
          .update(schema.esusImportJobs)
          .set({
            totalRecordsProcessed: sql`${schema.esusImportJobs.totalRecordsProcessed} + ${hits.length}`,
            patientsCreated: sql`${schema.esusImportJobs.patientsCreated} + ${patientsCreated}`,
            patientsUpdated: sql`${schema.esusImportJobs.patientsUpdated} + ${patientsUpdated}`,
            patientsDeceasedSkipped: sql`${schema.esusImportJobs.patientsDeceasedSkipped} + ${patientsDeceasedSkipped}`,
            requestsCreated: sql`${schema.esusImportJobs.requestsCreated} + ${requestsCreated}`,
            requestsUpdated: sql`${schema.esusImportJobs.requestsUpdated} + ${requestsUpdated}`,
            requestsSkippedStatus: sql`${schema.esusImportJobs.requestsSkippedStatus} + ${requestsSkippedStatus}`,
            updatedAt: nowTz,
          })
          .where(eq(schema.esusImportJobs.id, dto.jobId));
      }
    });

    return {
      processed: hits.length,
      patientsCreated,
      patientsUpdated,
      patientsDeceasedSkipped,
      requestsCreated,
      requestsUpdated,
      requestsSkippedStatus,
    };
  }
}
