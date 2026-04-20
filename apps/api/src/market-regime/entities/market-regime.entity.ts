import { ApiProperty } from '@nestjs/swagger';
import { RegimeLabel } from '@crypto-edge/shared';

export class MarketRegime {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  capturedAt!: Date;

  @ApiProperty()
  btcTrendScore!: number;

  @ApiProperty()
  ethTrendScore!: number;

  @ApiProperty()
  stablecoinFlowScore!: number;

  @ApiProperty()
  tvlScore!: number;

  @ApiProperty()
  fundingScore!: number;

  @ApiProperty()
  openInterestScore!: number;

  @ApiProperty()
  volatilityScore!: number;

  @ApiProperty()
  totalScore!: number;

  @ApiProperty({ enum: RegimeLabel })
  label!: RegimeLabel;

  @ApiProperty({ nullable: true })
  notes!: string | null;

  @ApiProperty()
  createdAt!: Date;
}
