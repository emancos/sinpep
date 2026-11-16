import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, and, or, ilike, desc, asc, inArray, sql, not, gte, gt } from 'drizzle-orm';
import * as schema from '../database';
import { randomUUID } from 'crypto';
import axios from 'axios';
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
   * Helper: Verifica compatibilidade semântica e por radical entre Especialidade/CBO e Procedimento de Consulta
   */
  private isProcedureCompatibleWithSpecialty(
    procedureName: string,
    specialtyName: string,
    cbo?: string | null,
  ): boolean {
    const normProc = procedureName
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase();
    const normSpec = specialtyName
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase();

    // Mapeamento direto de CBOs conhecidos para raízes de procedimentos de consulta
    const directMap: Record<string, string[]> = {
      '225135': ['DERMATO'], // Dermatologia
      '225120': ['CARDIO'], // Cardiologia
      '225112': ['NEURO'], // Neurologia
      '225285': ['UROLO'], // Urologia
      '225136': ['REUMATO'], // Reumatologia
      '225203': ['ANGIO', 'VASCULAR'], // Angiologia
      '225270': ['ORTOPED', 'TRAUMATO'], // Ortopedia
      '225180': ['GERIAT'], // Geriatria
      '225155': ['ENDOCRINO'], // Endocrinologia
      '225165': ['GASTRO'], // Gastroenterologia
      '225225': ['OFTALMO'], // Oftalmologia
      '225275': ['OTORRINO'], // Otorrinolaringologia
      '225124': ['PEDIAT'], // Pediatria
      '225133': ['PSIQUIAT'], // Psiquiatria
      '225250': ['GINECO', 'OBSTETR'], // Ginecologia / Obstetrícia
      '225125': ['CLINIC', 'GERAL'], // Clínica Médica
    };

    if (cbo && directMap[cbo]) {
      if (directMap[cbo].some((term) => normProc.includes(term))) {
        return true;
      }
    }

    // Extrai radicais significativos da especialidade (ex: CARDIOLOGISTA -> CARDIOLOG)
    const words = normSpec
      .replace(/\b(MEDICO|MEDICA|CIRURGIAO|CIRURGIA|CLINICO|ESPECIALISTA|DE|DA|DO|DOS|DAS|E|EM)\b/g, ' ')
      .split(/\s+/)
      .map((w) => w.trim())
      .filter((w) => w.length >= 3);

    for (const word of words) {
      let root = word;
      if (root.endsWith('ISTA') || root.endsWith('LOGO') || root.endsWith('LOGA')) {
        root = root.slice(0, -4);
      } else if (root.endsWith('ICO') || root.endsWith('ICA')) {
        root = root.slice(0, -3);
      } else if (root.endsWith('IA')) {
        root = root.slice(0, -2);
      }
      if (root.length >= 3 && normProc.includes(root)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Helper: Verifica se o médico está vinculado a uma unidade de saúde (diretamente ou via userHealthCenters)
   */
  private isDoctorInCenter(d: any, centerId: string): boolean {
    if (!d || !centerId) return false;
    if (d.user?.healthCenterId === centerId) return true;
    if (d.user?.userHealthCenters?.some((uhc: any) => uhc.healthCenterId === centerId)) return true;
    return false;
  }

  /**
   * Helper: Verifica se o médico está habilitado/autorizado a realizar um procedimento
   */
  private isDoctorAllowedForProcedure(
    doctor: any,
    procedure: { id: string; name: string; procedureGroupId?: string | null },
    scheduleType: string,
  ): boolean {
    if (!doctor || !procedure) return false;

    // 1. Vínculo explícito em doctorProcedures tem prioridade máxima
    const isExplicit = doctor.doctorProcedures?.some(
      (dp: any) => dp.procedureId === procedure.id,
    );
    if (isExplicit) return true;

    // 2. Para CONSULTA: verifica compatibilidade semântica com as especialidades/CBOs do profissional
    if (scheduleType === 'CONSULTA') {
      const docSpecs = doctor.doctorSpecialties?.map((ds: any) => ds.specialty) || [];
      return docSpecs.some((spec: any) =>
        this.isProcedureCompatibleWithSpecialty(procedure.name, spec.name, spec.cbo),
      );
    }

    // 3. Para EXAME ou PROCEDIMENTO:
    // Se o profissional tiver procedimentos cadastrados especificamente, restringe estritamente a eles
    if (doctor.doctorProcedures && doctor.doctorProcedures.length > 0) {
      return false;
    }

    // Se não tiver procedimentos restritos, verifica compatibilidade semântica com a especialidade
    const docSpecs = doctor.doctorSpecialties?.map((ds: any) => ds.specialty) || [];
    if (docSpecs.length > 0) {
      return docSpecs.some((spec: any) =>
        this.isProcedureCompatibleWithSpecialty(procedure.name, spec.name, spec.cbo),
      );
    }

    return true;
  }

  /**
   * 1. Endpoints de dependências reativas dos 4 selects (Estabelecimento, Procedimento, Profissional, CBO)
   */
  async getDependencies(filters: {
    healthCenterId?: string;
    procedureId?: string;
    procedureGroupId?: string;
    doctorId?: string;
    cbo?: string;
    scheduleType?: string; // 'CONSULTA' | 'EXAME' | 'PROCEDIMENTO'
  }) {
    const scheduleType = filters.scheduleType || 'CONSULTA';

    // 1.1 Estabelecimentos Executantes
    const allCenters = await this.db.query.healthCenters.findMany({
      where: eq(schema.healthCenters.stExecutante, true),
      orderBy: [asc(schema.healthCenters.name)],
    });

    // 1.2 Grupos de Procedimentos com seus procedimentos
    const rawGroups = await this.db.query.procedureGroups.findMany({
      where: eq(schema.procedureGroups.isActive, true),
      with: {
        procedures: {
          where: eq(schema.procedures.isActive, true),
          orderBy: [asc(schema.procedures.name)],
        },
      },
      orderBy: [asc(schema.procedureGroups.name)],
    });

    // 1.3 Procedimentos
    const rawProcedures = await this.db.query.procedures.findMany({
      where: eq(schema.procedures.isActive, true),
      orderBy: [asc(schema.procedures.name)],
    });

    // 1.4 Profissionais (Médicos com usuários ativos e unidades vinculadas)
    const allDoctors = await this.db.query.doctors.findMany({
      where: eq(schema.doctors.isActive, true),
      with: {
        user: {
          with: {
            userHealthCenters: true,
          },
        },
        doctorSpecialties: {
          with: { specialty: true },
        },
        doctorProcedures: {
          with: { procedure: true },
        },
      },
      orderBy: [asc(schema.doctors.crm)],
    });

    // 1.5 Especialidades com CBO
    const allSpecialties = await this.db.query.specialties.findMany({
      where: eq(schema.specialties.isActive, true),
      orderBy: [asc(schema.specialties.name)],
    });

    // 1.6 Consulta de Cotas Pactuadas/Configuradas para o Estabelecimento Executante
    const quotaProcedureIds = new Set<string>();
    const quotaGroupIds = new Set<string>();
    const procedureQuotaMap = new Map<string, number>();
    const groupQuotaMap = new Map<string, number>();

    if (filters.healthCenterId) {
      const [hcProcs, hcProcQuotas, hcGroups, hcGroupQuotas] = await Promise.all([
        this.db.query.healthCenterProcedures.findMany({
          where: and(
            eq(schema.healthCenterProcedures.healthCenterId, filters.healthCenterId),
            or(
              eq(schema.healthCenterProcedures.isOffered, true),
              gt(schema.healthCenterProcedures.monthlyQuantity, 0)
            )
          ),
        }),
        this.db.query.procedureSolicitorQuotas.findMany({
          where: and(
            eq(schema.procedureSolicitorQuotas.executingHealthCenterId, filters.healthCenterId),
            gt(schema.procedureSolicitorQuotas.monthlyQuota, 0)
          ),
        }),
        this.db.query.healthCenterProcedureGroups.findMany({
          where: and(
            eq(schema.healthCenterProcedureGroups.healthCenterId, filters.healthCenterId),
            or(
              eq(schema.healthCenterProcedureGroups.isOffered, true),
              gt(schema.healthCenterProcedureGroups.monthlyQuantity, 0)
            )
          ),
        }),
        this.db.query.procedureGroupSolicitorQuotas.findMany({
          where: and(
            eq(schema.procedureGroupSolicitorQuotas.executingHealthCenterId, filters.healthCenterId),
            gt(schema.procedureGroupSolicitorQuotas.monthlyQuota, 0)
          ),
        }),
      ]);

      hcProcs.forEach((p) => {
        quotaProcedureIds.add(p.procedureId);
        procedureQuotaMap.set(p.procedureId, (procedureQuotaMap.get(p.procedureId) || 0) + (p.monthlyQuantity || 0));
      });
      hcProcQuotas.forEach((q) => {
        quotaProcedureIds.add(q.procedureId);
        procedureQuotaMap.set(q.procedureId, (procedureQuotaMap.get(q.procedureId) || 0) + (q.monthlyQuota || 0));
      });

      hcGroups.forEach((g) => {
        quotaGroupIds.add(g.procedureGroupId);
        groupQuotaMap.set(g.procedureGroupId, (groupQuotaMap.get(g.procedureGroupId) || 0) + (g.monthlyQuantity || 0));
      });
      hcGroupQuotas.forEach((gq) => {
        quotaGroupIds.add(gq.procedureGroupId);
        groupQuotaMap.set(gq.procedureGroupId, (groupQuotaMap.get(gq.procedureGroupId) || 0) + (gq.monthlyQuota || 0));
      });
    }

    // 1.7 Classificação robusta por scheduleType (CONSULTA, EXAME, PROCEDIMENTO)
    const isConsultationProcedure = (p: typeof rawProcedures[0]) => {
      const code = (p.code || '').replace(/\D/g, '');
      if (code.startsWith('03') || code.startsWith('3')) return true;
      const norm = p.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
      return norm.includes('CONSULTA') || norm.includes('ATENDIMENTO');
    };

    const isConsultationGroup = (g: typeof rawGroups[0]) => {
      const code = (g.groupCode || '').replace(/\D/g, '');
      if (code.startsWith('03') || code.startsWith('3')) return true;
      const norm = g.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
      return norm.includes('CONSULTA') || norm.includes('ATENDIMENTO');
    };

    const isExamProcedure = (p: typeof rawProcedures[0]) => {
      const code = (p.code || '').replace(/\D/g, '');
      if (code.startsWith('02') || code.startsWith('2')) return true;
      const norm = p.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
      const examKeywords = [
        'EXAME', 'DIAGNOST', 'TOMOGRAF', 'ULTRASS', 'ULTRASON', 'RESSON', 'RAIO-X',
        'RADIOL', 'RADIOGRAF', 'MAMOGRAF', 'ENDOSCOP', 'COLONOSCOP', 'HOLTER', 'MAPA',
        'ECG', 'ELETROCARDIOG', 'EEG', 'ELETROENCEFAL', 'ECOCARDIOG', 'CITOPATOL',
        'HISTOPATOL', 'BIOPSIA', 'LABORATOR', 'HEMOGRAMA', 'AUDIOMETR', 'ESPIROMETR',
        'DENSITOMETR', 'CINTILOGRAF', 'TESTE',
      ];
      if (examKeywords.some((k) => norm.includes(k))) return true;
      if (quotaProcedureIds.has(p.id) && !norm.includes('CONSULTA')) return true;
      return false;
    };

    const isExamGroup = (g: typeof rawGroups[0]) => {
      const code = (g.groupCode || '').replace(/\D/g, '');
      if (code.startsWith('02') || code.startsWith('2')) return true;
      const norm = g.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
      const examKeywords = [
        'EXAME', 'DIAGNOST', 'TOMOGRAF', 'ULTRASS', 'ULTRASON', 'RESSON', 'RAIO-X',
        'RADIOL', 'RADIOGRAF', 'MAMOGRAF', 'ENDOSCOP', 'COLONOSCOP', 'HOLTER', 'MAPA',
        'ECG', 'ELETROCARDIOG', 'EEG', 'ELETROENCEFAL', 'ECOCARDIOG', 'CITOPATOL',
        'HISTOPATOL', 'BIOPSIA', 'LABORATOR', 'HEMOGRAMA', 'AUDIOMETR', 'ESPIROMETR',
        'DENSITOMETR', 'CINTILOGRAF', 'TESTE',
      ];
      if (examKeywords.some((k) => norm.includes(k))) return true;
      if (quotaGroupIds.has(g.id) && !norm.includes('CONSULTA')) return true;
      return false;
    };

    let allProcedures = rawProcedures;
    let allGroups = rawGroups;

    if (scheduleType === 'CONSULTA') {
      allProcedures = rawProcedures.filter(isConsultationProcedure);
      allGroups = rawGroups.filter(isConsultationGroup);
    } else if (scheduleType === 'EXAME') {
      allProcedures = rawProcedures.filter(isExamProcedure);
      allGroups = rawGroups.filter(isExamGroup);
    } else if (scheduleType === 'PROCEDIMENTO') {
      allProcedures = rawProcedures.filter((p) => !isExamProcedure(p) && !isConsultationProcedure(p));
      allGroups = rawGroups.filter((g) => !isExamGroup(g) && !isConsultationGroup(g));
    }

    // Listas base para refinamento reativo
    let filteredCenters = allCenters;
    let filteredDoctors = allDoctors;
    let filteredProcedures = allProcedures;
    let filteredGroups = allGroups;
    let filteredCbos = allSpecialties.filter((s) => !!s.cbo);

    // =========================================================================
    // REGRA 1: Filtro por Estabelecimento Executante (healthCenterId)
    // =========================================================================
    if (filters.healthCenterId) {
      // 1. Médicos vinculados à unidade executante selecionada (direto ou via userHealthCenters)
      filteredDoctors = filteredDoctors.filter((d) => this.isDoctorInCenter(d, filters.healthCenterId!));

      // 2. CBOs dos médicos vinculados a esta unidade
      const unitCbos = new Set<string>();
      filteredDoctors.forEach((d) => {
        d.doctorSpecialties?.forEach((ds) => {
          if (ds.specialty?.cbo) {
            unitCbos.add(ds.specialty.cbo);
          }
        });
      });

      if (unitCbos.size > 0) {
        filteredCbos = filteredCbos.filter((s) => unitCbos.has(s.cbo!));
      }

      // 3. Resolução de Procedimentos e Grupos com Cotas Configuradas na Unidade
      // Exibe estritamente os procedimentos e grupos que possuem cotas configuradas na unidade executante selecionada
      filteredProcedures = allProcedures.filter(
        (p) => quotaProcedureIds.has(p.id) || (p.procedureGroupId && quotaGroupIds.has(p.procedureGroupId)),
      );
      filteredGroups = allGroups.filter(
        (g) => quotaGroupIds.has(g.id) || (g.procedures || []).some((p) => quotaProcedureIds.has(p.id)),
      );
    }

    // =========================================================================
    // REGRA 2: Filtro por Grupo de Procedimentos (procedureGroupId)
    // =========================================================================
    if (filters.procedureGroupId) {
      filteredGroups = filteredGroups.filter((g) => g.id === filters.procedureGroupId);
      filteredProcedures = filteredProcedures.filter(
        (p) => p.procedureGroupId === filters.procedureGroupId,
      );
      // Médicos que podem executar ao menos um procedimento do grupo
      filteredDoctors = filteredDoctors.filter((d) =>
        filteredProcedures.some((proc) => this.isDoctorAllowedForProcedure(d, proc, scheduleType)),
      );
    }

    // =========================================================================
    // REGRA 3: Filtro por Profissional (doctorId)
    // =========================================================================
    if (filters.doctorId) {
      const selectedDoc = allDoctors.find((d) => d.id === filters.doctorId);
      if (selectedDoc) {
        // Estabelecimento executante do médico
        const docCenters = new Set<string>();
        if (selectedDoc.user?.healthCenterId) docCenters.add(selectedDoc.user.healthCenterId);
        selectedDoc.user?.userHealthCenters?.forEach((uhc: any) => {
          if (uhc.healthCenterId) docCenters.add(uhc.healthCenterId);
        });
        if (docCenters.size > 0 && !filters.healthCenterId) {
          filteredCenters = filteredCenters.filter((c) => docCenters.has(c.id));
        }

        // CBOs específicos do médico
        const docCbos = new Set(
          selectedDoc.doctorSpecialties?.map((ds) => ds.specialty?.cbo).filter(Boolean) as string[],
        );
        if (docCbos.size > 0) {
          filteredCbos = filteredCbos.filter((s) => docCbos.has(s.cbo!));
        }

        // Filtra procedimentos estritamente permitidos para o médico
        filteredProcedures = filteredProcedures.filter((proc) =>
          this.isDoctorAllowedForProcedure(selectedDoc, proc, scheduleType),
        );

        // Filtra grupos que possuam ao menos um procedimento permitido para o médico
        filteredGroups = filteredGroups.filter((group) =>
          (group.procedures || []).some((proc) =>
            this.isDoctorAllowedForProcedure(selectedDoc, proc, scheduleType),
          ),
        );
      }
    }

    // =========================================================================
    // REGRA 4: Filtro por CBO (cbo)
    // =========================================================================
    if (filters.cbo) {
      const targetSpecialty = allSpecialties.find((s) => s.cbo === filters.cbo);

      // Médicos que possuem esse CBO
      filteredDoctors = filteredDoctors.filter((d) =>
        d.doctorSpecialties?.some((ds) => ds.specialty?.cbo === filters.cbo),
      );

      // Estabelecimentos que possuem médicos com esse CBO
      const centersWithDoctor = new Set(
        filteredDoctors.flatMap((d) => [
          d.user?.healthCenterId,
          ...(d.user?.userHealthCenters?.map((uhc: any) => uhc.healthCenterId) || []),
        ]).filter(Boolean),
      );
      if (centersWithDoctor.size > 0 && !filters.healthCenterId) {
        filteredCenters = filteredCenters.filter((c) => centersWithDoctor.has(c.id));
      }

      // Procedimentos de consulta compatíveis com esse CBO
      if (targetSpecialty && scheduleType === 'CONSULTA') {
        filteredProcedures = filteredProcedures.filter((proc) =>
          this.isProcedureCompatibleWithSpecialty(proc.name, targetSpecialty.name, targetSpecialty.cbo),
        );
      }
    }

    // =========================================================================
    // REGRA 5: Filtro por Procedimento Individual (procedureId)
    // =========================================================================
    if (filters.procedureId) {
      const selectedProc = allProcedures.find((p) => p.id === filters.procedureId);
      if (selectedProc) {
        // Encontra especialidades compatíveis com este procedimento
        const matchingSpecs = allSpecialties.filter((spec) =>
          this.isProcedureCompatibleWithSpecialty(selectedProc.name, spec.name, spec.cbo),
        );
        const matchingCbos = new Set(matchingSpecs.map((s) => s.cbo).filter(Boolean) as string[]);

        if (matchingCbos.size > 0) {
          filteredCbos = filteredCbos.filter((s) => matchingCbos.has(s.cbo!));
        }

        // Médicos compatíveis (possuem especialidade compatível ou vínculo explícito)
        filteredDoctors = filteredDoctors.filter((d) =>
          this.isDoctorAllowedForProcedure(d, selectedProc, scheduleType),
        );

        // Estabelecimentos que possuem médicos compatíveis
        const centersWithDoc = new Set(
          filteredDoctors.flatMap((d) => [
            d.user?.healthCenterId,
            ...(d.user?.userHealthCenters?.map((uhc: any) => uhc.healthCenterId) || []),
          ]).filter(Boolean),
        );
        if (centersWithDoc.size > 0 && !filters.healthCenterId) {
          filteredCenters = filteredCenters.filter((c) => centersWithDoc.has(c.id));
        }
      }
    }

    // Refinamento de CBOs para consultas: exibe apenas CBOs que possuem procedimentos correspondentes
    if (scheduleType === 'CONSULTA' && (filters.healthCenterId || filters.doctorId)) {
      if (filteredProcedures.length === 0) {
        filteredCbos = [];
      } else {
        filteredCbos = filteredCbos.filter((spec) =>
          filteredProcedures.some((proc) =>
            this.isProcedureCompatibleWithSpecialty(proc.name, spec.name, spec.cbo),
          ),
        );
      }
    }

    // Ordenação inteligente: procedimentos com cotas configuradas aparecem no topo
    filteredProcedures.sort((a, b) => {
      const aHasQuota = quotaProcedureIds.has(a.id) || (a.procedureGroupId ? quotaGroupIds.has(a.procedureGroupId) : false);
      const bHasQuota = quotaProcedureIds.has(b.id) || (b.procedureGroupId ? quotaGroupIds.has(b.procedureGroupId) : false);
      if (aHasQuota && !bHasQuota) return -1;
      if (!aHasQuota && bHasQuota) return 1;
      return a.name.localeCompare(b.name);
    });

    filteredGroups.sort((a, b) => {
      const aHasQuota = quotaGroupIds.has(a.id) || (a.procedures || []).some((p) => quotaProcedureIds.has(p.id));
      const bHasQuota = quotaGroupIds.has(b.id) || (b.procedures || []).some((p) => quotaProcedureIds.has(p.id));
      if (aHasQuota && !bHasQuota) return -1;
      if (!aHasQuota && bHasQuota) return 1;
      return a.name.localeCompare(b.name);
    });

    // Formata retorno amigável com tags de cotas configuradas
    return {
      healthCenters: filteredCenters.map((c) => ({
        id: c.id,
        name: c.name,
        cnes: c.cnes,
        label: `${c.cnes ? c.cnes + ' - ' : ''}${c.name}`,
      })),
      procedureGroups: filteredGroups.map((g) => {
        const quotaTotal = groupQuotaMap.get(g.id) || 0;
        const hasQuota = quotaGroupIds.has(g.id) || quotaTotal > 0 || (g.procedures || []).some((p) => quotaProcedureIds.has(p.id));
        const quotaTag = quotaTotal > 0 ? ` [Cota: ${quotaTotal}/mês]` : hasQuota ? ` [Cota Configurada]` : '';
        return {
          id: g.id,
          name: g.name,
          groupCode: g.groupCode,
          hasQuota,
          quotaTotal,
          label: `${g.groupCode ? `[${g.groupCode}] ` : ''}${g.name}${quotaTag}`,
          procedures: (g.procedures || []).map((p) => {
            const pQuota = procedureQuotaMap.get(p.id) || 0;
            const pHasQuota = quotaProcedureIds.has(p.id) || hasQuota || pQuota > 0;
            const pTag = pQuota > 0 ? ` [Cota: ${pQuota}/mês]` : pHasQuota ? ` [Cota Configurada]` : '';
            return {
              id: p.id,
              code: p.code,
              name: p.name,
              hasQuota: pHasQuota,
              quotaTotal: pQuota,
              label: `${p.code ? p.code + ' - ' : ''}${p.name}${pTag}`,
            };
          }),
        };
      }),
      procedures: filteredProcedures.map((p) => {
        const pQuota = procedureQuotaMap.get(p.id) || 0;
        const hasQuota = quotaProcedureIds.has(p.id) || (p.procedureGroupId ? quotaGroupIds.has(p.procedureGroupId) : false) || pQuota > 0;
        const pTag = pQuota > 0 ? ` [Cota: ${pQuota}/mês]` : hasQuota ? ` [Cota Configurada]` : '';
        return {
          id: p.id,
          code: p.code,
          name: p.name,
          procedureGroupId: p.procedureGroupId,
          hasQuota,
          quotaTotal: pQuota,
          label: `${p.code ? p.code + ' - ' : ''}${p.name}${pTag}`,
        };
      }),
      doctors: filteredDoctors.map((d) => ({
        id: d.id,
        name: d.user?.name || `Dr. CRM ${d.crm}`,
        crm: `${d.crm || ''}${d.crmState ? '/' + d.crmState : ''}`,
        label: `${d.user?.name || 'Profissional'}${d.crm ? ` (CRM: ${d.crm})` : ''}`,
      })),
      cbos: filteredCbos.map((s) => ({
        cbo: s.cbo!,
        specialtyId: s.id,
        name: s.name,
        label: `${s.cbo} - ${s.name}`,
      })),
    };
  }

  /**
   * 2. Checagem Completa de Conflitos e Alertas de Agenda (SINPeP e e-SUS Regulação)
   */
  async checkConflicts(params: {
    doctorId: string;
    startDate: string;
    endDate: string;
    startTime: string;
    endTime: string;
    daysOfWeek: string[];
    excludeScheduleId?: string;
  }) {
    const { doctorId, startDate, endDate, startTime, endTime, daysOfWeek, excludeScheduleId } = params;

    const conflicts: Array<{
      source: 'SINPEP' | 'ESUS';
      severity: 'BLOCKING' | 'WARNING';
      title: string;
      message: string;
      details?: any;
    }> = [];

    const newStartMins = this.timeToMinutes(startTime);
    const newEndMins = this.timeToMinutes(endTime);

    // 2.1 Busca médico e dados cadastrais
    const doctor = await this.db.query.doctors.findFirst({
      where: eq(schema.doctors.id, doctorId),
      with: { user: true },
    });

    // 2.2 Conflito de Escala no SINPeP (Bloqueante)
    const doctorSchedules = await this.db.query.schedules.findMany({
      where: and(
        eq(schema.schedules.doctorId, doctorId),
        eq(schema.schedules.isActive, true),
        excludeScheduleId ? not(eq(schema.schedules.id, excludeScheduleId)) : undefined,
      ),
      with: {
        procedure: true,
        procedureGroup: true,
        executingHealthCenter: true,
      },
    });

    for (const existing of doctorSchedules) {
      const datesOverlap = startDate <= existing.endDate && endDate >= existing.startDate;
      if (!datesOverlap) continue;

      const commonDays = daysOfWeek.filter((d) => existing.daysOfWeek.includes(d));
      if (commonDays.length === 0) continue;

      const existStartMins = this.timeToMinutes(existing.startTime);
      const existEndMins = this.timeToMinutes(existing.endTime);

      const timesOverlap = newStartMins < existEndMins && newEndMins > existStartMins;
      if (timesOverlap) {
        conflicts.push({
          source: 'SINPEP',
          severity: 'BLOCKING',
          title: 'Conflito de Escala no SINPeP',
          message: `O profissional já possui a escala "${existing.procedure?.name || existing.procedureGroup?.name || 'Atendimento'}" na unidade "${existing.executingHealthCenter?.name || 'Unidade'}" das ${existing.startTime} às ${existing.endTime} nos dias [${commonDays.join(', ')}].`,
          details: {
            scheduleId: existing.id,
            procedure: existing.procedure?.name || existing.procedureGroup?.name,
            healthCenter: existing.executingHealthCenter?.name,
            startTime: existing.startTime,
            endTime: existing.endTime,
            days: commonDays,
          },
        });
      }
    }

    // 2.3 Checagem de Conflitos / Agendamentos no e-SUS Regulação (Alerta Informativo)
    const esusMatches: any[] = [];

    if (process.env.ESUS_API_SECRET && (doctor?.cns || doctor?.cpf || doctor?.user?.name)) {
      try {
        const queryTerms: any[] = [];
        if (doctor.cns) queryTerms.push({ term: { "nuCnsProfissionalExecutante": doctor.cns } });
        if (doctor.cpf) queryTerms.push({ term: { "nuCpfProfissionalExecutante": doctor.cpf } });
        if (doctor.user?.name) {
          queryTerms.push({ match_phrase: { "noProfissionalExecutante": doctor.user.name } });
        }

        const esusRes = await axios.post(
          'https://regulacao-api.saude.gov.br/regulacao-producao/_search',
          {
            size: 200,
            query: {
              bool: {
                must: [
                  { bool: { should: queryTerms, minimum_should_match: 1 } },
                  { range: { dtMarcacao: { gte: startDate, lte: endDate, format: "yyyy-MM-dd" } } },
                ],
              },
            },
          },
          {
            headers: {
              'Authorization': `Basic ${process.env.ESUS_API_SECRET}`,
              'Content-Type': 'application/json',
              'User-Agent': 'SINPeP-Regulacao/1.0',
            },
            timeout: 3000,
          },
        );

        const hits = esusRes.data?.hits?.hits || [];
        for (const hit of hits) {
          const src = hit._source;
          const dtStr = src.dtMarcacao;
          const hrStr = src.hrMarcacao || '07:00';
          if (dtStr) {
            const dt = new Date(`${dtStr}T00:00:00`);
            const dayName = DAY_MAP[dt.getDay()];
            if (daysOfWeek.length === 0 || daysOfWeek.includes(dayName)) {
              const slotMins = this.timeToMinutes(hrStr);
              if (slotMins >= newStartMins && slotMins < newEndMins) {
                esusMatches.push({
                  date: dtStr,
                  time: hrStr,
                  procedure: src.noProcedimentoInterno || 'CONSULTA',
                  patient: src.pacienteNome,
                  healthCenter: src.noEstabelecimentoExecutante,
                });
              }
            }
          }
        }
      } catch (err: any) {
        // Falhas na consulta remota do e-SUS não bloqueiam o fluxo
      }
    }

    if (esusMatches.length > 0) {
      const distinctDates = Array.from(new Set(esusMatches.map((m) => m.date))).slice(0, 5);
      const distinctProcs = Array.from(new Set(esusMatches.map((m) => m.procedure))).slice(0, 3);
      const distinctUnits = Array.from(new Set(esusMatches.map((m) => m.healthCenter).filter(Boolean))).slice(0, 2);

      conflicts.push({
        source: 'ESUS',
        severity: 'WARNING',
        title: 'Agendamentos Detectados no e-SUS Regulação',
        message: `Atenção: Foram identificados ${esusMatches.length} agendamento(s) para o médico no e-SUS Regulação no período selecionado nos mesmos dias/horários (${distinctProcs.join(', ')}). Verifique os limites de horário e capacidade do profissional para evitar sobrecarga assistencial.`,
        details: {
          totalAppointments: esusMatches.length,
          sampleDates: distinctDates,
          procedures: distinctProcs,
          units: distinctUnits,
        },
      });
    }

    const hasBlockingConflict = conflicts.some((c) => c.severity === 'BLOCKING');
    const hasWarning = conflicts.some((c) => c.severity === 'WARNING');

    return {
      hasBlockingConflict,
      hasWarning,
      conflicts,
    };
  }

  /**
   * 2.1 Validação Anti-Conflito de Horário do Profissional (Bloqueio ao Salvar)
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
    const check = await this.checkConflicts({
      doctorId,
      startDate,
      endDate,
      startTime,
      endTime,
      daysOfWeek,
      excludeScheduleId,
    });

    const blocking = check.conflicts.find((c) => c.severity === 'BLOCKING');
    if (blocking) {
      throw new BadRequestException(blocking.message);
    }
  }

  /**
   * 2.2 Validação da Capacidade do Turno vs Soma do Tempo de Atendimento
   */
  private validateTurnCapacity(
    startTime: string,
    endTime: string,
    firstTimeQty: number,
    firstTimeMins: number,
    returnQty: number,
    returnMins: number,
    regulatorQty: number,
    regulatorMins: number,
  ) {
    const startMins = this.timeToMinutes(startTime);
    const endMins = this.timeToMinutes(endTime);
    const turnMinutes = endMins - startMins;

    if (turnMinutes <= 0) {
      throw new BadRequestException('O horário final deve ser posterior ao horário inicial.');
    }

    const totalConfiguredMinutes =
      (firstTimeQty || 0) * (firstTimeMins || 0) +
      (returnQty || 0) * (returnMins || 0) +
      (regulatorQty || 0) * (regulatorMins || 0);

    if (totalConfiguredMinutes > turnMinutes) {
      const formatTime = (mins: number) => {
        const h = Math.floor(mins / 60);
        const m = mins % 60;
        return h > 0 ? `${h}h${m > 0 ? ` ${m}min` : ''}` : `${m}min`;
      };

      throw new BadRequestException(
        `A soma do tempo de atendimento configurado para as vagas (${formatTime(totalConfiguredMinutes)} - ${totalConfiguredMinutes} min) excede o intervalo total do turno (${formatTime(turnMinutes)} - ${turnMinutes} min). É necessário aumentar o intervalo de tempo entre a hora inicial e hora final da escala ou diminuir o tempo de atendimento por vaga.`,
      );
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
        procedureGroup: true,
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
        procedureGroup: true,
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
   * Validação estrita de elegibilidade e cotas:
   * 1. Unidade Executante ativa e com perfil de Coordenador respeitado.
   * 2. Vínculo do profissional com a unidade executante.
   * 3. Vínculo do CBO informado com o profissional.
   * 4. Existência de cotas pactuadas/configuradas para o procedimento/grupo na unidade executante.
   * 5. Habilitação/compatibilidade do profissional para realizar o procedimento selecionado.
   */
  private async validateScheduleEligibility(
    params: {
      executingHealthCenterId: string;
      doctorId: string;
      cbo: string;
      scheduleType?: string;
      procedureId?: string | null;
      procedureGroupId?: string | null;
      enabledProcedureIds?: string[] | null;
    },
    user: AuthUser,
  ) {
    const {
      executingHealthCenterId,
      doctorId,
      cbo,
      scheduleType = 'CONSULTA',
      procedureId,
      procedureGroupId,
      enabledProcedureIds,
    } = params;

    // 1. Unidade Executante
    const healthCenter = await this.db.query.healthCenters.findFirst({
      where: eq(schema.healthCenters.id, executingHealthCenterId),
    });

    if (!healthCenter) {
      throw new BadRequestException('Unidade Executante informada não encontrada.');
    }
    if (!healthCenter.stExecutante) {
      throw new BadRequestException(
        `A unidade "${healthCenter.name}" não está configurada como estabelecimento executante.`
      );
    }

    const isCoordinator = user.activeProfileName === 'Coordenador de Unidade';
    if (isCoordinator && user.healthCenterId && executingHealthCenterId !== user.healthCenterId) {
      throw new ForbiddenException(
        'Coordenadores de Unidade só podem criar ou editar escalas para sua própria unidade de saúde.'
      );
    }

    // 2. Médico e vínculo com a unidade executante
    const doctor = await this.db.query.doctors.findFirst({
      where: eq(schema.doctors.id, doctorId),
      with: {
        user: {
          with: { userHealthCenters: true },
        },
        doctorSpecialties: {
          with: { specialty: true },
        },
        doctorProcedures: {
          with: { procedure: true },
        },
      },
    });

    if (!doctor || !doctor.isActive) {
      throw new BadRequestException('Profissional selecionado não encontrado ou inativo.');
    }

    const isLinked = this.isDoctorInCenter(doctor, executingHealthCenterId);
    if (!isLinked) {
      throw new BadRequestException(
        `O profissional "${doctor.user?.name || doctor.crm}" não possui vínculo ativo com a unidade executante "${healthCenter.name}".`
      );
    }

    // 3. Vínculo do CBO com o profissional
    const doctorCbos = (doctor.doctorSpecialties || [])
      .map((ds) => ds.specialty?.cbo)
      .filter(Boolean);

    if (cbo && doctorCbos.length > 0 && !doctorCbos.includes(cbo)) {
      throw new BadRequestException(
        `O CBO "${cbo}" informado não pertence às especialidades cadastradas do profissional "${doctor.user?.name || doctor.crm}".`
      );
    }

    // 4. Cotas Pactuadas/Configuradas na Unidade Executante
    if (procedureId) {
      const [hcProc, solQuota, procData] = await Promise.all([
        this.db.query.healthCenterProcedures.findFirst({
          where: and(
            eq(schema.healthCenterProcedures.healthCenterId, executingHealthCenterId),
            eq(schema.healthCenterProcedures.procedureId, procedureId),
            or(
              eq(schema.healthCenterProcedures.isOffered, true),
              gt(schema.healthCenterProcedures.monthlyQuantity, 0),
            ),
          ),
        }),
        this.db.query.procedureSolicitorQuotas.findFirst({
          where: and(
            eq(schema.procedureSolicitorQuotas.executingHealthCenterId, executingHealthCenterId),
            eq(schema.procedureSolicitorQuotas.procedureId, procedureId),
            gt(schema.procedureSolicitorQuotas.monthlyQuota, 0),
          ),
        }),
        this.db.query.procedures.findFirst({
          where: eq(schema.procedures.id, procedureId),
        }),
      ]);

      if (!procData) {
        throw new BadRequestException('Procedimento informado não encontrado.');
      }

      let groupHasQuota = false;
      if (procData.procedureGroupId) {
        const [hcGroup, groupSolQuota] = await Promise.all([
          this.db.query.healthCenterProcedureGroups.findFirst({
            where: and(
              eq(schema.healthCenterProcedureGroups.healthCenterId, executingHealthCenterId),
              eq(schema.healthCenterProcedureGroups.procedureGroupId, procData.procedureGroupId),
              or(
                eq(schema.healthCenterProcedureGroups.isOffered, true),
                gt(schema.healthCenterProcedureGroups.monthlyQuantity, 0),
              ),
            ),
          }),
          this.db.query.procedureGroupSolicitorQuotas.findFirst({
            where: and(
              eq(schema.procedureGroupSolicitorQuotas.executingHealthCenterId, executingHealthCenterId),
              eq(schema.procedureGroupSolicitorQuotas.procedureGroupId, procData.procedureGroupId),
              gt(schema.procedureGroupSolicitorQuotas.monthlyQuota, 0),
            ),
          }),
        ]);
        groupHasQuota = Boolean(hcGroup || groupSolQuota);
      }

      const hasQuota = Boolean(hcProc || solQuota || groupHasQuota);
      if (!hasQuota) {
        throw new BadRequestException(
          `O procedimento "${procData.name}" não possui cotas configuradas na unidade executante "${healthCenter.name}".`
        );
      }

      // 5. Habilitação do Profissional para o Procedimento
      const isAllowed = this.isDoctorAllowedForProcedure(doctor, procData, scheduleType);
      if (!isAllowed) {
        throw new BadRequestException(
          `O profissional "${doctor.user?.name || doctor.crm}" não possui autorização ou especialidade compatível para realizar o procedimento "${procData.name}".`
        );
      }
    } else if (procedureGroupId) {
      const [hcGroup, groupSolQuota] = await Promise.all([
        this.db.query.healthCenterProcedureGroups.findFirst({
          where: and(
            eq(schema.healthCenterProcedureGroups.healthCenterId, executingHealthCenterId),
            eq(schema.healthCenterProcedureGroups.procedureGroupId, procedureGroupId),
            or(
              eq(schema.healthCenterProcedureGroups.isOffered, true),
              gt(schema.healthCenterProcedureGroups.monthlyQuantity, 0),
            ),
          ),
        }),
        this.db.query.procedureGroupSolicitorQuotas.findFirst({
          where: and(
            eq(schema.procedureGroupSolicitorQuotas.executingHealthCenterId, executingHealthCenterId),
            eq(schema.procedureGroupSolicitorQuotas.procedureGroupId, procedureGroupId),
            gt(schema.procedureGroupSolicitorQuotas.monthlyQuota, 0),
          ),
        }),
      ]);

      const groupProcs = await this.db.query.procedures.findMany({
        where: eq(schema.procedures.procedureGroupId, procedureGroupId),
      });

      const enabled = enabledProcedureIds && enabledProcedureIds.length > 0
        ? groupProcs.filter((p) => enabledProcedureIds.includes(p.id))
        : groupProcs;

      let anyProcQuota = false;
      if (enabled.length > 0) {
        const procIds = enabled.map((p) => p.id);
        const [foundHc, foundSol] = await Promise.all([
          this.db.query.healthCenterProcedures.findFirst({
            where: and(
              eq(schema.healthCenterProcedures.healthCenterId, executingHealthCenterId),
              inArray(schema.healthCenterProcedures.procedureId, procIds),
              or(
                eq(schema.healthCenterProcedures.isOffered, true),
                gt(schema.healthCenterProcedures.monthlyQuantity, 0),
              ),
            ),
          }),
          this.db.query.procedureSolicitorQuotas.findFirst({
            where: and(
              eq(schema.procedureSolicitorQuotas.executingHealthCenterId, executingHealthCenterId),
              inArray(schema.procedureSolicitorQuotas.procedureId, procIds),
              gt(schema.procedureSolicitorQuotas.monthlyQuota, 0),
            ),
          }),
        ]);
        anyProcQuota = Boolean(foundHc || foundSol);
      }

      if (!hcGroup && !groupSolQuota && !anyProcQuota) {
        throw new BadRequestException(
          `O grupo de procedimentos selecionado não possui cotas configuradas na unidade executante "${healthCenter.name}".`
        );
      }

      const anyAllowed = enabled.some((proc) =>
        this.isDoctorAllowedForProcedure(doctor, proc, scheduleType),
      );
      if (!anyAllowed) {
        throw new BadRequestException(
          `O profissional "${doctor.user?.name || doctor.crm}" não possui autorização ou especialidade compatível para os procedimentos deste grupo.`
        );
      }
    }
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

    if (!dto.procedureId && !dto.procedureGroupId) {
      throw new BadRequestException('É obrigatório informar o procedimento ou grupo de procedimentos.');
    }

    // Validação estrita de elegibilidade, vínculos e cotas
    await this.validateScheduleEligibility(
      {
        executingHealthCenterId,
        doctorId: dto.doctorId,
        cbo: dto.cbo,
        scheduleType: dto.scheduleType,
        procedureId: dto.procedureId,
        procedureGroupId: dto.procedureGroupId,
        enabledProcedureIds: dto.enabledProcedureIds,
      },
      user,
    );

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

    // Validação da capacidade do turno vs soma do tempo de atendimento configurado
    this.validateTurnCapacity(
      dto.startTime,
      dto.endTime,
      dto.firstTimeQuantity || 0,
      dto.firstTimeMinutes || 0,
      dto.returnQuantity || 0,
      dto.returnMinutes || 0,
      dto.regulatorReservedQuantity || 0,
      dto.regulatorReservedMinutes || 0,
    );

    // Se tiver procedureGroupId e enabledProcedureIds não informado, habilita todos os procedimentos do grupo
    let enabledProcedureIds = dto.enabledProcedureIds || [];
    if (dto.procedureGroupId && (!enabledProcedureIds || enabledProcedureIds.length === 0)) {
      const groupProcs = await this.db.query.procedures.findMany({
        where: eq(schema.procedures.procedureGroupId, dto.procedureGroupId),
      });
      enabledProcedureIds = groupProcs.map((p) => p.id);
    }

    const scheduleId = randomUUID();
    const now = new Date().toISOString();

    // Insere o cabeçalho da escala
    await this.db.insert(schema.schedules).values({
      id: scheduleId,
      executingHealthCenterId,
      scheduleType: dto.scheduleType || 'CONSULTA',
      procedureId: dto.procedureId || null,
      procedureGroupId: dto.procedureGroupId || null,
      doctorId: dto.doctorId,
      cbo: dto.cbo.trim(),
      enabledProcedureIds,
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
    const firstTimeQuantity = dto.firstTimeQuantity !== undefined ? dto.firstTimeQuantity : existing.firstTimeQuantity;
    const firstTimeMinutes = dto.firstTimeMinutes !== undefined ? dto.firstTimeMinutes : existing.firstTimeMinutes;
    const returnQuantity = dto.returnQuantity !== undefined ? dto.returnQuantity : existing.returnQuantity;
    const returnMinutes = dto.returnMinutes !== undefined ? dto.returnMinutes : existing.returnMinutes;
    const regulatorReservedQuantity = dto.regulatorReservedQuantity !== undefined ? dto.regulatorReservedQuantity : existing.regulatorReservedQuantity;
    const regulatorReservedMinutes = dto.regulatorReservedMinutes !== undefined ? dto.regulatorReservedMinutes : existing.regulatorReservedMinutes;

    const executingHealthCenterId = existing.executingHealthCenterId;
    const procedureId = dto.procedureId !== undefined ? dto.procedureId : existing.procedureId;
    const procedureGroupId = dto.procedureGroupId !== undefined ? dto.procedureGroupId : existing.procedureGroupId;
    const cbo = dto.cbo || existing.cbo;
    const scheduleType = dto.scheduleType || existing.scheduleType;
    const enabledProcedureIds = dto.enabledProcedureIds !== undefined ? dto.enabledProcedureIds : existing.enabledProcedureIds;

    // Validação estrita de elegibilidade, vínculos e cotas
    await this.validateScheduleEligibility(
      {
        executingHealthCenterId,
        doctorId,
        cbo,
        scheduleType,
        procedureId,
        procedureGroupId,
        enabledProcedureIds,
      },
      user,
    );

    // Valida capacidade do turno vs soma do tempo de atendimento configurado
    this.validateTurnCapacity(
      startTime,
      endTime,
      firstTimeQuantity,
      firstTimeMinutes,
      returnQuantity,
      returnMinutes,
      regulatorReservedQuantity,
      regulatorReservedMinutes,
    );

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
        scheduleType: dto.scheduleType || existing.scheduleType,
        procedureId: dto.procedureId !== undefined ? (dto.procedureId || null) : existing.procedureId,
        procedureGroupId: dto.procedureGroupId !== undefined ? (dto.procedureGroupId || null) : existing.procedureGroupId,
        doctorId,
        cbo: dto.cbo || existing.cbo,
        enabledProcedureIds: dto.enabledProcedureIds !== undefined ? dto.enabledProcedureIds : existing.enabledProcedureIds,
        startDate,
        endDate,
        startTime,
        endTime,
        daysOfWeek,
        firstTimeQuantity,
        firstTimeMinutes,
        returnQuantity,
        returnMinutes,
        regulatorReservedQuantity,
        regulatorReservedMinutes,
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
    procedureId?: string,
    filters?: {
      procedureGroupId?: string;
      executingHealthCenterId?: string;
      date?: string;
    },
  ) {
    const isAdmin = user.permissions.includes('admin:access') || user.activeProfileName === 'Administrador';
    const isRegulator = user.activeProfileName?.includes('Regulador') || user.permissions.includes('regulation-operator:read');
    const isCoordinator = !isAdmin && !isRegulator && user.activeProfileName === 'Coordenador de Unidade';
    const isSolicitor = !isAdmin && !isRegulator && (user.activeProfileName?.includes('Solicitante') || user.permissions.includes('regulation-solicitor:read'));

    // 1. Identifica o procedimento solicitado e seu grupo
    let targetProcedure: any = null;
    let targetGroupId = filters?.procedureGroupId;

    if (procedureId) {
      targetProcedure = await this.db.query.procedures.findFirst({
        where: eq(schema.procedures.id, procedureId),
      });
      if (targetProcedure?.procedureGroupId) {
        targetGroupId = targetProcedure.procedureGroupId;
      }
    }

    // 2. Monta condições de busca de agendas ativas
    const procConditions = [];
    if (procedureId) {
      procConditions.push(eq(schema.schedules.procedureId, procedureId));
    }
    if (targetGroupId) {
      procConditions.push(eq(schema.schedules.procedureGroupId, targetGroupId));
    }

    if (procConditions.length === 0) {
      return [];
    }

    const scheduleConditions = [
      or(...procConditions),
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
        procedureGroup: true,
        doctor: {
          with: { user: true },
        },
      },
    });

    if (schedules.length === 0) {
      return [];
    }

    const scheduleIds = schedules.map((s) => s.id);
    const todayStr = new Date().toISOString().split('T')[0];

    const slotConditions = [
      inArray(schema.scheduleSlots.scheduleId, scheduleIds),
      eq(schema.scheduleSlots.status, 'DISPONIVEL'),
      gte(schema.scheduleSlots.date, todayStr),
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
            procedure: true,
            procedureGroup: true,
            doctor: {
              with: { user: true },
            },
          },
        },
      },
      orderBy: [asc(schema.scheduleSlots.date), asc(schema.scheduleSlots.time)],
      limit: 100,
    });

    // Enriquecimento com validação de procedimentos desabilitados pelo gestor na escala
    return slots.map((slot) => {
      const sch = slot.schedule;
      let isProcedureDisabled = false;
      let disabledReason: string | null = null;

      if (sch.procedureGroupId && sch.enabledProcedureIds && sch.enabledProcedureIds.length > 0) {
        if (procedureId && !sch.enabledProcedureIds.includes(procedureId)) {
          isProcedureDisabled = true;
          disabledReason = `O procedimento solicitado (${targetProcedure?.name || 'não identificado'}) foi desmarcado na oferta desta escala de atendimento pelo gestor.`;
        }
      }

      return {
        ...slot,
        isProcedureDisabled,
        disabledReason,
      };
    });
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
            procedureGroup: true,
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

    // Validação de procedimento desabilitado na escala
    if (
      slot.schedule.procedureGroupId &&
      slot.schedule.enabledProcedureIds &&
      slot.schedule.enabledProcedureIds.length > 0 &&
      request.procedureId &&
      !slot.schedule.enabledProcedureIds.includes(request.procedureId)
    ) {
      throw new BadRequestException(
        'Este agendamento não pode ser realizado pois o procedimento solicitado foi desabilitado na configuração desta escala de atendimento.',
      );
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
