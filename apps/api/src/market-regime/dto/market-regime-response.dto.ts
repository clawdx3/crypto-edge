import { ApiProperty } from '@nestjs/swagger';
import { RegimeLabel } from '@crypto-edge/shared';

export class MarketRegimeResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ example: '2026-04-20T05:00:00.000Z' })
  capturedAt!: string;

  @ApiProperty({ enum: RegimeLabel })
  label!: RegimeLabel;

  @ApiProperty({ minimum: -100, maximum: 100, example: 18 })
  totalScore!: number;

  @ApiProperty({ nullable: true })
  notes!: string | null;
}
