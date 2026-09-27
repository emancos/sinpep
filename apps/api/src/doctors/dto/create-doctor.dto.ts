import { IsString, IsNotEmpty, IsOptional, IsUUID, IsArray, Matches } from 'class-validator';

export class CreateDoctorDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{3}\.\d{3}\.\d{3}\-\d{2}$/, { message: 'CPF inválido' })
  cpf: string;

  @IsString()
  @IsOptional()
  @Matches(/^\d{3}\s\d{4}\s\d{4}\s\d{4}$/, { message: 'CNS inválido' })
  cns?: string;

  @IsString()
  @IsNotEmpty()
  crm: string;

  @IsString()
  @IsNotEmpty()
  crmState: string;

  @IsString()
  @IsNotEmpty()
  attendanceType: string;

  @IsUUID()
  @IsNotEmpty()
  userId: string;

  @IsArray()
  @IsUUID('all', { each: true })
  @IsOptional()
  specialties?: string[];

  @IsArray()
  @IsUUID('all', { each: true })
  @IsOptional()
  procedures?: string[];
}
