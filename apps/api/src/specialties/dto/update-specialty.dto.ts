import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdateSpecialtyDto {
  @IsString()
  @IsOptional()
  cbo?: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  active?: boolean;
}
