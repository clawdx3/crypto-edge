import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsEnum, IsOptional, IsInt, IsDateString, IsNumber } from 'class-validator';
import { ConvictionLevel, PositionStatus } from '@crypto-edge/shared';

export class UpdatePositionDto {
  @ApiPropertyOptional({ enum: PositionStatus })
  @IsOptional()
  @IsEnum(PositionStatus)
  status?: PositionStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  thesis?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  entryReason?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  invalidation?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  catalystWindowStart?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  catalystWindowEnd?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  maxSizePct?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  entryPrice?: number;

  @ApiPropertyOptional({ enum: ConvictionLevel })
  @IsOptional()
  @IsEnum(ConvictionLevel)
  currentConviction?: ConvictionLevel;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  reviewFrequencyDays?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  lastReviewedAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  nextReviewAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
