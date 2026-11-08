import { IsBoolean, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateNoticeDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @IsString()
  @IsNotEmpty()
  content: string;

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

  @IsString()
  @IsOptional()
  expiresAt?: string;
}
