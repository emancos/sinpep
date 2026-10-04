import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsISO8601,
  IsArray,
  ValidateNested,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';

export class PatientPhoneDto {
  @IsString()
  @IsNotEmpty()
  phoneNumber: string;

  @IsBoolean()
  @IsOptional()
  isWhatsapp?: boolean;
}

export class PatientAnamnesisDto {
  @IsBoolean()
  @IsOptional()
  isHypertensive?: boolean;

  @IsBoolean()
  @IsOptional()
  isDiabetic?: boolean;

  @IsString()
  @IsOptional()
  otherDiseases?: string;

  @IsBoolean()
  @IsOptional()
  isOncological?: boolean;

  @IsString()
  @IsOptional()
  oncologicalStage?: string;

  @IsString()
  @IsOptional()
  allergies?: string;

  @IsBoolean()
  @IsOptional()
  isPcd?: boolean;

  @IsString()
  @IsOptional()
  pcdDescription?: string;

  @IsArray()
  @IsOptional()
  continuousMedications?: any[];
}

export class CreatePatientDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  cpf: string;

  @IsString()
  @IsOptional()
  cns?: string;

  @IsISO8601()
  @IsNotEmpty()
  birthDate: string;

  @IsString()
  @IsNotEmpty()
  gender: string;

  @IsUUID()
  @IsNotEmpty()
  healthCenterId: string;

  @IsUUID()
  @IsOptional()
  healthAgentId?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => PatientPhoneDto)
  phones?: PatientPhoneDto[];

  @IsOptional()
  @ValidateNested()
  @Type(() => PatientAnamnesisDto)
  anamnesis?: PatientAnamnesisDto;
}
