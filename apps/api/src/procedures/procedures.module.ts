import { Module } from '@nestjs/common';
import { ProceduresService } from './procedures.service';
import { ProceduresController } from './procedures.controller';
import { DatabaseModule } from '../database/database.module';
import { IntegraSusModule } from '../integra-sus/integra-sus.module';

@Module({
  imports: [DatabaseModule, IntegraSusModule],
  providers: [ProceduresService],
  controllers: [ProceduresController],
  exports: [ProceduresService],
})
export class ProceduresModule {}
