import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, IsBoolean } from 'class-validator';

export class CreateShadowPositionDto {
  @ApiProperty({ example: 'cuid...' })
  @IsString()
  shadowWalletId!: string;

  @ApiProperty({ example: '0xTokenAddr...' })
  @IsString()
  tokenAddress!: string;

  @ApiProperty({ example: 'PEPE' })
  @IsString()
  tokenSymbol!: string;

  @ApiProperty({ example: 'ethereum', default: 'ethereum' })
  @IsString()
  chain!: string;

  @ApiPropertyOptional({ example: 0.0012 })
  @IsOptional()
  @IsNumber()
  entryPrice?: number;

  @ApiPropertyOptional({ example: 0.0015 })
  @IsOptional()
  @IsNumber()
  currentPrice?: number;

  @ApiPropertyOptional({ example: 1000000 })
  @IsOptional()
  @IsNumber()
  amountHolding?: number;

  @ApiPropertyOptional({ example: 1500 })
  @IsOptional()
  @IsNumber()
  usdValue?: number;

  @ApiPropertyOptional({ example: 'active', default: 'active' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ example: 'Found via DexScreener scan' })
  @IsOptional()
  @IsString()
  notes?: string;
}
