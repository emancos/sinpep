import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { SpecialtiesService } from './specialties.service';
import { CreateSpecialtyDto } from './dto/create-specialty.dto';
import { UpdateSpecialtyDto } from './dto/update-specialty.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('specialties')
export class SpecialtiesController {
  constructor(private readonly specialtiesService: SpecialtiesService) {}

  @Permissions('specialties:write')
  @Post()
  create(@Body() createSpecialtyDto: CreateSpecialtyDto) {
    return this.specialtiesService.create(createSpecialtyDto);
  }

  @Permissions('specialties:read')
  @Get()
  findAll(@Query() query: PaginationQueryDto) {
    return this.specialtiesService.findAll(query);
  }

  @Permissions('specialties:read')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.specialtiesService.findOne(id);
  }

  @Permissions('specialties:write')
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateSpecialtyDto: UpdateSpecialtyDto) {
    return this.specialtiesService.update(id, updateSpecialtyDto);
  }

  @Permissions('specialties:write')
  @Patch(':id/toggle-active')
  toggleActive(@Param('id') id: string) {
    return this.specialtiesService.toggleActive(id);
  }

  @Permissions('specialties:write')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.specialtiesService.remove(id);
  }
}
