// src/dto/create-research.dto.ts
import {
  IsNumber,
  IsString,
  IsArray,
  MinLength,
  MaxLength,
  ArrayMinSize,
  Min,
  Max,
} from 'class-validator';

export class CreateResearchDto {
  @IsNumber()
  influencerId: number;

  @IsString()
  @MinLength(4)
  @MaxLength(20)
  timeRange: string;

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
