import { Module } from '@nestjs/common';
import { ProcedureGroupsService } from './procedure-groups.service';
import { ProcedureGroupsController } from './procedure-groups.controller';
import { DatabaseModule } from '../database/database.module';
import { IntegraSusModule } from '../integra-sus/integra-sus.module';

@Module({
  imports: [DatabaseModule, IntegraSusModule],
  providers: [ProcedureGroupsService],
  controllers: [ProcedureGroupsController],
  exports: [ProcedureGroupsService],
})
export class ProcedureGroupsModule {}
