import { Controller, Get, Post, Put, Delete, Body, Param, Req, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateNoticeDto } from './dto/create-notice.dto';
import { UpdateNoticeDto } from './dto/update-notice.dto';

@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  /**
   * Retorna os KPIs, gráficos e alertas consolidados para o perfil do usuário
   */
  @Get('summary')
  getSummary(@Req() req: any) {
    return this.dashboardService.getSummary(req.user);
  }

  /**
   * Retorna os avisos ativos (Globais e da Unidade) para o usuário
   */
  @Get('notices')
  getNotices(@Req() req: any) {
    return this.dashboardService.getNotices(req.user);
  }

  /**
   * Cria novo aviso no mural (Administradores e Coordenadores)
   */
  @Post('notices')
  createNotice(@Body() dto: CreateNoticeDto, @Req() req: any) {
    return this.dashboardService.createNotice(req.user, dto);
  }

  /**
   * Atualiza aviso existente
   */
  @Put('notices/:id')
  updateNotice(@Param('id') id: string, @Body() dto: UpdateNoticeDto, @Req() req: any) {
    return this.dashboardService.updateNotice(req.user, id, dto);
  }

  /**
   * Remove aviso do mural
   */
  @Delete('notices/:id')
  deleteNotice(@Param('id') id: string, @Req() req: any) {
    return this.dashboardService.deleteNotice(req.user, id);
  }
}
