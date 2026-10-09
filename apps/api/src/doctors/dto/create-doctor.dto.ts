import { IsString, IsNotEmpty, IsOptional, IsUUID, IsArray, Matches, ArrayMinSize } from 'class-validator';

export class CreateDoctorDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^(\d{3}|XXX)\.\d{3}\.\d{3}[-\.](\d{2}|XX)$/i, { message: 'CPF inválido' })
  cpf: string;

  @IsString()
  @IsOptional()
  @Matches(/^\d{3}\s\d{4}\s\d{4}\s\d{4}$/, { message: 'CNS inválido' })
  cns?: string;

  @IsString()
  @IsOptional()
  crm?: string;

  @IsString()
  @IsOptional()
  crmState?: string;

  @IsString()
  @IsNotEmpty()
  attendanceType: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsArray()
  @IsUUID('all', { each: true })
  @ArrayMinSize(1, { message: 'Selecione no mínimo 1 especialidade' })
  specialties: string[];

  @IsArray()
  @IsUUID('all', { each: true })
  @IsOptional()
  procedures?: string[];

  @IsArray()
  @IsUUID('all', { each: true })
  @IsOptional()
  procedureGroups?: string[];

  @IsOptional()
  healthCenter?: any;
}
