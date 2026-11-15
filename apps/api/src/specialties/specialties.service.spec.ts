import { Test, TestingModule } from '@nestjs/testing';
import { SpecialtiesService } from './specialties.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('SpecialtiesService', () => {
  let service: SpecialtiesService;

  const mockDb = {
    select: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SpecialtiesService,
        {
          provide: 'DATABASE_CONNECTION',
          useValue: mockDb,
        },
      ],
    }).compile();

    service = module.get<SpecialtiesService>(SpecialtiesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new specialty with CBO and name', async () => {
      // Mock name check (not found) and CBO check (not found)
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([]),
          }),
        }),
      });

      const insertedRecord = {
        id: 'new-spec-id',
        name: 'CARDIOLOGIA',
        cbo: '225120',
        description: 'Especialidade de cardiologia',
        isActive: true,
      };

      mockDb.insert.mockReturnValue({
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([insertedRecord]),
        }),
      });

      const result = await service.create({
        name: 'CARDIOLOGIA',
        cbo: '225120',
        description: 'Especialidade de cardiologia',
      });

      expect(result).toEqual(insertedRecord);
    });

    it('should create a specialty without CBO (cbo is optional and saved as null)', async () => {
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([]),
          }),
        }),
      });

      let capturedValues: any = null;
      mockDb.insert.mockReturnValue({
        values: jest.fn().mockImplementation((val) => {
          capturedValues = val;
          return {
            returning: jest.fn().mockResolvedValue([{ id: 'spec-id', ...val }]),
          };
        }),
      });

      const result = await service.create({
        name: 'HOMEOPATIA',
      });

      expect(result).toBeDefined();
      expect(capturedValues.cbo).toBeNull();
      expect(capturedValues.name).toBe('HOMEOPATIA');
    });

    it('should throw BadRequestException if name is missing or whitespace', async () => {
      await expect(service.create({ name: '   ' })).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if name already exists', async () => {
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([{ id: 'existing-id' }]),
          }),
        }),
      });

      await expect(
        service.create({ name: 'CARDIOLOGIA' })
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if CBO already exists', async () => {
      let callCount = 0;
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockImplementation(() => {
              callCount++;
              // First call: name check -> not found
              // Second call: cbo check -> found
              return Promise.resolve(callCount === 1 ? [] : [{ id: 'existing-id' }]);
            }),
          }),
        }),
      });

      await expect(
        service.create({ name: 'NOVA ESPECIALIDADE', cbo: '225120' })
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('update', () => {
    it('should update specialty successfully', async () => {
      // Mock findOne (existing)
      let selectCount = 0;
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockImplementation(() => {
              selectCount++;
              if (selectCount === 1) {
                return Promise.resolve([{ id: 'spec-1', name: 'VELHO NOME', cbo: '225100', isActive: true }]);
              }
              return Promise.resolve([]); // Uniqueness checks pass
            }),
          }),
        }),
      });

      const updatedRecord = { id: 'spec-1', name: 'NOVO NOME', cbo: '225199', isActive: true };
      mockDb.update.mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            returning: jest.fn().mockResolvedValue([updatedRecord]),
          }),
        }),
      });

      const result = await service.update('spec-1', { name: 'NOVO NOME', cbo: '225199' });
      expect(result).toEqual(updatedRecord);
    });
  });

  describe('findOne', () => {
    it('should throw NotFoundException if specialty not found', async () => {
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([]),
          }),
        }),
      });

      await expect(service.findOne('non-existent')).rejects.toThrow(NotFoundException);
    });
  });
});
