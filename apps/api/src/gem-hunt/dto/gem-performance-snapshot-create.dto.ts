import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, IsISO8601 } from 'class-validator';

export class GemPerformanceSnapshotCreateDto {
  @ApiProperty({ description: 'Arbitrary gem identifier (often tokenAddress)' })
  @IsString()
  gemId!: string;

  @ApiProperty()
  @IsString()
  tokenAddress!: string;

  @ApiProperty()
  @IsString()
  chain!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsISO8601()
  snapshotAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  priceUsd?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  marketCapUsd?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  liquidityUsd?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  volume24h?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  roiPct?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
