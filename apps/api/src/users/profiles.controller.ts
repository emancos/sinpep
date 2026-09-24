import { Controller, Get, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';

@Controller('profiles')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ProfilesController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Permissions('admin:access') // Assuming we only need admins to fetch profiles for creation/editing users
  async findAll() {
    return this.usersService.getProfiles();
  }
}
