import { Test, TestingModule } from '@nestjs/testing';
import { ProceduresController } from './procedures.controller';
import { ProceduresService } from './procedures.service';

describe('ProceduresController', () => {
  let controller: ProceduresController;

  const mockProceduresService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    searchIntegraSus: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProceduresController],
      providers: [{ provide: ProceduresService, useValue: mockProceduresService }],
    }).compile();

    controller = module.get<ProceduresController>(ProceduresController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
