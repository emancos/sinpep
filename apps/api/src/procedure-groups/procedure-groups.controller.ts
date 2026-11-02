import { Controller, Get, Post, Body, Patch, Param, Delete, Put, Query, UseGuards } from '@nestjs/common';
import { ProcedureGroupsService } from './procedure-groups.service';
import { AuthGuard } from '@nestjs/passport';

@UseGuards(AuthGuard('jwt'))
@Controller('procedure-groups')
export class ProcedureGroupsController {
  constructor(private readonly procedureGroupsService: ProcedureGroupsService) {}

  // --- Rotas INTEGRA SUS API ---
  @Get('integra-sus/subgroups')
  searchSubgroups(@Query('search') search?: string, @Query('grupo') grupo?: string) {
    return this.procedureGroupsService.searchSubgroups(search, grupo);
  }

  @Get('integra-sus/groups')
  getGroups(@Query('search') search?: string, @Query('arvore') arvore?: string) {
    return this.procedureGroupsService.getGroups(search, arvore === 'true');
  }

  @Get('integra-sus/groups/:grupo/subgroups')
  getGroupSubgroups(@Param('grupo') grupo: string, @Query('search') search?: string) {
    return this.procedureGroupsService.getGroupSubgroups(grupo, search);
  }

  @Get('integra-sus/groups/:grupo/subgroups/:subgrupo/procedimentos')
  getSubgroupProcedures(
    @Param('grupo') grupo: string,
    @Param('subgrupo') subgrupo: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    return this.procedureGroupsService.getSubgroupProcedures(
      grupo,
      subgrupo,
      page ? Number(page) : 1,
      limit ? Number(limit) : 200
    );
  }

  @Post('import-integra-sus')
  importIntegraSus(
    @Body() data: {
      name?: string;
      groupCode: string;
      subgroupCode: string;
      groupName?: string;
      subgroupName?: string;
      autoImportProcedures?: boolean;
    }
  ) {
    return this.procedureGroupsService.importGroupFromIntegraSus(data);
  }

  // --- CRUD Padrão de Grupos ---
  @Post()
  create(@Body() data: { name: string; groupCode?: string; subgroupCode?: string }) {
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
  update(@Param('id') id: string, @Body() data: { name: string; groupCode?: string; subgroupCode?: string }) {
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
