import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('sisreg')
@UseGuards(JwtAuthGuard)
export class SisregController {
  @Get('notifications')
  getNotifications() {
    // Retorna vazio para corrigir o erro 404 de polling do useSisregOfficial no frontend
    return [];
  }
}
