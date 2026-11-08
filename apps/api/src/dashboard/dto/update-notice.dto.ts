import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateNoticeDto {
  @IsString()
  @IsOptional()
  @MaxLength(200)
  title?: string;

  @IsString()
  @IsOptional()
  content?: string;

  @IsString()
  @IsOptional()
  type?: 'INFO' | 'WARNING' | 'URGENT';

  @IsString()
  @IsOptional()
  scope?: 'GLOBAL' | 'HEALTH_CENTER';

  @IsString()
  @IsOptional()
  healthCenterId?: string;

  @IsBoolean()
  @IsOptional()
  isPinned?: boolean;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsString()
  @IsOptional()
  expiresAt?: string;
}
