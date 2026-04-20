import { ApiProperty } from '@nestjs/swagger';
import { SourceKind } from '@crypto-edge/shared';

export class Source {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ enum: SourceKind })
  kind!: SourceKind;

  @ApiProperty({ nullable: true })
  baseUrl!: string | null;

  @ApiProperty()
  isEnabled!: boolean;

  @ApiProperty()
  rateLimitPerMin!: number;

  @ApiProperty({ nullable: true })
  lastSyncedAt!: Date | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
