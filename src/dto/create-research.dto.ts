// src/dto/create-research.dto.ts
import {
  IsNumber,
  IsString,
  IsArray,
  MaxLength,
  ArrayMinSize,
  Min,
  Max,
  IsIn,
} from 'class-validator';

export class CreateResearchDto {
  @IsNumber()
  influencerId: number;

  @IsString()
  @IsIn(['Last Week', 'Last Month', 'Last Year', 'All Time'])
  timeRange: string;

  @IsNumber()
  @Min(100)
  @Max(5000)
  max_tokens: number;

  @IsNumber()
  @Min(1)
  @Max(100)
  claimsCount: number;

  @IsArray()
  @ArrayMinSize(1)
  selectedJournals: string[];

  @IsString()
  @MaxLength(1000)
  notes?: string;
}
