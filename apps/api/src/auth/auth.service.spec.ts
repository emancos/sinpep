import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

// Mock bcrypt module
jest.mock('bcrypt', () => ({
  compare: jest.fn(),
}));

describe('AuthService', () => {
  let service: AuthService;
  let usersService: jest.Mocked<Partial<UsersService>>;
  let jwtService: jest.Mocked<Partial<JwtService>>;

  const mockUser = {
    id: 'user-uuid-123',
    email: 'test@regulasb.gov.br',
    name: 'João Silva',
    passwordHash: 'hashedpassword',
    profile: {
      id: 'profile-uuid',
      name: 'ACS',
      profilePermissions: [
        {
          permission: {
            id: 'perm-uuid-1',
            name: 'patients:read',
          },
        },
      ],
    },
    customPermissions: [],
  };

  beforeEach(async () => {
    usersService = {
      findByEmail: jest.fn(),
    };
    jwtService = {
      sign: jest.fn().mockReturnValue('mock-jwt-token'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useValue: jwtService },
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
        permissions: ['patients:read'],
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
});
