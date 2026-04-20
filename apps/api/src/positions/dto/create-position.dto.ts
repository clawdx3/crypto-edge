import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEnum, IsOptional, IsInt, IsDateString, IsNumber } from 'class-validator';
import { ConvictionLevel, PositionStatus } from '@crypto-edge/shared';

export class CreatePositionDto {
  @ApiProperty()
  @IsString()
  assetId!: string;

  @ApiProperty({ enum: PositionStatus, default: PositionStatus.WATCHLIST })
  @IsOptional()
  @IsEnum(PositionStatus)
  status?: PositionStatus;

  @ApiProperty({ example: 'L2 adoption thesis' })
  @IsString()
  thesis!: string;

  @ApiProperty({ example: 'Technical breakout on high timeframe' })
  @IsString()
  entryReason!: string;

  @ApiProperty({ example: 'Loss of bullish structure below key support' })
  @IsString()
  invalidation!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  catalystWindowStart?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  catalystWindowEnd?: string;

  @ApiProperty({ default: 10 })
  @IsOptional()
  @IsNumber()
  maxSizePct?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  entryPrice?: number;

  @ApiProperty({ enum: ConvictionLevel, default: ConvictionLevel.MEDIUM })
  @IsOptional()
  @IsEnum(ConvictionLevel)
  currentConviction?: ConvictionLevel;

  @ApiProperty({ default: 7 })
  @IsOptional()
  @IsInt()
  reviewFrequencyDays?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}
