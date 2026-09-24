import { IsString, IsNotEmpty, IsUUID, IsOptional } from 'class-validator';

export class CreateHealthAgentDto {
  @IsString()
  @IsNotEmpty()
  name: string;

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
  @IsNotEmpty()
  healthCenterId: string;
}
