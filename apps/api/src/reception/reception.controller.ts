import { Controller, Get, Post, Patch, Body, Query, UseGuards } from '@nestjs/common';
import { ReceptionService } from './reception.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { NonDoctorGuard } from '../auth/guards/non-doctor.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';

@Controller('reception')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ReceptionController {
  constructor(private readonly receptionService: ReceptionService) {}

  @Get('schedule')
  @Permissions('schedules:read')
  async getSchedule(
    @Query('date') date: string,
    @Query('cnes') cnes: string,
    @Query('includeMeta') includeMeta?: string,
  ) {
    return this.receptionService.getEsusSchedule(date, cnes, includeMeta === 'true');
  }

  @Post('enqueue')
  @UseGuards(NonDoctorGuard)
  @Permissions('schedules:book')
  async enqueuePatient(
    @Body('patientId') patientId: string,
    @Body('specialtyName') specialtyName: string,
    @Body('date') date: string,
    @Body('esusSolicitacaoId') esusSolicitacaoId: string,
    @Body('esusData') esusData: any,
    @Body('priority') priority?: string
  ) {
    return this.receptionService.enqueuePatient(patientId, specialtyName, date, esusSolicitacaoId, esusData, priority);
  }

  @Post('patient-from-esus')
  @UseGuards(NonDoctorGuard)
  @Permissions('patients:write', 'schedules:book')
  async createPatientFromEsus(@Body() payload: any) {
    return this.receptionService.createPatientFromEsus(payload);
  }

  @Get('queue-settings')
  @Permissions('schedules:read')
  async getQueueSettings() {
    return this.receptionService.getQueueSettings();
  }

  @Post('queue-settings')
  @UseGuards(NonDoctorGuard)
  @Permissions('schedules:book')
  async updateQueueSettings(@Body('rule') rule: 'PRIORITY_FIRST' | 'INTERLEAVED') {
    return this.receptionService.updateQueueSettings(rule);
  }

  @Patch('queue-priority')
  @UseGuards(NonDoctorGuard)
  @Permissions('schedules:book')
  async updateQueuePriority(
    @Body('queueId') queueId: string,
    @Body('priority') priority: 'PRIORITARIO' | 'CONVENCIONAL'
  ) {
    return this.receptionService.updateQueuePriority(queueId, priority);
  }

  @Patch('queue-status')
  @Permissions('schedules:read')
  async updateQueueStatus(
    @Body('queueId') queueId: string,
    @Body('status') status: 'AGUARDANDO' | 'ATENDIDO' | 'CANCELADO'
  ) {
    return this.receptionService.updateQueueStatus(queueId, status);
  }
}

