import { Module } from '@nestjs/common';
import { IntegraSusService } from './integra-sus.service';

@Module({
  providers: [IntegraSusService],
  exports: [IntegraSusService],
})
export class IntegraSusModule {}
