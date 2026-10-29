import { Controller, Get, Post, Body, Param, UseGuards, UseInterceptors, UploadedFiles, Req, Patch, Delete } from '@nestjs/common';
import { MedicalRecordsService } from './medical-records.service';
import { AuthGuard } from '@nestjs/passport';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import * as crypto from 'crypto';
import * as path from 'path';
import * as fs from 'fs';

// Certificar que a pasta uploads existe
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

@UseGuards(AuthGuard('jwt'), PermissionsGuard)
@Controller('patients/:patientId/medical-records')
export class MedicalRecordsController {
  constructor(private readonly medicalRecordsService: MedicalRecordsService) {}

  @Post()
  @Permissions('medical-records:write')
  @UseInterceptors(FilesInterceptor('attachments', 10, {
    storage: memoryStorage(),
    fileFilter: (req, file, cb) => {
      const allowedMimes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
      if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Invalid file type'), false);
      }
    }
  }))
  create(
    @Param('patientId') patientId: string,
    @Body() body: any,
    @UploadedFiles() files: Express.Multer.File[],
    @Req() req: any
  ) {
    let doctorId = req.user.id;
    if (body.doctorId && req.user.permissions?.includes('admin:access')) {
      doctorId = body.doctorId;
    }
    return this.medicalRecordsService.create(patientId, doctorId, body, files);
  }

  @Get()
  @Permissions('medical-records:read')
  findAll(@Param('patientId') patientId: string) {
    return this.medicalRecordsService.findAllByPatient(patientId);
  }

  @Get(':id')
  @Permissions('medical-records:read')
  findOne(@Param('id') id: string) {
    return this.medicalRecordsService.findOne(id);
  }

  @Patch(':id/status')
  @Permissions('admin:access')
  toggleStatus(@Param('id') id: string) {
    return this.medicalRecordsService.toggleStatus(id);
  }

  @Delete(':id')
  @Permissions('admin:access')
  remove(@Param('id') id: string) {
    return this.medicalRecordsService.delete(id);
  }
}
