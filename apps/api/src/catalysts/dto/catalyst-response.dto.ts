import { ApiProperty } from '@nestjs/swagger';
import { CatalystStatus, CatalystType } from '@crypto-edge/shared';

export class CatalystResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  assetSymbol!: string;

  @ApiProperty({ enum: CatalystType })
  type!: CatalystType;

  @ApiProperty({ enum: CatalystStatus })
  status!: CatalystStatus;

  @ApiProperty()
  title!: string;

  @ApiProperty({ example: '2026-04-28T12:00:00.000Z' })
  effectiveAt!: string;

  @ApiProperty({ minimum: 0, maximum: 100, example: 72 })
  rankScore!: number;
}
