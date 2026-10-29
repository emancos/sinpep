import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';

export class CreateMedicationDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  processNumber?: string;

  @IsOptional()
  @IsString()
  registrationNumber?: string;

  @IsOptional()
  @IsString()
  laboratoryId?: string;

  @IsOptional()
  @IsString()
  laboratoryName?: string;

  @IsOptional()
  @IsString()
  laboratoryCnpj?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  referenceMedicine?: string;

  @IsOptional()
  @IsString()
  stripe?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  substanceDescription?: string;

  @IsOptional()
  @IsString()
  dosage?: string;

  @IsOptional()
  @IsString()
  complement?: string;

  @IsOptional()
  @IsString()
  atcCode?: string;
}

