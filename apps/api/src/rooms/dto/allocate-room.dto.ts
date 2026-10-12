import { IsNotEmpty, IsString } from 'class-validator';

export class AllocateRoomDto {
  @IsNotEmpty({ message: 'O ID do ambulatório é obrigatório' })
  @IsString()
  roomId: string;

  @IsNotEmpty({ message: 'O nome da especialidade é obrigatório' })
  @IsString()
  specialtyName: string;

  @IsNotEmpty({ message: 'A data do agendamento é obrigatória' })
  @IsString()
  date: string;
}

export class DeallocateRoomDto {
  @IsNotEmpty({ message: 'O nome da especialidade é obrigatório' })
  @IsString()
  specialtyName: string;

  @IsNotEmpty({ message: 'A data do agendamento é obrigatória' })
  @IsString()
  date: string;
}
