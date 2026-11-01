import { Controller, Get, Post, Body, Patch, Param, Delete, Put, Query, UseGuards } from '@nestjs/common';
import { ProceduresService } from './procedures.service';
import { AuthGuard } from '@nestjs/passport';

@UseGuards(AuthGuard('jwt'))
@Controller('procedures')
export class ProceduresController {
  constructor(private readonly proceduresService: ProceduresService) {}

  @Post()
  create(@Body() data: any) {
    return this.proceduresService.create(data);
  }

  @Get()
  findAll(@Query() query: any) {
    return this.proceduresService.findAll(query);
  }

  // --- INTEGRA SUS API Search ---
  @Get('integra-sus/search')
  searchIntegraSus(@Query('search') search: string) {
    return this.proceduresService.searchIntegraSus(search || '');
  }

  // --- Cotas Matrix & Rebalanceamento ---
  @Get('quotas/matrix')
  getQuotasMatrix(
    @Query('executingHealthCenterId') executingHealthCenterId: string,
    @Query('procedureId') procedureId: string
  ) {
    return this.proceduresService.getProcedureQuotasMatrix(executingHealthCenterId, procedureId);
  }

  @Post('quotas/distribute-auto')
  distributeAuto(
    @Body() body: { executingHealthCenterId: string; procedureId: string; totalCapacity?: number }
  ) {
    return this.proceduresService.autoDistributeQuotas(
      body.executingHealthCenterId,
      body.procedureId,
      body.totalCapacity
    );
  }

  @Put('quotas/rebalance')
  rebalance(
    @Body() body: {
      executingHealthCenterId: string;
      procedureId: string;
      solicitingHealthCenterId: string;
      monthlyQuota: number;
    }
  ) {
    return this.proceduresService.rebalanceQuotas(
      body.executingHealthCenterId,
      body.procedureId,
      body.solicitingHealthCenterId,
      body.monthlyQuota
    );
  }

  // --- Ofertas da Executante ---
  @Get('executing/:healthCenterId')
  getExecutingOffers(
    @Param('healthCenterId') healthCenterId: string,
    @Query('groupId') groupId?: string,
    @Query('includeInactive') includeInactive?: string
  ) {
    return this.proceduresService.getExecutingOffers(healthCenterId, groupId, includeInactive === 'true');
  }

  @Put('executing/:healthCenterId')
  updateExecutingOffer(
    @Param('healthCenterId') healthCenterId: string,
    @Body() body: { procedureId: string; monthlyQuantity: number; isOffered: boolean }
  ) {
    return this.proceduresService.updateExecutingOffer(
      healthCenterId,
      body.procedureId,
      body.monthlyQuantity,
      body.isOffered
    );
  }

  // --- Preparo Clínico ---
  @Get(':id/preparation')
  getPreparation(@Param('id') id: string) {
    return this.proceduresService.getPreparation(id);
  }

  @Put(':id/preparation')
  savePreparation(@Param('id') id: string, @Body() body: any) {
    return this.proceduresService.savePreparation(id, body);
  }

  // --- Procedure CRUD ---
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.proceduresService.findOne(id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() data: any) {
    return this.proceduresService.update(id, data);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.proceduresService.remove(id);
  }

  @Patch(':id/toggle-active')
  toggleActive(@Param('id') id: string) {
    return this.proceduresService.toggleActive(id);
  }
}
