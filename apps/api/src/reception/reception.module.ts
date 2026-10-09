import { Module } from '@nestjs/common';
import { ReceptionController } from './reception.controller';
import { ReceptionService } from './reception.service';
import { DatabaseModule } from '../database/database.module';

import { DoctorsModule } from '../doctors/doctors.module';
import { HealthCentersModule } from '../health-centers/health-centers.module';

@Module({
  imports: [DatabaseModule, DoctorsModule, HealthCentersModule],
  controllers: [ReceptionController],
  providers: [ReceptionService],
  exports: [ReceptionService],
})
export class ReceptionModule {}
