import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Inject } from '@nestjs/common';
import { eq, and, sql, desc } from 'drizzle-orm';
import * as crypto from 'crypto';
import * as schema from '../database/schema';
import { BpaHeaderDto, BpaRecordDto, CreateBpaBatchDto } from './dto/bpa.dto';
import { extractLogradouro, generateBpaITxt, removeAccents } from './bpa-formatter.util';

@Injectable()
export class BpaService {
  constructor(
    @Inject('DRIZZLE')
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  /**
   * Identifica se o usuário é Administrador ou Coordenador de Unidade
   * e extrai a unidade permitida.
   */
  private resolveUserScope(user: any, requestedUnitId?: string): { isAdmin: boolean; isCoordinator: boolean; effectiveUnitId?: string } {
    const profileName = user.activeProfileName || '';
    const isAdmin = Boolean(user.permissions?.includes('admin:access') || profileName === 'Administrador');
    const isCoordinator = profileName === 'Coordenador de Unidade';

    if (!isAdmin && !isCoordinator) {
      throw new ForbiddenException('Acesso restrito a Administradores e Coordenadores de Unidade.');
    }

    if (isCoordinator) {
      if (!user.healthCenterId) {
        throw new ForbiddenException('Usuário com perfil de Coordenador de Unidade não possui Unidade de Saúde vinculada.');
      }
      return { isAdmin: false, isCoordinator: true, effectiveUnitId: user.healthCenterId };
    }

    return { isAdmin: true, isCoordinator: false, effectiveUnitId: requestedUnitId };
  }

  /**
   * Consulta os atendimentos finalizados no SINPeP para a competência selecionada
   */
  async getRecords(
    user: any,
    competencia: string, // AAAA-MM
    unitId?: string,
    doctorId?: string,
    patientIdType: 'CPF' | 'CNS' = 'CPF',
  ): Promise<{ records: BpaRecordDto[]; total: number; summary: { withCpf: number; withCns: number; withoutCid: number; withoutProc: number } }> {
    const { effectiveUnitId } = this.resolveUserScope(user, unitId);

    // Valida e extrai intervalo da competência (ex: 2026-11 -> 2026-11-01 a 2026-11-30)
    const cleanComp = (competencia || '').trim();
    if (!/^\d{4}-\d{2}$/.test(cleanComp)) {
      throw new Error('Formato de competência inválido. Utilize o formato AAAA-MM (ex: 2026-11).');
    }

    const [yearStr, monthStr] = cleanComp.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);

    const startDate = `${cleanComp}-01 00:00:00`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${cleanComp}-${String(lastDay).padStart(2, '0')} 23:59:59.999`;

    // 1. Carrega regras ativas de sobrescrita (De-Para)
    const rules = await this.db.select().from(schema.bpaExportRules);

    // 2. Consulta de atendimentos médicos finalizados com relacionamentos
    const recordsQuery = sql`
      SELECT 
        mr.id AS record_id,
        mr.record_date AS record_date,
        mr.cid10 AS cid10,
        mr.executing_unit_name AS executing_unit_name,
        mr.executing_unit_cnes AS executing_unit_cnes,
        p.id AS patient_id,
        p.name AS patient_name,
        p.cpf AS patient_cpf,
        p.cns AS patient_cns,
        p.birth_date AS patient_birth_date,
        p.gender AS patient_gender,
        p.address AS patient_address,
        p.health_center_id AS patient_health_center_id,
        u.id AS doctor_user_id,
        u.name AS doctor_name,
        d.id AS doctor_id,
        d.cpf AS doctor_cpf,
        d.cns AS doctor_cns,
        hc.id AS health_center_id,
        hc.name AS hc_name,
        hc.cnes AS hc_cnes,
        hc.co_municipio_ibge AS hc_ibge,
        hc.co_cep AS hc_cep,
        hc.no_bairro AS hc_bairro,
        hc.no_logradouro AS hc_logradouro,
        hc.nu_endereco AS hc_numero,
        ds.cbo AS doctor_cbo,
        sched.cbo AS schedule_cbo,
        sched_proc.code AS sched_procedure_code,
        sched_proc.name AS sched_procedure_name,
        phone.phone_number AS patient_phone
      FROM medical_records mr
      INNER JOIN patients p ON mr.patient_id = p.id
      INNER JOIN users u ON mr.doctor_id = u.id
      LEFT JOIN doctors d ON d.user_id = u.id
      LEFT JOIN doctor_specialties ds ON ds.doctor_id = d.id
      LEFT JOIN schedule_slots slot ON slot.patient_id = p.id AND slot.date = TO_CHAR(mr.record_date, 'YYYY-MM-DD')
      LEFT JOIN schedules sched ON slot.schedule_id = sched.id
      LEFT JOIN procedures sched_proc ON sched.procedure_id = sched_proc.id
      LEFT JOIN health_centers hc ON (
        (mr.executing_unit_cnes IS NOT NULL AND hc.cnes = mr.executing_unit_cnes)
        OR (sched.executing_health_center_id IS NOT NULL AND hc.id = sched.executing_health_center_id)
        OR (p.health_center_id = hc.id)
      )
      LEFT JOIN LATERAL (
        SELECT phone_number FROM patient_phones WHERE patient_id = p.id ORDER BY created_at DESC LIMIT 1
      ) phone ON true
      WHERE mr.is_active = true
        AND mr.record_date >= ${startDate}::timestamp
        AND mr.record_date <= ${endDate}::timestamp
        ${effectiveUnitId ? sql`AND hc.id = ${effectiveUnitId}::uuid` : sql``}
        ${doctorId ? sql`AND u.id = ${doctorId}::uuid` : sql``}
      ORDER BY mr.record_date ASC;
    `;

    const result = await this.db.execute(recordsQuery);
    const rows = (result as any)?.rows || (Array.isArray(result) ? result : []);

    let withCpf = 0;
    let withCns = 0;
    let withoutCid = 0;
    let withoutProc = 0;

    const bpaRecords: BpaRecordDto[] = [];
    const seenRecords = new Set<string>();

    for (const r of rows) {
      // Evita duplicatas de join se houver múltiplos slots no mesmo dia
      if (seenRecords.has(r.record_id)) continue;
      seenRecords.add(r.record_id);

      // 1. Data do atendimento (AAAAMMDD)
      const recordDateObj = new Date(r.record_date);
      const yAtend = recordDateObj.getFullYear();
      const mAtend = String(recordDateObj.getMonth() + 1).padStart(2, '0');
      const dAtend = String(recordDateObj.getDate()).padStart(2, '0');
      const dataAtendimento = `${yAtend}${mAtend}${dAtend}`;

      // 2. Data de nascimento do paciente e cálculo de idade
      let dtNascFormatted = '19800101';
      let idadeStr = '030';
      if (r.patient_birth_date) {
        const bdate = new Date(r.patient_birth_date);
        const yB = bdate.getFullYear();
        const mB = String(bdate.getMonth() + 1).padStart(2, '0');
        const dB = String(bdate.getDate()).padStart(2, '0');
        dtNascFormatted = `${yB}${mB}${dB}`;

        let age = yAtend - yB;
        if (
          recordDateObj.getMonth() < bdate.getMonth() ||
          (recordDateObj.getMonth() === bdate.getMonth() && recordDateObj.getDate() < bdate.getDate())
        ) {
          age--;
        }
        idadeStr = Math.max(0, age).toString().padStart(3, '0');
      }

      // 3. Documentos do paciente
      const cpfPatient = (r.patient_cpf || '').replace(/\D/g, '');
      const cnsPatient = (r.patient_cns || '').replace(/\D/g, '');
      if (cpfPatient) withCpf++;
      if (cnsPatient) withCns++;

      // 4. Profissional e CBO
      let cboProf = r.schedule_cbo || r.doctor_cbo || '225125'; // Fallback: Médico Clínico
      let cnsProf = (r.doctor_cns || '').replace(/\D/g, '');
      if (!cnsProf) {
        cnsProf = (r.doctor_cpf || '').replace(/\D/g, '').padEnd(15, '0');
      }

      // 5. Procedimento SIGTAP (10 dígitos)
      let procCode = (r.sched_procedure_code || '').replace(/\D/g, '');
      let procName = r.sched_procedure_name || 'CONSULTA MEDICA EM ATENCAO ESPECIALIZADA';
      if (!procCode || procCode.length < 10) {
        procCode = '0301010072'; // Consulta Médica em Atenção Especializada oficial SUS
        withoutProc++;
      }

      // 6. Sobrescrita por Regras cadastradas (se aplicável)
      for (const rule of rules) {
        if (
          rule.procedureCode.replace(/\D/g, '') === procCode &&
          (!rule.healthCenterId || rule.healthCenterId === r.health_center_id)
        ) {
          cboProf = rule.cboOverride;
          break;
        }
      }

      // 7. CID-10
      let cidClean = removeAccents(r.cid10).replace(/[^a-zA-Z0-9]/g, '');
      if (!cidClean) {
        cidClean = 'R69'; // Causa de morbidade não especificada (fallback clínico seguro)
        withoutCid++;
      }

      // 8. Endereço e logradouro
      const fullAddress = r.patient_address || r.hc_logradouro || '';
      const logInfo = extractLogradouro(fullAddress);

      // 9. Unidade Executante
      const cnesUnit = (r.hc_cnes || r.executing_unit_cnes || '0000000').replace(/\D/g, '').padStart(7, '0');
      const nameUnit = r.hc_name || r.executing_unit_name || 'UNIDADE BASICA DE SAUDE';
      const ibgeCode = (r.hc_ibge || '251390').replace(/\D/g, ''); // Fallback Sousa-PB

      bpaRecords.push({
        id: r.record_id,
        cnes: cnesUnit,
        competencia: cleanComp.replace('-', ''),
        cnsProfissional: cnsProf,
        cboProfissional: cboProf,
        nomeProfissional: r.doctor_name || 'PROFISSIONAL MEDICO',
        nomeEstabelecimento: nameUnit,
        dataAtendimento,
        procedimento: procCode,
        procedimentoNome: procName,
        cpfPaciente: patientIdType === 'CPF' ? cpfPatient : '',
        cnsPaciente: patientIdType === 'CNS' ? cnsPatient : (cpfPatient ? '' : cnsPatient),
        sexo: (r.patient_gender || 'M').toUpperCase().startsWith('F') ? 'F' : 'M',
        ibge: ibgeCode,
        cid: cidClean,
        idade: idadeStr,
        quantidade: '000001',
        caraterAtendimento: '01', // Eletivo
        numeroAutorizacao: '',
        origem: 'BPA',
        nomePaciente: r.patient_name || 'PACIENTE ATENDIDO',
        dataNascimento: dtNascFormatted,
        racaCor: '03', // Parda (padrão SUS)
        etnia: '',
        nacionalidade: '010', // Brasil
        cep: (r.hc_cep || '58865000').replace(/\D/g, ''),
        logradouro: logInfo.logCode,
        endereco: logInfo.logName || 'NAO INFORMADO',
        complemento: '',
        numero: 'SN',
        bairro: r.hc_bairro || 'CENTRO',
        telefone: r.patient_phone || '',
        email: '',
        ine: '',
        situacaoRua: false,
        semCpf: !cpfPatient,
      });
    }

    return {
      records: bpaRecords,
      total: bpaRecords.length,
      summary: {
        withCpf,
        withCns,
        withoutCid,
        withoutProc,
      },
    };
  }

  /**
   * Gera o arquivo oficial magnético do BPA-I em formato de texto (.TXT)
   */
  async exportTxt(user: any, competencia: string, unitId: string, records: BpaRecordDto[]): Promise<string> {
    const { effectiveUnitId } = this.resolveUserScope(user, unitId);

    // Carrega dados da unidade
    let unitData: any = null;
    if (effectiveUnitId) {
      const units = await this.db.select().from(schema.healthCenters).where(eq(schema.healthCenters.id, effectiveUnitId));
      unitData = units[0];
    }

    // Carrega dados institucionais do município
    const brandings = await this.db.select().from(schema.municipalityBrandings).where(eq(schema.municipalityBrandings.isActive, true));
    const branding = brandings[0] || {};

    const header: BpaHeaderDto = {
      competencia: competencia.replace('-', ''),
      orgaoNome: branding.fullName || 'PREFEITURA MUNICIPAL DE SOUSA',
      orgaoSigla: 'SMS',
      orgaoCnpj: (unitData?.nuCnpj || '00000000000000').replace(/\D/g, ''),
      orgaoDestinoNome: branding.department || 'SECRETARIA MUNICIPAL DE SAUDE',
      indicadorDestino: 'M',
      versaoSistema: 'SINPEP1.40',
    };

    return generateBpaITxt(header, records);
  }

  /**
   * Cria e congela um Lote Oficial no banco de dados com assinatura SHA-256
   */
  async createBatch(user: any, dto: CreateBpaBatchDto) {
    const { effectiveUnitId } = this.resolveUserScope(user, dto.unitId);

    const sha256Hash = crypto
      .createHash('sha256')
      .update(dto.fileContent, 'utf-8')
      .digest('hex');

    const [batch] = await this.db
      .insert(schema.bpaBatches)
      .values({
        id: crypto.randomUUID(),
        competencia: dto.competencia,
        healthCenterId: effectiveUnitId || dto.unitId,
        totalRecords: dto.totalRecords,
        sha256Hash,
        fileContent: dto.fileContent,
        metadata: dto.metadata || {},
        createdById: user.id,
        createdAt: new Date().toISOString(),
      })
      .returning();

    return batch;
  }

  /**
   * Lista os lotes oficiais arquivados
   */
  async listBatches(user: any, competencia?: string, unitId?: string) {
    const { effectiveUnitId } = this.resolveUserScope(user, unitId);

    let whereClause = sql`1=1`;
    if (effectiveUnitId) {
      whereClause = sql`${whereClause} AND ${schema.bpaBatches.healthCenterId} = ${effectiveUnitId}::uuid`;
    }
    if (competencia) {
      whereClause = sql`${whereClause} AND ${schema.bpaBatches.competencia} = ${competencia}`;
    }

    return this.db.query.bpaBatches.findMany({
      where: whereClause,
      orderBy: [desc(schema.bpaBatches.createdAt)],
      with: {
        healthCenter: {
          columns: {
            id: true,
            name: true,
            cnes: true,
          },
        },
        createdBy: {
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
   * Recupera o lote oficial por ID
   */
  async getBatchById(user: any, id: string) {
    const batch = await this.db.query.bpaBatches.findFirst({
      where: eq(schema.bpaBatches.id, id),
      with: {
        healthCenter: {
          columns: {
            id: true,
            name: true,
            cnes: true,
          },
        },
        createdBy: {
          columns: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!batch) {
      throw new NotFoundException(`Lote BPA com identificador ${id} não foi encontrado.`);
    }

    const { effectiveUnitId } = this.resolveUserScope(user, batch.healthCenterId);
    if (effectiveUnitId && batch.healthCenterId !== effectiveUnitId) {
      throw new ForbiddenException('Acesso negado aos lotes de outra unidade de saúde.');
    }

    return batch;
  }

  /**
   * Exclui um lote arquivado (Apenas Administrador)
   */
  async deleteBatch(user: any, id: string) {
    const profileName = user.activeProfileName || '';
    const isAdmin = Boolean(user.permissions?.includes('admin:access') || profileName === 'Administrador');
    if (!isAdmin) {
      throw new ForbiddenException('Apenas o Administrador pode excluir lotes oficiais arquivados.');
    }

    const batch = await this.getBatchById(user, id);
    await this.db.delete(schema.bpaBatches).where(eq(schema.bpaBatches.id, batch.id));
    return { success: true, message: 'Lote oficial excluído com sucesso.' };
  }

  /**
   * Regras de exportação (De-Para)
   */
  async listRules() {
    return this.db.select().from(schema.bpaExportRules);
  }

  async createRule(dto: { healthCenterId?: string; procedureCode: string; cboOverride: string; description?: string }) {
    const [rule] = await this.db
      .insert(schema.bpaExportRules)
      .values({
        id: crypto.randomUUID(),
        healthCenterId: dto.healthCenterId || null,
        procedureCode: dto.procedureCode,
        cboOverride: dto.cboOverride,
        description: dto.description || null,
        createdAt: new Date().toISOString(),
      })
      .returning();

    return rule;
  }
}
