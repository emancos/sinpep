import { Test, TestingModule } from '@nestjs/testing';
import { EsusImportService } from './esus-import.service';
import { IntegraSusService } from '../integra-sus/integra-sus.service';

describe('EsusImportService - Specialty and Doctor Import', () => {
  let service: EsusImportService;
  let integraSusService: jest.Mocked<Partial<IntegraSusService>>;

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
    integraSusService = {
      findProfessionalInCnes: jest.fn(),
      getProfessionalByCns: jest.fn(),
      getProfessionalByCpf: jest.fn(),
      searchProfessionals: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EsusImportService,
        { provide: 'DATABASE_CONNECTION', useValue: mockDb },
        { provide: IntegraSusService, useValue: integraSusService },
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

  describe('resolveDoctorCnesInfo', () => {
    it('should prioritize executing unit (Policlinica 2606712) and return its specialty CBO', async () => {
      (integraSusService.findProfessionalInCnes as jest.Mock).mockResolvedValue({
        cns: '700005530602201',
        nome: 'CAMILA KARLA PESSOA FRAZAO DIAS',
        unidades: [
          {
            codigo: '2606720',
            nome: 'PSF SEVERINO PEDRO DE SOUZA',
            cbo: { codigo: '225142', nome: 'MEDICO DA ESTRATEGIA DE SAUDE DA FAMILIA' },
          },
          {
            codigo: '2606712',
            nome: 'POLICLINICA ROBERVAL MEDEIROS DE ARAUJO',
            cbo: { codigo: '225250', nome: 'MEDICO GINECOLOGISTA E OBSTETRA' },
          },
        ],
      });

      const mockTx = {
        select: jest.fn().mockReturnValue({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              limit: jest.fn().mockImplementation(() => {
                return Promise.resolve([{ id: 'spec-gineco-id' }]);
              }),
            }),
          }),
        }),
      };

      const healthCenterCache = new Map<string, string>([
        ['2606712', 'policlinica-hc-id'],
        ['2606720', 'psf-hc-id'],
      ]);
      const specialtyCache = new Map<string, string>();
      const cnesDoctorCache = new Map<string, { healthCenterId?: string; specialtyIds: string[] }>();

      const result = await service.resolveDoctorCnesInfo(
        mockTx,
        {
          name: 'CAMILA KARLA PESSOA FRAZAO DIAS',
          cns: '700005530602201',
          targetCnes: '2606712',
          defaultHealthCenterId: 'default-hc-id',
        },
        cnesDoctorCache,
        healthCenterCache,
        specialtyCache,
      );

      expect(result.healthCenterId).toBe('policlinica-hc-id');
      expect(result.specialtyIds).toEqual(['spec-gineco-id']);
    });
  });

  describe('autoRegisterDoctorInBatch', () => {
    it('should auto-register a new doctor with specialty and health center relations', async () => {
      const insertedUsers: any[] = [];
      const insertedDoctors: any[] = [];
      const insertedSpecialties: any[] = [];
      const deletedDoctorSpecialties: any[] = [];

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
        delete: jest.fn().mockReturnValue({
          where: jest.fn((cond: any) => {
            deletedDoctorSpecialties.push(cond);
            return Promise.resolve([]);
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
          isExecutingDoctor: true,
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
      expect(deletedDoctorSpecialties.length).toBe(1);
    });
  });
});
