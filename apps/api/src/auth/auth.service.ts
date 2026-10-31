import { Injectable, UnauthorizedException, BadRequestException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
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

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  consolidatePermissions(user: any): string[] {
    const permissionMap = new Map<string, boolean>();

    // 1. Add profile permissions
    if (user.profile && user.profile.profilePermissions) {
      for (const pp of user.profile.profilePermissions) {
        if (pp.permission && pp.permission.name) {
          permissionMap.set(pp.permission.name, true);
        }
      }
    }

    // 2. Apply custom permission overrides
    if (user.userCustomPermissions) {
      for (const cp of user.userCustomPermissions) {
        if (cp.permission && cp.permission.name) {
          permissionMap.set(cp.permission.name, cp.isAllowed);
        }
      }
    }

    // 3. Filter only allowed permissions
    return Array.from(permissionMap.entries())
      .filter((entry) => entry[1])
      .map((entry) => entry[0]);
  }

  async validateUser(
    email: string,
    pass: string,
  ): Promise<ValidatedUser | null> {
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

  async getProfile(userId: string) {
    const user: any = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException('Usuário não encontrado');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Sessão expirada ou usuário inativo');
    }

    const permissions = this.consolidatePermissions(user);

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone || undefined,
      avatar: user.avatar || undefined,
      profileId: user.profileId,
      profileName: user.profile?.name,
      healthCenterId: user.healthCenterId,
      permissions,
    };
  }

  async login(email: string, pass: string) {
    const user = await this.validateUser(email, pass);
    if (!user) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const payload = {
      sub: user.id,
      email: user.email,
      permissions: user.permissions,
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
        permissions: user.permissions,
      },
    };
  }

  async forgotPassword(email: string): Promise<void> {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      // Retorna em silêncio para evitar vazamento de contas
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

    // Busca o usuário completo, já que Precisamos do passwordHash
    // validateUser não retorna o hash. Precisamos chamar Prisma ou criar findByIdComHash
    // Mas this.usersService tem algo? Vamos checar.
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
