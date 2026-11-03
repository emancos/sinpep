import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdateBrandingDto {
  @IsString()
  @IsOptional()
  slug?: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  fullName?: string;

  @IsString()
  @IsOptional()
  department?: string;

  @IsString()
  @IsOptional()
  networkName?: string;

  @IsString()
  @IsOptional()
  systemTitle?: string;

  @IsString()
  @IsOptional()
  systemSubtitle?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  badgeText?: string;

  @IsString()
  @IsOptional()
  coatOfArmsUrl?: string;

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
