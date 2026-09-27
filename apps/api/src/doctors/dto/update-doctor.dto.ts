import { IsBoolean, IsOptional, IsString, IsArray, IsUUID, Matches, ArrayMinSize } from 'class-validator';

export class UpdateDoctorDto {
  @IsString()
  @IsOptional()
  @Matches(/^\d{3}\.\d{3}\.\d{3}\-\d{2}$/, { message: 'CPF inválido' })
  cpf?: string;

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
  @IsOptional()
  attendanceType?: string;

  @IsUUID()
  @IsOptional()
  userId?: string;

  @IsArray()
  @IsUUID('all', { each: true })
  @ArrayMinSize(1, { message: 'Selecione no mínimo 1 especialidade' })
  specialties?: string[];

  @IsArray()
  @IsUUID('all', { each: true })
  @IsOptional()
  procedures?: string[];

  @IsArray()
  @IsUUID('all', { each: true })
  @IsOptional()
  procedureGroups?: string[];

  @IsBoolean()
  @IsOptional()
  active?: boolean;
}
