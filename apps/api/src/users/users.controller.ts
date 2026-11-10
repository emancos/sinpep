import {
  Controller,
  Get,
  Param,
  UseGuards,
  Put,
  Post,
  Delete,
  Body,
  Request,
  Query,
  Patch,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { Type } from 'class-transformer';
import {
  IsString,
  IsOptional,
  MinLength,
  IsArray,
  ValidateNested,
  IsBoolean,
} from 'class-validator';
import type { Request as ExpressRequest } from 'express';

interface AuthenticatedRequest extends ExpressRequest {
  user: {
    id: string;
    email: string;
    permissions: string[];
  };
}

export class CustomPermissionDto {
  @IsString()
  permissionId: string;

  @IsBoolean()
  isAllowed: boolean;
}

export class UpdateProfileDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  @MinLength(6, { message: 'A senha deve ter pelo menos 6 caracteres' })
  password?: string;
}

export class CreateUserDto {
  @IsString()
  email: string;

  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  profileId?: string;

  @IsArray()
  @IsOptional()
  profileIds?: string[];

  @IsString()
  @IsOptional()
  defaultProfileId?: string;

  @IsString()
  @IsOptional()
  healthCenterId?: string;

  @IsArray()
  @IsOptional()
  healthCenterIds?: string[];

  @IsString()
  @IsOptional()
  defaultHealthCenterId?: string;

  @IsBoolean()
  @IsOptional()
  isMunicipalRegulator?: boolean;

  @IsString()
  @IsOptional()
  @MinLength(6, { message: 'A senha deve ter pelo menos 6 caracteres' })
  password?: string;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CustomPermissionDto)
  customPermissions?: CustomPermissionDto[];
}

export class UpdateUserAdminDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  profileId?: string;

  @IsArray()
  @IsOptional()
  profileIds?: string[];

  @IsString()
  @IsOptional()
  defaultProfileId?: string;

  @IsString()
  @IsOptional()
  healthCenterId?: string;

  @IsArray()
  @IsOptional()
  healthCenterIds?: string[];

  @IsString()
  @IsOptional()
  defaultHealthCenterId?: string;

  @IsBoolean()
  @IsOptional()
  isMunicipalRegulator?: boolean;

  @IsString()
  @IsOptional()
  @MinLength(6, { message: 'A senha deve ter pelo menos 6 caracteres' })
  password?: string;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CustomPermissionDto)
  customPermissions?: CustomPermissionDto[];
}

@Controller('users')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
  ) {}

  @Get()
  @Permissions('users:read')
  async findAll(@Query('includeInactive') includeInactive?: string) {
    const include = includeInactive === 'true';
    return this.usersService.findAll(include);
  }

  @Put('profile')
  async updateProfile(
    @Request() req: AuthenticatedRequest,
    @Body() body: UpdateProfileDto,
  ) {
    const userId = req.user.id;

    const updatedUser = await this.usersService.update(userId, {
      name: body.name,
      phone: body.phone,
      password: body.password,
    });

    const result = { ...updatedUser } as any;
    delete result.passwordHash;
    return result;
  }

  @Get(':id')
  @Permissions('users:read')
  async findOne(@Param('id') id: string) {
    const user = await this.usersService.findById(id);
    if (user) {
      const result = { ...user } as Partial<typeof user>;
      delete result.passwordHash;
      return result;
    }
    return null;
  }

  @Post()
  @Permissions('admin:access')
  async create(@Body() body: CreateUserDto) {
    const user = await this.usersService.create(body);
    const result = { ...user } as any;
    delete result.passwordHash;
    return result;
  }

  @Put(':id')
  @Permissions('admin:access')
  async updateAsAdmin(
    @Param('id') id: string,
    @Body() body: UpdateUserAdminDto,
  ) {
    const updatedUser = await this.usersService.update(id, {
      name: body.name,
      phone: body.phone,
      password: body.password,
      profileId: body.profileId,
      profileIds: body.profileIds,
      defaultProfileId: body.defaultProfileId,
      healthCenterId: body.healthCenterId,
      healthCenterIds: body.healthCenterIds,
      defaultHealthCenterId: body.defaultHealthCenterId,
      isMunicipalRegulator: body.isMunicipalRegulator,
      customPermissions: body.customPermissions,
    });
    const result = { ...updatedUser } as any;
    delete result.passwordHash;
    return result;
  }

  @Delete(':id')
  @Permissions('admin:access')
  async remove(@Param('id') id: string) {
    const user = await this.usersService.delete(id);
    const result = { ...user } as any;
    delete result.passwordHash;
    return result;
  }

  @Patch(':id/toggle-active')
  @Permissions('users:write')
  async toggleActive(@Param('id') id: string) {
    const user = await this.usersService.toggleActive(id);
    const result = { ...user } as any;
    delete result.passwordHash;
    return result;
  }
}

