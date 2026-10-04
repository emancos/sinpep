import {
  IsString,
  IsOptional,
  IsUUID,
  IsISO8601,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PatientPhoneDto, PatientAnamnesisDto } from './create-patient.dto';

export class UpdatePatientDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  cpf?: string;

  @IsString()
  @IsOptional()
  cns?: string;

  @IsISO8601()
  @IsOptional()
  birthDate?: string;

  @IsString()
  @IsOptional()
  gender?: string;

  @IsUUID()
  @IsOptional()
  healthCenterId?: string;

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
