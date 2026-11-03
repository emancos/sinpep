import {
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class UpdateScheduleDto {
  @IsString()
  @IsOptional()
  executingHealthCenterId?: string;

  @IsString()
  @IsOptional()
  scheduleType?: string;

  @IsString()
  @IsOptional()
  procedureId?: string;

  @IsString()
  @IsOptional()
  procedureGroupId?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  enabledProcedureIds?: string[];

  @IsString()
  @IsOptional()
  doctorId?: string;

  @IsString()
  @IsOptional()
  cbo?: string;

  @IsString()
  @IsOptional()
  startDate?: string;

  @IsString()
  @IsOptional()
  endDate?: string;

  @IsString()
  @IsOptional()
  startTime?: string;

  @IsString()
  @IsOptional()
  endTime?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  daysOfWeek?: string[];

  @IsInt()
  @Min(0)
  @IsOptional()
  firstTimeQuantity?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  firstTimeMinutes?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  returnQuantity?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  returnMinutes?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  regulatorReservedQuantity?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  regulatorReservedMinutes?: number;

  @IsBoolean()
  @IsOptional()
  autoSlotSplit?: boolean;

  @IsBoolean()
  @IsOptional()
  isLocalSchedule?: boolean;

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
