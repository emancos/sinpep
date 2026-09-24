// @ts-nocheck
import { Controller, Get, UseGuards } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';

@Controller('permissions')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PermissionsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @Permissions('admin:access') // Or any appropriate permission if this is restricted
  async findAll() {
    return this.prisma.db.orm.public.Permissions
      .orderBy((p) => p.name.asc())
      .all();
  }
}
