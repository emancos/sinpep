import { Module } from '@nestjs/common';
import { ProcedureGroupsService } from './procedure-groups.service';
import { ProcedureGroupsController } from './procedure-groups.controller';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  providers: [ProcedureGroupsService],
  controllers: [ProcedureGroupsController]
})
export class ProcedureGroupsModule {}
