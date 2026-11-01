import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';

export class CreateHealthCenterDto {
  @IsString()
  @IsNotEmpty()
  name: string;

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
}
