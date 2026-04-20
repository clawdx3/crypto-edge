import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CalculateScoreDto {
  @ApiPropertyOptional({ description: 'Entity ID to score (wallet, position, catalyst)' })
  @IsOptional()
  @IsString()
  entityId?: string;

  @ApiPropertyOptional({ description: 'Type of scoring to perform' })
  @IsOptional()
  @IsString()
  scoringType?: 'regime' | 'catalyst' | 'wallet' | 'position';
}
