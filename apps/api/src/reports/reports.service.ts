import { Injectable, Inject, ForbiddenException, NotFoundException } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../database/schema';
import { sql, count, eq, desc, and, or, gte, lte } from 'drizzle-orm';

@Injectable()
export class ReportsService {
  constructor(
    @Inject('DATABASE_CONNECTION')
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  // =========================================================================
  // RELATÓRIOS GLOBAIS INTEGRADOS (SINPeP & e-SUS Regulação)
  // =========================================================================

  async getEpidemiological() {
    const anamnesisCount = await this.db.select({
      total: count(),
      hypertensive: sql<number>`SUM(CASE WHEN ${schema.patientAnamnesis.isHypertensive} = true THEN 1 ELSE 0 END)::int`,
      diabetic: sql<number>`SUM(CASE WHEN ${schema.patientAnamnesis.isDiabetic} = true THEN 1 ELSE 0 END)::int`,
      smoker: sql<number>`SUM(CASE WHEN ${schema.patientAnamnesis.isSmoker} = true THEN 1 ELSE 0 END)::int`,
      oncological: sql<number>`SUM(CASE WHEN ${schema.patientAnamnesis.isOncological} = true THEN 1 ELSE 0 END)::int`,
      pcd: sql<number>`SUM(CASE WHEN ${schema.patientAnamnesis.isPcd} = true THEN 1 ELSE 0 END)::int`,
    }).from(schema.patientAnamnesis);

    // Unifica CIDs de atendimentos clínicos (SINPeP) com solicitações regulatórias do e-SUS Regulação e SINPeP
    const topCidRes = await this.db.execute(sql`
      SELECT 
        clean_cid as code,
        MAX(display_name) as description,
        SUM(total)::int as count,
        SUM(sinpep_count)::int as from_sinpep,
        SUM(esus_count)::int as from_esus
      FROM (
        SELECT 
          SPLIT_PART(mr.cid10, ' - ', 1) as clean_cid,
          COALESCE(c.description, mr.cid10) as display_name,
          COUNT(*)::int as total,
          COUNT(*)::int as sinpep_count,
          0::int as esus_count
        FROM medical_records mr
        LEFT JOIN cid10 c ON c.code = SPLIT_PART(mr.cid10, ' - ', 1)
        WHERE mr.cid10 IS NOT NULL AND mr.cid10 != ''
        GROUP BY clean_cid, display_name

        UNION ALL

        SELECT 
          SPLIT_PART(rr.cid10, ' - ', 1) as clean_cid,
          CASE 
            WHEN rr.cid10 LIKE '% - %' THEN SUBSTRING(rr.cid10 FROM POSITION(' - ' IN rr.cid10) + 3)
            ELSE COALESCE(c.description, rr.cid10)
          END as display_name,
          COUNT(*)::int as total,
          COUNT(*) FILTER (WHERE rr.protocol_number LIKE 'REG-%')::int as sinpep_count,
          COUNT(*) FILTER (WHERE rr.protocol_number NOT LIKE 'REG-%')::int as esus_count
        FROM regulation_requests rr
        LEFT JOIN cid10 c ON c.code = SPLIT_PART(rr.cid10, ' - ', 1)
        WHERE rr.cid10 IS NOT NULL AND rr.cid10 != ''
        GROUP BY clean_cid, display_name
      ) unified_cid
      GROUP BY clean_cid
      ORDER BY count DESC
      LIMIT 10
    `);

    const topCidRows = (topCidRes as any)?.rows || (Array.isArray(topCidRes) ? topCidRes : []);

    return {
      comorbidities: anamnesisCount[0],
      topCid: topCidRows,
    };
  }

  async getOperational() {
    // Contagem de atendimentos clínicos do prontuário
    const recordsCount = await this.db.select({ count: count() }).from(schema.medicalRecords);
    
    // Contagem de solicitações regulatórias divididas por procedência (SINPeP vs e-SUS Regulação)
    const regulationCountRes = await this.db.execute(sql`
      SELECT 
        COUNT(*)::int as total_regulation,
        COUNT(*) FILTER (WHERE protocol_number NOT LIKE 'REG-%')::int as esus_requests,
        COUNT(*) FILTER (WHERE protocol_number LIKE 'REG-%')::int as sinpep_requests
      FROM regulation_requests
    `);
    const regRows = (regulationCountRes as any)?.rows || [];
    const regCounts = regRows[0] || { total_regulation: 0, esus_requests: 0, sinpep_requests: 0 };

    // Contagem de acolhimento na recepção por procedência
    const queueCountRes = await this.db.execute(sql`
      SELECT 
        COUNT(*)::int as total_queue,
        COUNT(*) FILTER (WHERE esus_solicitacao_id IS NOT NULL)::int as esus_queue,
        COUNT(*) FILTER (WHERE esus_solicitacao_id IS NULL)::int as sinpep_queue
      FROM attendance_queue
    `);
    const queueRows = (queueCountRes as any)?.rows || [];
    const queueCounts = queueRows[0] || { total_queue: 0, esus_queue: 0, sinpep_queue: 0 };

    // Atendimentos e demandas consolidadas por mês (últimos 6 meses)
    const recordsByMonth = await this.db.execute(sql`
      SELECT 
        month,
        SUM(count)::int as count,
        SUM(sinpep_count)::int as sinpep_count,
        SUM(esus_count)::int as esus_count
      FROM (
        SELECT 
          TO_CHAR(created_at, 'YYYY-MM') as month,
          COUNT(*)::int as count,
          COUNT(*)::int as sinpep_count,
          0::int as esus_count
        FROM medical_records
        WHERE created_at >= NOW() - INTERVAL '6 months'
        GROUP BY month

        UNION ALL

        SELECT 
          TO_CHAR(created_at, 'YYYY-MM') as month,
          COUNT(*)::int as count,
          COUNT(*) FILTER (WHERE protocol_number LIKE 'REG-%')::int as sinpep_count,
          COUNT(*) FILTER (WHERE protocol_number NOT LIKE 'REG-%')::int as esus_count
        FROM regulation_requests
        WHERE created_at >= NOW() - INTERVAL '6 months'
        GROUP BY month
      ) combined_months
      GROUP BY month
      ORDER BY month ASC
    `);

    // Top médicos por volume de atendimentos clínicos realizados
    const recordsByDoctor = await this.db.execute(sql`
      SELECT 
        u.name as doctor_name,
        COUNT(mr.id)::int as count
      FROM medical_records mr
      JOIN users u ON mr.doctor_id = u.id
      GROUP BY u.name
      ORDER BY count DESC
      LIMIT 10
    `);

    const monthRows = (recordsByMonth as any)?.rows || (Array.isArray(recordsByMonth) ? recordsByMonth : []);
    const docRows = (recordsByDoctor as any)?.rows || (Array.isArray(recordsByDoctor) ? recordsByDoctor : []);

    const totalMedical = recordsCount[0]?.count || 0;
    const totalReg = regCounts.total_regulation || 0;
    const totalQueue = queueCounts.total_queue || 0;
    const totalConsolidated = totalMedical + totalReg;

    const totalEsus = (regCounts.esus_requests || 0) + (queueCounts.esus_queue || 0);
    const totalSinpep = totalMedical + (regCounts.sinpep_requests || 0) + (queueCounts.sinpep_queue || 0);

    return {
      totalRecords: totalMedical,
      totalRegulationRequests: totalReg,
      totalReceptionQueue: totalQueue,
      totalConsolidated,
      byOrigin: {
        sinpep: totalSinpep,
        esus: totalEsus,
        percentageEsus: (totalEsus + totalSinpep) > 0 ? Math.round((totalEsus / (totalEsus + totalSinpep)) * 100) : 0,
        percentageSinpep: (totalEsus + totalSinpep) > 0 ? Math.round((totalSinpep / (totalEsus + totalSinpep)) * 100) : 0,
      },
      recordsByMonth: monthRows,
      recordsByDoctor: docRows,
    };
  }

  async getProcedures() {
    // Unifica procedimentos/exames da Regulação (SINPeP + e-SUS Regulação) e exames solicitados no prontuário
    const proceduresStats = await this.db.execute(sql`
      SELECT 
        exam,
        SUM(count)::int as count,
        SUM(sinpep_count)::int as from_sinpep,
        SUM(esus_count)::int as from_esus
      FROM (
        SELECT 
          COALESCE(pg.name, proc.name, s.name, 'Procedimento Regulado') as exam,
          COUNT(*)::int as count,
          COUNT(*) FILTER (WHERE r.protocol_number LIKE 'REG-%')::int as sinpep_count,
          COUNT(*) FILTER (WHERE r.protocol_number NOT LIKE 'REG-%')::int as esus_count
        FROM regulation_requests r
        LEFT JOIN procedures proc ON r.procedure_id = proc.id
        LEFT JOIN procedure_groups pg ON (r.procedure_group_id = pg.id OR proc.procedure_group_id = pg.id)
        LEFT JOIN specialties s ON r.specialty_id = s.id
        GROUP BY exam

        UNION ALL

        SELECT 
          jsonb_array_elements_text(requested_exams) as exam,
          COUNT(*)::int as count,
          COUNT(*)::int as sinpep_count,
          0::int as esus_count
        FROM medical_records
        WHERE jsonb_array_length(requested_exams) > 0
        GROUP BY exam
      ) unified_exams
      GROUP BY exam
      ORDER BY count DESC
      LIMIT 15
    `);

    const rows = (proceduresStats as any)?.rows || (Array.isArray(proceduresStats) ? proceduresStats : []);
    return {
      topExams: rows,
    };
  }

  async getPharmacy() {
    const continuousMedsStats = await this.db.execute(sql`
      SELECT 
        jsonb_array_elements_text(continuous_medications) as medication,
        COUNT(*)::int as count
      FROM patient_anamnesis
      WHERE jsonb_array_length(continuous_medications) > 0
      GROUP BY medication
      ORDER BY count DESC
      LIMIT 15
    `);

    const prescribedMedsStats = await this.db.execute(sql`
      SELECT 
        jsonb_array_elements_text(medications) as medication,
        COUNT(*)::int as count
      FROM medical_records
      WHERE jsonb_array_length(medications) > 0
      GROUP BY medication
      ORDER BY count DESC
      LIMIT 15
    `);

    const contRows = (continuousMedsStats as any)?.rows || (Array.isArray(continuousMedsStats) ? continuousMedsStats : []);
    const presRows = (prescribedMedsStats as any)?.rows || (Array.isArray(prescribedMedsStats) ? prescribedMedsStats : []);

    return {
      continuousMedications: contRows,
      prescribedMedications: presRows,
    };
  }

  // =========================================================================
  // NOVOS RELATÓRIOS SEGMENTADOS POR PERFIL
  // =========================================================================

  /**
   * 1. Relatório da Central de Regulação (Regulador & Administrador) - Integrado SINPeP & e-SUS
   */
  async getRegulationReport(filters: {
    startDate?: string;
    endDate?: string;
    specialtyId?: string;
    risk?: string;
    status?: string;
    origin?: string;
  }) {
    const conditions: string[] = ['1=1'];
    if (filters.startDate) conditions.push(`r.created_at >= '${filters.startDate} 00:00:00'`);
    if (filters.endDate) conditions.push(`r.created_at <= '${filters.endDate} 23:59:59'`);
    if (filters.specialtyId) conditions.push(`(r.specialty_id = '${filters.specialtyId}' OR proc.id = '${filters.specialtyId}' OR pg.id = '${filters.specialtyId}')`);
    if (filters.risk) conditions.push(`r.priority::text = '${filters.risk}'`);
    if (filters.status) conditions.push(`r.status = '${filters.status}'`);
    if (filters.origin === 'SINPEP') {
      conditions.push(`r.protocol_number LIKE 'REG-%'`);
    } else if (filters.origin === 'ESUS') {
      conditions.push(`r.protocol_number NOT LIKE 'REG-%'`);
    }

    const whereClause = sql.raw(conditions.join(' AND '));

    // Status counts consolidados com segregação de origem (SINPeP vs e-SUS)
    const statusRes = await this.db.execute(sql`
      SELECT 
        count(*)::int as total,
        count(*) FILTER (WHERE r.status = 'PENDENTE_REGULACAO')::int as to_evaluate,
        count(*) FILTER (WHERE r.status = 'PENDENTE_AGENDAMENTO')::int as waiting_list,
        count(*) FILTER (WHERE r.status = 'AGENDADA')::int as scheduled,
        count(*) FILTER (WHERE r.status = 'DEVOLVIDA')::int as returned,
        count(*) FILTER (WHERE r.status = 'NEGADA')::int as denied,
        count(*) FILTER (WHERE r.protocol_number NOT LIKE 'REG-%')::int as esus_total,
        count(*) FILTER (WHERE r.protocol_number LIKE 'REG-%')::int as sinpep_total
      FROM regulation_requests r
      LEFT JOIN procedures proc ON r.procedure_id = proc.id
      LEFT JOIN procedure_groups pg ON (r.procedure_group_id = pg.id OR proc.procedure_group_id = pg.id)
      WHERE ${whereClause}
    `);
    const statusRows = (statusRes as any)?.rows || [];
    const statusCounts = statusRows[0] || {
      total: 0,
      to_evaluate: 0,
      waiting_list: 0,
      scheduled: 0,
      returned: 0,
      denied: 0,
      esus_total: 0,
      sinpep_total: 0,
    };

    // Risco/Prioridade counts (utiliza a coluna priority do banco)
    const riskRes = await this.db.execute(sql`
      SELECT 
        r.priority::text as risk,
        count(*)::int as count
      FROM regulation_requests r
      LEFT JOIN procedures proc ON r.procedure_id = proc.id
      LEFT JOIN procedure_groups pg ON (r.procedure_group_id = pg.id OR proc.procedure_group_id = pg.id)
      WHERE ${whereClause}
      GROUP BY r.priority
      ORDER BY count DESC
    `);
    const riskBreakdown = (riskRes as any)?.rows || [];

    // Por especialidade / grupo de procedimentos (suportando integralmente SINPeP e e-SUS Regulação)
    const specRes = await this.db.execute(sql`
      SELECT 
        COALESCE(s.name, pg.name, proc.name, 'Não Classificado') as specialty_name,
        count(r.id)::int as total_requests,
        count(*) FILTER (WHERE r.status = 'AGENDADA')::int as scheduled,
        count(*) FILTER (WHERE r.status = 'PENDENTE_AGENDAMENTO')::int as waiting,
        count(*) FILTER (WHERE r.protocol_number NOT LIKE 'REG-%')::int as esus_count,
        count(*) FILTER (WHERE r.protocol_number LIKE 'REG-%')::int as sinpep_count
      FROM regulation_requests r
      LEFT JOIN specialties s ON r.specialty_id = s.id
      LEFT JOIN procedures proc ON r.procedure_id = proc.id
      LEFT JOIN procedure_groups pg ON (r.procedure_group_id = pg.id OR proc.procedure_group_id = pg.id)
      WHERE ${whereClause}
      GROUP BY specialty_name
      ORDER BY total_requests DESC
      LIMIT 10
    `);
    const bySpecialty = (specRes as any)?.rows || [];

    // Por UBS Solicitante (suportando integralmente SINPeP e e-SUS Regulação)
    const ubsRes = await this.db.execute(sql`
      SELECT 
        COALESCE(hc.name, 'Unidade Não Identificada') as ubs_name,
        count(r.id)::int as total_requests,
        count(*) FILTER (WHERE r.status = 'DEVOLVIDA')::int as returned,
        count(*) FILTER (WHERE r.status = 'AGENDADA')::int as scheduled,
        count(*) FILTER (WHERE r.protocol_number NOT LIKE 'REG-%')::int as esus_count,
        count(*) FILTER (WHERE r.protocol_number LIKE 'REG-%')::int as sinpep_count
      FROM regulation_requests r
      LEFT JOIN health_centers hc ON r.requesting_health_center_id = hc.id
      LEFT JOIN procedures proc ON r.procedure_id = proc.id
      LEFT JOIN procedure_groups pg ON (r.procedure_group_id = pg.id OR proc.procedure_group_id = pg.id)
      WHERE ${whereClause}
      GROUP BY ubs_name
      ORDER BY total_requests DESC
      LIMIT 10
    `);
    const bySolicitingUnit = (ubsRes as any)?.rows || [];

    return {
      statusCounts,
      riskBreakdown,
      bySpecialty,
      bySolicitingUnit,
      byOrigin: {
        total: statusCounts.total || 0,
        sinpep: statusCounts.sinpep_total || 0,
        esus: statusCounts.esus_total || 0,
      },
    };
  }

  /**
   * 2. Relatório de Encaminhamentos da UBS (Solicitante & Administrador) - Integrado
   */
  async getSolicitorReport(healthCenterId: string | undefined, filters: {
    startDate?: string;
    endDate?: string;
    status?: string;
    origin?: string;
  }) {
    const conditions: string[] = ['1=1'];
    if (healthCenterId) {
      conditions.push(`r.requesting_health_center_id = '${healthCenterId}'`);
    }
    if (filters.startDate) conditions.push(`r.created_at >= '${filters.startDate} 00:00:00'`);
    if (filters.endDate) conditions.push(`r.created_at <= '${filters.endDate} 23:59:59'`);
    if (filters.status) conditions.push(`r.status = '${filters.status}'`);
    if (filters.origin === 'SINPEP') {
      conditions.push(`r.protocol_number LIKE 'REG-%'`);
    } else if (filters.origin === 'ESUS') {
      conditions.push(`r.protocol_number NOT LIKE 'REG-%'`);
    }

    const whereClause = sql.raw(conditions.join(' AND '));

    // Resumo da UBS com contagens e procedência
    const summaryRes = await this.db.execute(sql`
      SELECT 
        count(*)::int as total,
        count(*) FILTER (WHERE r.status = 'PENDENTE_REGULACAO')::int as to_evaluate,
        count(*) FILTER (WHERE r.status = 'PENDENTE_AGENDAMENTO')::int as waiting_list,
        count(*) FILTER (WHERE r.status = 'AGENDADA')::int as scheduled,
        count(*) FILTER (WHERE r.status = 'DEVOLVIDA')::int as returned,
        count(*) FILTER (WHERE r.status = 'NEGADA')::int as denied,
        count(*) FILTER (WHERE r.protocol_number NOT LIKE 'REG-%')::int as esus_count,
        count(*) FILTER (WHERE r.protocol_number LIKE 'REG-%')::int as sinpep_count
      FROM regulation_requests r
      WHERE ${whereClause}
    `);
    const summaryRows = (summaryRes as any)?.rows || [];
    const summary = summaryRows[0] || {
      total: 0,
      to_evaluate: 0,
      waiting_list: 0,
      scheduled: 0,
      returned: 0,
      denied: 0,
      esus_count: 0,
      sinpep_count: 0,
    };

    // Pacientes agendados da UBS para busca ativa e entrega de guias (SINPeP + e-SUS Regulação)
    const scheduledListRes = await this.db.execute(sql`
      SELECT 
        r.id,
        r.protocol_number as protocol,
        r.confirmation_token as token,
        r.scheduled_date,
        r.scheduled_time,
        p.name as patient_name,
        p.cpf as patient_cpf,
        p.cns as patient_cns,
        COALESCE(s.name, pg.name, proc.name, 'Geral') as specialty_name,
        COALESCE(hc.name, 'Unidade Executante') as executing_unit,
        CASE 
          WHEN r.protocol_number NOT LIKE 'REG-%' THEN 'e-SUS Regulação'
          ELSE 'SINPeP'
        END as origin
      FROM regulation_requests r
      JOIN patients p ON r.patient_id = p.id
      LEFT JOIN specialties s ON r.specialty_id = s.id
      LEFT JOIN procedures proc ON r.procedure_id = proc.id
      LEFT JOIN procedure_groups pg ON (r.procedure_group_id = pg.id OR proc.procedure_group_id = pg.id)
      LEFT JOIN health_centers hc ON r.executing_health_center_id = hc.id
      WHERE ${whereClause}
        AND r.status = 'AGENDADA'
        ${filters.startDate ? sql`AND r.scheduled_date >= ${filters.startDate}` : sql``}
        ${filters.endDate ? sql`AND r.scheduled_date <= ${filters.endDate}` : sql``}
      ORDER BY r.scheduled_date ASC, r.scheduled_time ASC
      LIMIT 100
    `);
    const scheduledPatients = (scheduledListRes as any)?.rows || [];

    // Principais motivos de devolução estruturados para capacitação da equipe
    const returnsRes = await this.db.execute(sql`
      SELECT 
        rsh.justification as raw_justification,
        count(*)::int as count
      FROM regulation_requests r
      JOIN regulation_status_history rsh ON rsh.request_id = r.id AND rsh.new_status = 'DEVOLVIDA'
      WHERE ${whereClause}
        AND rsh.justification IS NOT NULL
      GROUP BY rsh.justification
      ORDER BY count DESC
      LIMIT 60
    `);
    const rawReturns = (returnsRes as any)?.rows || [];

    const toTitleCase = (str: string) =>
      str.toLowerCase().replace(/(?:^|\s|-)\S/g, (c) => c.toUpperCase());

    const reasonsMap = new Map<string, {
      reason: string;
      operators: Set<string>;
      origin: string;
      count: number;
    }>();

    for (const row of rawReturns) {
      let raw = (row.raw_justification || '').trim();
      let operator: string | null = null;
      let origin = 'SINPeP';

      const esusMatch = raw.match(/^\[e-SUS\s+([^\]]+)\]:\s*([\s\S]*)$/i);
      if (esusMatch) {
        origin = 'e-SUS Regulação';
        operator = toTitleCase(esusMatch[1].trim());
        raw = esusMatch[2].trim();
      } else {
        const sinpepMatch = raw.match(/^\[SINPeP\s*([^\]]*)\]:\s*([\s\S]*)$/i);
        if (sinpepMatch) {
          origin = 'SINPeP';
          if (sinpepMatch[1].trim()) operator = toTitleCase(sinpepMatch[1].trim());
          raw = sinpepMatch[2].trim();
        }
      }

      // Normaliza quebras de linha e múltiplos espaços
      raw = raw.replace(/[\r\n]+/g, ' - ').replace(/\s+/g, ' ').trim();

      let reasonText = raw;
      if (!reasonText) {
        reasonText = 'Devolução administrativa (sem justificativa textual preenchida)';
      } else {
        reasonText = reasonText.charAt(0).toUpperCase() + reasonText.slice(1);
      }

      const groupKey = reasonText.toLowerCase();
      if (!reasonsMap.has(groupKey)) {
        reasonsMap.set(groupKey, {
          reason: reasonText,
          operators: new Set<string>(),
          origin,
          count: 0,
        });
      }

      const item = reasonsMap.get(groupKey)!;
      item.count += Number(row.count || 0);
      if (operator) item.operators.add(operator);
    }

    const returnReasons = Array.from(reasonsMap.values())
      .map((item) => ({
        reason: item.reason,
        operator: Array.from(item.operators).slice(0, 2).join(', ') || null,
        origin: item.origin,
        count: item.count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      summary,
      scheduledPatients,
      returnReasons,
    };
  }

  /**
   * 3. Relatório de Produção e Ocupação da Unidade Executante (Coordenador de Unidade & Admin)
   */
  async getUnitOperationalReport(healthCenterId: string | undefined, filters: {
    startDate?: string;
    endDate?: string;
  }) {
    const start = filters.startDate || new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
    const end = filters.endDate || new Date().toISOString().split('T')[0];

    // Produção por Médico na Unidade
    const docProdRes = await this.db.execute(sql`
      SELECT 
        u.name as doctor_name,
        doc.crm,
        doc.crm_state,
        count(distinct ss.id)::int as total_slots,
        count(distinct ss.id) FILTER (WHERE ss.status = 'AGENDADO')::int as booked_slots,
        count(distinct mr.id)::int as completed_records
      FROM schedules s
      JOIN doctors doc ON s.doctor_id = doc.id
      JOIN users u ON doc.user_id = u.id
      LEFT JOIN schedule_slots ss ON ss.schedule_id = s.id AND ss.date >= ${start} AND ss.date <= ${end}
      LEFT JOIN medical_records mr ON mr.doctor_id = u.id ${healthCenterId ? sql`AND mr.health_center_id = ${healthCenterId}` : sql``} AND mr.created_at >= ${start}::timestamp AND mr.created_at <= (${end} || ' 23:59:59')::timestamp
      WHERE ${healthCenterId ? sql`s.executing_health_center_id = ${healthCenterId}` : sql`1=1`}
      GROUP BY u.name, doc.crm, doc.crm_state
      ORDER BY booked_slots DESC
    `);
    const productionByDoctor = (docProdRes as any)?.rows || [];

    // Ocupação de Vagas e Faltas (No-Show)
    const occupancyRes = await this.db.execute(sql`
      SELECT 
        count(*)::int as total_slots,
        count(*) FILTER (WHERE ss.status = 'AGENDADO')::int as booked_slots,
        count(*) FILTER (WHERE ss.status = 'DISPONIVEL')::int as available_slots
      FROM schedule_slots ss
      JOIN schedules s ON ss.schedule_id = s.id
      WHERE ${healthCenterId ? sql`s.executing_health_center_id = ${healthCenterId}` : sql`1=1`}
        AND ss.date >= ${start}
        AND ss.date <= ${end}
    `);
    const occRows = (occupancyRes as any)?.rows || [];
    const occupancy = occRows[0] || { total_slots: 0, booked_slots: 0, available_slots: 0 };

    // Taxa de absenteísmo / no-show da recepção
    const noShowRes = await this.db.execute(sql`
      SELECT 
        count(*) FILTER (WHERE status IN ('FINALIZADO', 'ATENDIDO'))::int as attended,
        count(*) FILTER (WHERE status = 'NAO_COMPARECEU')::int as no_show
      FROM attendance_queue
      WHERE date >= ${start}
        AND date <= ${end}
    `);
    const noShowRows = (noShowRes as any)?.rows || [];
    const attendanceStats = noShowRows[0] || { attended: 0, no_show: 0 };

    return {
      period: { start, end },
      occupancy: {
        totalSlots: occupancy.total_slots,
        bookedSlots: occupancy.booked_slots,
        availableSlots: occupancy.available_slots,
        occupancyRate: occupancy.total_slots > 0 ? Math.round((occupancy.booked_slots / occupancy.total_slots) * 100) : 0,
      },
      attendance: {
        attended: attendanceStats.attended,
        noShow: attendanceStats.no_show,
        noShowRate: (attendanceStats.attended + attendanceStats.no_show) > 0
          ? Math.round((attendanceStats.no_show / (attendanceStats.attended + attendanceStats.no_show)) * 100)
          : 0,
      },
      productionByDoctor,
    };
  }

  /**
   * 4. Relatório de Produção Clínica Individual (Médico & Admin)
   */
  async getDoctorProductionReport(userId: string | undefined, filters: {
    startDate?: string;
    endDate?: string;
  }) {
    const start = filters.startDate || new Date(Date.now() - 90 * 86400000).toISOString().split('T')[0];
    const end = filters.endDate || new Date().toISOString().split('T')[0];

    const doctorCondition = userId ? sql`doctor_id = ${userId}` : sql`1=1`;

    // Total de consultas realizadas
    const totalRes = await this.db.execute(sql`
      SELECT count(*)::int as total
      FROM medical_records
      WHERE ${doctorCondition}
        AND created_at >= ${start}::timestamp
        AND created_at <= (${end} || ' 23:59:59')::timestamp
    `);
    const totalRows = (totalRes as any)?.rows || [];
    const totalConsultations = totalRows[0]?.total || 0;

    // Evolução mensal
    const monthlyRes = await this.db.execute(sql`
      SELECT 
        TO_CHAR(created_at, 'YYYY-MM') as month,
        count(*)::int as count
      FROM medical_records
      WHERE ${doctorCondition}
        AND created_at >= ${start}::timestamp
        AND created_at <= (${end} || ' 23:59:59')::timestamp
      GROUP BY month
      ORDER BY month ASC
    `);
    const monthlyEvolution = (monthlyRes as any)?.rows || [];

    // Top CIDs diagnosticados
    const cidRes = await this.db.execute(sql`
      SELECT 
        cid10,
        count(*)::int as count
      FROM medical_records
      WHERE ${doctorCondition}
        AND cid10 IS NOT NULL AND cid10 != ''
        AND created_at >= ${start}::timestamp
        AND created_at <= (${end} || ' 23:59:59')::timestamp
      GROUP BY cid10
      ORDER BY count DESC
      LIMIT 10
    `);
    const topCid10 = (cidRes as any)?.rows || [];

    return {
      period: { start, end },
      totalConsultations,
      monthlyEvolution,
      topCid10,
    };
  }

  /**
   * 5. Relatório de Presença e Fluxo de Recepção (Recepcionista & Coordenador & Admin) - Integrado
   */
  async getReceptionAttendanceReport(healthCenterId?: string, date?: string) {
    const dateCondition = (date && date.trim() !== '') ? sql`aq.date = ${date}` : sql`1=1`;

    // Lista nominal de atendimento e presença no dia com identificação clara de procedência (e-SUS vs SINPeP)
    const attendanceRes = await this.db.execute(sql`
      SELECT 
        aq.id,
        aq.date,
        TO_CHAR(aq.created_at, 'HH24:MI') as time,
        aq.specialty_name,
        aq.priority,
        aq.status,
        aq.queue_order,
        aq.created_at,
        p.name as patient_name,
        p.cpf as patient_cpf,
        p.cns as patient_cns,
        CASE 
          WHEN aq.esus_solicitacao_id IS NOT NULL THEN 'e-SUS Regulação'
          ELSE 'SINPeP'
        END as origin,
        aq.esus_solicitacao_id
      FROM attendance_queue aq
      LEFT JOIN patients p ON aq.patient_id = p.id
      WHERE ${dateCondition}
      ORDER BY aq.date DESC, aq.specialty_name ASC, aq.queue_order ASC
      LIMIT 200
    `);
    const attendanceList = (attendanceRes as any)?.rows || [];

    // Totais de status com contagem segregada por procedência
    const totalsRes = await this.db.execute(sql`
      SELECT 
        count(*)::int as total,
        count(*) FILTER (WHERE status = 'AGUARDANDO')::int as waiting,
        count(*) FILTER (WHERE status IN ('CHAMADO', 'EM_ATENDIMENTO'))::int as in_attendance,
        count(*) FILTER (WHERE status IN ('FINALIZADO', 'ATENDIDO'))::int as completed,
        count(*) FILTER (WHERE status = 'NAO_COMPARECEU')::int as no_show,
        count(*) FILTER (WHERE esus_solicitacao_id IS NOT NULL)::int as from_esus,
        count(*) FILTER (WHERE esus_solicitacao_id IS NULL)::int as from_sinpep
      FROM attendance_queue
      WHERE ${dateCondition}
    `);
    const totalRows = (totalsRes as any)?.rows || [];
    const statusTotals = totalRows[0] || {
      total: 0,
      waiting: 0,
      in_attendance: 0,
      completed: 0,
      no_show: 0,
      from_esus: 0,
      from_sinpep: 0,
    };

    return {
      date: date || 'Todas as datas',
      statusTotals,
      attendanceList,
    };
  }
}
