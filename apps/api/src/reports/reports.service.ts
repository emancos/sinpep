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
  // RELATÓRIOS GLOBAIS EXISTENTES
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

    const topCid = await this.db.select({
      code: schema.medicalRecords.cid10,
      count: count(schema.medicalRecords.id),
    })
    .from(schema.medicalRecords)
    .where(sql`${schema.medicalRecords.cid10} IS NOT NULL AND ${schema.medicalRecords.cid10} != ''`)
    .groupBy(schema.medicalRecords.cid10)
    .orderBy(desc(count(schema.medicalRecords.id)))
    .limit(10);

    return {
      comorbidities: anamnesisCount[0],
      topCid
    };
  }

  async getOperational() {
    const recordsCount = await this.db.select({ count: count() }).from(schema.medicalRecords);
    
    const recordsByMonth = await this.db.execute(sql`
      SELECT 
        TO_CHAR(created_at, 'YYYY-MM') as month,
        COUNT(*)::int as count
      FROM medical_records
      WHERE created_at >= NOW() - INTERVAL '6 months'
      GROUP BY month
      ORDER BY month ASC
    `);

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

    return {
      totalRecords: recordsCount[0]?.count || 0,
      recordsByMonth: monthRows,
      recordsByDoctor: docRows,
    };
  }

  async getProcedures() {
    const examsStats = await this.db.execute(sql`
      SELECT 
        jsonb_array_elements_text(requested_exams) as exam,
        COUNT(*)::int as count
      FROM medical_records
      WHERE jsonb_array_length(requested_exams) > 0
      GROUP BY exam
      ORDER BY count DESC
      LIMIT 15
    `);

    const rows = (examsStats as any)?.rows || (Array.isArray(examsStats) ? examsStats : []);
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
   * 1. Relatório da Central de Regulação (Regulador & Administrador)
   */
  async getRegulationReport(filters: {
    startDate?: string;
    endDate?: string;
    specialtyId?: string;
    risk?: string;
    status?: string;
  }) {
    const conditions: string[] = ['1=1'];
    if (filters.startDate) conditions.push(`r.created_at >= '${filters.startDate} 00:00:00'`);
    if (filters.endDate) conditions.push(`r.created_at <= '${filters.endDate} 23:59:59'`);
    if (filters.specialtyId) conditions.push(`r.specialty_id = '${filters.specialtyId}'`);
    if (filters.risk) conditions.push(`r.risk_classification = '${filters.risk}'`);
    if (filters.status) conditions.push(`r.status = '${filters.status}'`);

    const whereClause = sql.raw(conditions.join(' AND '));

    // Status counts
    const statusRes = await this.db.execute(sql`
      SELECT 
        count(*)::int as total,
        count(*) FILTER (WHERE r.status = 'PENDENTE_REGULACAO')::int as to_evaluate,
        count(*) FILTER (WHERE r.status = 'PENDENTE_AGENDAMENTO')::int as waiting_list,
        count(*) FILTER (WHERE r.status = 'AGENDADA')::int as scheduled,
        count(*) FILTER (WHERE r.status = 'DEVOLVIDA')::int as returned,
        count(*) FILTER (WHERE r.status = 'NEGADA')::int as denied
      FROM regulation_requests r
      WHERE ${whereClause}
    `);
    const statusRows = (statusRes as any)?.rows || [];
    const statusCounts = statusRows[0] || { total: 0, to_evaluate: 0, waiting_list: 0, scheduled: 0, returned: 0, denied: 0 };

    // Risco counts
    const riskRes = await this.db.execute(sql`
      SELECT 
        r.risk_classification as risk,
        count(*)::int as count
      FROM regulation_requests r
      WHERE ${whereClause}
      GROUP BY r.risk_classification
      ORDER BY count DESC
    `);
    const riskBreakdown = (riskRes as any)?.rows || [];

    // Por especialidade
    const specRes = await this.db.execute(sql`
      SELECT 
        s.name as specialty_name,
        count(r.id)::int as total_requests,
        count(*) FILTER (WHERE r.status = 'AGENDADA')::int as scheduled,
        count(*) FILTER (WHERE r.status = 'PENDENTE_AGENDAMENTO')::int as waiting
      FROM regulation_requests r
      JOIN specialties s ON r.specialty_id = s.id
      WHERE ${whereClause}
      GROUP BY s.name
      ORDER BY total_requests DESC
      LIMIT 10
    `);
    const bySpecialty = (specRes as any)?.rows || [];

    // Por UBS Solicitante
    const ubsRes = await this.db.execute(sql`
      SELECT 
        hc.name as ubs_name,
        count(r.id)::int as total_requests,
        count(*) FILTER (WHERE r.status = 'DEVOLVIDA')::int as returned,
        count(*) FILTER (WHERE r.status = 'AGENDADA')::int as scheduled
      FROM regulation_requests r
      JOIN health_centers hc ON r.requesting_health_center_id = hc.id
      WHERE ${whereClause}
      GROUP BY hc.name
      ORDER BY total_requests DESC
      LIMIT 10
    `);
    const bySolicitingUnit = (ubsRes as any)?.rows || [];

    return {
      statusCounts,
      riskBreakdown,
      bySpecialty,
      bySolicitingUnit,
    };
  }

  /**
   * 2. Relatório de Encaminhamentos da UBS (Solicitante & Administrador)
   */
  async getSolicitorReport(healthCenterId: string, filters: {
    startDate?: string;
    endDate?: string;
    status?: string;
  }) {
    if (!healthCenterId) {
      throw new NotFoundException('Unidade Solicitante não identificada.');
    }

    const conditions: string[] = [`r.requesting_health_center_id = '${healthCenterId}'`];
    if (filters.startDate) conditions.push(`r.created_at >= '${filters.startDate} 00:00:00'`);
    if (filters.endDate) conditions.push(`r.created_at <= '${filters.endDate} 23:59:59'`);
    if (filters.status) conditions.push(`r.status = '${filters.status}'`);

    const whereClause = sql.raw(conditions.join(' AND '));

    // Resumo da UBS
    const summaryRes = await this.db.execute(sql`
      SELECT 
        count(*)::int as total,
        count(*) FILTER (WHERE r.status = 'PENDENTE_REGULACAO')::int as to_evaluate,
        count(*) FILTER (WHERE r.status = 'PENDENTE_AGENDAMENTO')::int as waiting_list,
        count(*) FILTER (WHERE r.status = 'AGENDADA')::int as scheduled,
        count(*) FILTER (WHERE r.status = 'DEVOLVIDA')::int as returned,
        count(*) FILTER (WHERE r.status = 'NEGADA')::int as denied
      FROM regulation_requests r
      WHERE ${whereClause}
    `);
    const summaryRows = (summaryRes as any)?.rows || [];
    const summary = summaryRows[0] || { total: 0, to_evaluate: 0, waiting_list: 0, scheduled: 0, returned: 0, denied: 0 };

    // Pacientes agendados da UBS para busca ativa e entrega de guias
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
        s.name as specialty_name,
        hc.name as executing_unit
      FROM regulation_requests r
      JOIN patients p ON r.patient_id = p.id
      JOIN specialties s ON r.specialty_id = s.id
      LEFT JOIN health_centers hc ON r.executing_health_center_id = hc.id
      WHERE r.requesting_health_center_id = ${healthCenterId}
        AND r.status = 'AGENDADA'
        ${filters.startDate ? sql`AND r.scheduled_date >= ${filters.startDate}` : sql``}
        ${filters.endDate ? sql`AND r.scheduled_date <= ${filters.endDate}` : sql``}
      ORDER BY r.scheduled_date ASC, r.scheduled_time ASC
      LIMIT 100
    `);
    const scheduledPatients = (scheduledListRes as any)?.rows || [];

    // Principais motivos de devolução para capacitação da equipe
    const returnsRes = await this.db.execute(sql`
      SELECT 
        r.evaluation_notes as reason,
        count(*)::int as count
      FROM regulation_requests r
      WHERE r.requesting_health_center_id = ${healthCenterId}
        AND r.status = 'DEVOLVIDA'
        AND r.evaluation_notes IS NOT NULL
      GROUP BY r.evaluation_notes
      ORDER BY count DESC
      LIMIT 10
    `);
    const returnReasons = (returnsRes as any)?.rows || [];

    return {
      summary,
      scheduledPatients,
      returnReasons,
    };
  }

  /**
   * 3. Relatório de Produção e Ocupação da Unidade Executante (Coordenador de Unidade & Admin)
   */
  async getUnitOperationalReport(healthCenterId: string, filters: {
    startDate?: string;
    endDate?: string;
  }) {
    if (!healthCenterId) {
      throw new NotFoundException('Unidade Executante não identificada.');
    }

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
      LEFT JOIN medical_records mr ON mr.doctor_id = u.id AND mr.health_center_id = ${healthCenterId} AND mr.created_at >= ${start}::timestamp AND mr.created_at <= (${end} || ' 23:59:59')::timestamp
      WHERE s.executing_health_center_id = ${healthCenterId}
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
      WHERE s.executing_health_center_id = ${healthCenterId}
        AND ss.date >= ${start}
        AND ss.date <= ${end}
    `);
    const occRows = (occupancyRes as any)?.rows || [];
    const occupancy = occRows[0] || { total_slots: 0, booked_slots: 0, available_slots: 0 };

    // Taxa de absenteísmo / no-show da recepção
    const noShowRes = await this.db.execute(sql`
      SELECT 
        count(*) FILTER (WHERE status = 'FINALIZADO')::int as attended,
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
  async getDoctorProductionReport(userId: string, filters: {
    startDate?: string;
    endDate?: string;
  }) {
    const start = filters.startDate || new Date(Date.now() - 90 * 86400000).toISOString().split('T')[0];
    const end = filters.endDate || new Date().toISOString().split('T')[0];

    // Total de consultas realizadas
    const totalRes = await this.db.execute(sql`
      SELECT count(*)::int as total
      FROM medical_records
      WHERE doctor_id = ${userId}
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
      WHERE doctor_id = ${userId}
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
      WHERE doctor_id = ${userId}
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
   * 5. Relatório de Presença e Fluxo de Recepção (Recepcionista & Coordenador & Admin)
   */
  async getReceptionAttendanceReport(healthCenterId?: string, date?: string) {
    const queryDate = date || new Date().toISOString().split('T')[0];

    // Lista nominal de atendimento e presença no dia
    const attendanceRes = await this.db.execute(sql`
      SELECT 
        aq.id,
        aq.date,
        aq.time,
        aq.specialty_name,
        aq.priority,
        aq.status,
        aq.queue_order,
        aq.created_at,
        p.name as patient_name,
        p.cpf as patient_cpf,
        p.cns as patient_cns
      FROM attendance_queue aq
      LEFT JOIN patients p ON aq.patient_id = p.id
      WHERE aq.date = ${queryDate}
      ORDER BY aq.specialty_name ASC, aq.queue_order ASC
    `);
    const attendanceList = (attendanceRes as any)?.rows || [];

    // Totais de status do dia
    const totalsRes = await this.db.execute(sql`
      SELECT 
        count(*)::int as total,
        count(*) FILTER (WHERE status = 'AGUARDANDO')::int as waiting,
        count(*) FILTER (WHERE status IN ('CHAMADO', 'EM_ATENDIMENTO'))::int as in_attendance,
        count(*) FILTER (WHERE status = 'FINALIZADO')::int as completed,
        count(*) FILTER (WHERE status = 'NAO_COMPARECEU')::int as no_show
      FROM attendance_queue
      WHERE date = ${queryDate}
    `);
    const totalRows = (totalsRes as any)?.rows || [];
    const statusTotals = totalRows[0] || { total: 0, waiting: 0, in_attendance: 0, completed: 0, no_show: 0 };

    return {
      date: queryDate,
      statusTotals,
      attendanceList,
    };
  }
}
