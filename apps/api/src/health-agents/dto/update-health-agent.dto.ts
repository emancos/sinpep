import { IsString, IsOptional, IsUUID } from 'class-validator';

export class UpdateHealthAgentDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  microArea?: string;

  @IsUUID()
  @IsOptional()
  userId?: string;

  @IsUUID()
  @IsOptional()
  healthCenterId?: string;
}
