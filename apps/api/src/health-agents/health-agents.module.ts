import { Module } from '@nestjs/common';
import { HealthAgentsService } from './health-agents.service';
import { HealthAgentsController } from './health-agents.controller';

@Module({
  controllers: [HealthAgentsController],
  providers: [HealthAgentsService],
  exports: [HealthAgentsService],
})
export class HealthAgentsModule {}
