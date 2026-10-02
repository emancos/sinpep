import { Module } from '@nestjs/common';
import { SisregController } from './sisreg.controller';

@Module({
  controllers: [SisregController],
})
export class SisregModule {}
