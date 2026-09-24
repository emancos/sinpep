import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

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
}
