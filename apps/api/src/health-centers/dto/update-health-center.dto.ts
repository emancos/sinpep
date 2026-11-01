import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class UpdateHealthCenterDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  cnes?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  nurseName?: string;

  @IsBoolean()
  @IsOptional()
  stSolicitante?: boolean;

  @IsBoolean()
  @IsOptional()
  stExecutante?: boolean;

  @IsBoolean()
  @IsOptional()
  active?: boolean;
}
