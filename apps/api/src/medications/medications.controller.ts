import { Controller, Get, Query, Param, UseGuards } from '@nestjs/common';
import { MedicationsService } from './medications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('medications')
@UseGuards(JwtAuthGuard)
export class MedicationsController {
  constructor(private readonly medicationsService: MedicationsService) {}

  @Get('search')
  search(
    @Query('q') q: string,
    @Query('activeOnly') activeOnly?: string,
    @Query('limit') limit?: string,
  ) {
    const isActiveOnly = activeOnly !== 'false';
    const limitNum = limit ? Math.min(parseInt(limit, 10) || 30, 100) : 30;
    return this.medicationsService.search(q || '', isActiveOnly, limitNum);
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.medicationsService.findById(id);
  }
}
