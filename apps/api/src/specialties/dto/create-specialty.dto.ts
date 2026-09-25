import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';

export class CreateSpecialtyDto {
  @IsString()
  @IsNotEmpty()
  cbo: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;
}
