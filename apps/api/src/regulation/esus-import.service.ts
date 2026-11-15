import { Injectable, Inject, Logger, NotFoundException, Optional } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../database';
import { DATABASE_CONNECTION } from '../database/database.constants';
import { eq, desc, sql, and, ilike, or, inArray, notInArray } from 'drizzle-orm';
import * as crypto from 'crypto';
import { IntegraSusService } from '../integra-sus/integra-sus.service';

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
  nuCpfProfissionalExecutante?: string;
  nuCnsProfissionalExecutante?: string;
  noProfissionalExecutante?: string;
  nuCrmExecutante?: string;
  coCnesEstabelecimentoExecutante?: string;
  noEstabelecimentoExecutante?: string;
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
 * Dicionário de subgrupos SIGTAP padrão (Grupo.Subgrupo -> Nome Padronizado)
 */
const SIGTAP_SUBGROUPS: Record<string, string> = {
  '02.01': '02.01 - COLETAS DE MATERIAL',
  '02.02': '02.02 - DIAGNÓSTICO EM LABORATÓRIO CLÍNICO',
  '02.03': '02.03 - DIAGNÓSTICO POR ANATOMIA PATOLÓGICA E CITOPATOLOGIA',
  '02.04': '02.04 - DIAGNÓSTICO POR RADIOLOGIA',
  '02.05': '02.05 - DIAGNÓSTICO POR ULTRASSONOGRAFIA',
  '02.06': '02.06 - DIAGNÓSTICO POR TOMOGRAFIA',
  '02.07': '02.07 - DIAGNÓSTICO POR RESSONÂNCIA MAGNÉTICA',
  '02.08': '02.08 - DIAGNÓSTICO POR MEDICINA NUCLEAR',
  '02.09': '02.09 - DIAGNÓSTICO POR ENDOSCOPIA',
  '02.10': '02.10 - DIAGNÓSTICO POR RADIOLOGIA INTERVENCIONISTA',
  '02.11': '02.11 - MÉTODOS DIAGNÓSTICOS EM ESPECIALIDADES',
  '02.12': '02.12 - DIAGNÓSTICO E PROCEDIMENTOS ESPECIAIS EM HEMOTERAPIA',
  '02.13': '02.13 - EXAMES CITOPATOLÓGICOS / HISTOPATOLÓGICOS',
  '02.14': '02.14 - DIAGNÓSTICO POR TESTE RÁPIDO',
  '03.01': '03.01 - CONSULTAS / ATENDIMENTOS / ACOMPANHAMENTOS',
  '03.02': '03.02 - FISIOTERAPIA',
  '03.03': '03.03 - TRATAMENTOS CLÍNICOS',
  '04.01': '04.01 - PEQUENAS CIRURGIAS',
};

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
    @Optional()
    private readonly integraSusService?: IntegraSusService,
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

    // Cache local de especialidades e médicos durante este lote
    const specialtyCache = new Map<string, string>();
    const doctorCache = new Map<string, string>();
    const cnesDoctorCache = new Map<string, { healthCenterId?: string; specialtyIds: string[] }>();

    // Busca perfil de Médico
    let [medicoProfile] = await this.db
      .select({ id: schema.profiles.id })
      .from(schema.profiles)
      .where(or(
        eq(schema.profiles.name, 'Médico'),
        eq(schema.profiles.name, 'Medico'),
        ilike(schema.profiles.name, '%médico%'),
        ilike(schema.profiles.name, '%medico%')
      ))
      .limit(1);

    if (!medicoProfile) {
      const [newProf] = await this.db
        .insert(schema.profiles)
        .values({
          id: crypto.randomUUID(),
          name: 'Médico',
          description: 'Acesso às rotinas clínicas (prontuários, pacientes e consulta de procedimentos)',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        .onConflictDoNothing()
        .returning({ id: schema.profiles.id });
      if (newProf) {
        medicoProfile = newProf;
      } else {
        const [existing] = await this.db.select({ id: schema.profiles.id }).from(schema.profiles).limit(1);
        medicoProfile = existing;
      }
    }

    const medicoProfileId = medicoProfile.id;

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
        // 5. PROCEDIMENTO / GRUPO: Resolução Precisa de Procedimentos de Grupo vs Individuais
        // ---------------------------------------------------------
        // No e-SUS Regulação:
        // 1. Procedimento de GRUPO:
        //    - rawGroupName começa com "GRUPO" (ex: "GRUPO - ULTRASSONOGRAFIA - GERAL")
        //    - ou coProcedimentoInterno termina em "00000" (ex: "20500000")
        //    - ou o exame no array interno "procedimentos" tem nome DIFERENTE do grupo no topo.
        //    Neste caso, a requisição DEVE receber o procedureGroupId do grupo.
        // 2. Procedimento INDIVIDUAL FORA DE GRUPO:
        //    - O exame simplesmente se repete no array interno (ex: "ENDOSCOPIA DIGESTIVA ALTA" no topo e no array)
        //    - ou não começa com "GRUPO".
        //    Neste caso, a requisição NÃO pertence a um grupo regulatório (procedureGroupId DEVE SER NULL).
        const hasProceduresArray = Array.isArray(src.procedimentos) && src.procedimentos.length > 0;
        const rawGroupCode = String(src.coProcedimentoInterno || '').trim();
        const rawGroupName = String(src.noProcedimentoInterno || '').trim().toUpperCase();
        const mod = (src.noModulo || '').toUpperCase();

        // Identificação precisa de consultas especializadas do e-SUS
        const isConsultation =
          mod.includes('CONSULTA') ||
          rawGroupName.startsWith('CONSULTA') ||
          rawGroupName.includes('CONSULTA');

        const firstProc = hasProceduresArray ? src.procedimentos![0] : null;
        const specificProcName = firstProc?.noProcedimentoInterno?.trim().toUpperCase();

        const isGroupRequest =
          !isConsultation &&
          (rawGroupName.startsWith('GRUPO') ||
            rawGroupCode.endsWith('00000') ||
            (hasProceduresArray && !!specificProcName && specificProcName !== rawGroupName));

        let procName: string;
        let sigtapCode: string;

        if (hasProceduresArray && firstProc) {
          procName = (firstProc.noProcedimentoInterno || rawGroupName || 'PROCEDIMENTO REGULADO').trim().toUpperCase();
          sigtapCode = (firstProc.coProcedimentoSigtap || firstProc.coProcedimentoInterno || src.coProcedimentoSigtap || rawGroupCode || '').trim();
        } else {
          procName = (rawGroupName || 'PROCEDIMENTO REGULADO').trim().toUpperCase();
          sigtapCode = (src.coProcedimentoSigtap || rawGroupCode || '').trim();
        }

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
        } else if (combinedNames.includes('ENDOSCOP') || combinedNames.includes('COLONOSCOP')) {
          semanticKeyword = 'ENDOSCOP';
          if (extGroup === '00') { extGroup = '02'; extSubgroup = '09'; }
        } else if (combinedNames.includes('CONSULTA') || mod.includes('CONSULTA')) {
          semanticKeyword = 'CONSULTA';
          if (extGroup === '00') { extGroup = '03'; extSubgroup = '01'; }
        }

        // 5.3 Resolução do Grupo de Procedimentos
        const subgroupCodeKey = `${extGroup}.${extSubgroup}`;
        const standardCatalogGroupName =
          SIGTAP_SUBGROUPS[subgroupCodeKey] ||
          (extGroup !== '00'
            ? `${subgroupCodeKey} - ${mod || 'PROCEDIMENTOS REGULADOS'}`
            : `GRUPO E-SUS - ${mod || 'GERAL'}`);

        const groupKey = isGroupRequest
          ? `GROUP_${rawGroupName}_${subgroupCodeKey}`
          : `CATALOG_${subgroupCodeKey}`;

        let targetGroupId: string | null = null;

        if (procedureGroupCache.has(groupKey)) {
          targetGroupId = procedureGroupCache.get(groupKey)!;
        } else {
          if (isGroupRequest) {
            // Busca grupo específico de requisições de grupo (ex: GRUPO - ULTRASSONOGRAFIA)
            const cleanName = rawGroupName.replace(/^GRUPO\s*[-–]\s*/i, '').replace(/\s*[-–]\s*GERAL$/i, '').trim();
            const [foundGroup] = await tx
              .select({ id: schema.procedureGroups.id, name: schema.procedureGroups.name })
              .from(schema.procedureGroups)
              .where(or(
                ilike(schema.procedureGroups.name, `%${cleanName}%`),
                ilike(schema.procedureGroups.name, `%${rawGroupName}%`)
              ))
              .limit(1);

            if (foundGroup) {
              targetGroupId = foundGroup.id;
              if (foundGroup.name.startsWith('02.05') || foundGroup.name.includes('02.05')) {
                await tx
                  .update(schema.procedureGroups)
                  .set({ name: rawGroupName, updatedAt: nowTz })
                  .where(eq(schema.procedureGroups.id, foundGroup.id));
              }
            } else {
              const newGroupId = crypto.randomUUID();
              const [created] = await tx
                .insert(schema.procedureGroups)
                .values({
                  id: newGroupId,
                  name: rawGroupName.startsWith('GRUPO') ? rawGroupName : `GRUPO - ${rawGroupName}`,
                  groupCode: extGroup !== '00' ? extGroup : '00',
                  subgroupCode: extSubgroup !== '00' ? extSubgroup : '00',
                  isActive: true,
                  createdAt: nowTz,
                  updatedAt: nowTz,
                })
                .returning({ id: schema.procedureGroups.id });
              targetGroupId = created.id;
            }
          } else {
            // Procedimento individual: deve pertencer ao subgrupo SIGTAP padronizado
            const [foundSubgroup] = await tx
              .select({ id: schema.procedureGroups.id, name: schema.procedureGroups.name })
              .from(schema.procedureGroups)
              .where(and(
                eq(schema.procedureGroups.groupCode, extGroup),
                eq(schema.procedureGroups.subgroupCode, extSubgroup)
              ))
              .limit(1);

            if (foundSubgroup) {
              targetGroupId = foundSubgroup.id;
              // Se o grupo existente possuía o nome de um exame individual (ex: "COLONOSCOPIA COM BIOPSIA"), renomeia para o nome padronizado
              if (
                foundSubgroup.name !== standardCatalogGroupName &&
                !foundSubgroup.name.toUpperCase().startsWith('GRUPO') &&
                !foundSubgroup.name.includes(subgroupCodeKey)
              ) {
                await tx
                  .update(schema.procedureGroups)
                  .set({ name: standardCatalogGroupName, updatedAt: nowTz })
                  .where(eq(schema.procedureGroups.id, foundSubgroup.id));
              }
            } else {
              const newGroupId = crypto.randomUUID();
              const [created] = await tx
                .insert(schema.procedureGroups)
                .values({
                  id: newGroupId,
                  name: standardCatalogGroupName,
                  groupCode: extGroup !== '00' ? extGroup : '00',
                  subgroupCode: extSubgroup !== '00' ? extSubgroup : '00',
                  isActive: true,
                  createdAt: nowTz,
                  updatedAt: nowTz,
                })
                .returning({ id: schema.procedureGroups.id });
              targetGroupId = created.id;
            }
          }

          procedureGroupCache.set(groupKey, targetGroupId!);
        }

        // 5.4 Resolução de Todos os Procedimentos (especialmente para requisições com múltiplos procedimentos dentro do grupo)
        const groupProceduresList: Array<{
          procedureId?: string;
          code: string;
          sigtapCode?: string;
          name: string;
        }> = [];

        if (hasProceduresArray) {
          for (const item of src.procedimentos!) {
            const itemProcName = (item.noProcedimentoInterno || rawGroupName || 'PROCEDIMENTO REGULADO').trim().toUpperCase();
            const itemSigtap = (item.coProcedimentoSigtap || item.coProcedimentoInterno || '').trim();
            const itemCode = (item.coProcedimentoInterno || item.coProcedimentoSigtap || '').trim();

            let itemProcId: string | null = null;
            if (itemSigtap && procedureCache.has(itemSigtap)) {
              itemProcId = procedureCache.get(itemSigtap)!.id;
            } else if (itemProcName && procedureCache.has(itemProcName)) {
              itemProcId = procedureCache.get(itemProcName)!.id;
            } else {
              if (itemSigtap) {
                const [found] = await tx
                  .select({ id: schema.procedures.id, procedureGroupId: schema.procedures.procedureGroupId })
                  .from(schema.procedures)
                  .where(eq(schema.procedures.code, itemSigtap))
                  .limit(1);
                if (found) itemProcId = found.id;
              }
              if (!itemProcId && itemProcName) {
                const [found] = await tx
                  .select({ id: schema.procedures.id, procedureGroupId: schema.procedures.procedureGroupId })
                  .from(schema.procedures)
                  .where(eq(schema.procedures.name, itemProcName))
                  .limit(1);
                if (found) itemProcId = found.id;
              }

              if (!itemProcId) {
                itemProcId = crypto.randomUUID();
                await tx.insert(schema.procedures).values({
                  id: itemProcId,
                  code: itemSigtap || itemCode || `INT-${itemProcId.slice(0, 8)}`,
                  name: itemProcName,
                  procedureGroupId: targetGroupId!,
                  requiresRegulation: true,
                  isActive: true,
                  createdAt: nowTz,
                  updatedAt: nowTz,
                });
              }

              const cachedObj = { id: itemProcId, groupId: targetGroupId! };
              if (itemSigtap) procedureCache.set(itemSigtap, cachedObj);
              procedureCache.set(itemProcName, cachedObj);
            }

            groupProceduresList.push({
              procedureId: itemProcId,
              code: itemCode,
              sigtapCode: itemSigtap,
              name: itemProcName,
            });
          }
        }

        let procedureId: string | null = null;
        let procedureGroupId: string | null = null;

        if (groupProceduresList.length > 0) {
          procedureId = groupProceduresList[0].procedureId || null;
          procedureGroupId = targetGroupId;
        } else if (isConsultation) {
          // CONSULTAS MÉDICAS ESPECIALIZADAS:
          // No e-SUS e no SIGTAP, todas as consultas especializadas compartilham o código SIGTAP genérico 0301010072.
          // A identificação exclusiva deve ser feita pelo coProcedimentoInterno (ex: 03527001, 03513301) e pelo nome específico (ex: CONSULTA EM ORTOPEDIA E TRAUMATOLOGIA).
          const consultInternalCode = rawGroupCode || sigtapCode;
          const cacheKeyByCode = consultInternalCode ? `CONS_CODE_${consultInternalCode}` : null;
          const cacheKeyByName = `CONS_NAME_${procName}`;

          if (cacheKeyByCode && procedureCache.has(cacheKeyByCode)) {
            const cached = procedureCache.get(cacheKeyByCode)!;
            procedureId = cached.id;
            procedureGroupId = cached.groupId;
          } else if (procedureCache.has(cacheKeyByName)) {
            const cached = procedureCache.get(cacheKeyByName)!;
            procedureId = cached.id;
            procedureGroupId = cached.groupId;
          } else {
            // 1. Busca no catálogo por código interno específico da consulta (ex: 03527001)
            if (consultInternalCode) {
              const [foundProc] = await tx
                .select({ id: schema.procedures.id, procedureGroupId: schema.procedures.procedureGroupId })
                .from(schema.procedures)
                .where(eq(schema.procedures.code, consultInternalCode))
                .limit(1);
              if (foundProc) {
                procedureId = foundProc.id;
                procedureGroupId = foundProc.procedureGroupId;
              }
            }

            // 2. Busca no catálogo por nome específico da consulta (ex: CONSULTA EM ORTOPEDIA E TRAUMATOLOGIA)
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

            // 3. Provisiona no catálogo com o código interno exclusivo e o nome correto
            if (!procedureId) {
              const newProcId = crypto.randomUUID();
              const finalGroupId: string = targetGroupId!;

              await tx.insert(schema.procedures).values({
                id: newProcId,
                code: consultInternalCode || `CONS-${newProcId.slice(0, 8)}`,
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
            if (cacheKeyByCode) procedureCache.set(cacheKeyByCode, cachedObj);
            procedureCache.set(cacheKeyByName, cachedObj);
          }
        } else {
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
        const reqType: 'CONSULTA' | 'EXAME' | 'PROCEDIMENTO' = isConsultation
          ? 'CONSULTA'
          : modName.includes('EXAME') || rawGroupName.includes('EXAME')
          ? 'EXAME'
          : 'PROCEDIMENTO';

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
        // O procedureGroupId na requisição regulatória só deve ser preenchido quando for
        // efetivamente uma requisição de GRUPO (ex: GRUPO - ULTRASSONOGRAFIA).
        // Para exames/consultas individuais fora de grupo (ex: ENDOSCOPIA DIGESTIVA ALTA, COLONOSCOPIA),
        // deve ser rigorosamente NULL, para não poluir nem confundir a exibição na regulação.
        const requestGroupId = isGroupRequest ? (targetGroupId || procedureGroupId) : null;
        const requestGroupProcedures = isGroupRequest && groupProceduresList.length > 0 ? groupProceduresList : [];

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
              procedureGroupId: requestGroupId,
              groupProcedures: requestGroupProcedures,
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
            procedureGroupId: requestGroupId,
            groupProcedures: requestGroupProcedures,
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
        // 8. MÉDICOS E ESPECIALIDADES: Registro e Vinculação Automática com CNES
        // ---------------------------------------------------------
        try {
          const execCnes = (src.coCnesEstabelecimentoExecutante || '').trim();
          let execCenterId = healthCenterId;
          if (execCnes && healthCenterCache.has(execCnes)) {
            execCenterId = healthCenterCache.get(execCnes)!;
          }

          // 8.1 Profissional Executante (prioritário para vincular à unidade executante e sua especialidade)
          const execName = src.noProfissionalExecutante || (src as any).noExecutante || (src as any).nomeProfissionalExecutante;
          const execCpf = src.nuCpfProfissionalExecutante || (src as any).nuCpfExecutante || (src as any).cpfProfissionalExecutante;
          const execCns = src.nuCnsProfissionalExecutante || (src as any).nuCnsExecutante || (src as any).cnsProfissionalExecutante;
          const execCrm = src.nuCrmExecutante || (src as any).crmExecutante || (src as any).nuCrmProfissionalExecutante;

          if (execName || execCpf || execCns || execCrm) {
            const cnesInfo = await this.resolveDoctorCnesInfo(
              tx,
              {
                name: execName,
                cpf: execCpf,
                cns: execCns,
                crm: execCrm,
                targetCnes: execCnes || '2606712',
                defaultHealthCenterId: execCenterId,
              },
              cnesDoctorCache,
              healthCenterCache,
              specialtyCache,
            );

            await this.autoRegisterDoctorInBatch(
              tx,
              {
                name: execName,
                cpf: execCpf,
                cns: execCns,
                crm: execCrm,
                healthCenterId: cnesInfo.healthCenterId || execCenterId,
                procedureId,
                specialtyIds: cnesInfo.specialtyIds,
                nowTz,
                isExecutingDoctor: true,
              },
              medicoProfileId,
              doctorCache,
            );
          }

          // 8.2 Profissional Solicitante
          const solName = src.noProfissionalSolicitante || (src as any).noProfissional || (src as any).nomeProfissionalSolicitante;
          const solCpf = src.nuCpfProfissionalSolicitante || (src as any).nuCpfProfissional || (src as any).cpfProfissionalSolicitante;
          const solCns = src.nuCnsProfissionalSolicitante || (src as any).nuCnsProfissional || (src as any).cnsProfissionalSolicitante;
          const solCrm = src.nuCrmSolicitante || (src as any).nuCrm || (src as any).crmSolicitante;

          if (solName || solCpf || solCns || solCrm) {
            const cnesInfo = await this.resolveDoctorCnesInfo(
              tx,
              {
                name: solName,
                cpf: solCpf,
                cns: solCns,
                crm: solCrm,
                targetCnes: execCnes || '2606712',
                defaultHealthCenterId: healthCenterId,
              },
              cnesDoctorCache,
              healthCenterCache,
              specialtyCache,
            );

            await this.autoRegisterDoctorInBatch(
              tx,
              {
                name: solName,
                cpf: solCpf,
                cns: solCns,
                crm: solCrm,
                healthCenterId: cnesInfo.healthCenterId || healthCenterId,
                procedureId,
                specialtyIds: cnesInfo.specialtyIds,
                nowTz,
                isExecutingDoctor: false,
              },
              medicoProfileId,
              doctorCache,
            );
          }
        } catch (err: any) {
          this.logger.warn(`Falha não impeditiva ao auto-registrar médicos da solicitação ${protocol}: ${err.message}`);
        }

        // ---------------------------------------------------------
        // 9. HISTÓRICO DE STATUS / PARECERES
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

  /**
   * Consulta o CNES via Integra-SUS para identificar a unidade executante e especialidade real do médico
   */
  async resolveDoctorCnesInfo(
    tx: any,
    doc: {
      name?: string;
      cpf?: string;
      cns?: string;
      crm?: string;
      targetCnes?: string;
      defaultHealthCenterId?: string;
    },
    cnesDoctorCache?: Map<string, { healthCenterId?: string; specialtyIds: string[] }>,
    healthCenterCache?: Map<string, string>,
    specialtyCache?: Map<string, string>,
  ): Promise<{ healthCenterId?: string; specialtyIds: string[] }> {
    const rawName = (doc.name || '').trim();
    const cleanCns = String(doc.cns || '').replace(/\D/g, '');
    const cleanCpf = String(doc.cpf || '').replace(/\D/g, '');

    const cacheKey = (cleanCns || cleanCpf || rawName).toUpperCase();
    if (cnesDoctorCache?.has(cacheKey)) {
      return cnesDoctorCache.get(cacheKey)!;
    }

    let profData: any = null;
    if (this.integraSusService) {
      try {
        profData = await this.integraSusService.findProfessionalInCnes({
          cns: cleanCns,
          cpf: cleanCpf,
          nome: rawName,
          cnes: doc.targetCnes,
        });
      } catch (err: any) {
        this.logger.warn(`Falha na busca CNES para ${rawName}: ${err.message}`);
      }
    }

    let resolvedHcId = doc.defaultHealthCenterId;
    let resolvedSpecialtyIds: string[] = [];

    if (profData && Array.isArray(profData.unidades) && profData.unidades.length > 0) {
      const targetCnes = (doc.targetCnes || '2606712').trim();

      // 1. Procura vínculo na unidade executante prioritária (ex: Policlínica 2606712 ou a indicada no pedido)
      let matchedUnit = profData.unidades.find(
        (u: any) => String(u.codigo || u.cnes || '').trim() === targetCnes
      );

      // 2. Se não achou na unidade executante indicada, procura em 2606712 (Policlínica Municipal)
      if (!matchedUnit) {
        matchedUnit = profData.unidades.find(
          (u: any) => String(u.codigo || u.cnes || '').trim() === '2606712'
        );
      }

      // 3. Se ainda não achou, procura em qualquer unidade executante do município no banco
      if (!matchedUnit) {
        const [execHc] = await tx
          .select({ id: schema.healthCenters.id, cnes: schema.healthCenters.cnes })
          .from(schema.healthCenters)
          .where(and(
            eq(schema.healthCenters.stExecutante, true),
            inArray(schema.healthCenters.cnes, profData.unidades.map((u: any) => String(u.codigo || u.cnes || '').trim()))
          ))
          .limit(1);
        if (execHc) {
          matchedUnit = profData.unidades.find((u: any) => String(u.codigo || u.cnes || '').trim() === execHc.cnes);
        }
      }

      // 4. Se não tem vínculo em executante, procura qualquer unidade municipal cadastrada
      if (!matchedUnit) {
        for (const u of profData.unidades) {
          const uCnes = String(u.codigo || u.cnes || '').trim();
          if (healthCenterCache?.has(uCnes)) {
            matchedUnit = u;
            break;
          }
        }
      }

      if (matchedUnit) {
        const unitCnes = String(matchedUnit.codigo || matchedUnit.cnes || '').trim();
        // Resolve health center id
        if (healthCenterCache?.has(unitCnes)) {
          resolvedHcId = healthCenterCache.get(unitCnes)!;
        } else {
          const [foundHc] = await tx
            .select({ id: schema.healthCenters.id })
            .from(schema.healthCenters)
            .where(eq(schema.healthCenters.cnes, unitCnes))
            .limit(1);
          if (foundHc) {
            resolvedHcId = foundHc.id;
            healthCenterCache?.set(unitCnes, foundHc.id);
          }
        }

        // Resolve CBO / Especialidade da unidade
        const cboCodigo = matchedUnit.cbo?.codigo ? String(matchedUnit.cbo.codigo).trim() : null;
        const cboNome = matchedUnit.cbo?.nome ? String(matchedUnit.cbo.nome).trim() : null;

        if (cboCodigo) {
          if (specialtyCache?.has(`cbo:${cboCodigo}`)) {
            resolvedSpecialtyIds.push(specialtyCache.get(`cbo:${cboCodigo}`)!);
          } else {
            const [spec] = await tx
              .select({ id: schema.specialties.id })
              .from(schema.specialties)
              .where(eq(schema.specialties.cbo, cboCodigo))
              .limit(1);
            if (spec) {
              resolvedSpecialtyIds.push(spec.id);
              specialtyCache?.set(`cbo:${cboCodigo}`, spec.id);
            }
          }
        } else if (cboNome) {
          const [spec] = await tx
            .select({ id: schema.specialties.id })
            .from(schema.specialties)
            .where(ilike(schema.specialties.name, `%${cboNome}%`))
            .limit(1);
          if (spec) {
            resolvedSpecialtyIds.push(spec.id);
          }
        }
      }
    }

    const result = {
      healthCenterId: resolvedHcId,
      specialtyIds: resolvedSpecialtyIds,
    };
    cnesDoctorCache?.set(cacheKey, result);
    return result;
  }

  /**
   * Resolução precisa da especialidade médica a partir dos dados do e-SUS e das 62 especialidades oficiais
   */
  async resolveSpecialtyId(
    tx: any,
    procName?: string,
    cboCode?: string,
    specialtyCache?: Map<string, string>,
  ): Promise<string | null> {
    const cacheKey = `${cboCode || ''}_${procName || ''}`.trim();
    if (cacheKey && specialtyCache?.has(cacheKey)) {
      return specialtyCache.get(cacheKey)!;
    }

    // 1. Busca por CBO exato (6 dígitos)
    if (cboCode && cboCode.trim().length >= 4) {
      const cleanCbo = cboCode.trim();
      const [found] = await tx
        .select({ id: schema.specialties.id })
        .from(schema.specialties)
        .where(eq(schema.specialties.cbo, cleanCbo))
        .limit(1);
      if (found) {
        if (cacheKey) specialtyCache?.set(cacheKey, found.id);
        return found.id;
      }
    }

    // 2. Mapeamento semântico por radical e termos de especialidades
    const norm = (procName || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase();

    let targetCbo: string | null = null;
    if (norm.includes('CARDIOLOG')) targetCbo = '225120';
    else if (norm.includes('ORTOPED') || norm.includes('TRAUMATO')) targetCbo = '225270';
    else if (norm.includes('PEDIAT') || norm.includes('INFANTIL')) targetCbo = '225124';
    else if (norm.includes('PSIQUIAT') || norm.includes('MENTAL')) targetCbo = '225133';
    else if (norm.includes('DERMATO')) targetCbo = '225135';
    else if (norm.includes('GINECO') || norm.includes('OBSTETR')) targetCbo = '225250';
    else if (norm.includes('UROLOG')) targetCbo = '225285';
    else if (norm.includes('OFTALMO')) targetCbo = '225265';
    else if (norm.includes('OTORRINO')) targetCbo = '225275';
    else if (norm.includes('ENDOCRINO') || norm.includes('METABOL')) targetCbo = '225155';
    else if (norm.includes('NEUROCIRURG')) targetCbo = '225260';
    else if (norm.includes('NEUROLOG')) targetCbo = '225112';
    else if (norm.includes('GASTRO')) targetCbo = '225165';
    else if (norm.includes('REUMATO')) targetCbo = '225136';
    else if (norm.includes('ANGIOLOG') || norm.includes('VASCULAR')) targetCbo = '225203';
    else if (norm.includes('INFECTO')) targetCbo = '225103';
    else if (norm.includes('PNEUMO')) targetCbo = '225127';
    else if (norm.includes('NEFROLOG')) targetCbo = '225109';
    else if (norm.includes('GERIAT')) targetCbo = '225180';
    else if (norm.includes('HEMATO')) targetCbo = '225185';
    else if (norm.includes('MASTOLOG')) targetCbo = '225255';
    else if (norm.includes('COLOPROCTO')) targetCbo = '225280';
    else if (norm.includes('ALERG') || norm.includes('IMUNO')) targetCbo = '225110';
    else if (norm.includes('ONCOLOG') || norm.includes('CANCER')) targetCbo = '225121';
    else if (norm.includes('CIRURGIA GERAL')) targetCbo = '225225';
    else if (norm.includes('ENDOSCOP')) targetCbo = '225310';
    else if (norm.includes('ULTRASS') || norm.includes('TOMOGRAF') || norm.includes('RESSON') || norm.includes('RADIOLOG') || norm.includes('MAMOGRAF')) targetCbo = '225320';
    else if (norm.includes('CITOPATOL')) targetCbo = '225305';
    else if (norm.includes('ANATOMOPATOL') || norm.includes('BIOPSIA')) targetCbo = '225148';
    else if (norm.includes('FAMILIA') || norm.includes('ESF')) targetCbo = '225130';
    else if (norm.includes('GENERALISTA')) targetCbo = '225170';
    else if (norm.includes('CLINIC') || norm.includes('CONSULTA')) targetCbo = '225125';

    if (targetCbo) {
      const [found] = await tx
        .select({ id: schema.specialties.id })
        .from(schema.specialties)
        .where(eq(schema.specialties.cbo, targetCbo))
        .limit(1);
      if (found) {
        if (cacheKey) specialtyCache?.set(cacheKey, found.id);
        return found.id;
      }
    }

    // 3. Fallback: busca por termo na tabela de especialidades
    const cleanTerm = norm
      .replace(/^CONSULTA\s+(EM|DE)\s+/i, '')
      .trim()
      .split(' ')[0];
    if (cleanTerm && cleanTerm.length >= 4) {
      const [found] = await tx
        .select({ id: schema.specialties.id })
        .from(schema.specialties)
        .where(ilike(schema.specialties.name, `%${cleanTerm}%`))
        .limit(1);
      if (found) {
        if (cacheKey) specialtyCache?.set(cacheKey, found.id);
        return found.id;
      }
    }

    // 4. Fallback final: Médico clínico geral (225125) ou primeiro do banco
    const [defaultSpec] = await tx
      .select({ id: schema.specialties.id })
      .from(schema.specialties)
      .where(eq(schema.specialties.cbo, '225125'))
      .limit(1);

    if (defaultSpec) {
      if (cacheKey) specialtyCache?.set(cacheKey, defaultSpec.id);
      return defaultSpec.id;
    }

    const [firstSpec] = await tx.select({ id: schema.specialties.id }).from(schema.specialties).limit(1);
    if (firstSpec) {
      if (cacheKey) specialtyCache?.set(cacheKey, firstSpec.id);
      return firstSpec.id;
    }

    return null;
  }

  /**
   * Auto-registro ou atualização de médico durante a importação em lote
   */
  async autoRegisterDoctorInBatch(
    tx: any,
    doctorData: {
      name?: string;
      cpf?: string;
      cns?: string;
      crm?: string;
      healthCenterId: string;
      procedureId?: string | null;
      specialtyId?: string | null;
      specialtyIds?: string[];
      nowTz: string;
      isExecutingDoctor?: boolean;
    },
    medicoProfileId: string,
    doctorCache: Map<string, string>,
  ): Promise<string | null> {
    const rawName = (doctorData.name || '').trim();
    if (!rawName || rawName.toUpperCase().includes('NAO INFORMADO') || rawName.toUpperCase().includes('NÃO INFORMADO')) {
      return null;
    }

    const rawCpf = String(doctorData.cpf || '').replace(/\D/g, '');
    const cleanCpf = rawCpf.length === 11 ? rawCpf : null;
    const formattedCpf = cleanCpf ? cleanCpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') : null;
    const cleanCns = String(doctorData.cns || '').replace(/\D/g, '');
    const validCns = cleanCns.length >= 10 ? cleanCns : null;
    const cleanCrm = doctorData.crm ? String(doctorData.crm).trim() : null;

    if (!cleanCpf && !validCns && !cleanCrm && (!rawName || rawName.length < 3)) {
      return null;
    }

    const targetSpecialtyIds: string[] = doctorData.specialtyIds && doctorData.specialtyIds.length > 0
      ? doctorData.specialtyIds
      : (doctorData.specialtyId ? [doctorData.specialtyId] : []);

    const cacheKey = cleanCpf || validCns || cleanCrm || rawName.toUpperCase();
    if (doctorCache.has(cacheKey)) {
      const existingDocId = doctorCache.get(cacheKey)!;
      await this.ensureDoctorRelations(tx, existingDocId, targetSpecialtyIds, doctorData.isExecutingDoctor ? doctorData.procedureId : undefined, doctorData.nowTz);
      return existingDocId;
    }

    // Busca médico existente por CPF, CNS, CRM ou Nome
    let existingDoctor: typeof schema.doctors.$inferSelect | null = null;
    if (cleanCpf) {
      const [found] = await tx
        .select()
        .from(schema.doctors)
        .where(or(
          eq(schema.doctors.cpf, cleanCpf),
          eq(schema.doctors.cpf, formattedCpf!)
        ))
        .limit(1);
      if (found) existingDoctor = found;
    }
    if (!existingDoctor && validCns) {
      const [found] = await tx
        .select()
        .from(schema.doctors)
        .where(eq(schema.doctors.cns, validCns))
        .limit(1);
      if (found) existingDoctor = found;
    }
    if (!existingDoctor && cleanCrm) {
      const [found] = await tx
        .select()
        .from(schema.doctors)
        .where(eq(schema.doctors.crm, cleanCrm))
        .limit(1);
      if (found) existingDoctor = found;
    }
    if (!existingDoctor && rawName && rawName.length >= 3) {
      const [foundUser] = await tx
        .select({ id: schema.users.id })
        .from(schema.users)
        .where(eq(schema.users.name, rawName.toUpperCase()))
        .limit(1);
      if (foundUser) {
        const [foundDoc] = await tx
          .select()
          .from(schema.doctors)
          .where(eq(schema.doctors.userId, foundUser.id))
          .limit(1);
        if (foundDoc) existingDoctor = foundDoc;
      }
    }

    if (existingDoctor) {
      doctorCache.set(cacheKey, existingDoctor.id);

      // Atualiza campos faltantes no médico
      const docUpdates: any = {};
      if (!existingDoctor.cns && validCns) docUpdates.cns = validCns;
      if (!existingDoctor.cpf && (formattedCpf || cleanCpf)) docUpdates.cpf = formattedCpf || cleanCpf;
      if (!existingDoctor.crm && cleanCrm) docUpdates.crm = cleanCrm;
      if (Object.keys(docUpdates).length > 0) {
        docUpdates.updatedAt = doctorData.nowTz;
        await tx.update(schema.doctors).set(docUpdates).where(eq(schema.doctors.id, existingDoctor.id));
      }

      // Se o médico possui unidade executante identificada, atualiza vínculo principal
      if (doctorData.healthCenterId) {
        await tx.update(schema.users).set({
          healthCenterId: doctorData.healthCenterId,
          updatedAt: doctorData.nowTz,
        }).where(eq(schema.users.id, existingDoctor.userId));

        const [existingUhc] = await tx
          .select({ id: schema.userHealthCenters.id })
          .from(schema.userHealthCenters)
          .where(and(
            eq(schema.userHealthCenters.userId, existingDoctor.userId),
            eq(schema.userHealthCenters.healthCenterId, doctorData.healthCenterId)
          ))
          .limit(1);
        if (!existingUhc) {
          await tx.insert(schema.userHealthCenters).values({
            id: crypto.randomUUID(),
            userId: existingDoctor.userId,
            healthCenterId: doctorData.healthCenterId,
            isDefault: true,
            createdAt: doctorData.nowTz,
            updatedAt: doctorData.nowTz,
          });
        } else {
          await tx.update(schema.userHealthCenters).set({
            isDefault: true,
            updatedAt: doctorData.nowTz,
          }).where(eq(schema.userHealthCenters.id, existingUhc.id));
        }
      }

      await this.ensureDoctorRelations(tx, existingDoctor.id, targetSpecialtyIds, doctorData.isExecutingDoctor ? doctorData.procedureId : undefined, doctorData.nowTz);
      return existingDoctor.id;
    }

    // Médico não cadastrado -> cria usuário e registro de médico
    const newUserId = crypto.randomUUID();
    const newDoctorId = crypto.randomUUID();
    const cleanNormalized = rawName
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '.')
      .replace(/\.+/g, '.')
      .replace(/^\.|\.$/g, '');
    const randomSuffix = cleanCpf ? cleanCpf.slice(-4) : Math.floor(Math.random() * 8999 + 1000);
    let generatedEmail = `${cleanNormalized || 'medico'}.${randomSuffix}@saude.gov.br`;
    const [existingEmail] = await tx
      .select({ id: schema.users.id })
      .from(schema.users)
      .where(eq(schema.users.email, generatedEmail))
      .limit(1);
    if (existingEmail) {
      generatedEmail = `${cleanNormalized || 'medico'}.${Date.now().toString().slice(-6)}@saude.gov.br`;
    }

    const defaultPasswordHash = '$2b$10$wT8K.VbEaXN9E5PqD6G9YeB8eY1qX9s2a7d4h3k2j1m0o9p8q7r6s'; // '123456'

    await tx.insert(schema.users).values({
      id: newUserId,
      name: rawName.toUpperCase(),
      email: generatedEmail,
      passwordHash: defaultPasswordHash,
      profileId: medicoProfileId,
      healthCenterId: doctorData.healthCenterId,
      forcePasswordChange: true,
      createdAt: doctorData.nowTz,
      updatedAt: doctorData.nowTz,
    });

    await tx.insert(schema.userProfiles).values({
      id: crypto.randomUUID(),
      userId: newUserId,
      profileId: medicoProfileId,
      isDefault: true,
      createdAt: doctorData.nowTz,
    });

    if (doctorData.healthCenterId) {
      await tx.insert(schema.userHealthCenters).values({
        id: crypto.randomUUID(),
        userId: newUserId,
        healthCenterId: doctorData.healthCenterId,
        isDefault: true,
        createdAt: doctorData.nowTz,
        updatedAt: doctorData.nowTz,
      });
    }

    await tx.insert(schema.doctors).values({
      id: newDoctorId,
      userId: newUserId,
      crm: cleanCrm,
      crmState: 'PB',
      attendanceType: 'AMBOS',
      isActive: true,
      cpf: formattedCpf || cleanCpf,
      cns: validCns,
      createdAt: doctorData.nowTz,
      updatedAt: doctorData.nowTz,
    });

    doctorCache.set(cacheKey, newDoctorId);

    await this.ensureDoctorRelations(tx, newDoctorId, targetSpecialtyIds, doctorData.isExecutingDoctor ? doctorData.procedureId : undefined, doctorData.nowTz);
    return newDoctorId;
  }

  /**
   * Helper: Garante que especialidade e procedimento estejam vinculados ao médico conforme a unidade executante
   */
  private async ensureDoctorRelations(
    tx: any,
    doctorId: string,
    specialtyIds?: string[] | string | null,
    procedureId?: string | null,
    nowTz: string = new Date().toISOString(),
  ) {
    const specIds: string[] = Array.isArray(specialtyIds)
      ? specialtyIds
      : (specialtyIds ? [specialtyIds] : []);

    if (specIds.length > 0) {
      // Remove especialidades que não façam parte da lista vinculada à unidade executante
      await tx
        .delete(schema.doctorSpecialties)
        .where(and(
          eq(schema.doctorSpecialties.doctorId, doctorId),
          notInArray(schema.doctorSpecialties.specialtyId, specIds)
        ));

      // Insere as especialidades válidas da unidade executante
      for (const sId of specIds) {
        const [existingSpec] = await tx
          .select({ doctorId: schema.doctorSpecialties.doctorId })
          .from(schema.doctorSpecialties)
          .where(and(
            eq(schema.doctorSpecialties.doctorId, doctorId),
            eq(schema.doctorSpecialties.specialtyId, sId)
          ))
          .limit(1);
        if (!existingSpec) {
          await tx.insert(schema.doctorSpecialties).values({
            doctorId,
            specialtyId: sId,
            createdAt: nowTz,
          });
        }
      }
    }

    if (procedureId) {
      const [existingProc] = await tx
        .select({ doctorId: schema.doctorProcedures.doctorId })
        .from(schema.doctorProcedures)
        .where(and(
          eq(schema.doctorProcedures.doctorId, doctorId),
          eq(schema.doctorProcedures.procedureId, procedureId)
        ))
        .limit(1);
      if (!existingProc) {
        await tx.insert(schema.doctorProcedures).values({
          doctorId,
          procedureId,
          createdAt: nowTz,
        });
      }
    }
  }
}
