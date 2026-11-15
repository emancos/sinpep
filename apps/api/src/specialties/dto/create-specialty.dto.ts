import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateSpecialtyDto {
  @IsString()
  @IsOptional()
  cbo?: string;

  @IsString()
  @IsNotEmpty({ message: 'O nome da especialidade é obrigatório.' })
  name: string;

  @IsString()
  @IsOptional()
  description?: string;
}
