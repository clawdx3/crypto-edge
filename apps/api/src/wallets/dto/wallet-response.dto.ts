import { ApiProperty } from '@nestjs/swagger';
import { WalletCategory } from '@crypto-edge/shared';

export class WalletResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  label!: string;

  @ApiProperty()
  address!: string;

  @ApiProperty()
  chain!: string;

  @ApiProperty({ enum: WalletCategory })
  category!: WalletCategory;

  @ApiProperty({ minimum: 0, maximum: 100, example: 81 })
  signalScore!: number;
}
