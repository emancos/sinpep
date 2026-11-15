import { Test, TestingModule } from '@nestjs/testing';
import { SpecialtiesController } from './specialties.controller';
import { SpecialtiesService } from './specialties.service';

describe('SpecialtiesController', () => {
  let controller: SpecialtiesController;

  const mockSpecialtiesService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    toggleActive: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SpecialtiesController],
      providers: [
        {
          provide: SpecialtiesService,
          useValue: mockSpecialtiesService,
        },
      ],
    }).compile();

    controller = module.get<SpecialtiesController>(SpecialtiesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should call create on service', async () => {
    const dto = { name: 'CARDIOLOGIA', cbo: '225120' };
    mockSpecialtiesService.create.mockResolvedValue({ id: '1', ...dto });

    const result = await controller.create(dto);
    expect(mockSpecialtiesService.create).toHaveBeenCalledWith(dto);
    expect(result).toEqual({ id: '1', ...dto });
  });

  it('should call findAll on service', async () => {
    const query = { page: 1, limit: 10 };
    mockSpecialtiesService.findAll.mockResolvedValue({ data: [], total: 0 });

    const result = await controller.findAll(query);
    expect(mockSpecialtiesService.findAll).toHaveBeenCalledWith(query);
    expect(result).toEqual({ data: [], total: 0 });
  });

  it('should call findOne on service', async () => {
    mockSpecialtiesService.findOne.mockResolvedValue({ id: '1', name: 'CARDIOLOGIA' });

    const result = await controller.findOne('1');
    expect(mockSpecialtiesService.findOne).toHaveBeenCalledWith('1');
    expect(result).toEqual({ id: '1', name: 'CARDIOLOGIA' });
  });

  it('should call update on service', async () => {
    const dto = { name: 'NOVO NOME' };
    mockSpecialtiesService.update.mockResolvedValue({ id: '1', ...dto });

    const result = await controller.update('1', dto);
    expect(mockSpecialtiesService.update).toHaveBeenCalledWith('1', dto);
    expect(result).toEqual({ id: '1', ...dto });
  });

  it('should call toggleActive on service', async () => {
    mockSpecialtiesService.toggleActive.mockResolvedValue({ id: '1', isActive: false });

    const result = await controller.toggleActive('1');
    expect(mockSpecialtiesService.toggleActive).toHaveBeenCalledWith('1');
    expect(result).toEqual({ id: '1', isActive: false });
  });

  it('should call remove on service', async () => {
    mockSpecialtiesService.remove.mockResolvedValue({ id: '1' });

    const result = await controller.remove('1');
    expect(mockSpecialtiesService.remove).toHaveBeenCalledWith('1');
    expect(result).toEqual({ id: '1' });
  });
});
