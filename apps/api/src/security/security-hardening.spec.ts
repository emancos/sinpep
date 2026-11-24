import { ExecutionContext, ForbiddenException, HttpException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import * as jwt from 'jsonwebtoken';
import { getJwtSecret } from '../auth/utils/jwt-secret.util';
import { RateLimitGuard, RATE_LIMIT_KEY } from '../common/guards/rate-limit.guard';
import { EventsGateway } from '../events/events.gateway';
import { UsersController } from '../users/users.controller';
import { EsusImportService } from '../regulation/esus-import.service';
import { RegulationController } from '../regulation/regulation.controller';
import { DashboardService } from '../dashboard/dashboard.service';

describe('Security Hardening Suite', () => {
  describe('getJwtSecret', () => {
    const origEnv = process.env.NODE_ENV;
    const origSecret = process.env.JWT_SECRET;

    afterEach(() => {
      process.env.NODE_ENV = origEnv;
      process.env.JWT_SECRET = origSecret;
    });

    it('deve lançar erro em produção quando JWT_SECRET não está definida', () => {
      process.env.NODE_ENV = 'production';
      delete process.env.JWT_SECRET;
      expect(() => getJwtSecret()).toThrow(/JWT_SECRET/);
    });

    it('deve lançar erro em produção quando JWT_SECRET tem menos de 32 caracteres', () => {
      process.env.NODE_ENV = 'production';
      process.env.JWT_SECRET = 'short_secret';
      expect(() => getJwtSecret()).toThrow(/32 caracteres/);
    });

    it('nunca deve usar a chave literal insegura supersecretkey_dev_only', () => {
      process.env.NODE_ENV = 'test';
      delete process.env.JWT_SECRET;
      const secret = getJwtSecret();
      expect(secret).not.toBe('supersecretkey_dev_only');
      expect(secret.length).toBeGreaterThanOrEqual(32);
    });
  });

  describe('UsersController.findAll (proteção contra vazamento de passwordHash)', () => {
    it('deve remover passwordHash de todos os usuários retornados', async () => {
      const mockUsersService = {
        findAll: jest.fn().mockResolvedValue([
          { id: 'u1', name: 'Admin', email: 'admin@test.local', passwordHash: '$2b$10$secretHash' },
        ]),
      };
      const controller = new UsersController(mockUsersService as any);
      const result = await controller.findAll();
      expect(result).toHaveLength(1);
      expect(result[0].passwordHash).toBeUndefined();
    });
  });

  describe('EsusImportService.getConfig (não exposição de credenciais)', () => {
    it('não deve retornar authorizationHeader nem segredos do e-SUS', () => {
      process.env.ESUS_API_SECRET = 'dGVzdDpzZWNyZXQ=';
      const service = new EsusImportService({} as any);
      const config: any = service.getConfig();
      expect(config.authorizationHeader).toBeUndefined();
      expect(config.apiUrl).toBeUndefined();
      expect(config.configured).toBe(true);
    });
  });

  describe('RegulationController.findMyCenterRequests (proteção contra IDOR multiunidade)', () => {
    it('deve bloquear solicitante tentando consultar solicitações de outra unidade de saúde', async () => {
      const mockRegService = { findRequestsByHealthCenter: jest.fn() };
      const controller = new RegulationController(mockRegService as any);

      await expect(
        controller.findMyCenterRequests(
          'hc-outra-ubs',
          {},
          {
            user: {
              id: 'u-sol',
              healthCenterId: 'hc-ubs-a',
              linkedHealthCenterIds: ['hc-ubs-a'],
              isMunicipalRegulator: false,
              permissions: ['regulation-solicitor:read'],
            },
          },
        ),
      ).rejects.toThrow(ForbiddenException);

      expect(mockRegService.findRequestsByHealthCenter).not.toHaveBeenCalled();
    });
  });

  describe('DashboardService.updateNotice (proteção contra escalação de escopo)', () => {
    it('deve impedir Coordenador de alterar aviso da unidade para GLOBAL', async () => {
      const mockWhereResult = [
        {
          id: 'notice-1',
          authorId: 'u-coord',
          scope: 'HEALTH_CENTER',
          healthCenterId: 'hc-1',
        },
      ];
      const mockDb = {
        select: jest.fn().mockReturnValue({
          from: jest.fn().mockReturnValue({
            innerJoin: jest.fn().mockReturnValue({
              leftJoin: jest.fn().mockReturnValue({
                where: jest.fn().mockResolvedValue(mockWhereResult),
              }),
              where: jest.fn().mockResolvedValue(mockWhereResult),
            }),
            where: jest.fn().mockResolvedValue(mockWhereResult),
          }),
        }),
      };
      const service = new DashboardService(mockDb as any);

      await expect(
        service.updateNotice(
          {
            id: 'u-coord',
            activeProfileName: 'Coordenador de Unidade',
            healthCenterId: 'hc-1',
            permissions: ['health-centers:read'],
          },
          'notice-1',
          { scope: 'GLOBAL' as any },
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('EventsGateway (autenticação JWT no WebSocket)', () => {
    it('deve desconectar cliente WebSocket sem token JWT', () => {
      const gateway = new EventsGateway();
      const mockClient: any = {
        id: 'sock-1',
        handshake: { auth: {}, headers: {} },
        data: {},
        disconnect: jest.fn(),
      };

      gateway.handleConnection(mockClient);
      expect(mockClient.disconnect).toHaveBeenCalledWith(true);
    });

    it('deve aceitar cliente WebSocket com token JWT válido', () => {
      process.env.JWT_SECRET = 'test-secret-for-ws-validation-32-chars-min';
      const token = jwt.sign({ sub: 'user-123' }, getJwtSecret());
      const gateway = new EventsGateway();
      const mockClient: any = {
        id: 'sock-2',
        handshake: { auth: { token }, headers: {} },
        data: {},
        disconnect: jest.fn(),
      };

      gateway.handleConnection(mockClient);
      expect(mockClient.disconnect).not.toHaveBeenCalled();
      expect(mockClient.data.userId).toBe('user-123');
    });
  });

  describe('RateLimitGuard', () => {
    it('deve retornar 429 Too Many Requests ao exceder o limite configurado', () => {
      const reflector = {
        getAllAndOverride: jest.fn().mockImplementation((key) =>
          key === RATE_LIMIT_KEY ? { max: 2, windowMs: 60_000 } : undefined,
        ),
      } as unknown as Reflector;

      const guard = new RateLimitGuard(reflector);
      const mockContext = {
        getHandler: jest.fn(),
        getClass: jest.fn(),
        switchToHttp: () => ({
          getRequest: () => ({
            method: 'POST',
            url: '/auth/login',
            ip: '127.0.0.1',
            headers: {},
          }),
        }),
      } as unknown as ExecutionContext;

      expect(guard.canActivate(mockContext)).toBe(true);
      expect(guard.canActivate(mockContext)).toBe(true);
      expect(() => guard.canActivate(mockContext)).toThrow(HttpException);
    });
  });
});
