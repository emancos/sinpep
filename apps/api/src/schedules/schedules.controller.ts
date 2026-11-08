import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { SchedulesService } from './schedules.service';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';
import { BookSlotDto } from './dto/book-slot.dto';

@UseGuards(AuthGuard('jwt'), PermissionsGuard)
@Controller('schedules')
export class SchedulesController {
  constructor(private readonly schedulesService: SchedulesService) {}

  /**
   * Endpoint de dependências reativas dos 4 selects
   */
  @Get('dependencies')
  @Permissions('schedules:read', 'schedules:write')
  async getDependencies(
    @Query('healthCenterId') healthCenterId?: string,
    @Query('procedureId') procedureId?: string,
    @Query('procedureGroupId') procedureGroupId?: string,
    @Query('doctorId') doctorId?: string,
    @Query('cbo') cbo?: string,
    @Query('scheduleType') scheduleType?: string,
  ) {
    return this.schedulesService.getDependencies({
      healthCenterId,
      procedureId,
      procedureGroupId,
      doctorId,
      cbo,
      scheduleType,
    });
  }

  /**
   * Listagem de agendas
   */
  @Get()
  @Permissions('schedules:read')
  async findAll(
    @Req() req: any,
    @Query('healthCenterId') healthCenterId?: string,
    @Query('procedureId') procedureId?: string,
    @Query('doctorId') doctorId?: string,
    @Query('activeOnly') activeOnly?: string,
  ) {
    return this.schedulesService.findAll(req.user, {
      healthCenterId,
      procedureId,
      doctorId,
      activeOnly,
    });
  }

  /**
   * Vagas disponíveis para agendamento
   */
  @Get('available-slots')
  @Permissions('schedules:book', 'schedules:read')
  async getAvailableSlots(
    @Req() req: any,
    @Query('procedureId') procedureId?: string,
    @Query('procedureGroupId') procedureGroupId?: string,
    @Query('executingHealthCenterId') executingHealthCenterId?: string,
    @Query('date') date?: string,
  ) {
    return this.schedulesService.getAvailableSlots(req.user, procedureId, {
      procedureGroupId,
      executingHealthCenterId,
      date,
    });
  }

  /**
   * Checagem prévia de conflitos de agenda (SINPeP e e-SUS Regulação)
   */
  @Get('check-conflicts')
  @Permissions('schedules:read', 'schedules:write')
  async checkConflicts(
    @Query('doctorId') doctorId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('startTime') startTime?: string,
    @Query('endTime') endTime?: string,
    @Query('daysOfWeek') daysOfWeek?: string,
    @Query('excludeScheduleId') excludeScheduleId?: string,
  ) {
    if (!doctorId || !startDate || !endDate || !startTime || !endTime) {
      return { hasBlockingConflict: false, hasWarning: false, conflicts: [] };
    }
    const days = daysOfWeek ? daysOfWeek.split(',').map((d) => d.trim()).filter(Boolean) : [];
    return this.schedulesService.checkConflicts({
      doctorId,
      startDate,
      endDate,
      startTime,
      endTime,
      daysOfWeek: days,
      excludeScheduleId,
    });
  }

  /**
   * Detalhes de uma agenda específica
   */
  @Get(':id')
  @Permissions('schedules:read')
  async findOne(@Param('id') id: string, @Req() req: any) {
    return this.schedulesService.findOne(id, req.user);
  }

  /**
   * Criação de nova agenda
   */
  @Post()
  @Permissions('schedules:write')
  async create(@Body() dto: CreateScheduleDto, @Req() req: any) {
    return this.schedulesService.create(dto, req.user);
  }

  /**
   * Edição de agenda
   */
  @Put(':id')
  @Permissions('schedules:write')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateScheduleDto,
    @Req() req: any,
  ) {
    return this.schedulesService.update(id, dto, req.user);
  }

  /**
   * Ativar / Desativar agenda
   */
  @Patch(':id/toggle-active')
  @Permissions('schedules:write')
  async toggleActive(@Param('id') id: string, @Req() req: any) {
    return this.schedulesService.toggleActive(id, req.user);
  }

  /**
   * Bloquear / Desbloquear data pontual
   */
  @Patch(':id/toggle-block-date')
  @Permissions('schedules:write')
  async toggleBlockDate(
    @Param('id') id: string,
    @Body('date') date: string,
    @Req() req: any,
  ) {
    return this.schedulesService.toggleBlockDate(id, date, req.user);
  }

  /**
   * Exclusão de agenda com reversão de requisições
   */
  @Delete(':id')
  @Permissions('schedules:delete')
  async delete(@Param('id') id: string, @Req() req: any) {
    return this.schedulesService.delete(id, req.user);
  }

  /**
   * Realizar agendamento (Reserva da vaga)
   */
  @Post('book-slot')
  @Permissions('schedules:book')
  async bookSlot(@Body() dto: BookSlotDto, @Req() req: any) {
    return this.schedulesService.bookSlot(dto, req.user);
  }
}
