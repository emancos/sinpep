import { Module } from '@nestjs/common';
import { RegulationService } from './regulation.service';
import { RegulationController } from './regulation.controller';
import { DatabaseModule } from '../database/database.module';
import { StorageModule } from '../storage/storage.module';
import { EventsModule } from '../events/events.module';

@Module({
  imports: [DatabaseModule, StorageModule, EventsModule],
  controllers: [RegulationController],
  providers: [RegulationService],
  exports: [RegulationService],
})
export class RegulationModule {}
