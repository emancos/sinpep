import { JwtStrategy } from './strategies/jwt.strategy';
import {
  extractLinkedHealthCenterIds,
  isSolicitorRestrictedUser,
} from './utils/role-scope.util';

describe('JwtStrategy & role-scope utils', () => {
  beforeAll(() => {
    process.env.JWT_SECRET = 'test-jwt-secret';
  });

  describe('extractLinkedHealthCenterIds', () => {
    it('extrai e deduplica unidades de healthCenterId e userHealthCenters', () => {
      const ids = extractLinkedHealthCenterIds({
        healthCenterId: 'hc-1',
        userHealthCenters: [
          { healthCenterId: 'hc-1' },
          { healthCenterId: 'hc-2' },
          { healthCenter: { id: 'hc-3' } },
        ],
      });

      expect(ids).toEqual(['hc-1', 'hc-2', 'hc-3']);
    });

    it('prioriza linkedHealthCenterIds quando já resolvido no usuário', () => {
      const ids = extractLinkedHealthCenterIds({
        linkedHealthCenterIds: ['hc-ubs-a', 'hc-ubs-b'],
        healthCenterId: 'hc-other',
      });

      expect(ids).toEqual(['hc-ubs-a', 'hc-ubs-b']);
    });
  });

  describe('isSolicitorRestrictedUser', () => {
    it('retorna true para Solicitante (UBS) sem permissão admin:access', () => {
      expect(
        isSolicitorRestrictedUser({
          activeProfileName: 'Solicitante (UBS)',
          permissions: ['patients:read', 'patients:write', 'regulation-solicitor:write'],
        }),
      ).toBe(true);
    });

    it('retorna false quando possui admin:access no perfil ativo', () => {
      expect(
        isSolicitorRestrictedUser({
          activeProfileName: 'Solicitante (UBS)',
          permissions: ['admin:access', 'patients:write'],
        }),
      ).toBe(false);
    });

    it('retorna false para outros perfis como Regulador ou Administrador', () => {
      expect(
        isSolicitorRestrictedUser({
          activeProfileName: 'Regulador (Central de Regulação)',
          permissions: ['regulation-operator:read'],
        }),
      ).toBe(false);
    });
  });

  describe('JwtStrategy.validate', () => {
    it('retorna phone e linkedHealthCenterIds estritos do vínculo do usuário sem vazar unidades administrativas', async () => {
      const mockUsersService = {
        findById: jest.fn().mockResolvedValue({
          id: 'user-dual-1',
          email: 'solicitante@saobento.pb.gov.br',
          name: 'Maria Solicitante',
          phone: '(83) 99988-7766',
          isActive: true,
          profileId: 'prof-admin',
          healthCenterId: 'hc-ubs-1',
          isMunicipalRegulator: false,
          userHealthCenters: [
            { healthCenterId: 'hc-ubs-1' },
            { healthCenterId: 'hc-ubs-2' },
          ],
        }),
      };

      const mockAuthService = {
        consolidatePermissionsForProfile: jest.fn().mockResolvedValue({
          permissions: ['patients:read', 'patients:write', 'regulation-solicitor:write'],
          activeProfile: { id: 'prof-sol', name: 'Solicitante (UBS)' },
        }),
      };

      const strategy = new JwtStrategy(mockUsersService as any, mockAuthService as any);

      const validated = await strategy.validate({
        sub: 'user-dual-1',
        email: 'solicitante@saobento.pb.gov.br',
        activeProfileId: 'prof-sol',
        activeHealthCenterId: 'hc-ubs-1',
      });

      expect(mockUsersService.findById).toHaveBeenCalledWith('user-dual-1');
      expect(mockAuthService.consolidatePermissionsForProfile).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'user-dual-1' }),
        'prof-sol',
      );
      expect(validated).toEqual(
        expect.objectContaining({
          id: 'user-dual-1',
          name: 'Maria Solicitante',
          email: 'solicitante@saobento.pb.gov.br',
          phone: '(83) 99988-7766',
          activeProfileId: 'prof-sol',
          activeProfileName: 'Solicitante (UBS)',
          activeHealthCenterId: 'hc-ubs-1',
          linkedHealthCenterIds: ['hc-ubs-1', 'hc-ubs-2'],
        }),
      );
    });

    it('retorna phone como null quando não cadastrado no usuário', async () => {
      const mockUsersService = {
        findById: jest.fn().mockResolvedValue({
          id: 'user-2',
          email: 'semfone@saobento.pb.gov.br',
          name: 'Carlos UBS',
          phone: null,
          isActive: true,
          profileId: 'prof-sol',
          healthCenterId: 'hc-ubs-1',
          isMunicipalRegulator: false,
          userHealthCenters: [],
        }),
      };

      const mockAuthService = {
        consolidatePermissionsForProfile: jest.fn().mockResolvedValue({
          permissions: ['patients:read', 'patients:write'],
          activeProfile: { id: 'prof-sol', name: 'Solicitante (UBS)' },
        }),
      };

      const strategy = new JwtStrategy(mockUsersService as any, mockAuthService as any);
      const validated = await strategy.validate({
        sub: 'user-2',
        email: 'semfone@saobento.pb.gov.br',
      });

      expect(validated.phone).toBeNull();
      expect(validated.linkedHealthCenterIds).toEqual(['hc-ubs-1']);
    });
  });
});

