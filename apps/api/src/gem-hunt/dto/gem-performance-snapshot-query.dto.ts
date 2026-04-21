import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsISO8601 } from 'class-validator';

export class GemPerformanceSnapshotQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  tokenAddress?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  chain?: string;

  @ApiPropertyOptional({ description: 'ISO date string for start of range' })
  @IsOptional()
  @IsISO8601()
  from?: string;

  @ApiPropertyOptional({ description: 'ISO date string for end of range' })
  @IsOptional()
  @IsISO8601()
  to?: string;

  @ApiPropertyOptional({ default: '20' })
  @IsOptional()
  limit?: string;
}
