import { Controller, Get } from '@nestjs/common';

@Controller('sisreg')
export class SisregController {
  @Get('notifications')
  getNotifications() {
    // Retorna vazio para corrigir o erro 404 de polling do useSisregOfficial no frontend
    return [];
  }
}
