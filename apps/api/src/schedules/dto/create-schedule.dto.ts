import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateScheduleDto {
  @IsString()
  @IsNotEmpty()
  executingHealthCenterId: string;

  @IsString()
  @IsNotEmpty()
  procedureId: string;

  @IsString()
  @IsNotEmpty()
  doctorId: string;

  @IsString()
  @IsNotEmpty()
  cbo: string;

  @IsString()
  @IsNotEmpty()
  startDate: string; // YYYY-MM-DD

  @IsString()
  @IsNotEmpty()
  endDate: string; // YYYY-MM-DD

  @IsString()
  @IsNotEmpty()
  startTime: string; // HH:mm

  @IsString()
  @IsNotEmpty()
  endTime: string; // HH:mm

  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty()
  daysOfWeek: string[]; // ['DOMINGO', 'SEGUNDA', 'TERCA', 'QUARTA', 'QUINTA', 'SEXTA', 'SABADO']

  @IsInt()
  @Min(0)
  firstTimeQuantity: number;

  @IsInt()
  @Min(0)
  firstTimeMinutes: number;

  @IsInt()
  @Min(0)
  returnQuantity: number;

  @IsInt()
  @Min(0)
  returnMinutes: number;

  @IsInt()
  @Min(0)
  regulatorReservedQuantity: number;

  @IsInt()
  @Min(0)
  regulatorReservedMinutes: number;

  @IsBoolean()
  autoSlotSplit: boolean;

  @IsBoolean()
  isLocalSchedule: boolean;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  blockedDates?: string[];
}
