import { Test, TestingModule } from '@nestjs/testing';
import { ProcedureGroupsService } from './procedure-groups.service';
import { IntegraSusService } from '../integra-sus/integra-sus.service';

describe('ProcedureGroupsService', () => {
  let service: ProcedureGroupsService;

  const mockDb = {
    query: {
      procedureGroups: { findMany: jest.fn(), findFirst: jest.fn() },
    },
    insert: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  const mockIntegraSusService = {
    getGroups: jest.fn(),
    searchSubgroups: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProcedureGroupsService,
        { provide: 'DATABASE_CONNECTION', useValue: mockDb },
        { provide: IntegraSusService, useValue: mockIntegraSusService },
      ],
    }).compile();

    service = module.get<ProcedureGroupsService>(ProcedureGroupsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
