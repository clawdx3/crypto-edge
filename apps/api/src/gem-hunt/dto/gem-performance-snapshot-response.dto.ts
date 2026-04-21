import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GemPerformanceSnapshotResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ description: 'Arbitrary gem identifier (often tokenAddress)' })
  gemId!: string;

  @ApiProperty()
  tokenAddress!: string;

  @ApiProperty()
  chain!: string;

  @ApiProperty({ type: Date })
  snapshotAt!: Date;

  @ApiPropertyOptional()
  priceUsd?: number;

  @ApiPropertyOptional()
  marketCapUsd?: number;

  @ApiPropertyOptional()
  liquidityUsd?: number;

  @ApiPropertyOptional()
  volume24h?: number;

  @ApiPropertyOptional({ description: 'ROI percentage vs detected price' })
  roiPct?: number;

  @ApiPropertyOptional()
  notes?: string;

  @ApiProperty({ type: Date })
  createdAt!: Date;
}
