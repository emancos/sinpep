import { Injectable, UnauthorizedException, BadRequestException, ForbiddenException, Logger, Inject } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { DATABASE_CONNECTION } from '../database/database.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../database';
import { eq, asc } from 'drizzle-orm';
import * as bcrypt from 'bcrypt';
import * as nodemailer from 'nodemailer';

export interface ValidatedUser {
  id: string;
  email: string;
  name: string;
  phone?: string | null;
  avatar?: string | null;
  profileId: string;
  healthCenterId?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  permissions: string[];
}

export interface ProfileSummary {
  id: string;
  name: string;
  description: string | null;
  isDefault: boolean;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  /**
   * Retorna todos os perfis aos quais o usuário tem acesso.
   * Administradores possuem acesso a todos os perfis cadastrados no sistema.
   * Demais utilizadores têm acesso aos perfis atribuídos.
   */
  async getAvailableProfiles(user: any): Promise<ProfileSummary[]> {
    const isAdmin =
      user.profile?.name === 'Administrador' ||
      user.profile?.profilePermissions?.some((pp: any) => pp.permission?.name === 'admin:access') ||
      user.userProfiles?.some(
        (up: any) =>
          up.profile?.name === 'Administrador' ||
          up.profile?.profilePermissions?.some((pp: any) => pp.permission?.name === 'admin:access'),
      );

    if (isAdmin) {
      const allProfiles = await this.db.query.profiles.findMany({
        orderBy: [asc(schema.profiles.name)],
      });
      return allProfiles.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        isDefault: p.id === user.profileId,
      }));
    }

    const profileMap = new Map<string, ProfileSummary>();

    if (user.profile) {
      profileMap.set(user.profile.id, {
        id: user.profile.id,
        name: user.profile.name,
        description: user.profile.description,
        isDefault: true,
      });
    }

    if (user.userProfiles && Array.isArray(user.userProfiles)) {
      for (const up of user.userProfiles) {
        if (up.profile) {
          profileMap.set(up.profile.id, {
            id: up.profile.id,
            name: up.profile.name,
            description: up.profile.description,
            isDefault: up.isDefault || up.profile.id === user.profileId,
          });
        }
      }
    }

    return Array.from(profileMap.values());
  }

  /**
   * Consolida as permissões estritamente para o perfil ativo selecionado.
   */
  async consolidatePermissionsForProfile(
    user: any,
    activeProfileId?: string,
  ): Promise<{ permissions: string[]; activeProfile: ProfileSummary | null }> {
    const availableProfiles = await this.getAvailableProfiles(user);

    let targetProfile = availableProfiles.find((p) => p.id === activeProfileId);
    if (!targetProfile) {
      targetProfile = availableProfiles.find((p) => p.isDefault) || availableProfiles[0] || null;
    }

    if (!targetProfile) {
      return { permissions: [], activeProfile: null };
    }

    // Se o perfil escolhido for Administrador
    if (targetProfile.name === 'Administrador') {
      const allPermissions = await this.db.query.permissions.findMany();
      return {
        permissions: allPermissions.map((p) => p.name).concat('admin:access'),
        activeProfile: targetProfile,
      };
    }

    // Busca o perfil completo com suas permissões vinculadas
    const fullProfile = await this.db.query.profiles.findFirst({
      where: eq(schema.profiles.id, targetProfile.id),
      with: {
        profilePermissions: {
          with: { permission: true },
        },
      },
    });

    const permissionMap = new Map<string, boolean>();

    if (fullProfile && fullProfile.profilePermissions) {
      for (const pp of fullProfile.profilePermissions) {
        if (pp.permission && pp.permission.name) {
          permissionMap.set(pp.permission.name, true);
        }
      }
    }

    // Aplica eventuais permissões customizadas individuais do usuário
    if (user.userCustomPermissions) {
      for (const cp of user.userCustomPermissions) {
        if (cp.permission && cp.permission.name) {
          permissionMap.set(cp.permission.name, cp.isAllowed);
        }
      }
    }

    const permissions = Array.from(permissionMap.entries())
      .filter((entry) => entry[1])
      .map((entry) => entry[0]);

    return { permissions, activeProfile: targetProfile };
  }

  consolidatePermissions(user: any): string[] {
    const permissionMap = new Map<string, boolean>();

    if (user.profile && user.profile.profilePermissions) {
      for (const pp of user.profile.profilePermissions) {
        if (pp.permission && pp.permission.name) {
          permissionMap.set(pp.permission.name, true);
        }
      }
    }

    if (user.userCustomPermissions) {
      for (const cp of user.userCustomPermissions) {
        if (cp.permission && cp.permission.name) {
          permissionMap.set(cp.permission.name, cp.isAllowed);
        }
      }
    }

    return Array.from(permissionMap.entries())
      .filter((entry) => entry[1])
      .map((entry) => entry[0]);
  }

  async validateUser(email: string, pass: string): Promise<ValidatedUser | null> {
    const user: any = await this.usersService.findByEmail(email);
    if (!user) {
      return null;
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Usuário inativo. Entre em contato com o administrador.');
    }

    const isMatch = await bcrypt.compare(pass, user.passwordHash);
    if (!isMatch) {
      return null;
    }

    const consolidatedPermissions = this.consolidatePermissions(user);

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      avatar: user.avatar,
      profileId: user.profileId,
      healthCenterId: user.healthCenterId,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      permissions: consolidatedPermissions,
    };
  }

  async login(email: string, pass: string) {
    const user: any = await this.usersService.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Usuário inativo. Entre em contato com o administrador.');
    }

    const isMatch = await bcrypt.compare(pass, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const availableProfiles = await this.getAvailableProfiles(user);
    const defaultProfile = availableProfiles.find((p) => p.isDefault) || availableProfiles[0];
    const { permissions, activeProfile } = await this.consolidatePermissionsForProfile(
      user,
      defaultProfile?.id,
    );

    const payload = {
      sub: user.id,
      email: user.email,
      activeProfileId: activeProfile?.id,
      permissions,
    };

    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone || undefined,
        avatar: user.avatar || undefined,
        healthCenterId: user.healthCenterId,
        permissions,
      },
      activeProfile,
      availableProfiles,
      permissions,
    };
  }

  async selectProfile(userId: string, profileId: string) {
    const user: any = await this.usersService.findById(userId);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Usuário não encontrado ou inativo');
    }

    const availableProfiles = await this.getAvailableProfiles(user);
    const chosen = availableProfiles.find((p) => p.id === profileId);
    if (!chosen) {
      throw new ForbiddenException('Usuário não possui permissão para acessar este perfil');
    }

    const { permissions, activeProfile } = await this.consolidatePermissionsForProfile(user, profileId);

    const payload = {
      sub: user.id,
      email: user.email,
      activeProfileId: profileId,
      permissions,
    };

    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone || undefined,
        avatar: user.avatar || undefined,
        healthCenterId: user.healthCenterId,
        permissions,
      },
      activeProfile,
      availableProfiles,
      permissions,
    };
  }

  async getProfile(userId: string, activeProfileId?: string) {
    const user: any = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException('Usuário não encontrado');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Sessão expirada ou usuário inativo');
    }

    const availableProfiles = await this.getAvailableProfiles(user);
    const { permissions, activeProfile } = await this.consolidatePermissionsForProfile(
      user,
      activeProfileId || user.profileId,
    );

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone || undefined,
      avatar: user.avatar || undefined,
      profileId: activeProfile?.id || user.profileId,
      profileName: activeProfile?.name || user.profile?.name,
      healthCenterId: user.healthCenterId,
      activeProfile,
      availableProfiles,
      permissions,
    };
  }

  async forgotPassword(email: string): Promise<void> {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      this.logger.log(`Tentativa de recuperação para email inexistente: ${email}`);
      return;
    }

    const secret = (process.env.JWT_SECRET || 'supersecretkey_dev_only') + user.passwordHash;
    const payload = { sub: user.id, email: user.email };
    const token = this.jwtService.sign(payload, { secret, expiresIn: '1h' });

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const resetLink = `${frontendUrl}/reset-password?token=${token}`;

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASS,
      },
    });

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; background-color: #f4f7f6; padding: 40px 20px; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
          <div style="background-color: #2563eb; padding: 30px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px;">${process.env.APP_NAME || 'Sistema Base'}</h1>
          </div>
          <div style="padding: 40px 30px;">
            <h2 style="margin-top: 0; color: #1e293b; font-size: 20px;">Redefinição de Senha</h2>
            <p style="font-size: 16px; line-height: 1.6; color: #475569;">
              Olá <strong>${user.name}</strong>,
            </p>
            <p style="font-size: 16px; line-height: 1.6; color: #475569;">
              Recebemos uma solicitação para redefinir a senha da sua conta no sistema ${process.env.APP_NAME || 'Sistema Base'}. 
              Se você não fez essa solicitação, pode ignorar este e-mail.
            </p>
            <div style="text-align: center; margin: 40px 0;">
              <a href="${resetLink}" style="display: inline-block; background-color: #2563eb; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; box-shadow: 0 2px 4px rgba(37, 99, 235, 0.3);">
                Redefinir Minha Senha
              </a>
            </div>
            <p style="font-size: 14px; line-height: 1.5; color: #64748b; margin-bottom: 0;">
              Este link é válido por apenas 1 hora. Por motivos de segurança, ele deixará de funcionar assim que sua senha for alterada.
            </p>
          </div>
          <div style="background-color: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;">
            <p style="margin: 0; font-size: 12px; color: #94a3b8;">
              &copy; ${new Date().getFullYear()} ${process.env.APP_NAME || 'Sistema Base'}. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </div>
    `;

    try {
      await transporter.sendMail({
        from: `"${process.env.APP_NAME || 'Sistema Base'}" <${process.env.GMAIL_USER}>`,
        to: user.email,
        subject: `Recuperação de Senha - ${process.env.APP_NAME || 'Sistema Base'}`,
        html: htmlContent,
      });
      this.logger.log(`Email de recuperação de senha enviado para ${email}`);
    } catch (error) {
      this.logger.error(`Erro ao enviar email de recuperação para ${email}:`, error);
      throw new BadRequestException('Não foi possível enviar o email de recuperação.');
    }
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    let decodedPayload: any;
    try {
      decodedPayload = this.jwtService.decode(token);
    } catch (e) {
      throw new BadRequestException('Token inválido ou mal formatado.');
    }

    if (!decodedPayload || !decodedPayload.sub) {
      throw new BadRequestException('Token inválido.');
    }

    const user = await this.usersService.findByEmail(decodedPayload.email);
    if (!user) {
      throw new BadRequestException('Usuário não encontrado.');
    }

    const secret = (process.env.JWT_SECRET || 'supersecretkey_dev_only') + user.passwordHash;

    try {
      this.jwtService.verify(token, { secret });
    } catch (error) {
      throw new BadRequestException('O link de recuperação é inválido ou já expirou.');
    }

    await this.usersService.update(user.id, { password: newPassword });
    this.logger.log(`Senha redefinida com sucesso para o usuário ${user.id}`);
  }
}
