import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, Request } from '@nestjs/common';
import { DoctorsService } from './doctors.service';
import { CreateDoctorDto } from './dto/create-doctor.dto';
import { UpdateDoctorDto } from './dto/update-doctor.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('doctors')
export class DoctorsController {
  constructor(private readonly doctorsService: DoctorsService) {}

  @Permissions('doctors:write')
  @Post()
  create(@Body() createDoctorDto: CreateDoctorDto) {
    return this.doctorsService.create(createDoctorDto);
  }

  @Get('me')
  findCurrentDoctor(@Request() req: any) {
    return this.doctorsService.findByUserId(req.user.id);
  }

  @Permissions('doctors:write')
  @Post('sync-cpf-cns')
  syncCpfByCns(@Body('cns') cns: string, @Body('fullCpf') fullCpf: string) {
    return this.doctorsService.updateDoctorCpfAndCredentialsByCns(cns, fullCpf);
  }

  @Permissions('doctors:read')
  @Get()
  findAll(@Query() query: PaginationQueryDto) {
    return this.doctorsService.findAll(query);
  }

  @Permissions('doctors:read')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.doctorsService.findOne(id);
  }

  @Permissions('doctors:write')
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateDoctorDto: UpdateDoctorDto) {
    return this.doctorsService.update(id, updateDoctorDto);
  }

  @Permissions('doctors:write')
  @Patch(':id/toggle-active')
  toggleActive(@Param('id') id: string) {
    return this.doctorsService.toggleActive(id);
  }

  @Permissions('admin:access')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.doctorsService.remove(id);
  }
}
