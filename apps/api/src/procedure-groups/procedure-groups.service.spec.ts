import { Test, TestingModule } from '@nestjs/testing';
import { ProcedureGroupsService } from './procedure-groups.service';

describe('ProcedureGroupsService', () => {
  let service: ProcedureGroupsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ProcedureGroupsService],
    }).compile();

    service = module.get<ProcedureGroupsService>(ProcedureGroupsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
