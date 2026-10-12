import { Module } from '@nestjs/common';
import { RoomsService } from './rooms.service';
import { RoomsController } from './rooms.controller';
import { DatabaseModule } from '../database/database.module';
import { EventsModule } from '../events/events.module';
import { NonDoctorGuard } from '../auth/guards/non-doctor.guard';

@Module({
  imports: [DatabaseModule, EventsModule],
  controllers: [RoomsController],
  providers: [RoomsService, NonDoctorGuard],
  exports: [RoomsService],
})
export class RoomsModule {}
