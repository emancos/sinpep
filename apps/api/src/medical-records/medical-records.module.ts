import { Module } from '@nestjs/common';
import { MedicalRecordsService } from './medical-records.service';
import { MedicalRecordsController } from './medical-records.controller';
import { MedicalRecordsGlobalController } from './medical-records-global.controller';
import { DatabaseModule } from '../database/database.module';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [DatabaseModule, StorageModule],
  controllers: [MedicalRecordsController, MedicalRecordsGlobalController],
  providers: [MedicalRecordsService],
})
export class MedicalRecordsModule {}
