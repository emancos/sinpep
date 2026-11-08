import { Module } from '@nestjs/common';
import { BpaController } from './bpa.controller';
import { BpaService } from './bpa.service';
import { BpaPdfService } from './bpa-pdf.service';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [BpaController],
  providers: [BpaService, BpaPdfService],
  exports: [BpaService, BpaPdfService],
})
export class BpaModule {}
