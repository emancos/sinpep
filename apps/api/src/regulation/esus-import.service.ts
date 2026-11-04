import { Injectable, Inject, Logger, NotFoundException } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../database';
import { DATABASE_CONNECTION } from '../database/database.constants';
import { eq, desc, sql } from 'drizzle-orm';
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

    // Cache local de unidades de saúde e procedimentos durante este lote
    const healthCenterCache = new Map<string, string>(); // cnes -> id
    const procedureCache = new Map<string, string>(); // code/name -> id

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
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              });

              healthCenterId = newCenterId;
              healthCenterCache.set(cnes, healthCenterId);
            }
          }
        }

        // ---------------------------------------------------------
        // 3. PACIENTE: Deduplicação e Ingestão
        // ---------------------------------------------------------
        const rawCpf = (src.pacienteNuCpf || '').replace(/\D/g, '');
        const rawCns = (src.pacienteNuCns || src.pacienteCartoes?.[0]?.nuCns || '').replace(/\D/g, '');
        const patientName = (src.pacienteNome || 'NÃO INFORMADO').trim().toUpperCase();

        let patientId: string = crypto.randomUUID();
        let existingPatient: typeof schema.patients.$inferSelect | null = null;

        if (rawCpf && rawCpf.length === 11) {
          const [found] = await tx
            .select()
            .from(schema.patients)
            .where(eq(schema.patients.cpf, rawCpf))
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
          if (!existingPatient.cpf && rawCpf.length === 11) updates.cpf = rawCpf;

          if (Object.keys(updates).length > 0) {
            updates.updatedAt = new Date().toISOString();
            await tx
              .update(schema.patients)
              .set(updates)
              .where(eq(schema.patients.id, patientId));
            patientsUpdated++;
          }
        } else {
          // Cria novo paciente no SINPeP
          let birthDateStr = new Date('1980-01-01').toISOString();
          if (src.pacienteDtNascimento) {
            const parsed = new Date(src.pacienteDtNascimento);
            if (!isNaN(parsed.getTime())) birthDateStr = parsed.toISOString();
          }

          // Se não houver CPF, gera um identificador único provisório baseado no CNS ou UUID
          const cpfToUse = rawCpf.length === 11 ? rawCpf : `SUS${rawCns || patientId.replace(/\D/g, '').slice(0, 11)}`;

          await tx.insert(schema.patients).values({
            id: patientId,
            name: patientName,
            cpf: cpfToUse,
            cns: rawCns || null,
            birthDate: birthDateStr,
            gender: src.pacienteCoSexo === 'F' ? 'F' : 'M',
            address: fullAddress || null,
            healthCenterId,
            attentionLevel: 1,
            isActive: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
          patientsCreated++;
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
        // 5. PROCEDIMENTO / SIGTAP: Buscar ou Auto-Provisionar
        // ---------------------------------------------------------
        const sigtapCode = (src.coProcedimentoSigtap || src.coProcedimentoInterno || '').trim();
        const procName = (src.noProcedimentoInterno || 'PROCEDIMENTO REGULADO').trim().toUpperCase();
        let procedureId: string | null = null;

        if (sigtapCode && procedureCache.has(sigtapCode)) {
          procedureId = procedureCache.get(sigtapCode)!;
        } else {
          // Tenta localizar por código SIGTAP
          if (sigtapCode) {
            const [foundProc] = await tx
              .select({ id: schema.procedures.id })
              .from(schema.procedures)
              .where(eq(schema.procedures.code, sigtapCode))
              .limit(1);
            if (foundProc) {
              procedureId = foundProc.id;
              procedureCache.set(sigtapCode, foundProc.id);
            }
          }

          // Se não encontrou por código, tenta por nome
          if (!procedureId && procName) {
            const [foundProc] = await tx
              .select({ id: schema.procedures.id })
              .from(schema.procedures)
              .where(eq(schema.procedures.name, procName))
              .limit(1);
            if (foundProc) {
              procedureId = foundProc.id;
              procedureCache.set(procName, foundProc.id);
            }
          }

          // Se ainda não existir, cria o procedimento no catálogo com os dados do e-SUS
          if (!procedureId) {
            const newProcId = crypto.randomUUID();
            const mod = (src.noModulo || '').toUpperCase();
            const procType: 'CONSULTA' | 'EXAME' | 'PROCEDIMENTO' =
              mod.includes('CONSULTA') ? 'CONSULTA' : mod.includes('EXAME') ? 'EXAME' : 'PROCEDIMENTO';

            await tx.insert(schema.procedures).values({
              id: newProcId,
              code: sigtapCode || `INT-${newProcId.slice(0, 8)}`,
              name: procName,
              type: procType,
              requiresRegulation: true,
              isActive: true,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            });

            procedureId = newProcId;
            if (sigtapCode) procedureCache.set(sigtapCode, procedureId);
            procedureCache.set(procName, procedureId);
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

        // Data de criação
        let createdAtDate = new Date().toISOString();
        if (src.dtSolicitacao) {
          const parsed = new Date(src.dtSolicitacao.replace(' ', 'T'));
          if (!isNaN(parsed.getTime())) createdAtDate = parsed.toISOString();
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
              priority,
              status: mappedStatus,
              type: reqType,
              cid10: cidText,
              clinicalJustification: justificationText,
              clinicalHistory: clinicalHistoryText,
              updatedAt: new Date().toISOString(),
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
            type: reqType,
            cid10: cidText,
            clinicalJustification: justificationText,
            clinicalHistory: clinicalHistoryText,
            priority,
            status: mappedStatus,
            createdAt: createdAtDate,
            updatedAt: new Date().toISOString(),
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
              let histDate = new Date().toISOString();
              if (hist.dtHistorico) {
                const parsed = new Date(hist.dtHistorico.replace(' ', 'T'));
                if (!isNaN(parsed.getTime())) histDate = parsed.toISOString();
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
            updatedAt: new Date().toISOString(),
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
