import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { AutoSchedulingService } from './auto-scheduling.service';

@UseGuards(AuthGuard('jwt'), PermissionsGuard)
@Controller('regulation')
export class AutoSchedulingController {
  constructor(private readonly autoSchedulingService: AutoSchedulingService) {}

  /**
   * 1. Fila de Espera de Solicitações Autorizadas (com Score Dinâmico)
   */
  @Get('waiting-list')
  @Permissions('regulation-operator:read')
  async getWaitingList(@Query() query: any) {
    const page = query.page ? parseInt(query.page, 10) : 1;
    const limit = query.limit ? parseInt(query.limit, 10) : 20;
    const minDays = query.minWaitingDays ? parseInt(query.minWaitingDays, 10) : undefined;
    const maxDays = query.maxWaitingDays ? parseInt(query.maxWaitingDays, 10) : undefined;

    return this.autoSchedulingService.getWaitingList({
      page: isNaN(page) ? 1 : page,
      limit: isNaN(limit) ? 20 : limit,
      procedureId: query.procedureId || undefined,
      procedureGroupId: query.procedureGroupId || undefined,
      specialtyId: query.specialtyId || undefined,
      priority: query.priority || undefined,
      requestingHealthCenterId: query.requestingHealthCenterId || undefined,
      search: query.search || undefined,
      minWaitingDays: isNaN(minDays as any) ? undefined : minDays,
      maxWaitingDays: isNaN(maxDays as any) ? undefined : maxDays,
    });
  }

  /**
   * 2. Regras de Agendamento Automático
   */
  @Get('auto-scheduling/rules')
  @Permissions('regulation-operator:read')
  async getRules() {
    return this.autoSchedulingService.getRules();
  }

  @Post('auto-scheduling/rules')
  @Permissions('regulation-operator:schedule')
  async createRule(@Body() body: any) {
    return this.autoSchedulingService.createRule(body);
  }

  @Put('auto-scheduling/rules/:id')
  @Permissions('regulation-operator:schedule')
  async updateRule(@Param('id') id: string, @Body() body: any) {
    return this.autoSchedulingService.updateRule(id, body);
  }

  @Delete('auto-scheduling/rules/:id')
  @Permissions('regulation-operator:schedule')
  async deleteRule(@Param('id') id: string) {
    return this.autoSchedulingService.deleteRule(id);
  }

  /**
   * 3. Simulação de Agendamento em Lote ("Dry-Run")
   */
  @Post('auto-scheduling/simulate')
  @Permissions('regulation-operator:schedule')
  async simulate(@Body() body: any) {
    return this.autoSchedulingService.simulate(body);
  }

  /**
   * 4. Efetivação dos Agendamentos em Lote
   */
  @Post('auto-scheduling/execute')
  @Permissions('regulation-operator:schedule')
  async execute(@Body() body: any, @Req() req: any) {
    return this.autoSchedulingService.execute(body, req.user);
  }

  /**
   * 5. Histórico de Execuções Anteriores
   */
  @Get('auto-scheduling/runs')
  @Permissions('regulation-operator:read')
  async getRuns() {
    return this.autoSchedulingService.getRuns();
  }
}
