import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { SchedulesService } from './schedules.service';

describe('SchedulesService - getDependencies and Quotas', () => {
  let service: SchedulesService;

  const mockDb = {
    query: {
      healthCenters: { findMany: jest.fn(), findFirst: jest.fn() },
      procedureGroups: { findMany: jest.fn(), findFirst: jest.fn() },
      procedures: { findMany: jest.fn(), findFirst: jest.fn() },
      doctors: { findMany: jest.fn(), findFirst: jest.fn() },
      specialties: { findMany: jest.fn(), findFirst: jest.fn() },
      healthCenterProcedures: { findMany: jest.fn(), findFirst: jest.fn() },
      procedureSolicitorQuotas: { findMany: jest.fn(), findFirst: jest.fn() },
      healthCenterProcedureGroups: { findMany: jest.fn(), findFirst: jest.fn() },
      procedureGroupSolicitorQuotas: { findMany: jest.fn(), findFirst: jest.fn() },
      schedules: { findMany: jest.fn(), findFirst: jest.fn() },
      scheduleSlots: { findMany: jest.fn() },
    },
    select: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SchedulesService,
        { provide: 'DATABASE_CONNECTION', useValue: mockDb },
      ],
    }).compile();

    service = module.get<SchedulesService>(SchedulesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return configured quotas when healthCenterId has pactuadas quotas', async () => {
    const hcId = 'center-123';
    const procWithQuotaId = 'proc-ultrassom';
    const groupWithQuotaId = 'group-usg';

    mockDb.query.healthCenters.findMany.mockResolvedValue([
      { id: hcId, name: 'POLICLÍNICA CENTRAL', cnes: '1234567', stExecutante: true },
    ]);

    mockDb.query.procedureGroups.findMany.mockResolvedValue([
      {
        id: groupWithQuotaId,
        name: 'GRUPO - ULTRASSONOGRAFIA - GERAL',
        groupCode: '02',
        isActive: true,
        procedures: [
          { id: procWithQuotaId, code: '0205020097', name: 'ULTRASSONOGRAFIA DE MAMAS', isActive: true },
        ],
      },
    ]);

    mockDb.query.procedures.findMany.mockResolvedValue([
      { id: procWithQuotaId, code: '0205020097', name: 'ULTRASSONOGRAFIA DE MAMAS', procedureGroupId: groupWithQuotaId, isActive: true },
      { id: 'proc-other', code: '0205020127', name: 'ULTRASSONOGRAFIA DE TIREOIDE', procedureGroupId: groupWithQuotaId, isActive: true },
    ]);

    mockDb.query.doctors.findMany.mockResolvedValue([]);
    mockDb.query.specialties.findMany.mockResolvedValue([
      { id: 'spec-1', name: 'Médico em radiologia e diagnóstico por imagem', cbo: '225320', isActive: true },
    ]);

    mockDb.query.healthCenterProcedures.findMany.mockResolvedValue([
      { procedureId: procWithQuotaId, healthCenterId: hcId, monthlyQuantity: 50, isOffered: true },
    ]);
    mockDb.query.procedureSolicitorQuotas.findMany.mockResolvedValue([
      { procedureId: procWithQuotaId, executingHealthCenterId: hcId, monthlyQuota: 30 },
    ]);
    mockDb.query.healthCenterProcedureGroups.findMany.mockResolvedValue([
      { procedureGroupId: groupWithQuotaId, healthCenterId: hcId, monthlyQuantity: 100, isOffered: true },
    ]);
    mockDb.query.procedureGroupSolicitorQuotas.findMany.mockResolvedValue([]);

    const result = await service.getDependencies({
      healthCenterId: hcId,
      scheduleType: 'EXAME',
    });

    expect(result).toBeDefined();
    expect(result.healthCenters).toHaveLength(1);
    expect(result.procedureGroups).toHaveLength(1);
    expect(result.procedureGroups[0].hasQuota).toBe(true);
    expect(result.procedureGroups[0].label).toContain('[Cota: 100/mês]');

    expect(result.procedures).toHaveLength(2);
    expect(result.procedures[0].id).toBe(procWithQuotaId);
    expect(result.procedures[0].hasQuota).toBe(true);
    expect(result.procedures[0].label).toContain('[Cota: 80/mês]');
    expect(result.procedures[1].id).toBe('proc-other');
    expect(result.procedures[1].hasQuota).toBe(true);
  });

  it('should return empty procedures when health center has no quotas configured for that scheduleType', async () => {
    const hcId = 'center-empty';
    mockDb.query.healthCenters.findMany.mockResolvedValue([
      { id: hcId, name: 'UBS SÃO BENTO', cnes: '7654321', stExecutante: true },
    ]);
    mockDb.query.procedureGroups.findMany.mockResolvedValue([]);
    mockDb.query.procedures.findMany.mockResolvedValue([
      { id: 'proc-cardio', code: '0301010072', name: 'CONSULTA EM CARDIOLOGIA', isActive: true },
    ]);
    mockDb.query.doctors.findMany.mockResolvedValue([]);
    mockDb.query.specialties.findMany.mockResolvedValue([
      { id: 'spec-cardio', name: 'Médico cardiologista', cbo: '225120', isActive: true },
    ]);
    mockDb.query.healthCenterProcedures.findMany.mockResolvedValue([]);
    mockDb.query.procedureSolicitorQuotas.findMany.mockResolvedValue([]);
    mockDb.query.healthCenterProcedureGroups.findMany.mockResolvedValue([]);
    mockDb.query.procedureGroupSolicitorQuotas.findMany.mockResolvedValue([]);

    const result = await service.getDependencies({
      healthCenterId: hcId,
      scheduleType: 'CONSULTA',
    });

    // Como a unidade não possui cotas configuradas, não deve exibir procedimentos
    expect(result.procedures).toHaveLength(0);
    expect(result.cbos).toHaveLength(0);
  });

  it('should return empty procedures when a cardiologist is selected and only dermatology has quota', async () => {
    const hcId = 'center-policlinica';
    const docId = 'doc-cardiologist';

    mockDb.query.healthCenters.findMany.mockResolvedValue([
      { id: hcId, name: 'POLICLÍNICA', cnes: '1122334', stExecutante: true },
    ]);
    mockDb.query.procedureGroups.findMany.mockResolvedValue([]);
    mockDb.query.procedures.findMany.mockResolvedValue([
      { id: 'proc-dermato', code: '0301010080', name: 'CONSULTA EM DERMATOLOGIA', isActive: true },
      { id: 'proc-cardio', code: '0301010072', name: 'CONSULTA EM CARDIOLOGIA', isActive: true },
    ]);

    // Médico cardiologista vinculado à unidade
    mockDb.query.doctors.findMany.mockResolvedValue([
      {
        id: docId,
        crm: '5566',
        crmState: 'PB',
        isActive: true,
        user: {
          id: 'user-doc',
          name: 'Dr. Roberto Cardiologista',
          healthCenterId: hcId,
          userHealthCenters: [],
        },
        doctorSpecialties: [
          {
            specialty: {
              id: 'spec-cardio',
              name: 'Médico cardiologista',
              cbo: '225120',
            },
          },
        ],
        doctorProcedures: [],
      },
    ]);

    mockDb.query.specialties.findMany.mockResolvedValue([
      { id: 'spec-dermato', name: 'Médico dermatologista', cbo: '225135', isActive: true },
      { id: 'spec-cardio', name: 'Médico cardiologista', cbo: '225120', isActive: true },
    ]);

    // Apenas consulta em dermatologia possui cota na unidade executante
    mockDb.query.healthCenterProcedures.findMany.mockResolvedValue([
      { procedureId: 'proc-dermato', healthCenterId: hcId, monthlyQuantity: 30, isOffered: true },
    ]);
    mockDb.query.procedureSolicitorQuotas.findMany.mockResolvedValue([]);
    mockDb.query.healthCenterProcedureGroups.findMany.mockResolvedValue([]);
    mockDb.query.procedureGroupSolicitorQuotas.findMany.mockResolvedValue([]);

    const result = await service.getDependencies({
      healthCenterId: hcId,
      doctorId: docId,
      scheduleType: 'CONSULTA',
    });

    // O médico cardiologista não tem permissão para dermatologia -> select de procedimento deve ficar vazio
    expect(result.procedures).toHaveLength(0);
    expect(result.cbos).toHaveLength(0);
  });

  it('should return the procedure when the doctor has compatible specialty with the configured quota', async () => {
    const hcId = 'center-policlinica';
    const docId = 'doc-cardiologist';

    mockDb.query.healthCenters.findMany.mockResolvedValue([
      { id: hcId, name: 'POLICLÍNICA', cnes: '1122334', stExecutante: true },
    ]);
    mockDb.query.procedureGroups.findMany.mockResolvedValue([]);
    mockDb.query.procedures.findMany.mockResolvedValue([
      { id: 'proc-dermato', code: '0301010080', name: 'CONSULTA EM DERMATOLOGIA', isActive: true },
      { id: 'proc-cardio', code: '0301010072', name: 'CONSULTA EM CARDIOLOGIA', isActive: true },
    ]);

    mockDb.query.doctors.findMany.mockResolvedValue([
      {
        id: docId,
        crm: '5566',
        crmState: 'PB',
        isActive: true,
        user: {
          id: 'user-doc',
          name: 'Dr. Roberto Cardiologista',
          healthCenterId: hcId,
          userHealthCenters: [],
        },
        doctorSpecialties: [
          {
            specialty: {
              id: 'spec-cardio',
              name: 'Médico cardiologista',
              cbo: '225120',
            },
          },
        ],
        doctorProcedures: [],
      },
    ]);

    mockDb.query.specialties.findMany.mockResolvedValue([
      { id: 'spec-dermato', name: 'Médico dermatologista', cbo: '225135', isActive: true },
      { id: 'spec-cardio', name: 'Médico cardiologista', cbo: '225120', isActive: true },
    ]);

    // Unidade tem cota para cardiologia
    mockDb.query.healthCenterProcedures.findMany.mockResolvedValue([
      { procedureId: 'proc-cardio', healthCenterId: hcId, monthlyQuantity: 40, isOffered: true },
    ]);
    mockDb.query.procedureSolicitorQuotas.findMany.mockResolvedValue([]);
    mockDb.query.healthCenterProcedureGroups.findMany.mockResolvedValue([]);
    mockDb.query.procedureGroupSolicitorQuotas.findMany.mockResolvedValue([]);

    const result = await service.getDependencies({
      healthCenterId: hcId,
      doctorId: docId,
      scheduleType: 'CONSULTA',
    });

    expect(result.procedures).toHaveLength(1);
    expect(result.procedures[0].id).toBe('proc-cardio');
    expect(result.cbos).toHaveLength(1);
    expect(result.cbos[0].cbo).toBe('225120');
  });

  it('should validate and throw BadRequestException in create when doctor is not linked to unit', async () => {
    mockDb.query.healthCenters.findFirst.mockResolvedValue({
      id: 'center-1',
      name: 'POLICLÍNICA',
      stExecutante: true,
    });
    mockDb.query.doctors.findFirst.mockResolvedValue({
      id: 'doc-1',
      crm: '9999',
      isActive: true,
      user: {
        id: 'u-1',
        name: 'Dr. Sem Vínculo',
        healthCenterId: 'other-center',
        userHealthCenters: [],
      },
      doctorSpecialties: [{ specialty: { cbo: '225120', name: 'Médico cardiologista' } }],
    });

    const mockUser: any = {
      id: 'admin-1',
      name: 'Admin',
      activeProfileName: 'Administrador',
      permissions: ['admin:access'],
    };

    await expect(
      service.create(
        {
          executingHealthCenterId: 'center-1',
          doctorId: 'doc-1',
          cbo: '225120',
          procedureId: 'proc-1',
          startDate: '2026-11-20',
          endDate: '2026-11-25',
          startTime: '08:00',
          endTime: '12:00',
          daysOfWeek: ['SEGUNDA'],
          firstTimeQuantity: 5,
          firstTimeMinutes: 20,
          returnQuantity: 5,
          returnMinutes: 15,
          regulatorReservedQuantity: 0,
          regulatorReservedMinutes: 0,
          autoSlotSplit: true,
          isLocalSchedule: false,
        },
        mockUser,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('should throw BadRequestException in create when procedure has no quota in executing health center', async () => {
    mockDb.query.healthCenters.findFirst.mockResolvedValue({
      id: 'center-1',
      name: 'POLICLÍNICA',
      stExecutante: true,
    });
    mockDb.query.doctors.findFirst.mockResolvedValue({
      id: 'doc-1',
      crm: '9999',
      isActive: true,
      user: {
        id: 'u-1',
        name: 'Dr. Vinculado',
        healthCenterId: 'center-1',
        userHealthCenters: [],
      },
      doctorSpecialties: [{ specialty: { cbo: '225120', name: 'Médico cardiologista' } }],
      doctorProcedures: [],
    });

    mockDb.query.healthCenterProcedures.findFirst.mockResolvedValue(null);
    mockDb.query.procedureSolicitorQuotas.findFirst.mockResolvedValue(null);
    mockDb.query.procedures.findFirst.mockResolvedValue({
      id: 'proc-sem-cota',
      name: 'CONSULTA EM CARDIOLOGIA',
      procedureGroupId: null,
    });

    const mockUser: any = {
      id: 'admin-1',
      name: 'Admin',
      activeProfileName: 'Administrador',
      permissions: ['admin:access'],
    };

    await expect(
      service.create(
        {
          executingHealthCenterId: 'center-1',
          doctorId: 'doc-1',
          cbo: '225120',
          procedureId: 'proc-sem-cota',
          startDate: '2026-11-20',
          endDate: '2026-11-25',
          startTime: '08:00',
          endTime: '12:00',
          daysOfWeek: ['SEGUNDA'],
          firstTimeQuantity: 5,
          firstTimeMinutes: 20,
          returnQuantity: 5,
          returnMinutes: 15,
          regulatorReservedQuantity: 0,
          regulatorReservedMinutes: 0,
          autoSlotSplit: true,
          isLocalSchedule: false,
        },
        mockUser,
      ),
    ).rejects.toThrow('não possui cotas configuradas');
  });
});
