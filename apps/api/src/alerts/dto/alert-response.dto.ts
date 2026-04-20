import { ApiProperty } from '@nestjs/swagger';
import { AlertSeverity, AlertType } from '@crypto-edge/shared';

export class AlertResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: AlertType })
  type!: AlertType;

  @ApiProperty({ enum: AlertSeverity })
  severity!: AlertSeverity;

  @ApiProperty()
  title!: string;

  @ApiProperty({ example: '2026-04-20T05:10:00.000Z' })
  createdAt!: string;
}
