import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../../users/users.service';
import { AuthService } from '../auth.service';
import { extractLinkedHealthCenterIds } from '../utils/role-scope.util';
import { getJwtSecret } from '../utils/jwt-secret.util';

interface JwtPayload {
  sub: string;
  email: string;
  activeProfileId?: string;
  activeHealthCenterId?: string;
  permissions?: string[];
  tv?: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly usersService: UsersService,
    private readonly authService: AuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: getJwtSecret(),
    });
  }

  async validate(payload: JwtPayload) {
    const user: any = await this.usersService.findById(payload.sub);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Sessão expirada ou usuário inativo');
    }

    // Valida versão do token para suportar revogação imediata (logout / troca de senha)
    if (payload.tv !== undefined && payload.tv !== (user.tokenVersion ?? 0)) {
      throw new UnauthorizedException('Sessão revogada. Faça login novamente.');
    }

    const { permissions, activeProfile } = await this.authService.consolidatePermissionsForProfile(
      user,
      payload.activeProfileId,
    );

    const linkedHealthCenterIds = extractLinkedHealthCenterIds(user);
    const isAdminOrMunicipal =
      permissions.includes('admin:access') || Boolean(user.isMunicipalRegulator);

    // Revalida se o activeHealthCenterId do JWT ainda pertence aos vínculos do usuário
    let effectiveHealthCenterId = user.healthCenterId;
    if (payload.activeHealthCenterId) {
      if (isAdminOrMunicipal || linkedHealthCenterIds.includes(payload.activeHealthCenterId)) {
        effectiveHealthCenterId = payload.activeHealthCenterId;
      }
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone ?? null,
      avatar: user.avatar ?? null,
      profileId: activeProfile?.id || user.profileId,
      activeProfileId: activeProfile?.id || user.profileId,
      activeProfileName: activeProfile?.name || user.profile?.name,
      healthCenterId: effectiveHealthCenterId,
      activeHealthCenterId: effectiveHealthCenterId,
      linkedHealthCenterIds,
      isMunicipalRegulator: Boolean(user.isMunicipalRegulator),
      userHealthCenters: user.userHealthCenters,
      permissions,
    };
  }
}
