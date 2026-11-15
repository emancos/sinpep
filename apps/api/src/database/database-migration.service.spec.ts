import { Test, TestingModule } from '@nestjs/testing';
import { DatabaseMigrationService } from './database-migration.service';
import { DATABASE_CONNECTION } from './database.constants';
import { MEDICAL_SPECIALTIES_SEED } from './specialties-seed.data';

describe('DatabaseMigrationService', () => {
  let service: DatabaseMigrationService;
  let mockDb: any;
  let executedSqls: string[];
  let insertedSpecialties: any[];
  let updatedSpecialties: any[];

  beforeEach(async () => {
    executedSqls = [];
    insertedSpecialties = [];
    updatedSpecialties = [];

    const mockExistingSpecialties = [
      {
        id: 'spec-1',
        cbo: '225120',
        name: 'Médico cardiologista',
        isActive: true,
      },
      {
        id: 'spec-2',
        cbo: null,
        name: 'Médico infectologista',
        isActive: false,
      },
    ];

    mockDb = {
      execute: jest.fn().mockImplementation((query) => {
        executedSqls.push(String(query));
        return Promise.resolve();
      }),
      select: jest.fn().mockReturnValue({
        from: jest.fn().mockResolvedValue(mockExistingSpecialties),
      }),
      insert: jest.fn().mockReturnValue({
        values: jest.fn().mockImplementation((val) => {
          insertedSpecialties.push(val);
          return {
            returning: jest.fn().mockResolvedValue([val]),
          };
        }),
      }),
      update: jest.fn().mockReturnValue({
        set: jest.fn().mockImplementation((updateVal) => ({
          where: jest.fn().mockImplementation(() => {
            updatedSpecialties.push(updateVal);
            return Promise.resolve([updateVal]);
          }),
        })),
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DatabaseMigrationService,
        {
          provide: DATABASE_CONNECTION,
          useValue: mockDb,
        },
      ],
    }).compile();

    service = module.get<DatabaseMigrationService>(DatabaseMigrationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should apply migrations and seed all 62 official medical specialties idempotently', async () => {
    await service.onModuleInit();

    // Deve executar os scripts DDL de migração
    expect(mockDb.execute).toHaveBeenCalled();

    // Deve consultar especialidades existentes
    expect(mockDb.select).toHaveBeenCalled();

    // CBO 225103 (Infectologista) já existia por nome mas estava inativo e sem CBO -> deve atualizar
    expect(updatedSpecialties.some((s) => s.cbo === '225103')).toBe(true);

    // CBO 225120 (Cardiologista) já existia com dados corretos -> não precisa atualizar se já ativo e idêntico

    // O restante das especialidades (60) deve ser inserido
    expect(insertedSpecialties.length).toBe(60);

    // O total trabalhado cobre as 62 especialidades oficiais
    expect(MEDICAL_SPECIALTIES_SEED.length).toBe(62);
  });
});
