import { ApiProperty } from '@nestjs/swagger';
import { ConvictionLevel, PositionStatus } from '@crypto-edge/shared';

export class Position {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  assetId!: string;

  @ApiProperty({ enum: PositionStatus })
  status!: PositionStatus;

  @ApiProperty()
  thesis!: string;

  @ApiProperty()
  entryReason!: string;

  @ApiProperty()
  invalidation!: string;

  @ApiProperty({ nullable: true })
  catalystWindowStart!: Date | null;

  @ApiProperty({ nullable: true })
  catalystWindowEnd!: Date | null;

  @ApiProperty()
  maxSizePct!: number;

  @ApiProperty({ nullable: true })
  entryPrice!: number | null;

  @ApiProperty({ enum: ConvictionLevel })
  currentConviction!: ConvictionLevel;

  @ApiProperty()
  reviewFrequencyDays!: number;

  @ApiProperty({ nullable: true })
  lastReviewedAt!: Date | null;

  @ApiProperty({ nullable: true })
  nextReviewAt!: Date | null;

  @ApiProperty({ nullable: true })
  notes!: string | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
