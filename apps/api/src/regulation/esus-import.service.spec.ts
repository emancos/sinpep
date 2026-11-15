import { Test, TestingModule } from '@nestjs/testing';
import { EsusImportService } from './esus-import.service';

describe('EsusImportService - Specialty and Doctor Import', () => {
  let service: EsusImportService;

  const mockDb = {
    query: {
      healthCenters: { findFirst: jest.fn(), findMany: jest.fn() },
      esusImportJobs: { findMany: jest.fn() },
    },
    select: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    transaction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EsusImportService,
        { provide: 'DATABASE_CONNECTION', useValue: mockDb },
      ],
    }).compile();

    service = module.get<EsusImportService>(EsusImportService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('resolveSpecialtyId', () => {
    it('should resolve specialty by CBO code directly', async () => {
      const mockTx = {
        select: jest.fn().mockReturnValue({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue([{ id: 'spec-cardio-id' }]),
            }),
          }),
        }),
      };

      const result = await service.resolveSpecialtyId(mockTx, 'CONSULTA MEDICA', '225120');
      expect(result).toBe('spec-cardio-id');
    });

    it('should resolve specialty by procedure name for Ortopedia (CBO 225270)', async () => {
      const mockTx = {
        select: jest.fn().mockReturnValue({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue([{ id: 'spec-orto-id' }]),
            }),
          }),
        }),
      };

      const result = await service.resolveSpecialtyId(mockTx, 'CONSULTA EM ORTOPEDIA E TRAUMATOLOGIA');
      expect(result).toBe('spec-orto-id');
    });

    it('should resolve specialty by procedure name for Radiologia/Ultrassom (CBO 225320)', async () => {
      const mockTx = {
        select: jest.fn().mockReturnValue({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue([{ id: 'spec-usg-id' }]),
            }),
          }),
        }),
      };

      const result = await service.resolveSpecialtyId(mockTx, 'ULTRASSONOGRAFIA DE MAMAS (BILATERAL)');
      expect(result).toBe('spec-usg-id');
    });
  });

  describe('autoRegisterDoctorInBatch', () => {
    it('should auto-register a new doctor with specialty and health center relations', async () => {
      const insertedUsers: any[] = [];
      const insertedDoctors: any[] = [];
      const insertedSpecialties: any[] = [];

      const mockTx = {
        select: jest.fn().mockReturnValue({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue([]), // Nenhum médico existente
            }),
          }),
        }),
        insert: jest.fn((table: any) => ({
          values: jest.fn((val: any) => {
            if (val.email) insertedUsers.push(val);
            if (val.crmState) insertedDoctors.push(val);
            if (val.specialtyId) insertedSpecialties.push(val);
            return Promise.resolve([val]);
          }),
        })),
        update: jest.fn().mockReturnValue({
          set: jest.fn().mockReturnValue({
            where: jest.fn().mockResolvedValue([]),
          }),
        }),
      };

      const doctorCache = new Map<string, string>();
      const doctorId = await service.autoRegisterDoctorInBatch(
        mockTx,
        {
          name: 'DR. CARLOS SILVA',
          cpf: '12345678901',
          cns: '700000000000001',
          crm: '12345',
          healthCenterId: 'center-1',
          procedureId: 'proc-1',
          specialtyId: 'spec-cardio',
          nowTz: new Date().toISOString(),
        },
        'profile-medico-id',
        doctorCache,
      );

      expect(doctorId).toBeDefined();
      expect(insertedUsers.length).toBe(1);
      expect(insertedUsers[0].name).toBe('DR. CARLOS SILVA');
      expect(insertedDoctors.length).toBe(1);
      expect(insertedDoctors[0].crm).toBe('12345');
      expect(insertedSpecialties.length).toBe(1);
      expect(insertedSpecialties[0].specialtyId).toBe('spec-cardio');
    });
  });
});
