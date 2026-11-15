import { Test, TestingModule } from '@nestjs/testing';
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
      healthCenterProcedures: { findMany: jest.fn() },
      procedureSolicitorQuotas: { findMany: jest.fn() },
      healthCenterProcedureGroups: { findMany: jest.fn() },
      procedureGroupSolicitorQuotas: { findMany: jest.fn() },
      schedules: { findMany: jest.fn(), findFirst: jest.fn() },
      scheduleSlots: { findMany: jest.fn() },
    },
    select: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
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

    // Simula cotas configuradas para o procedimento e grupo
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

  it('should not return empty procedures for CONSULTA when no doctors are registered yet', async () => {
    const hcId = 'center-456';
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

    // Não deve esvaziar a lista de procedimentos
    expect(result.procedures.length).toBeGreaterThan(0);
    expect(result.procedures[0].name).toBe('CONSULTA EM CARDIOLOGIA');
  });
});
