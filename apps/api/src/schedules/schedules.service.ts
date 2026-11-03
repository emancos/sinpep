import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, and, or, ilike, desc, asc, inArray, sql, not } from 'drizzle-orm';
import * as schema from '../database';
import { randomUUID } from 'crypto';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';
import { BookSlotDto } from './dto/book-slot.dto';

interface AuthUser {
  id: string;
  name: string;
  email: string;
  profileId: string;
  activeProfileName: string;
  healthCenterId?: string | null;
  permissions: string[];
}

const DAY_MAP: Record<number, string> = {
  0: 'DOMINGO',
  1: 'SEGUNDA',
  2: 'TERCA',
  3: 'QUARTA',
  4: 'QUINTA',
  5: 'SEXTA',
  6: 'SABADO',
};

@Injectable()
export class SchedulesService {
  constructor(
    @Inject('DATABASE_CONNECTION')
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  /**
   * Helper: Converte string HH:mm para minutos totais desde 00:00
   */
  private timeToMinutes(timeStr: string): number {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  }

  /**
   * Helper: Converte minutos totais desde 00:00 para string HH:mm
   */
  private minutesToTime(totalMinutes: number): string {
    const hours = Math.floor(totalMinutes / 60) % 24;
    const mins = totalMinutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
  }

  /**
   * Helper: Gera token alfanumérico seguro para chave de confirmação (ex: 8 dígitos)
   */
  private generateConfirmationToken(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let token = '';
    for (let i = 0; i < 8; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return token;
  }

  /**
   * 1. Endpoints de dependências reativas dos 4 selects (Estabelecimento, Procedimento, Profissional, CBO)
   */
  async getDependencies(filters: {
    healthCenterId?: string;
    procedureId?: string;
    doctorId?: string;
    cbo?: string;
  }) {
    // 1.1 Estabelecimentos Executantes
    const healthCentersQuery = this.db.query.healthCenters.findMany({
      where: eq(schema.healthCenters.stExecutante, true),
      orderBy: [asc(schema.healthCenters.name)],
    });

    // 1.2 Procedimentos
    const proceduresQuery = this.db.query.procedures.findMany({
      where: eq(schema.procedures.isActive, true),
      orderBy: [asc(schema.procedures.name)],
    });

    // 1.3 Profissionais (Médicos com usuários ativos)
    const doctorsQuery = this.db.query.doctors.findMany({
      where: eq(schema.doctors.isActive, true),
      with: {
        user: true,
        doctorSpecialties: {
          with: { specialty: true },
        },
        doctorProcedures: {
          with: { procedure: true },
        },
      },
      orderBy: [asc(schema.doctors.crm)],
    });

    // 1.4 Especialidades com CBO
    const specialtiesQuery = this.db.query.specialties.findMany({
      where: eq(schema.specialties.isActive, true),
      orderBy: [asc(schema.specialties.name)],
    });

    const [allCenters, allProcedures, allDoctors, allSpecialties] = await Promise.all([
      healthCentersQuery,
      proceduresQuery,
      doctorsQuery,
      specialtiesQuery,
    ]);

    // Cruzamento e filtragem condicional
    let filteredCenters = allCenters;
    let filteredProcedures = allProcedures;
    let filteredDoctors = allDoctors;
    let cbosList = allSpecialties
      .filter((s) => !!s.cbo)
      .map((s) => ({
        cbo: s.cbo!,
        specialtyId: s.id,
        name: s.name,
        label: `${s.cbo} - ${s.name}`,
      }));

    // Se filtrou por Profissional (doctorId)
    if (filters.doctorId) {
      const selectedDoctor = allDoctors.find((d) => d.id === filters.doctorId);
      if (selectedDoctor) {
        // CBOs do médico selecionado
        const doctorCbos = selectedDoctor.doctorSpecialties
          ?.map((ds) => ds.specialty.cbo)
          .filter(Boolean);
        if (doctorCbos && doctorCbos.length > 0) {
          cbosList = cbosList.filter((c) => doctorCbos.includes(c.cbo));
        }

        // Procedimentos que este médico realiza
        const doctorProcIds = selectedDoctor.doctorProcedures?.map((dp) => dp.procedureId) || [];
        if (doctorProcIds.length > 0) {
          filteredProcedures = filteredProcedures.filter((p) => doctorProcIds.includes(p.id));
        }
      }
    }

    // Se filtrou por Procedimento (procedureId)
    if (filters.procedureId) {
      // Médicos que realizam o procedimento
      filteredDoctors = filteredDoctors.filter((d) =>
        d.doctorProcedures?.some((dp) => dp.procedureId === filters.procedureId),
      );
    }

    // Se filtrou por CBO
    if (filters.cbo) {
      filteredDoctors = filteredDoctors.filter((d) =>
        d.doctorSpecialties?.some((ds) => ds.specialty.cbo === filters.cbo),
      );
    }

    // Formata retorno amigável
    return {
      healthCenters: filteredCenters.map((c) => ({
        id: c.id,
        name: c.name,
        cnes: c.cnes,
        label: `${c.cnes ? c.cnes + ' - ' : ''}${c.name}`,
      })),
      procedures: filteredProcedures.map((p) => ({
        id: p.id,
        code: p.code,
        name: p.name,
        label: `${p.code} - ${p.name}`,
      })),
      doctors: filteredDoctors.map((d) => ({
        id: d.id,
        name: d.user?.name || `Dr. CRM ${d.crm}`,
        crm: `${d.crm || ''}${d.crmState ? '/' + d.crmState : ''}`,
        label: `${d.user?.name || 'Profissional'} (CRM: ${d.crm || 'N/I'})`,
      })),
      cbos: cbosList,
    };
  }

  /**
   * 2. Validação Anti-Conflito de Horário do Profissional
   */
  private async validateAntiConflict(
    doctorId: string,
    startDate: string,
    endDate: string,
    startTime: string,
    endTime: string,
    daysOfWeek: string[],
    excludeScheduleId?: string,
  ) {
    const doctorSchedules = await this.db.query.schedules.findMany({
      where: and(
        eq(schema.schedules.doctorId, doctorId),
        eq(schema.schedules.isActive, true),
        excludeScheduleId ? not(eq(schema.schedules.id, excludeScheduleId)) : undefined,
      ),
      with: {
        procedure: true,
        executingHealthCenter: true,
      },
    });

    const newStartMins = this.timeToMinutes(startTime);
    const newEndMins = this.timeToMinutes(endTime);

    for (const existing of doctorSchedules) {
      // 1. Verifica sobreposição de período de vigência
      const datesOverlap = startDate <= existing.endDate && endDate >= existing.startDate;
      if (!datesOverlap) continue;

      // 2. Verifica sobreposição de dias da semana
      const commonDays = daysOfWeek.filter((d) => existing.daysOfWeek.includes(d));
      if (commonDays.length === 0) continue;

      // 3. Verifica sobreposição de horários
      const existStartMins = this.timeToMinutes(existing.startTime);
      const existEndMins = this.timeToMinutes(existing.endTime);

      const timesOverlap = newStartMins < existEndMins && newEndMins > existStartMins;
      if (timesOverlap) {
        throw new BadRequestException(
          `Conflito de agenda: O profissional já possui a escala "${existing.procedure?.name || 'Atendimento'}" na unidade "${existing.executingHealthCenter?.name || 'Unidade'}" das ${existing.startTime} às ${existing.endTime} nos dias [${commonDays.join(', ')}].`,
        );
      }
    }
  }

  /**
   * 3. Gerador de Slots/Vagas Recorrentes com Quebra Automática em Blocos Contínuos
   */
  private generateSlots(
    scheduleId: string,
    startDateStr: string,
    endDateStr: string,
    startTimeStr: string,
    endTimeStr: string,
    daysOfWeek: string[],
    firstTimeQty: number,
    firstTimeMins: number,
    returnQty: number,
    returnMins: number,
    regulatorQty: number,
    regulatorMins: number,
    autoSlotSplit: boolean,
    blockedDates: string[] = [],
  ) {
    const slots: Array<typeof schema.scheduleSlots.$inferInsert> = [];
    const now = new Date().toISOString();

    const start = new Date(`${startDateStr}T00:00:00`);
    const end = new Date(`${endDateStr}T00:00:00`);

    const current = new Date(start);

    while (current <= end) {
      const year = current.getFullYear();
      const month = String(current.getMonth() + 1).padStart(2, '0');
      const day = String(current.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;

      const dayOfWeekName = DAY_MAP[current.getDay()];

      if (daysOfWeek.includes(dayOfWeekName) && !blockedDates.includes(dateStr)) {
        let currentSlotMinutes = this.timeToMinutes(startTimeStr);

        // Bloco 1: PRIMEIRA_VEZ
        for (let i = 0; i < firstTimeQty; i++) {
          const slotTime = autoSlotSplit ? this.minutesToTime(currentSlotMinutes) : startTimeStr;
          slots.push({
            id: randomUUID(),
            scheduleId,
            date: dateStr,
            time: slotTime,
            slotType: 'PRIMEIRA_VEZ',
            status: 'DISPONIVEL',
            createdAt: now,
            updatedAt: now,
          });
          if (autoSlotSplit) {
            currentSlotMinutes += firstTimeMins || 15;
          }
        }

        // Bloco 2: RETORNO (sequencial contínuo)
        for (let i = 0; i < returnQty; i++) {
          const slotTime = autoSlotSplit ? this.minutesToTime(currentSlotMinutes) : startTimeStr;
          slots.push({
            id: randomUUID(),
            scheduleId,
            date: dateStr,
            time: slotTime,
            slotType: 'RETORNO',
            status: 'DISPONIVEL',
            createdAt: now,
            updatedAt: now,
          });
          if (autoSlotSplit) {
            currentSlotMinutes += returnMins || 10;
          }
        }

        // Bloco 3: RESERVA_REGULADOR (ao final do turno)
        for (let i = 0; i < regulatorQty; i++) {
          const slotTime = autoSlotSplit ? this.minutesToTime(currentSlotMinutes) : startTimeStr;
          slots.push({
            id: randomUUID(),
            scheduleId,
            date: dateStr,
            time: slotTime,
            slotType: 'RESERVA_REGULADOR',
            status: 'DISPONIVEL',
            createdAt: now,
            updatedAt: now,
          });
          if (autoSlotSplit) {
            currentSlotMinutes += regulatorMins || 15;
          }
        }
      }

      current.setDate(current.getDate() + 1);
    }

    return slots;
  }

  /**
   * 4. Listagem de Agendas com Filtros e Permissão de Coordenador
   */
  async findAll(
    user: AuthUser,
    query?: {
      healthCenterId?: string;
      procedureId?: string;
      doctorId?: string;
      activeOnly?: string;
    },
  ) {
    const isCoordinator = user.activeProfileName === 'Coordenador de Unidade';
    const isAdmin = user.activeProfileName === 'Administrador' || user.permissions.includes('admin:access');

    // Se for Coordenador, restringe estritamente à sua unidade executante
    const effectiveHealthCenterId = isCoordinator
      ? user.healthCenterId || query?.healthCenterId
      : query?.healthCenterId;

    const conditions = [];

    if (effectiveHealthCenterId) {
      conditions.push(eq(schema.schedules.executingHealthCenterId, effectiveHealthCenterId));
    }

    if (query?.procedureId) {
      conditions.push(eq(schema.schedules.procedureId, query.procedureId));
    }

    if (query?.doctorId) {
      conditions.push(eq(schema.schedules.doctorId, query.doctorId));
    }

    if (query?.activeOnly === 'true') {
      conditions.push(eq(schema.schedules.isActive, true));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const allSchedules = await this.db.query.schedules.findMany({
      where: whereClause,
      with: {
        executingHealthCenter: true,
        procedure: true,
        doctor: {
          with: { user: true },
        },
        createdByUser: true,
      },
      orderBy: [desc(schema.schedules.createdAt)],
    });

    // Calcula contagem de slots para cada agenda
    const result = await Promise.all(
      allSchedules.map(async (sch) => {
        const slotsCount = await this.db
          .select({
            total: sql<number>`count(*)`,
            booked: sql<number>`count(case when status = 'AGENDADO' then 1 end)`,
            available: sql<number>`count(case when status = 'DISPONIVEL' then 1 end)`,
          })
          .from(schema.scheduleSlots)
          .where(eq(schema.scheduleSlots.scheduleId, sch.id));

        const counts = slotsCount[0] || { total: 0, booked: 0, available: 0 };

        return {
          ...sch,
          totalSlots: Number(counts.total),
          bookedSlots: Number(counts.booked),
          availableSlots: Number(counts.available),
        };
      }),
    );

    return result;
  }

  /**
   * 5. Detalhes de uma Agenda com seus Slots
   */
  async findOne(id: string, user: AuthUser) {
    const schedule = await this.db.query.schedules.findFirst({
      where: eq(schema.schedules.id, id),
      with: {
        executingHealthCenter: true,
        procedure: true,
        doctor: {
          with: { user: true },
        },
        createdByUser: true,
        slots: {
          with: {
            patient: true,
            regulationRequest: true,
            bookedByUser: true,
          },
          orderBy: [asc(schema.scheduleSlots.date), asc(schema.scheduleSlots.time)],
        },
      },
    });

    if (!schedule) {
      throw new NotFoundException('Agenda não encontrada.');
    }

    const isCoordinator = user.activeProfileName === 'Coordenador de Unidade';
    if (isCoordinator && user.healthCenterId && schedule.executingHealthCenterId !== user.healthCenterId) {
      throw new ForbiddenException('Acesso negado às agendas de outra unidade de saúde.');
    }

    return schedule;
  }

  /**
   * 6. Criação de Agenda com Validação Anti-Conflito e Geração de Vagas
   */
  async create(dto: CreateScheduleDto, user: AuthUser) {
    const isCoordinator = user.activeProfileName === 'Coordenador de Unidade';

    // Se for Coordenador, força a unidade para o vínculo único do usuário
    const executingHealthCenterId = isCoordinator && user.healthCenterId
      ? user.healthCenterId
      : dto.executingHealthCenterId;

    if (!executingHealthCenterId) {
      throw new BadRequestException('Unidade Executante não informada ou usuário sem unidade vinculada.');
    }

    // Validação de intervalo de datas (limite máximo de 180 dias / 6 meses)
    const startDate = new Date(`${dto.startDate}T00:00:00`);
    const endDate = new Date(`${dto.endDate}T00:00:00`);

    if (endDate < startDate) {
      throw new BadRequestException('A data de vigência final não pode ser anterior à vigência inicial.');
    }

    const diffDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays > 180) {
      throw new BadRequestException('O período de vigência da escala não pode ultrapassar 6 meses (180 dias).');
    }

    // Validação de horário
    if (this.timeToMinutes(dto.startTime) >= this.timeToMinutes(dto.endTime)) {
      throw new BadRequestException('O horário final deve ser posterior ao horário inicial.');
    }

    // Validação anti-conflito de horário do profissional
    await this.validateAntiConflict(
      dto.doctorId,
      dto.startDate,
      dto.endDate,
      dto.startTime,
      dto.endTime,
      dto.daysOfWeek,
    );

    const scheduleId = randomUUID();
    const now = new Date().toISOString();

    // Insere o cabeçalho da escala
    await this.db.insert(schema.schedules).values({
      id: scheduleId,
      executingHealthCenterId,
      procedureId: dto.procedureId,
      doctorId: dto.doctorId,
      cbo: dto.cbo.trim(),
      startDate: dto.startDate,
      endDate: dto.endDate,
      startTime: dto.startTime,
      endTime: dto.endTime,
      daysOfWeek: dto.daysOfWeek,
      firstTimeQuantity: dto.firstTimeQuantity || 0,
      firstTimeMinutes: dto.firstTimeMinutes || 0,
      returnQuantity: dto.returnQuantity || 0,
      returnMinutes: dto.returnMinutes || 0,
      regulatorReservedQuantity: dto.regulatorReservedQuantity || 0,
      regulatorReservedMinutes: dto.regulatorReservedMinutes || 0,
      autoSlotSplit: dto.autoSlotSplit ?? false,
      isLocalSchedule: dto.isLocalSchedule ?? false,
      isActive: dto.isActive ?? true,
      notes: dto.notes?.trim() || null,
      blockedDates: dto.blockedDates || [],
      createdByUserId: user.id,
      createdAt: now,
      updatedAt: now,
    });

    // Gera os slots
    const slots = this.generateSlots(
      scheduleId,
      dto.startDate,
      dto.endDate,
      dto.startTime,
      dto.endTime,
      dto.daysOfWeek,
      dto.firstTimeQuantity || 0,
      dto.firstTimeMinutes || 0,
      dto.returnQuantity || 0,
      dto.returnMinutes || 0,
      dto.regulatorReservedQuantity || 0,
      dto.regulatorReservedMinutes || 0,
      dto.autoSlotSplit ?? false,
      dto.blockedDates || [],
    );

    if (slots.length > 0) {
      await this.db.insert(schema.scheduleSlots).values(slots);
    }

    return this.findOne(scheduleId, user);
  }

  /**
   * 7. Edição de Agenda
   */
  async update(id: string, dto: UpdateScheduleDto, user: AuthUser) {
    const existing = await this.findOne(id, user);

    const doctorId = dto.doctorId || existing.doctorId;
    const startDate = dto.startDate || existing.startDate;
    const endDate = dto.endDate || existing.endDate;
    const startTime = dto.startTime || existing.startTime;
    const endTime = dto.endTime || existing.endTime;
    const daysOfWeek = dto.daysOfWeek || existing.daysOfWeek;

    // Valida anti-conflito
    await this.validateAntiConflict(
      doctorId,
      startDate,
      endDate,
      startTime,
      endTime,
      daysOfWeek,
      id,
    );

    const now = new Date().toISOString();

    await this.db
      .update(schema.schedules)
      .set({
        procedureId: dto.procedureId || existing.procedureId,
        doctorId,
        cbo: dto.cbo || existing.cbo,
        startDate,
        endDate,
        startTime,
        endTime,
        daysOfWeek,
        firstTimeQuantity: dto.firstTimeQuantity !== undefined ? dto.firstTimeQuantity : existing.firstTimeQuantity,
        firstTimeMinutes: dto.firstTimeMinutes !== undefined ? dto.firstTimeMinutes : existing.firstTimeMinutes,
        returnQuantity: dto.returnQuantity !== undefined ? dto.returnQuantity : existing.returnQuantity,
        returnMinutes: dto.returnMinutes !== undefined ? dto.returnMinutes : existing.returnMinutes,
        regulatorReservedQuantity: dto.regulatorReservedQuantity !== undefined ? dto.regulatorReservedQuantity : existing.regulatorReservedQuantity,
        regulatorReservedMinutes: dto.regulatorReservedMinutes !== undefined ? dto.regulatorReservedMinutes : existing.regulatorReservedMinutes,
        autoSlotSplit: dto.autoSlotSplit !== undefined ? dto.autoSlotSplit : existing.autoSlotSplit,
        isLocalSchedule: dto.isLocalSchedule !== undefined ? dto.isLocalSchedule : existing.isLocalSchedule,
        isActive: dto.isActive !== undefined ? dto.isActive : existing.isActive,
        notes: dto.notes !== undefined ? dto.notes?.trim() || null : existing.notes,
        blockedDates: dto.blockedDates !== undefined ? dto.blockedDates : existing.blockedDates,
        updatedAt: now,
      })
      .where(eq(schema.schedules.id, id));

    return this.findOne(id, user);
  }

  /**
   * 8. Ativar / Desativar Agenda
   */
  async toggleActive(id: string, user: AuthUser) {
    const schedule = await this.findOne(id, user);
    const newActive = !schedule.isActive;

    await this.db
      .update(schema.schedules)
      .set({ isActive: newActive, updatedAt: new Date().toISOString() })
      .where(eq(schema.schedules.id, id));

    return { id, isActive: newActive };
  }

  /**
   * 9. Bloquear / Desbloquear data pontual (ex: Feriado / Recesso Médico)
   */
  async toggleBlockDate(id: string, date: string, user: AuthUser) {
    const schedule = await this.findOne(id, user);
    let blockedDates = schedule.blockedDates || [];

    const isCurrentlyBlocked = blockedDates.includes(date);

    if (isCurrentlyBlocked) {
      // Desbloqueia
      blockedDates = blockedDates.filter((d) => d !== date);
      // Reabre slots daquela data que não estejam ocupados
      await this.db
        .update(schema.scheduleSlots)
        .set({ status: 'DISPONIVEL', updatedAt: new Date().toISOString() })
        .where(
          and(
            eq(schema.scheduleSlots.scheduleId, id),
            eq(schema.scheduleSlots.date, date),
            eq(schema.scheduleSlots.status, 'BLOQUEADO'),
          ),
        );
    } else {
      // Bloqueia
      blockedDates = [...blockedDates, date];
      // Marca slots não preenchidos como BLOQUEADO
      await this.db
        .update(schema.scheduleSlots)
        .set({ status: 'BLOQUEADO', updatedAt: new Date().toISOString() })
        .where(
          and(
            eq(schema.scheduleSlots.scheduleId, id),
            eq(schema.scheduleSlots.date, date),
            eq(schema.scheduleSlots.status, 'DISPONIVEL'),
          ),
        );
    }

    await this.db
      .update(schema.schedules)
      .set({ blockedDates, updatedAt: new Date().toISOString() })
      .where(eq(schema.schedules.id, id));

    return { id, blockedDates, isBlocked: !isCurrentlyBlocked };
  }

  /**
   * 10. Exclusão de Agenda com Cancelamento de Vagas e Retorno para PENDENTE_REGULACAO
   */
  async delete(id: string, user: AuthUser) {
    const schedule = await this.findOne(id, user);

    // Busca todos os slots da agenda que possuem pacientes agendados
    const bookedSlots = await this.db.query.scheduleSlots.findMany({
      where: and(
        eq(schema.scheduleSlots.scheduleId, id),
        eq(schema.scheduleSlots.status, 'AGENDADO'),
      ),
      with: {
        regulationRequest: true,
      },
    });

    const now = new Date().toISOString();
    const doctorName = schedule.doctor?.user?.name || 'Profissional';
    const unitName = schedule.executingHealthCenter?.name || 'Unidade Executante';

    // Para cada agendamento afetado, reverte para PENDENTE_REGULACAO e grava auditoria
    for (const slot of bookedSlots) {
      if (slot.regulationRequestId) {
        await this.db
          .update(schema.regulationRequests)
          .set({
            status: 'PENDENTE_REGULACAO',
            scheduledDate: null,
            scheduledTime: null,
            confirmationToken: null,
            updatedAt: now,
          })
          .where(eq(schema.regulationRequests.id, slot.regulationRequestId));

        await this.db.insert(schema.regulationStatusHistory).values({
          id: randomUUID(),
          requestId: slot.regulationRequestId,
          previousStatus: 'AGENDADA',
          newStatus: 'PENDENTE_REGULACAO',
          justification: `Agendamento cancelado devido à exclusão da agenda do profissional ${doctorName} na unidade ${unitName} para o dia ${slot.date} às ${slot.time}. Requisição retornou para a fila de regulação.`,
          actionByUserId: user.id,
          createdAt: now,
        });
      }
    }

    // Exclui a escala e todos os slots vinculados
    await this.db.delete(schema.schedules).where(eq(schema.schedules.id, id));

    return {
      success: true,
      revertedRequestsCount: bookedSlots.length,
      message: `Agenda excluída com sucesso. ${bookedSlots.length} requisição(ões) retornada(s) para a fila de regulação.`,
    };
  }

  /**
   * 11. Busca de Vagas Disponíveis para Agendamento
   */
  async getAvailableSlots(
    user: AuthUser,
    procedureId: string,
    filters?: {
      executingHealthCenterId?: string;
      date?: string;
    },
  ) {
    const isCoordinator = user.activeProfileName === 'Coordenador de Unidade';
    const isSolicitor = user.activeProfileName?.includes('Solicitante') || user.permissions.includes('regulation-solicitor:read');

    // Monta condições de busca de agendas ativas
    const scheduleConditions = [
      eq(schema.schedules.procedureId, procedureId),
      eq(schema.schedules.isActive, true),
    ];

    if (filters?.executingHealthCenterId) {
      scheduleConditions.push(eq(schema.schedules.executingHealthCenterId, filters.executingHealthCenterId));
    }

    // Se for solicitante de UBS, agendas marcadas como "isLocalSchedule" não devem aparecer
    if (isSolicitor) {
      scheduleConditions.push(eq(schema.schedules.isLocalSchedule, false));
    }

    // Se for coordenador de unidade, só pode agendar na sua própria unidade
    if (isCoordinator && user.healthCenterId) {
      scheduleConditions.push(eq(schema.schedules.executingHealthCenterId, user.healthCenterId));
    }

    const schedules = await this.db.query.schedules.findMany({
      where: and(...scheduleConditions),
      with: {
        executingHealthCenter: true,
        procedure: true,
        doctor: {
          with: { user: true },
        },
      },
    });

    if (schedules.length === 0) {
      return [];
    }

    const scheduleIds = schedules.map((s) => s.id);

    const slotConditions = [
      inArray(schema.scheduleSlots.scheduleId, scheduleIds),
      eq(schema.scheduleSlots.status, 'DISPONIVEL'),
      sql`${schema.scheduleSlots.date} >= CURRENT_DATE`,
    ];

    if (filters?.date) {
      slotConditions.push(eq(schema.scheduleSlots.date, filters.date));
    }

    const slots = await this.db.query.scheduleSlots.findMany({
      where: and(...slotConditions),
      with: {
        schedule: {
          with: {
            executingHealthCenter: true,
            doctor: {
              with: { user: true },
            },
          },
        },
      },
      orderBy: [asc(schema.scheduleSlots.date), asc(schema.scheduleSlots.time)],
      limit: 100,
    });

    return slots;
  }

  /**
   * 12. Realização do Agendamento (Reserva da Vaga)
   */
  async bookSlot(dto: BookSlotDto, user: AuthUser) {
    const slot = await this.db.query.scheduleSlots.findFirst({
      where: eq(schema.scheduleSlots.id, dto.slotId),
      with: {
        schedule: {
          with: {
            executingHealthCenter: true,
            doctor: { with: { user: true } },
          },
        },
      },
    });

    if (!slot) {
      throw new NotFoundException('Vaga não encontrada.');
    }

    if (slot.status !== 'DISPONIVEL') {
      throw new BadRequestException('Esta vaga já foi preenchida ou está indisponível.');
    }

    const request = await this.db.query.regulationRequests.findFirst({
      where: eq(schema.regulationRequests.id, dto.regulationRequestId),
      with: {
        patient: true,
        procedure: true,
      },
    });

    if (!request) {
      throw new NotFoundException('Requisição de regulação não encontrada.');
    }

    const isCoordinator = user.activeProfileName === 'Coordenador de Unidade';
    if (isCoordinator && user.healthCenterId && slot.schedule.executingHealthCenterId !== user.healthCenterId) {
      throw new ForbiddenException('Coordenadores só podem agendar vagas da sua unidade executante.');
    }

    const now = new Date().toISOString();
    const confirmationToken = request.confirmationToken || this.generateConfirmationToken();
    const doctorName = slot.schedule.doctor?.user?.name || 'Profissional';
    const unitName = slot.schedule.executingHealthCenter?.name || 'Unidade Executante';

    // Atualiza a vaga
    await this.db
      .update(schema.scheduleSlots)
      .set({
        status: 'AGENDADO',
        regulationRequestId: request.id,
        patientId: request.patientId,
        bookedByUserId: user.id,
        bookedAt: now,
        updatedAt: now,
      })
      .where(eq(schema.scheduleSlots.id, slot.id));

    // Atualiza a requisição de regulação
    await this.db
      .update(schema.regulationRequests)
      .set({
        status: 'AGENDADA',
        executingHealthCenterId: slot.schedule.executingHealthCenterId,
        scheduledDate: slot.date,
        scheduledTime: slot.time,
        confirmationToken,
        scheduledByUserId: user.id,
        updatedAt: now,
      })
      .where(eq(schema.regulationRequests.id, request.id));

    // Grava histórico de status
    await this.db.insert(schema.regulationStatusHistory).values({
      id: randomUUID(),
      requestId: request.id,
      previousStatus: request.status,
      newStatus: 'AGENDADA',
      justification: `Agendamento confirmado para o dia ${slot.date} às ${slot.time} com ${doctorName} na unidade ${unitName}. Chave de Confirmação: ${confirmationToken}.`,
      actionByUserId: user.id,
      createdAt: now,
    });

    return {
      success: true,
      protocolNumber: request.protocolNumber,
      confirmationToken,
      scheduledDate: slot.date,
      scheduledTime: slot.time,
      executingHealthCenter: unitName,
      doctor: doctorName,
      patient: request.patient?.name,
    };
  }
}
