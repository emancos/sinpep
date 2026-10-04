import { Controller, Get, Post, Body, Param, UseGuards, UseInterceptors, UploadedFiles, Req } from '@nestjs/common';
import { MedicalRecordsService } from './medical-records.service';
import { AuthGuard } from '@nestjs/passport';
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

@UseGuards(AuthGuard('jwt'))
@Controller('patients/:patientId/medical-records')
export class MedicalRecordsController {
  constructor(private readonly medicalRecordsService: MedicalRecordsService) {}

  @Post()
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
  findAll(@Param('patientId') patientId: string) {
    return this.medicalRecordsService.findAllByPatient(patientId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.medicalRecordsService.findOne(id);
  }
}
