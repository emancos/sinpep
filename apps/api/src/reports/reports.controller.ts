import { Controller, Get, UseGuards } from '@nestjs/common';
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
}
