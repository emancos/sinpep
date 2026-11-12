import {
  Controller,
  Get,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Put,
  Post,
  Delete,
  Body,
  Request,
  Query,
  Patch,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UsersService } from './users.service';
import {
  buildAvatarMulterOptions,
  buildAvatarPublicUrl,
  removeLocalAvatarIfExists,
} from './avatar-upload.util';
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

  @IsString()
  @IsOptional()
  removeAvatar?: string;
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

  @IsString()
  @IsOptional()
  removeAvatar?: string;
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

  @IsString()
  @IsOptional()
  removeAvatar?: string;
}

@Controller('users')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
  ) {}

  private async handleAvatarAwareUpdate(
    userId: string,
    payload: Parameters<UsersService['update']>[1],
    removeAvatar: boolean,
    avatarFile?: Express.Multer.File,
  ) {
    const nextAvatar = avatarFile
      ? buildAvatarPublicUrl(avatarFile.filename)
      : removeAvatar
      ? null
      : undefined;

    let previousAvatar: string | null | undefined;
    if (nextAvatar !== undefined) {
      const existing = await this.usersService.findById(userId);
      previousAvatar = existing?.avatar;
    }

    const updatedUser = await this.usersService.update(userId, {
      ...payload,
      ...(nextAvatar !== undefined ? { avatar: nextAvatar } : {}),
    });

    if (nextAvatar !== undefined && previousAvatar && previousAvatar !== nextAvatar) {
      await removeLocalAvatarIfExists(previousAvatar).catch(() => undefined);
    }

    const result = { ...updatedUser } as any;
    delete result.passwordHash;
    return result;
  }

  @Get()
  @Permissions('users:read')
  async findAll(@Query('includeInactive') includeInactive?: string) {
    const include = includeInactive === 'true';
    return this.usersService.findAll(include);
  }

  @Put('profile')
  @UseInterceptors(FileInterceptor('avatar', buildAvatarMulterOptions()))
  async updateProfile(
    @Request() req: AuthenticatedRequest,
    @Body() body: UpdateProfileDto,
    @UploadedFile() avatarFile?: Express.Multer.File,
  ) {
    return this.handleAvatarAwareUpdate(
      req.user.id,
      {
        name: body.name,
        phone: body.phone,
        password: body.password,
      },
      body.removeAvatar === 'true',
      avatarFile,
    );
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
  @UseInterceptors(FileInterceptor('avatar', buildAvatarMulterOptions()))
  async updateAsAdmin(
    @Param('id') id: string,
    @Body() body: UpdateUserAdminDto,
    @UploadedFile() avatarFile?: Express.Multer.File,
  ) {
    return this.handleAvatarAwareUpdate(
      id,
      {
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
      },
      body.removeAvatar === 'true',
      avatarFile,
    );
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

