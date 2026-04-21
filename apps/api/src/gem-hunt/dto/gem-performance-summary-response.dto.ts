import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GemRoiSummaryDto {
  @ApiProperty()
  tokenAddress!: string;

  @ApiProperty()
  chain!: string;

  @ApiProperty()
  tokenName!: string | null;

  @ApiProperty()
  detectedAt!: Date;

  @ApiPropertyOptional()
  detectedPrice?: string | null;

  @ApiPropertyOptional()
  detectedMarketCap?: string | null;

  @ApiPropertyOptional()
  latestPrice?: number;

  @ApiPropertyOptional()
  latestMarketCap?: number;

  @ApiPropertyOptional({ description: 'ROI percentage from detection to latest snapshot' })
  roiPct?: number;

  @ApiPropertyOptional({ description: 'Number of snapshots taken' })
  snapshotCount?: number;
}

export class GemPerformanceSummaryResponseDto {
  @ApiProperty({ description: 'Timestamp of summary generation' })
  generatedAt!: Date;

  @ApiProperty({ description: 'Total gems currently being tracked' })
  totalTracked!: number;

  @ApiProperty({ description: 'Gems with positive ROI' })
  positiveRoiCount!: number;

  @ApiProperty({ description: 'Average ROI across all tracked gems' })
  avgRoiPct!: number;

  @ApiProperty({ type: [GemRoiSummaryDto] })
  gems!: GemRoiSummaryDto[];
}
