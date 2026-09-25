import { Controller, Get, Post, Body, Patch, Param, Delete, Put, Query, UseGuards } from '@nestjs/common';
import { ProcedureGroupsService } from './procedure-groups.service';
import { AuthGuard } from '@nestjs/passport';

@UseGuards(AuthGuard('jwt'))
@Controller('procedure-groups')
export class ProcedureGroupsController {
  constructor(private readonly procedureGroupsService: ProcedureGroupsService) {}

  @Post()
  create(@Body() data: { name: string }) {
    return this.procedureGroupsService.create(data);
  }

  @Get()
  findAll(@Query('includeInactive') includeInactive?: string) {
    return this.procedureGroupsService.findAll(includeInactive === 'true');
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.procedureGroupsService.findOne(id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() data: { name: string }) {
    return this.procedureGroupsService.update(id, data);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.procedureGroupsService.remove(id);
  }

  @Patch(':id/toggle-active')
  toggleActive(@Param('id') id: string) {
    return this.procedureGroupsService.toggleActive(id);
  }
}
