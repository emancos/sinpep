import { IsOptional, IsString, IsBoolean } from 'class-validator';

export class UpdateRoomDto {
  @IsOptional()
  @IsString({ message: 'O nome deve ser uma string' })
  name?: string;

  @IsOptional()
  @IsString({ message: 'O número deve ser uma string' })
  number?: string;

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
