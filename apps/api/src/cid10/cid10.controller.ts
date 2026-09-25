import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { Cid10Service } from './cid10.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('cid10')
@UseGuards(JwtAuthGuard)
export class Cid10Controller {
  constructor(private readonly cid10Service: Cid10Service) {}

  @Get('search')
  search(@Query('q') q: string) {
    return this.cid10Service.search(q || '');
  }
}
