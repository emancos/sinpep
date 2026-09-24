import { IsInt, Min, Max, IsString, IsOptional } from 'class-validator';

export class UpdateAttentionDto {
  @IsInt()
  @Min(1)
  @Max(5)
  attentionLevel: number;

  @IsString()
  @IsOptional()
  attentionNotes?: string;
}
