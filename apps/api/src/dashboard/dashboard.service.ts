import { Injectable, Inject, ForbiddenException, NotFoundException } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../database';
import { eq, and, or, sql, desc, asc, inArray, gte, lte } from 'drizzle-orm';
import { CreateNoticeDto } from './dto/create-notice.dto';
import { UpdateNoticeDto } from './dto/update-notice.dto';
import { randomUUID } from 'crypto';

@Injectable()
export class DashboardService {
  constructor(
    @Inject('DATABASE_CONNECTION')
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  /**
   * Retorna os KPIs, alertas e itens recentes consolidados para o perfil ativo do usuário
   */
  async getSummary(user: any) {
    const profileName = user.activeProfileName || '';
    const isAdmin = user.permissions?.includes('admin:access') || profileName === 'Administrador';
    const isRegulator = profileName === 'Regulador (Central de Regulação)';
    const isSolicitor = profileName.includes('Solicitante');
    const isCoordinator = profileName === 'Coordenador de Unidade';
    const isDoctor = profileName === 'Médico';
    const isReceptionist = profileName === 'Recepcionista';

    const today = new Date().toISOString().split('T')[0];

    // 1. Visão do Administrador
    if (isAdmin) {
      return this.getAdminSummary();
    }

    // 2. Visão do Regulador
    if (isRegulator) {
      return this.getRegulatorSummary();
    }

    // 3. Visão do Solicitante (UBS)
    if (isSolicitor) {
      return this.getSolicitorSummary(user.healthCenterId);
    }

    // 4. Visão do Coordenador de Unidade
    if (isCoordinator) {
      return this.getCoordinatorSummary(user.healthCenterId, today);
    }

    // 5. Visão do Médico
    if (isDoctor) {
      return this.getDoctorSummary(user.id, today);
    }

    // 6. Visão do Recepcionista
    if (isReceptionist) {
      return this.getReceptionistSummary(user.healthCenterId, today);
    }

    // Fallback: painel administrativo geral
    return this.getAdminSummary();
  }

  // =========================================================================
  // SUMÁRIOS POR PERFIL
  // =========================================================================

  private async getAdminSummary() {
    // 1. Contagens gerais
    const [patientsCount, recordsCount, doctorsCount, healthCentersCount] = await Promise.all([
      this.db.select({ count: sql<number>`count(*)::int` }).from(schema.patients),
      this.db.select({ count: sql<number>`count(*)::int` }).from(schema.medicalRecords),
      this.db.select({ count: sql<number>`count(*)::int` }).from(schema.doctors).where(eq(schema.doctors.isActive, true)),
      this.db.select({ count: sql<number>`count(*)::int` }).from(schema.healthCenters).where(eq(schema.healthCenters.isActive, true)),
    ]);

    // 2. Métricas de Regulação
    const regResult = await this.db.execute(sql`
      SELECT 
        count(*)::int as total,
        count(*) FILTER (WHERE status = 'PENDENTE_REGULACAO')::int as to_evaluate,
        count(*) FILTER (WHERE status = 'PENDENTE_AGENDAMENTO')::int as to_schedule,
        count(*) FILTER (WHERE status = 'AGENDADA')::int as scheduled,
        count(*) FILTER (WHERE status = 'DEVOLVIDA')::int as returned,
        count(*) FILTER (WHERE status = 'NEGADA')::int as denied
      FROM regulation_requests
    `);
    const regRows = (regResult as any)?.rows || (Array.isArray(regResult) ? regResult : []);
    const regStats = regRows[0] || { total: 0, to_evaluate: 0, to_schedule: 0, scheduled: 0, returned: 0, denied: 0 };

    // 3. Ocupação de Escalas no Mês
    const slotsResult = await this.db.execute(sql`
      SELECT 
        count(*)::int as total,
        count(*) FILTER (WHERE status = 'AGENDADO')::int as booked,
        count(*) FILTER (WHERE status = 'DISPONIVEL')::int as available
      FROM schedule_slots
      WHERE date >= TO_CHAR(NOW(), 'YYYY-MM-01')
    `);
    const slotRows = (slotsResult as any)?.rows || (Array.isArray(slotsResult) ? slotsResult : []);
    const slotStats = slotRows[0] || { total: 0, booked: 0, available: 0 };

    const occupancyRate = slotStats.total > 0
      ? Math.round((slotStats.booked / slotStats.total) * 100)
      : 0;

    // 4. Top 5 Especialidades mais reguladas
    const topSpecResult = await this.db.execute(sql`
      SELECT s.name as specialty_name, count(r.id)::int as count
      FROM regulation_requests r
      JOIN specialties s ON r.specialty_id = s.id
      GROUP BY s.name
      ORDER BY count DESC
      LIMIT 5
    `);
    const topSpecialties = (topSpecResult as any)?.rows || [];

    // 5. Top 5 UBS Solicitantes
    const topUbsResult = await this.db.execute(sql`
      SELECT hc.name as ubs_name, count(r.id)::int as count
      FROM regulation_requests r
      JOIN health_centers hc ON r.requesting_health_center_id = hc.id
      GROUP BY hc.name
      ORDER BY count DESC
      LIMIT 5
    `);
    const topSolicitors = (topUbsResult as any)?.rows || [];

    // 6. Evolução mensal de prontuários (últimos 6 meses)
    const monthlyResult = await this.db.execute(sql`
      SELECT 
        TO_CHAR(created_at, 'YYYY-MM') as month,
        COUNT(*)::int as count
      FROM medical_records
      WHERE created_at >= NOW() - INTERVAL '6 months'
      GROUP BY month
      ORDER BY month ASC
    `);
    const monthlyTrend = (monthlyResult as any)?.rows || [];

    return {
      profile: 'Administrador',
      kpis: {
        totalPatients: patientsCount[0]?.count || 0,
        totalRecords: recordsCount[0]?.count || 0,
        activeDoctors: doctorsCount[0]?.count || 0,
        activeHealthCenters: healthCentersCount[0]?.count || 0,
        regulationTotal: regStats.total,
        regulationToEvaluate: regStats.to_evaluate,
        regulationWaitingList: regStats.to_schedule,
        regulationScheduled: regStats.scheduled,
        regulationReturned: regStats.returned,
        occupancyRate,
        totalSlotsMonth: slotStats.total,
        bookedSlotsMonth: slotStats.booked,
      },
      charts: {
        monthlyTrend,
        topSpecialties,
        topSolicitors,
        regulationDistribution: [
          { name: 'Triagem Pendente', value: regStats.to_evaluate, color: '#f59e0b' },
          { name: 'Fila de Espera', value: regStats.to_schedule, color: '#3b82f6' },
          { name: 'Agendadas', value: regStats.scheduled, color: '#10b981' },
          { name: 'Devolvidas', value: regStats.returned, color: '#ef4444' },
          { name: 'Negadas', value: regStats.denied, color: '#6b7280' },
        ],
      },
    };
  }

  private async getRegulatorSummary() {
    // 1. Contadores da Central de Regulação
    const regResult = await this.db.execute(sql`
      SELECT 
        count(*)::int as total,
        count(*) FILTER (WHERE status = 'PENDENTE_REGULACAO')::int as to_evaluate,
        count(*) FILTER (WHERE status = 'PENDENTE_AGENDAMENTO')::int as to_schedule,
        count(*) FILTER (WHERE status = 'AGENDADA')::int as scheduled,
        count(*) FILTER (WHERE status = 'DEVOLVIDA')::int as returned,
        count(*) FILTER (WHERE status = 'NEGADA')::int as denied
      FROM regulation_requests
    `);
    const regRows = (regResult as any)?.rows || [];
    const regStats = regRows[0] || { total: 0, to_evaluate: 0, to_schedule: 0, scheduled: 0, returned: 0, denied: 0 };

    // 2. Fila de espera por gravidade/risco
    const riskResult = await this.db.execute(sql`
      SELECT 
        risk_classification as risk,
        count(*)::int as count
      FROM regulation_requests
      WHERE status IN ('PENDENTE_REGULACAO', 'PENDENTE_AGENDAMENTO')
      GROUP BY risk_classification
      ORDER BY count DESC
    `);
    const riskBreakdown = (riskResult as any)?.rows || [];

    // 3. Top Especialidades aguardando na fila
    const specWaitingResult = await this.db.execute(sql`
      SELECT s.name as specialty_name, count(r.id)::int as count
      FROM regulation_requests r
      JOIN specialties s ON r.specialty_id = s.id
      WHERE r.status = 'PENDENTE_AGENDAMENTO'
      GROUP BY s.name
      ORDER BY count DESC
      LIMIT 6
    `);
    const topWaitingSpecialties = (specWaitingResult as any)?.rows || [];

    // 4. Solicitações urgentes recém-chegadas (últimas 24h/mais recentes de risco VERMELHO/AMARELO)
    const urgentResult = await this.db.execute(sql`
      SELECT 
        r.id,
        r.protocol_number as protocol,
        r.risk_classification as risk,
        r.status,
        r.created_at,
        p.name as patient_name,
        p.cpf as patient_cpf,
        s.name as specialty_name,
        hc.name as requesting_unit
      FROM regulation_requests r
      JOIN patients p ON r.patient_id = p.id
      JOIN specialties s ON r.specialty_id = s.id
      JOIN health_centers hc ON r.requesting_health_center_id = hc.id
      WHERE r.status = 'PENDENTE_REGULACAO'
      ORDER BY 
        CASE r.risk_classification
          WHEN 'VERMELHO' THEN 1
          WHEN 'AMARELO' THEN 2
          WHEN 'VERDE' THEN 3
          ELSE 4
        END,
        r.created_at ASC
      LIMIT 6
    `);
    const urgentRequests = (urgentResult as any)?.rows || [];

    return {
      profile: 'Regulador (Central de Regulação)',
      kpis: {
        toEvaluate: regStats.to_evaluate,
        waitingList: regStats.to_schedule,
        scheduled: regStats.scheduled,
        returned: regStats.returned,
        denied: regStats.denied,
        totalActive: regStats.to_evaluate + regStats.to_schedule,
      },
      charts: {
        riskBreakdown,
        topWaitingSpecialties,
      },
      recentItems: urgentRequests,
    };
  }

  private async getSolicitorSummary(healthCenterId?: string) {
    if (!healthCenterId) {
      return {
        profile: 'Solicitante (UBS)',
        kpis: { total: 0, toEvaluate: 0, waitingList: 0, scheduled: 0, returned: 0 },
        alerts: [],
        recentScheduled: [],
      };
    }

    // 1. Contadores da UBS específica
    const regResult = await this.db.execute(sql`
      SELECT 
        count(*)::int as total,
        count(*) FILTER (WHERE status = 'PENDENTE_REGULACAO')::int as to_evaluate,
        count(*) FILTER (WHERE status = 'PENDENTE_AGENDAMENTO')::int as to_schedule,
        count(*) FILTER (WHERE status = 'AGENDADA')::int as scheduled,
        count(*) FILTER (WHERE status = 'DEVOLVIDA')::int as returned,
        count(*) FILTER (WHERE status = 'NEGADA')::int as denied
      FROM regulation_requests
      WHERE requesting_health_center_id = ${healthCenterId}
    `);
    const regRows = (regResult as any)?.rows || [];
    const regStats = regRows[0] || { total: 0, to_evaluate: 0, to_schedule: 0, scheduled: 0, returned: 0, denied: 0 };

    // 2. Alertas: Solicitações devolvidas que precisam de ação imediata da UBS
    const returnedResult = await this.db.execute(sql`
      SELECT 
        r.id,
        r.protocol_number as protocol,
        r.created_at,
        r.updated_at,
        COALESCE(rsh.justification, 'Devolvida para adequação clínica') as reason,
        p.name as patient_name,
        p.cpf as patient_cpf,
        COALESCE(s.name, pr.name, 'Procedimento') as specialty_name
      FROM regulation_requests r
      JOIN patients p ON r.patient_id = p.id
      LEFT JOIN specialties s ON r.specialty_id = s.id
      LEFT JOIN procedures pr ON r.procedure_id = pr.id
      LEFT JOIN LATERAL (
        SELECT justification 
        FROM regulation_status_history 
        WHERE request_id = r.id AND new_status = 'DEVOLVIDA' 
        ORDER BY created_at DESC 
        LIMIT 1
      ) rsh ON true
      WHERE r.requesting_health_center_id = ${healthCenterId}
        AND r.status = 'DEVOLVIDA'
      ORDER BY r.updated_at DESC
      LIMIT 6
    `);
    const returnedItems = (returnedResult as any)?.rows || [];

    // 3. Recentes Agendadas da UBS (para emissão de comprovantes pelos ACS/recepção)
    const scheduledResult = await this.db.execute(sql`
      SELECT 
        r.id,
        r.protocol_number as protocol,
        r.confirmation_token as token,
        r.scheduled_date as scheduled_date,
        r.scheduled_time as scheduled_time,
        p.name as patient_name,
        p.cpf as patient_cpf,
        COALESCE(s.name, pr.name, 'Procedimento') as specialty_name,
        hc.name as executing_unit
      FROM regulation_requests r
      JOIN patients p ON r.patient_id = p.id
      LEFT JOIN specialties s ON r.specialty_id = s.id
      LEFT JOIN procedures pr ON r.procedure_id = pr.id
      LEFT JOIN health_centers hc ON r.executing_health_center_id = hc.id
      WHERE r.requesting_health_center_id = ${healthCenterId}
        AND r.status = 'AGENDADA'
      ORDER BY r.updated_at DESC
      LIMIT 6
    `);
    const recentScheduled = (scheduledResult as any)?.rows || [];

    return {
      profile: 'Solicitante (UBS)',
      kpis: {
        total: regStats.total,
        toEvaluate: regStats.to_evaluate,
        waitingList: regStats.to_schedule,
        scheduled: regStats.scheduled,
        returned: regStats.returned,
        denied: regStats.denied,
      },
      alerts: returnedItems,
      recentScheduled,
    };
  }

  private async getCoordinatorSummary(healthCenterId?: string, today?: string) {
    const todayStr = today || new Date().toISOString().split('T')[0];

    // Se o usuário não tiver unidade vinculada, retorna estrutura zerada
    if (!healthCenterId) {
      return {
        profile: 'Coordenador de Unidade',
        kpis: { scheduledToday: 0, activeSchedules: 0, totalSlotsMonth: 0, bookedSlotsMonth: 0, occupancyRate: 0 },
        todayFlow: { waiting: 0, inAttendance: 0, completed: 0, noShow: 0 },
        activeSchedules: [],
      };
    }

    // 1. Escalas ativas na unidade
    const schedulesResult = await this.db.execute(sql`
      SELECT 
        s.id,
        s.start_date,
        s.end_date,
        s.start_time,
        s.end_time,
        s.slot_interval_minutes,
        s.slots_per_turn,
        doc.crm,
        u.name as doctor_name,
        spec.name as specialty_name
      FROM schedules s
      JOIN doctors doc ON s.doctor_id = doc.id
      JOIN users u ON doc.user_id = u.id
      LEFT JOIN specialties spec ON s.specialty_id = spec.id
      WHERE s.executing_health_center_id = ${healthCenterId}
        AND s.is_active = true
        AND s.start_date <= ${todayStr}
        AND s.end_date >= ${todayStr}
      LIMIT 10
    `);
    const activeSchedules = (schedulesResult as any)?.rows || [];

    // 2. Vagas e Ocupação do Mês na Unidade
    const slotsMonthResult = await this.db.execute(sql`
      SELECT 
        count(*)::int as total,
        count(*) FILTER (WHERE ss.status = 'AGENDADO')::int as booked,
        count(*) FILTER (WHERE ss.status = 'DISPONIVEL')::int as available
      FROM schedule_slots ss
      JOIN schedules s ON ss.schedule_id = s.id
      WHERE s.executing_health_center_id = ${healthCenterId}
        AND ss.date >= TO_CHAR(NOW(), 'YYYY-MM-01')
    `);
    const slotMonthRows = (slotsMonthResult as any)?.rows || [];
    const slotMonthStats = slotMonthRows[0] || { total: 0, booked: 0, available: 0 };
    const occupancyRate = slotMonthStats.total > 0
      ? Math.round((slotMonthStats.booked / slotMonthStats.total) * 100)
      : 0;

    // 3. Vagas Agendadas para Hoje
    const todaySlotsResult = await this.db.execute(sql`
      SELECT 
        count(*)::int as total,
        count(*) FILTER (WHERE ss.status = 'AGENDADO')::int as booked
      FROM schedule_slots ss
      JOIN schedules s ON ss.schedule_id = s.id
      WHERE s.executing_health_center_id = ${healthCenterId}
        AND ss.date = ${todayStr}
    `);
    const todayRows = (todaySlotsResult as any)?.rows || [];
    const scheduledToday = todayRows[0]?.booked || 0;

    // 4. Fluxo da Fila de Recepção de Hoje
    const queueResult = await this.db.execute(sql`
      SELECT 
        count(*) FILTER (WHERE status = 'AGUARDANDO')::int as waiting,
        count(*) FILTER (WHERE status IN ('CHAMADO', 'EM_ATENDIMENTO'))::int as in_attendance,
        count(*) FILTER (WHERE status = 'FINALIZADO')::int as completed,
        count(*) FILTER (WHERE status = 'NAO_COMPARECEU')::int as no_show
      FROM attendance_queue
      WHERE date = ${todayStr}
    `);
    const queueRows = (queueResult as any)?.rows || [];
    const todayFlow = queueRows[0] || { waiting: 0, in_attendance: 0, completed: 0, no_show: 0 };

    return {
      profile: 'Coordenador de Unidade',
      kpis: {
        scheduledToday,
        activeSchedules: activeSchedules.length,
        totalSlotsMonth: slotMonthStats.total,
        bookedSlotsMonth: slotMonthStats.booked,
        occupancyRate,
      },
      todayFlow: {
        waiting: todayFlow.waiting || 0,
        inAttendance: todayFlow.in_attendance || 0,
        completed: todayFlow.completed || 0,
        noShow: todayFlow.no_show || 0,
      },
      activeSchedules,
    };
  }

  private async getDoctorSummary(userId: string, today?: string) {
    const todayStr = today || new Date().toISOString().split('T')[0];

    // Busca o registro do médico vinculado ao usuário
    const doctor = await this.db.query.doctors.findFirst({
      where: eq(schema.doctors.userId, userId),
      with: {
        user: true,
        doctorSpecialties: {
          with: { specialty: true },
        },
      },
    });

    if (!doctor) {
      return {
        profile: 'Médico',
        kpis: { scheduledToday: 0, waitingInRoom: 0, completedToday: 0, recordsMonth: 0 },
        doctorInfo: null,
        recentRecords: [],
      };
    }

    // 1. Agendados hoje na escala do médico
    const todaySlotsResult = await this.db.execute(sql`
      SELECT count(*)::int as count
      FROM schedule_slots ss
      JOIN schedules s ON ss.schedule_id = s.id
      WHERE s.doctor_id = ${doctor.id}
        AND ss.date = ${todayStr}
        AND ss.status = 'AGENDADO'
    `);
    const todaySlotsRows = (todaySlotsResult as any)?.rows || [];
    const scheduledToday = todaySlotsRows[0]?.count || 0;

    // 2. Prontuários finalizados pelo médico hoje e no mês
    const recordsResult = await this.db.execute(sql`
      SELECT 
        count(*) FILTER (WHERE created_at::date = ${todayStr}::date)::int as today_count,
        count(*) FILTER (WHERE created_at >= TO_CHAR(NOW(), 'YYYY-MM-01')::date)::int as month_count
      FROM medical_records
      WHERE doctor_id = ${userId}
    `);
    const recordsRows = (recordsResult as any)?.rows || [];
    const completedToday = recordsRows[0]?.today_count || 0;
    const recordsMonth = recordsRows[0]?.month_count || 0;

    // 3. Fila de espera na sala hoje para as especialidades do médico
    const specNames = doctor.doctorSpecialties?.map((ds) => ds.specialty?.name).filter(Boolean) || [];
    let waitingInRoom = 0;
    if (specNames.length > 0) {
      const queueRes = await this.db.execute(sql`
        SELECT count(*)::int as count
        FROM attendance_queue
        WHERE date = ${todayStr}
          AND status = 'AGUARDANDO'
          AND specialty_name IN (${sql.join(specNames.map(s => sql`${s}`), sql`, `)})
      `);
      const qRows = (queueRes as any)?.rows || [];
      waitingInRoom = qRows[0]?.count || 0;
    }

    // 4. Últimos 5 prontuários do médico
    const recentRecordsResult = await this.db.execute(sql`
      SELECT 
        mr.id,
        mr.patient_id,
        mr.cid10,
        mr.observation,
        mr.created_at,
        p.name as patient_name,
        p.cpf as patient_cpf
      FROM medical_records mr
      JOIN patients p ON mr.patient_id = p.id
      WHERE mr.doctor_id = ${userId}
      ORDER BY mr.created_at DESC
      LIMIT 5
    `);
    const recentRecords = (recentRecordsResult as any)?.rows || [];

    return {
      profile: 'Médico',
      doctorInfo: {
        id: doctor.id,
        name: (doctor as any).user?.name || '',
        crm: doctor.crm,
        crmState: doctor.crmState,
        specialties: specNames,
      },
      kpis: {
        scheduledToday,
        waitingInRoom,
        completedToday,
        recordsMonth,
      },
      recentRecords,
    };
  }

  private async getReceptionistSummary(healthCenterId?: string, today?: string) {
    const todayStr = today || new Date().toISOString().split('T')[0];

    // 1. Total agendados hoje na unidade
    let totalScheduledToday = 0;
    if (healthCenterId) {
      const schRes = await this.db.execute(sql`
        SELECT count(*)::int as count
        FROM schedule_slots ss
        JOIN schedules s ON ss.schedule_id = s.id
        WHERE s.executing_health_center_id = ${healthCenterId}
          AND ss.date = ${todayStr}
          AND ss.status = 'AGENDADO'
      `);
      const schRows = (schRes as any)?.rows || [];
      totalScheduledToday = schRows[0]?.count || 0;
    }

    // 2. Fila da recepção hoje
    const queueResult = await this.db.execute(sql`
      SELECT 
        count(*)::int as total_checked_in,
        count(*) FILTER (WHERE status = 'AGUARDANDO')::int as waiting,
        count(*) FILTER (WHERE status IN ('CHAMADO', 'EM_ATENDIMENTO'))::int as in_attendance,
        count(*) FILTER (WHERE status = 'FINALIZADO')::int as completed,
        count(*) FILTER (WHERE status = 'NAO_COMPARECEU')::int as no_show
      FROM attendance_queue
      WHERE date = ${todayStr}
    `);
    const queueRows = (queueResult as any)?.rows || [];
    const queueStats = queueRows[0] || { total_checked_in: 0, waiting: 0, in_attendance: 0, completed: 0, no_show: 0 };

    // 3. Médicos e consultórios ativos hoje na unidade
    let activeRooms: any[] = [];
    if (healthCenterId) {
      const roomsRes = await this.db.execute(sql`
        SELECT 
          r.name as room_name,
          r.room_type,
          u.name as doctor_name,
          spec.name as specialty_name,
          s.start_time,
          s.end_time
        FROM schedules s
        JOIN doctors doc ON s.doctor_id = doc.id
        JOIN users u ON doc.user_id = u.id
        LEFT JOIN specialties spec ON s.specialty_id = spec.id
        LEFT JOIN room_allocations ra ON ra.schedule_id = s.id
        LEFT JOIN rooms r ON ra.room_id = r.id
        WHERE s.executing_health_center_id = ${healthCenterId}
          AND s.is_active = true
          AND s.start_date <= ${todayStr}
          AND s.end_date >= ${todayStr}
        LIMIT 6
      `);
      activeRooms = (roomsRes as any)?.rows || [];
    }

    return {
      profile: 'Recepcionista',
      kpis: {
        totalScheduledToday,
        totalCheckedIn: queueStats.total_checked_in || 0,
        waiting: queueStats.waiting || 0,
        inAttendance: queueStats.in_attendance || 0,
        completed: queueStats.completed || 0,
        noShow: queueStats.no_show || 0,
      },
      activeRooms,
    };
  }

  // =========================================================================
  // QUADRO DE AVISOS (NOTICES)
  // =========================================================================

  /**
   * Retorna os avisos ativos para o usuário (Globais ou direcionados à sua Unidade)
   */
  async getNotices(user: any) {
    const healthCenterId = user.healthCenterId;

    const query = this.db
      .select({
        id: schema.dashboardNotices.id,
        title: schema.dashboardNotices.title,
        content: schema.dashboardNotices.content,
        type: schema.dashboardNotices.type,
        scope: schema.dashboardNotices.scope,
        healthCenterId: schema.dashboardNotices.healthCenterId,
        authorId: schema.dashboardNotices.authorId,
        isPinned: schema.dashboardNotices.isPinned,
        isActive: schema.dashboardNotices.isActive,
        expiresAt: schema.dashboardNotices.expiresAt,
        createdAt: schema.dashboardNotices.createdAt,
        updatedAt: schema.dashboardNotices.updatedAt,
        authorName: schema.users.name,
        authorAvatar: schema.users.avatar,
        healthCenterName: schema.healthCenters.name,
      })
      .from(schema.dashboardNotices)
      .innerJoin(schema.users, eq(schema.dashboardNotices.authorId, schema.users.id))
      .leftJoin(schema.healthCenters, eq(schema.dashboardNotices.healthCenterId, schema.healthCenters.id))
      .where(
        and(
          eq(schema.dashboardNotices.isActive, true),
          or(
            sql`${schema.dashboardNotices.expiresAt} IS NULL`,
            gte(schema.dashboardNotices.expiresAt, new Date().toISOString()),
          ),
          healthCenterId
            ? or(
                eq(schema.dashboardNotices.scope, 'GLOBAL'),
                eq(schema.dashboardNotices.healthCenterId, healthCenterId),
              )
            : eq(schema.dashboardNotices.scope, 'GLOBAL'),
        ),
      )
      .orderBy(desc(schema.dashboardNotices.isPinned), desc(schema.dashboardNotices.createdAt));

    return query;
  }

  /**
   * Criação de novo aviso (apenas Administradores e Coordenadores de Unidade)
   */
  async createNotice(user: any, dto: CreateNoticeDto) {
    const profileName = user.activeProfileName || '';
    const isAdmin = user.permissions?.includes('admin:access') || profileName === 'Administrador';
    const isCoordinator = profileName === 'Coordenador de Unidade';

    if (!isAdmin && !isCoordinator) {
      throw new ForbiddenException('Apenas Administradores e Coordenadores de Unidade podem publicar avisos.');
    }

    let targetScope = dto.scope || 'GLOBAL';
    let targetHealthCenterId = dto.healthCenterId || null;

    // Coordenador só pode publicar para sua própria unidade
    if (!isAdmin && isCoordinator) {
      if (!user.healthCenterId) {
        throw new ForbiddenException('Coordenador deve estar vinculado a uma unidade de saúde para criar avisos.');
      }
      targetScope = 'HEALTH_CENTER';
      targetHealthCenterId = user.healthCenterId;
    }

    const id = randomUUID();
    const now = new Date().toISOString();

    await this.db.insert(schema.dashboardNotices).values({
      id,
      title: dto.title,
      content: dto.content,
      type: dto.type || 'INFO',
      scope: targetScope,
      healthCenterId: targetHealthCenterId,
      authorId: user.id,
      isPinned: dto.isPinned ?? false,
      isActive: true,
      expiresAt: dto.expiresAt || null,
      createdAt: now,
      updatedAt: now,
    });

    return this.findOneNotice(id);
  }

  /**
   * Atualização de aviso
   */
  async updateNotice(user: any, id: string, dto: UpdateNoticeDto) {
    const notice = await this.findOneNotice(id);
    const profileName = user.activeProfileName || '';
    const isAdmin = user.permissions?.includes('admin:access') || profileName === 'Administrador';
    const isAuthor = notice.authorId === user.id;

    if (!isAdmin && !isAuthor) {
      throw new ForbiddenException('Você não tem permissão para editar este aviso.');
    }

    const now = new Date().toISOString();
    await this.db
      .update(schema.dashboardNotices)
      .set({
        ...(dto.title ? { title: dto.title } : {}),
        ...(dto.content ? { content: dto.content } : {}),
        ...(dto.type ? { type: dto.type } : {}),
        ...(dto.scope ? { scope: dto.scope } : {}),
        ...(dto.healthCenterId !== undefined ? { healthCenterId: dto.healthCenterId } : {}),
        ...(dto.isPinned !== undefined ? { isPinned: dto.isPinned } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        ...(dto.expiresAt !== undefined ? { expiresAt: dto.expiresAt } : {}),
        updatedAt: now,
      })
      .where(eq(schema.dashboardNotices.id, id));

    return this.findOneNotice(id);
  }

  /**
   * Remoção de aviso
   */
  async deleteNotice(user: any, id: string) {
    const notice = await this.findOneNotice(id);
    const profileName = user.activeProfileName || '';
    const isAdmin = user.permissions?.includes('admin:access') || profileName === 'Administrador';
    const isAuthor = notice.authorId === user.id;

    if (!isAdmin && !isAuthor) {
      throw new ForbiddenException('Você não tem permissão para remover este aviso.');
    }

    await this.db.delete(schema.dashboardNotices).where(eq(schema.dashboardNotices.id, id));
    return { success: true, message: 'Aviso removido com sucesso.' };
  }

  private async findOneNotice(id: string) {
    const [notice] = await this.db
      .select({
        id: schema.dashboardNotices.id,
        title: schema.dashboardNotices.title,
        content: schema.dashboardNotices.content,
        type: schema.dashboardNotices.type,
        scope: schema.dashboardNotices.scope,
        healthCenterId: schema.dashboardNotices.healthCenterId,
        authorId: schema.dashboardNotices.authorId,
        isPinned: schema.dashboardNotices.isPinned,
        isActive: schema.dashboardNotices.isActive,
        expiresAt: schema.dashboardNotices.expiresAt,
        createdAt: schema.dashboardNotices.createdAt,
        updatedAt: schema.dashboardNotices.updatedAt,
        authorName: schema.users.name,
        authorAvatar: schema.users.avatar,
        healthCenterName: schema.healthCenters.name,
      })
      .from(schema.dashboardNotices)
      .innerJoin(schema.users, eq(schema.dashboardNotices.authorId, schema.users.id))
      .leftJoin(schema.healthCenters, eq(schema.dashboardNotices.healthCenterId, schema.healthCenters.id))
      .where(eq(schema.dashboardNotices.id, id));

    if (!notice) {
      throw new NotFoundException('Aviso não encontrado.');
    }

    return notice;
  }
}
