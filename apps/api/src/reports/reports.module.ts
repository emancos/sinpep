import { Module } from '@nestjs/common';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { ReportsPdfService } from './reports-pdf.service';
import { ReportsExportService } from './reports-export.service';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [ReportsController],
  providers: [ReportsService, ReportsPdfService, ReportsExportService],
  exports: [ReportsService, ReportsPdfService, ReportsExportService],
})
export class ReportsModule {}
