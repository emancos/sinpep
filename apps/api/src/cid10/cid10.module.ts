import { Module } from '@nestjs/common';
import { Cid10Controller } from './cid10.controller';
import { Cid10Service } from './cid10.service';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [Cid10Controller],
  providers: [Cid10Service],
})
export class Cid10Module {}
