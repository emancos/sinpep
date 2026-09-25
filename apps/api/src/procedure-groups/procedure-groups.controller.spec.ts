import { Test, TestingModule } from '@nestjs/testing';
import { ProcedureGroupsController } from './procedure-groups.controller';

describe('ProcedureGroupsController', () => {
  let controller: ProcedureGroupsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProcedureGroupsController],
    }).compile();

    controller = module.get<ProcedureGroupsController>(ProcedureGroupsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
