import { Module } from '@nestjs/common';
import { BrandingsController } from './brandings.controller';
import { BrandingsService } from './brandings.service';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [BrandingsController],
  providers: [BrandingsService],
  exports: [BrandingsService],
})
export class BrandingsModule {}
