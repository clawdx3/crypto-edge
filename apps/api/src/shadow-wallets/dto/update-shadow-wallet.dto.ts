import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsNumber, IsInt } from 'class-validator';

export class UpdateShadowWalletDto {
  @ApiPropertyOptional({ example: 'Smart Money Whale' })
  @IsOptional()
  @IsString()
  label?: string;

  @ApiPropertyOptional({ example: 'ethereum' })
  @IsOptional()
  @IsString()
  chain?: string;

  @ApiPropertyOptional({ example: 'whale-sigma' })
  @IsOptional()
  @IsString()
  alias?: string;

  @ApiPropertyOptional({ example: 'whale' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ example: 0.72 })
  @IsOptional()
  @IsNumber()
  winRate?: number;

  @ApiPropertyOptional({ example: 0.45 })
  @IsOptional()
  @IsNumber()
  avgRoi30d?: number;

  @ApiPropertyOptional({ example: 42 })
  @IsOptional()
  @IsInt()
  totalTrades?: number;

  @ApiPropertyOptional({ example: 'Top performer in AI tokens' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
