import { ApiProperty } from '@nestjs/swagger';
import { ConvictionLevel, PositionStatus } from '@crypto-edge/shared';

export class PositionResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  assetSymbol!: string;

  @ApiProperty({ enum: PositionStatus })
  status!: PositionStatus;

  @ApiProperty({ enum: ConvictionLevel })
  conviction!: ConvictionLevel;

  @ApiProperty({ nullable: true })
  nextReviewAt!: string | null;
}
