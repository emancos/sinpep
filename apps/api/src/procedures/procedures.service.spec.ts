import { Test, TestingModule } from '@nestjs/testing';
import { ProceduresService } from './procedures.service';
import { IntegraSusService } from '../integra-sus/integra-sus.service';

describe('ProceduresService', () => {
  let service: ProceduresService;

  const mockDb = {
    query: {
      procedures: { findMany: jest.fn(), findFirst: jest.fn() },
    },
    select: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  const mockIntegraSusService = {
    searchProcedures: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProceduresService,
        { provide: 'DATABASE_CONNECTION', useValue: mockDb },
        { provide: IntegraSusService, useValue: mockIntegraSusService },
      ],
    }).compile();

    service = module.get<ProceduresService>(ProceduresService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
