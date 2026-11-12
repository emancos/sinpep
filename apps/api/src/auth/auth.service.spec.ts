import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { DATABASE_CONNECTION } from '../database/database.constants';

// Mock bcrypt module
jest.mock('bcrypt', () => ({
  compare: jest.fn(),
}));

describe('AuthService', () => {
  let service: AuthService;
  let usersService: jest.Mocked<Partial<UsersService>>;
  let jwtService: jest.Mocked<Partial<JwtService>>;
  let mockDb: {
    query: {
      profiles: {
        findMany: jest.Mock;
        findFirst: jest.Mock;
      };
      permissions: {
        findMany: jest.Mock;
      };
      healthCenters: {
        findMany: jest.Mock;
      };
    };
  };

  const mockUser = {
    id: 'user-uuid-123',
    email: 'test@regulasb.gov.br',
    name: 'João Silva',
    passwordHash: 'hashedpassword',
    isActive: true,
    profileId: 'profile-uuid',
    healthCenterId: 'hc-1',
    isMunicipalRegulator: false,
    profile: {
      id: 'profile-uuid',
      name: 'ACS',
      description: 'Agente Comunitário',
      profilePermissions: [
        {
          permission: {
            id: 'perm-uuid-1',
            name: 'patients:read',
          },
        },
      ],
    },
    healthCenter: {
      id: 'hc-1',
      name: 'UBS Centro',
      cnes: '1234567',
    },
    userProfiles: [],
    userHealthCenters: [],
    userCustomPermissions: [],
  };

  beforeEach(async () => {
    usersService = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
    };
    jwtService = {
      sign: jest.fn().mockReturnValue('mock-jwt-token'),
    };
    mockDb = {
      query: {
        profiles: {
          findMany: jest.fn().mockResolvedValue([]),
          findFirst: jest.fn().mockResolvedValue({
            id: 'profile-uuid',
            name: 'ACS',
            profilePermissions: [
              { permission: { id: 'perm-uuid-1', name: 'patients:read' } },
            ],
          }),
        },
        permissions: {
          findMany: jest.fn().mockResolvedValue([
            { id: 'perm-1', name: 'patients:read' },
            { id: 'perm-2', name: 'regulation-operator:read' },
          ]),
        },
        healthCenters: {
          findMany: jest.fn().mockResolvedValue([
            { id: 'hc-1', name: 'UBS Centro', cnes: '1234567' },
          ]),
        },
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useValue: jwtService },
        { provide: DATABASE_CONNECTION, useValue: mockDb },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('login', () => {
    it('should validate credentials correctly and return a JWT token', async () => {
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (usersService.findByEmail as jest.Mock).mockResolvedValue(
        mockUser as any,
      );

      const result = await service.login(
        'test@regulasb.gov.br',
        'correctpassword',
      );

      expect(result).toHaveProperty('accessToken');
      expect(result.accessToken).toBe('mock-jwt-token');
      expect(result.user).toEqual({
        id: 'user-uuid-123',
        name: 'João Silva',
        email: 'test@regulasb.gov.br',
        phone: undefined,
        avatar: undefined,
        healthCenterId: 'hc-1',
        linkedHealthCenterIds: ['hc-1'],
        isMunicipalRegulator: false,
        permissions: ['patients:read'],
      });
      expect(result.activeProfile).toEqual({
        id: 'profile-uuid',
        name: 'ACS',
        description: 'Agente Comunitário',
        isDefault: true,
      });
      expect(usersService.findByEmail).toHaveBeenCalledWith(
        'test@regulasb.gov.br',
      );
      expect(bcrypt.compare).toHaveBeenCalledWith(
        'correctpassword',
        'hashedpassword',
      );
    });

    it('should throw UnauthorizedException for incorrect password', async () => {
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      (usersService.findByEmail as jest.Mock).mockResolvedValue(
        mockUser as any,
      );

      await expect(
        service.login('test@regulasb.gov.br', 'wrongpassword'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if user is not found', async () => {
      (usersService.findByEmail as jest.Mock).mockResolvedValue(null);

      await expect(
        service.login('nonexistent@regulasb.gov.br', 'password'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('selectProfile', () => {
    it('preserves admin:access when master administrator switches to Regulador', async () => {
      const adminProfile = {
        id: 'prof-admin',
        name: 'Administrador',
        description: 'Acesso total',
      };
      const regulatorProfile = {
        id: 'prof-reg',
        name: 'Regulador (Central de Regulação)',
        description: 'Regulação',
      };

      const adminUser = {
        ...mockUser,
        id: 'd7734add-74bf-42c6-86f9-bf55654bcb5c',
        profileId: adminProfile.id,
        profile: {
          ...adminProfile,
          profilePermissions: [
            { permission: { id: 'perm-admin', name: 'admin:access' } },
          ],
        },
        userProfiles: [{ isDefault: false, profile: regulatorProfile }],
      };

      (usersService.findById as jest.Mock).mockResolvedValue(adminUser as any);
      mockDb.query.profiles.findMany.mockResolvedValue([
        adminProfile,
        regulatorProfile,
      ]);
      mockDb.query.profiles.findFirst.mockResolvedValue({
        ...regulatorProfile,
        profilePermissions: [
          { permission: { id: 'perm-reg-read', name: 'regulation-operator:read' } },
        ],
      });

      const result = await service.selectProfile(
        adminUser.id,
        regulatorProfile.id,
      );

      expect(result.activeProfile?.id).toBe(regulatorProfile.id);
      expect(result.permissions).toContain('regulation-operator:read');
      expect(result.permissions).toContain('admin:access');
    });
  });
});
