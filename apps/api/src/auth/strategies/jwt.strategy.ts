import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../../users/users.service';
import { AuthService } from '../auth.service';

interface JwtPayload {
  sub: string;
  email: string;
  activeProfileId?: string;
  activeHealthCenterId?: string;
  permissions?: string[];
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
      secretOrKey: process.env.JWT_SECRET || 'supersecretkey_dev_only',
    });
  }

  async validate(payload: JwtPayload) {
    const user: any = await this.usersService.findById(payload.sub);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Sessão expirada ou usuário inativo');
    }

    const { permissions, activeProfile } = await this.authService.consolidatePermissionsForProfile(
      user,
      payload.activeProfileId,
    );

    const effectiveHealthCenterId = payload.activeHealthCenterId || user.healthCenterId;

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      profileId: activeProfile?.id || user.profileId,
      activeProfileId: activeProfile?.id || user.profileId,
      activeProfileName: activeProfile?.name || user.profile?.name,
      healthCenterId: effectiveHealthCenterId,
      activeHealthCenterId: effectiveHealthCenterId,
      isMunicipalRegulator: Boolean(user.isMunicipalRegulator),
      userHealthCenters: user.userHealthCenters,
      permissions,
    };
  }
}
