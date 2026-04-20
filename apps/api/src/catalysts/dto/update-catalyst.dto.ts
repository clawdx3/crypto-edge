import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsEnum, IsOptional, IsBoolean, IsInt, IsDateString } from 'class-validator';
import { CatalystStatus, CatalystType } from '@crypto-edge/shared';

export class UpdateCatalystDto {
  @ApiPropertyOptional({ enum: CatalystType })
  @IsOptional()
  @IsEnum(CatalystType)
  type?: CatalystType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sourceUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sourceName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  effectiveAt?: string;

  @ApiPropertyOptional({ enum: CatalystStatus })
  @IsOptional()
  @IsEnum(CatalystStatus)
  status?: CatalystStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  impactScore?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  confidenceScore?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  urgencyScore?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isManual?: boolean;
}
