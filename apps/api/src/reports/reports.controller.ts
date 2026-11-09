import { Controller, Get, Query, Req, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { ReportsService } from './reports.service';
import { ReportsPdfService } from './reports-pdf.service';
import { ReportsExportService } from './reports-export.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';

@Controller('reports')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ReportsController {
  constructor(
    private readonly reportsService: ReportsService,
    private readonly reportsPdfService: ReportsPdfService,
    private readonly reportsExportService: ReportsExportService,
  ) {}

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
    @Query('origin') origin?: string,
  ) {
    return this.reportsService.getRegulationReport({
      startDate,
      endDate,
      specialtyId,
      risk,
      status,
      origin,
    });
  }

  /**
   * Exportação Oficial da Central de Regulação (PDF / CSV)
   */
  @Get('regulation/export')
  @Permissions('reports:read')
  async exportRegulationReport(
    @Req() req: any,
    @Res() res: Response,
    @Query('format') format: string = 'pdf',
    @Query('mode') mode: 'executive' | 'analytical' = 'executive',
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('specialtyId') specialtyId?: string,
    @Query('risk') risk?: string,
    @Query('status') status?: string,
    @Query('origin') origin?: string,
  ) {
    const data = await this.reportsService.getRegulationReport({
      startDate,
      endDate,
      specialtyId,
      risk,
      status,
      origin,
    });

    const dateStr = new Date().toISOString().split('T')[0];

    if (format === 'csv' || format === 'xlsx') {
      const csvData = this.reportsExportService.exportRegulationCsv(data);
      res.set({
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="relatorio-regulacao-${dateStr}.csv"`,
      });
      return res.send(csvData);
    }

    const pdfBuffer = await this.reportsPdfService.generateRegulationPdf(
      data,
      { startDate, endDate, risk, status, origin },
      req.user,
      mode
    );

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="relatorio-regulacao-${dateStr}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });
    return res.end(pdfBuffer);
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
    @Query('origin') origin?: string,
  ) {
    const profileName = req.user.activeProfileName || '';
    const isAdmin = req.user.permissions?.includes('admin:access') || profileName === 'Administrador';
    const targetHcId = queryHealthCenterId || (isAdmin ? undefined : req.user.healthCenterId);

    return this.reportsService.getSolicitorReport(targetHcId, {
      startDate,
      endDate,
      status,
      origin,
    });
  }

  /**
   * Exportação Oficial de Encaminhamentos da UBS (PDF / CSV)
   */
  @Get('solicitor/export')
  @Permissions('reports:read')
  async exportSolicitorReport(
    @Req() req: any,
    @Res() res: Response,
    @Query('format') format: string = 'pdf',
    @Query('healthCenterId') queryHealthCenterId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('status') status?: string,
    @Query('origin') origin?: string,
  ) {
    const profileName = req.user.activeProfileName || '';
    const isAdmin = req.user.permissions?.includes('admin:access') || profileName === 'Administrador';
    const targetHcId = queryHealthCenterId || (isAdmin ? undefined : req.user.healthCenterId);

    const data = await this.reportsService.getSolicitorReport(targetHcId, {
      startDate,
      endDate,
      status,
      origin,
    });

    const dateStr = new Date().toISOString().split('T')[0];

    if (format === 'csv' || format === 'xlsx') {
      const csvData = this.reportsExportService.exportSolicitorCsv(data);
      res.set({
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="relatorio-encaminhamentos-ubs-${dateStr}.csv"`,
      });
      return res.send(csvData);
    }

    const pdfBuffer = await this.reportsPdfService.generateSolicitorPdf(
      data,
      { startDate, endDate, status, origin },
      req.user
    );

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="relatorio-encaminhamentos-ubs-${dateStr}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });
    return res.end(pdfBuffer);
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
    const targetHcId = queryHealthCenterId || (isAdmin ? undefined : req.user.healthCenterId);

    return this.reportsService.getUnitOperationalReport(targetHcId, {
      startDate,
      endDate,
    });
  }

  /**
   * Exportação Oficial de Produção e Ocupação da Unidade (PDF / CSV)
   */
  @Get('unit-operational/export')
  @Permissions('reports:read')
  async exportUnitOperationalReport(
    @Req() req: any,
    @Res() res: Response,
    @Query('format') format: string = 'pdf',
    @Query('healthCenterId') queryHealthCenterId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const profileName = req.user.activeProfileName || '';
    const isAdmin = req.user.permissions?.includes('admin:access') || profileName === 'Administrador';
    const targetHcId = queryHealthCenterId || (isAdmin ? undefined : req.user.healthCenterId);

    const data = await this.reportsService.getUnitOperationalReport(targetHcId, {
      startDate,
      endDate,
    });

    const dateStr = new Date().toISOString().split('T')[0];

    if (format === 'csv' || format === 'xlsx') {
      const csvData = this.reportsExportService.exportUnitOperationalCsv(data);
      res.set({
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="relatorio-producao-unidade-${dateStr}.csv"`,
      });
      return res.send(csvData);
    }

    const pdfBuffer = await this.reportsPdfService.generateUnitOperationalPdf(
      data,
      { startDate, endDate },
      req.user
    );

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="relatorio-producao-unidade-${dateStr}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });
    return res.end(pdfBuffer);
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
    const targetUserId = queryDoctorId || (isAdmin ? undefined : req.user.id);

    return this.reportsService.getDoctorProductionReport(targetUserId, {
      startDate,
      endDate,
    });
  }

  /**
   * Exportação Oficial de Produção Clínica Individual (PDF / CSV)
   */
  @Get('doctor-production/export')
  @Permissions('reports:read')
  async exportDoctorProductionReport(
    @Req() req: any,
    @Res() res: Response,
    @Query('format') format: string = 'pdf',
    @Query('doctorId') queryDoctorId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const profileName = req.user.activeProfileName || '';
    const isAdmin = req.user.permissions?.includes('admin:access') || profileName === 'Administrador';
    const targetUserId = queryDoctorId || (isAdmin ? undefined : req.user.id);

    const data = await this.reportsService.getDoctorProductionReport(targetUserId, {
      startDate,
      endDate,
    });

    const dateStr = new Date().toISOString().split('T')[0];

    if (format === 'csv' || format === 'xlsx') {
      const csvData = this.reportsExportService.exportDoctorProductionCsv(data);
      res.set({
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="extrato-producao-medica-${dateStr}.csv"`,
      });
      return res.send(csvData);
    }

    const pdfBuffer = await this.reportsPdfService.generateDoctorProductionPdf(
      data,
      { startDate, endDate },
      req.user
    );

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="extrato-producao-medica-${dateStr}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });
    return res.end(pdfBuffer);
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
    const targetHcId = queryHealthCenterId || (isAdmin ? undefined : req.user.healthCenterId);

    return this.reportsService.getReceptionAttendanceReport(targetHcId, date);
  }

  /**
   * Exportação Oficial da Folha de Presença (PDF / CSV)
   */
  @Get('reception-attendance/export')
  @Permissions('reports:read')
  async exportReceptionAttendanceReport(
    @Req() req: any,
    @Res() res: Response,
    @Query('format') format: string = 'pdf',
    @Query('healthCenterId') queryHealthCenterId?: string,
    @Query('date') date?: string,
  ) {
    const profileName = req.user.activeProfileName || '';
    const isAdmin = req.user.permissions?.includes('admin:access') || profileName === 'Administrador';
    const targetHcId = queryHealthCenterId || (isAdmin ? undefined : req.user.healthCenterId);

    const data = await this.reportsService.getReceptionAttendanceReport(targetHcId, date);
    const dateStr = date || new Date().toISOString().split('T')[0];

    if (format === 'csv' || format === 'xlsx') {
      const csvData = this.reportsExportService.exportReceptionAttendanceCsv(data);
      res.set({
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="folha-presenca-${dateStr}.csv"`,
      });
      return res.send(csvData);
    }

    const pdfBuffer = await this.reportsPdfService.generateReceptionAttendancePdf(
      data,
      { date },
      req.user
    );

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="folha-presenca-${dateStr}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });
    return res.end(pdfBuffer);
  }

  /**
   * Exportação Oficial do Perfil Epidemiológico (PDF / CSV)
   */
  @Get('epidemiological/export')
  @Permissions('reports:read')
  async exportEpidemiologicalReport(
    @Req() req: any,
    @Res() res: Response,
    @Query('format') format: string = 'pdf',
  ) {
    const data = await this.reportsService.getEpidemiological();
    const dateStr = new Date().toISOString().split('T')[0];

    if (format === 'csv' || format === 'xlsx') {
      const csvData = this.reportsExportService.exportEpidemiologicalCsv(data);
      res.set({
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="boletim-epidemiologico-${dateStr}.csv"`,
      });
      return res.send(csvData);
    }

    const pdfBuffer = await this.reportsPdfService.generateEpidemiologicalPdf(data, req.user);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="boletim-epidemiologico-${dateStr}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });
    return res.end(pdfBuffer);
  }
}
