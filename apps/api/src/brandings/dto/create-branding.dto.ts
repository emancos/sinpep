import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateBrandingDto {
  @IsString()
  @IsNotEmpty()
  slug: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  fullName: string;

  @IsString()
  @IsNotEmpty()
  department: string;

  @IsString()
  @IsOptional()
  networkName?: string;

  @IsString()
  @IsOptional()
  systemTitle?: string;

  @IsString()
  @IsNotEmpty()
  systemSubtitle: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  badgeText?: string;

  @IsString()
  @IsNotEmpty()
  coatOfArmsUrl: string;

  @IsString()
  @IsOptional()
  logoUrl?: string;

  @IsString()
  @IsOptional()
  primaryGradientStart?: string;

  @IsString()
  @IsOptional()
  primaryGradientEnd?: string;

  @IsString()
  @IsOptional()
  footerText?: string;

  @IsString()
  @IsOptional()
  supportContact?: string;

  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
