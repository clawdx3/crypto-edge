import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsEnum, IsOptional, IsString, Min, Max } from 'class-validator';
import { RegimeLabel } from '@crypto-edge/shared';

export class CreateMarketRegimeDto {
  @ApiProperty()
  @IsInt()
  capturedAt!: Date;

  @ApiProperty({ minimum: -100, maximum: 100 })
  @IsInt()
  @Min(-100)
  @Max(100)
  btcTrendScore!: number;

  @ApiProperty({ minimum: -100, maximum: 100 })
  @IsInt()
  @Min(-100)
  @Max(100)
  ethTrendScore!: number;

  @ApiProperty({ minimum: -100, maximum: 100 })
  @IsInt()
  @Min(-100)
  @Max(100)
  stablecoinFlowScore!: number;

  @ApiProperty({ minimum: -100, maximum: 100 })
  @IsInt()
  @Min(-100)
  @Max(100)
  tvlScore!: number;

  @ApiProperty({ minimum: -100, maximum: 100 })
  @IsInt()
  @Min(-100)
  @Max(100)
  fundingScore!: number;

  @ApiProperty({ minimum: -100, maximum: 100 })
  @IsInt()
  @Min(-100)
  @Max(100)
  openInterestScore!: number;

  @ApiProperty({ minimum: -100, maximum: 100 })
  @IsInt()
  @Min(-100)
  @Max(100)
  volatilityScore!: number;

  @ApiProperty({ enum: RegimeLabel })
  @IsEnum(RegimeLabel)
  label!: RegimeLabel;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}
