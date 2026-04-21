import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ShadowPositionResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  shadowWalletId!: string;

  @ApiProperty()
  tokenAddress!: string;

  @ApiProperty()
  tokenSymbol!: string;

  @ApiProperty()
  chain!: string;

  @ApiPropertyOptional()
  entryPrice!: number | null;

  @ApiPropertyOptional()
  currentPrice!: number | null;

  @ApiPropertyOptional()
  amountHolding!: number | null;

  @ApiPropertyOptional()
  usdValue!: number | null;

  @ApiProperty()
  status!: string;

  @ApiProperty()
  firstSeenAt!: Date;

  @ApiProperty()
  lastUpdatedAt!: Date;

  @ApiProperty()
  isNew!: boolean;

  @ApiPropertyOptional()
  notes!: string | null;
}
