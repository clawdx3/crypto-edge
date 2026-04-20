import { ApiProperty } from '@nestjs/swagger';
import { SourceKind } from '@crypto-edge/shared';

export class SourceResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ enum: SourceKind })
  kind!: SourceKind;

  @ApiProperty()
  isEnabled!: boolean;

  @ApiProperty({ nullable: true })
  lastSuccessfulSyncAt!: string | null;
}
