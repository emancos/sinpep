import { IsNotEmpty, IsOptional, IsString, IsBoolean } from 'class-validator';

export class CreateRoomDto {
  @IsNotEmpty({ message: 'O nome do ambulatório/sala é obrigatório' })
  @IsString({ message: 'O nome deve ser uma string' })
  name: string;

  @IsNotEmpty({ message: 'O número da sala é obrigatório' })
  @IsString({ message: 'O número deve ser uma string' })
  number: string;

  @IsOptional()
  @IsString({ message: 'O setor deve ser uma string' })
  sector?: string;

  @IsOptional()
  @IsString({ message: 'O andar deve ser uma string' })
  floor?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
