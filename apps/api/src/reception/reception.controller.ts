import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { ReceptionService } from './reception.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('reception')
@UseGuards(JwtAuthGuard)
export class ReceptionController {
  constructor(private readonly receptionService: ReceptionService) {}

  @Get('schedule')
  async getSchedule(
    @Query('date') date: string,
    @Query('cnes') cnes: string
  ) {
    return this.receptionService.getEsusSchedule(date, cnes);
  }

  @Post('enqueue')
  async enqueuePatient(
    @Body('patientId') patientId: string,
    @Body('specialtyName') specialtyName: string,
    @Body('date') date: string,
    @Body('esusSolicitacaoId') esusSolicitacaoId: string
  ) {
    return this.receptionService.enqueuePatient(patientId, specialtyName, date, esusSolicitacaoId);
  }

  @Post('patient-from-esus')
  async createPatientFromEsus(@Body() payload: any) {
    return this.receptionService.createPatientFromEsus(payload);
  }
}
