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
import { HealthAgentsService } from './health-agents.service';
import { CreateHealthAgentDto } from './dto/create-health-agent.dto';
import { UpdateHealthAgentDto } from './dto/update-health-agent.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';

@Controller('health-agents')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class HealthAgentsController {
  constructor(private readonly healthAgentsService: HealthAgentsService) {}

  @Post()
  @Permissions('health-agents:write')
  create(@Body() createHealthAgentDto: CreateHealthAgentDto) {
    return this.healthAgentsService.create(createHealthAgentDto);
  }

  @Get()
  @Permissions('health-agents:read')
  findAll(@Query() query: PaginationQueryDto) {
    return this.healthAgentsService.findAll(query);
  }

  @Get(':id')
  @Permissions('health-agents:read')
  findOne(@Param('id') id: string) {
    return this.healthAgentsService.findOne(id);
  }

  @Put(':id')
  @Permissions('health-agents:write')
  update(
    @Param('id') id: string,
    @Body() updateHealthAgentDto: UpdateHealthAgentDto,
  ) {
    return this.healthAgentsService.update(id, updateHealthAgentDto);
  }

  @Delete(':id')
  @Permissions('admin:access')
  remove(@Param('id') id: string) {
    return this.healthAgentsService.remove(id);
  }

  @Patch(':id/toggle-active')
  @Permissions('health-agents:write')
  toggleActive(@Param('id') id: string) {
    return this.healthAgentsService.toggleActive(id);
  }
}
