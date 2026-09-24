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
import { HealthCentersService } from './health-centers.service';
import { CreateHealthCenterDto } from './dto/create-health-center.dto';
import { UpdateHealthCenterDto } from './dto/update-health-center.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';

@Controller('health-centers')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class HealthCentersController {
  constructor(private readonly healthCentersService: HealthCentersService) {}

  @Post()
  @Permissions('health-centers:write')
  create(@Body() createHealthCenterDto: CreateHealthCenterDto) {
    return this.healthCentersService.create(createHealthCenterDto);
  }

  @Get()
  @Permissions('health-centers:read')
  findAll(@Query() query: PaginationQueryDto) {
    return this.healthCentersService.findAll(query);
  }

  @Get(':id')
  @Permissions('health-centers:read')
  findOne(@Param('id') id: string) {
    return this.healthCentersService.findOne(id);
  }

  @Put(':id')
  @Permissions('health-centers:write')
  update(
    @Param('id') id: string,
    @Body() updateHealthCenterDto: UpdateHealthCenterDto,
  ) {
    return this.healthCentersService.update(id, updateHealthCenterDto);
  }

  @Delete(':id')
  @Permissions('admin:access')
  remove(@Param('id') id: string) {
    return this.healthCentersService.remove(id);
  }

  @Patch(':id/toggle-active')
  @Permissions('health-centers:write')
  toggleActive(@Param('id') id: string) {
    return this.healthCentersService.toggleActive(id);
  }
}
