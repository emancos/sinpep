import { Controller, Post, Get, Body, HttpCode, HttpStatus, UseGuards, Request } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto.email, loginDto.password);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getMe(@Request() req: any) {
    return this.authService.getProfile(req.user.id, req.user.activeProfileId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('select-profile')
  @HttpCode(HttpStatus.OK)
  async selectProfile(@Request() req: any, @Body('profileId') profileId: string) {
    return this.authService.selectProfile(req.user.id, profileId);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() body: { email: string }) {
    if (!body.email) {
      // Retorna sucesso de qualquer forma para não vazar a existência do email, ou apenas pede o email
      return { message: 'Se o email estiver cadastrado, você receberá um link de recuperação em breve.' };
    }
    // Fire and forget
    this.authService.forgotPassword(body.email).catch(err => {
      // Log ignorado ou tratado no service
    });
    return { message: 'Se o email estiver cadastrado, você receberá um link de recuperação em breve.' };
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() body: { token: string; password: string }) {
    if (!body.token || !body.password) {
      return { message: 'Token e nova senha são obrigatórios.' };
    }
    await this.authService.resetPassword(body.token, body.password);
    return { message: 'Senha redefinida com sucesso.' };
  }
}
