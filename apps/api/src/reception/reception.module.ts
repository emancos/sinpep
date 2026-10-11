import { Module } from '@nestjs/common';
import { ReceptionController } from './reception.controller';
import { ReceptionService } from './reception.service';
import { DatabaseModule } from '../database/database.module';

import { DoctorsModule } from '../doctors/doctors.module';
import { HealthCentersModule } from '../health-centers/health-centers.module';
import { EventsModule } from '../events/events.module';

@Module({
  imports: [DatabaseModule, DoctorsModule, HealthCentersModule, EventsModule],
  controllers: [ReceptionController],
  providers: [ReceptionService],
  exports: [ReceptionService],
})
export class ReceptionModule {}
