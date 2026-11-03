import { IsNotEmpty, IsString } from 'class-validator';

export class BookSlotDto {
  @IsString()
  @IsNotEmpty()
  slotId: string;

  @IsString()
  @IsNotEmpty()
  regulationRequestId: string;
}
