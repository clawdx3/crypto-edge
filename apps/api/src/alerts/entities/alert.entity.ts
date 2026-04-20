import { ApiProperty } from '@nestjs/swagger';
import { AlertSeverity, AlertStatus, AlertType } from '@crypto-edge/shared';

export class Alert {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: AlertType })
  type!: AlertType;

  @ApiProperty({ enum: AlertSeverity })
  severity!: AlertSeverity;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  body!: string;

  @ApiProperty({ nullable: true })
  entityType!: string | null;

  @ApiProperty({ nullable: true })
  entityId!: string | null;

  @ApiProperty()
  dedupeKey!: string;

  @ApiProperty({ enum: AlertStatus })
  status!: AlertStatus;

  @ApiProperty({ nullable: true })
  sentAt!: Date | null;

  @ApiProperty()
  createdAt!: Date;
}
