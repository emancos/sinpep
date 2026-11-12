import { Test, TestingModule } from '@nestjs/testing';
import { ProcedureGroupsController } from './procedure-groups.controller';
import { ProcedureGroupsService } from './procedure-groups.service';

describe('ProcedureGroupsController', () => {
  let controller: ProcedureGroupsController;

  const mockProcedureGroupsService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    searchSubgroups: jest.fn(),
    getGroups: jest.fn(),
    getGroupSubgroups: jest.fn(),
    getSubgroupProcedures: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProcedureGroupsController],
      providers: [
        {
          provide: ProcedureGroupsService,
          useValue: mockProcedureGroupsService,
        },
      ],
    }).compile();

    controller = module.get<ProcedureGroupsController>(
      ProcedureGroupsController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
