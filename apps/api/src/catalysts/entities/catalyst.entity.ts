import { ApiProperty } from '@nestjs/swagger';
import { CatalystStatus, CatalystType } from '@crypto-edge/shared';

export class Catalyst {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  assetId!: string;

  @ApiProperty({ enum: CatalystType })
  type!: CatalystType;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  description!: string;

  @ApiProperty({ nullable: true })
  sourceUrl!: string | null;

  @ApiProperty({ nullable: true })
  sourceName!: string | null;

  @ApiProperty()
  detectedAt!: Date;

  @ApiProperty()
  effectiveAt!: Date;

  @ApiProperty({ enum: CatalystStatus })
  status!: CatalystStatus;

  @ApiProperty()
  impactScore!: number;

  @ApiProperty()
  confidenceScore!: number;

  @ApiProperty()
  urgencyScore!: number;

  @ApiProperty()
  rankScore!: number;

  @ApiProperty()
  isManual!: boolean;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
