import { Controller, Get, UseGuards } from '@nestjs/common';
import { MedicalRecordsService } from './medical-records.service';
import { AuthGuard } from '@nestjs/passport';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';

@UseGuards(AuthGuard('jwt'), PermissionsGuard)
@Controller('medical-records')
export class MedicalRecordsGlobalController {
  constructor(private readonly medicalRecordsService: MedicalRecordsService) {}

  @Get('count')
  @Permissions('medical-records:read')
  countAll() {
    return this.medicalRecordsService.countAll();
  }
}
