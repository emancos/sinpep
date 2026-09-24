import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
  Patch,
  UseGuards,
  Query,
} from '@nestjs/common';
import { PatientsService } from './patients.service';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { UpdateAttentionDto } from './dto/update-attention.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';

@Controller('patients')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PatientsController {
  constructor(private readonly patientsService: PatientsService) { }

  @Post()
  @Permissions('patients:write')
  create(@Body() createPatientDto: CreatePatientDto) {
    return this.patientsService.create(createPatientDto);
  }

  @Get()
  @Permissions('patients:read')
  findAll(@Query() query: PaginationQueryDto) {
    return this.patientsService.findAll(query);
  }

  @Get('check-unique')
  @Permissions('patients:read')
  checkUnique(
    @Query('cpf') cpf?: string,
    @Query('cns') cns?: string,
    @Query('excludeId') excludeId?: string,
  ) {
    return this.patientsService.checkUnique(cpf, cns, excludeId);
  }

  @Get(':id')
  @Permissions('patients:read')
  findOne(@Param('id') id: string) {
    return this.patientsService.findOne(id);
  }

  @Put(':id')
  @Permissions('patients:write')
  update(@Param('id') id: string, @Body() updatePatientDto: UpdatePatientDto) {
    return this.patientsService.update(id, updatePatientDto);
  }

  @Delete(':id')
  @Permissions('admin:access')
  remove(@Param('id') id: string) {
    return this.patientsService.remove(id);
  }

  @Patch(':id/toggle-active')
  @Permissions('patients:write')
  toggleActive(@Param('id') id: string) {
    return this.patientsService.toggleActive(id);
  }

  @Patch(':id/attention')
  @Permissions('patients:write_attention')
  updateAttention(
    @Param('id') id: string,
    @Body() updateAttentionDto: UpdateAttentionDto,
  ) {
    return this.patientsService.updateAttention(id, updateAttentionDto);
  }
}
