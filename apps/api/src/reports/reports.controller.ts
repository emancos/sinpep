import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';

@Controller('reports')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('epidemiological')
  @Permissions('reports:read')
  getEpidemiological() {
    return this.reportsService.getEpidemiological();
  }

  @Get('operational')
  @Permissions('reports:read')
  getOperational() {
    return this.reportsService.getOperational();
  }

  @Get('procedures')
  @Permissions('reports:read')
  getProcedures() {
    return this.reportsService.getProcedures();
  }

  @Get('pharmacy')
  @Permissions('reports:read')
  getPharmacy() {
    return this.reportsService.getPharmacy();
  }

  /**
   * Relatório da Central de Regulação (Regulador & Administrador)
   */
  @Get('regulation')
  @Permissions('reports:read')
  getRegulationReport(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('specialtyId') specialtyId?: string,
    @Query('risk') risk?: string,
    @Query('status') status?: string,
  ) {
    return this.reportsService.getRegulationReport({
      startDate,
      endDate,
      specialtyId,
      risk,
      status,
    });
  }

  /**
   * Relatório de Encaminhamentos da UBS (Solicitante & Administrador)
   */
  @Get('solicitor')
  @Permissions('reports:read')
  getSolicitorReport(
    @Req() req: any,
    @Query('healthCenterId') queryHealthCenterId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('status') status?: string,
  ) {
    const profileName = req.user.activeProfileName || '';
    const isAdmin = req.user.permissions?.includes('admin:access') || profileName === 'Administrador';
    const targetHcId = (!isAdmin || !queryHealthCenterId) ? req.user.healthCenterId : queryHealthCenterId;

    return this.reportsService.getSolicitorReport(targetHcId, {
      startDate,
      endDate,
      status,
    });
  }

  /**
   * Relatório de Produção e Ocupação da Unidade (Coordenador & Administrador)
   */
  @Get('unit-operational')
  @Permissions('reports:read')
  getUnitOperationalReport(
    @Req() req: any,
    @Query('healthCenterId') queryHealthCenterId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const profileName = req.user.activeProfileName || '';
    const isAdmin = req.user.permissions?.includes('admin:access') || profileName === 'Administrador';
    const targetHcId = (!isAdmin || !queryHealthCenterId) ? req.user.healthCenterId : queryHealthCenterId;

    return this.reportsService.getUnitOperationalReport(targetHcId, {
      startDate,
      endDate,
    });
  }

  /**
   * Relatório de Produção Clínica Individual (Médico & Administrador)
   */
  @Get('doctor-production')
  @Permissions('reports:read')
  getDoctorProductionReport(
    @Req() req: any,
    @Query('doctorId') queryDoctorId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const profileName = req.user.activeProfileName || '';
    const isAdmin = req.user.permissions?.includes('admin:access') || profileName === 'Administrador';
    const targetUserId = (!isAdmin || !queryDoctorId) ? req.user.id : queryDoctorId;

    return this.reportsService.getDoctorProductionReport(targetUserId, {
      startDate,
      endDate,
    });
  }

  /**
   * Relatório de Presença e Fluxo da Recepção (Recepcionista, Coordenador & Administrador)
   */
  @Get('reception-attendance')
  @Permissions('reports:read')
  getReceptionAttendanceReport(
    @Req() req: any,
    @Query('healthCenterId') queryHealthCenterId?: string,
    @Query('date') date?: string,
  ) {
    const profileName = req.user.activeProfileName || '';
    const isAdmin = req.user.permissions?.includes('admin:access') || profileName === 'Administrador';
    const targetHcId = (!isAdmin || !queryHealthCenterId) ? req.user.healthCenterId : queryHealthCenterId;

    return this.reportsService.getReceptionAttendanceReport(targetHcId, date);
  }
}
