import { Module } from '@nestjs/common';
import { StorageService } from './storage.service';
import { StorageController } from './storage.controller';
import { PatientsModule } from '../patients/patients.module';

@Module({
  imports: [PatientsModule],
  controllers: [StorageController],
  providers: [StorageService],
  exports: [StorageService],
})
export class StorageModule {}
