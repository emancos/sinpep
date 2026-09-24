import { Module } from '@nestjs/common';
import { HealthCentersService } from './health-centers.service';
import { HealthCentersController } from './health-centers.controller';

@Module({
  controllers: [HealthCentersController],
  providers: [HealthCentersService],
  exports: [HealthCentersService],
})
export class HealthCentersModule {}
