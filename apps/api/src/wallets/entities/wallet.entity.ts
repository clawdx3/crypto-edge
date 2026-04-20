import { ApiProperty } from '@nestjs/swagger';
import { WalletCategory } from '@crypto-edge/shared';

export class Wallet {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  address!: string;

  @ApiProperty()
  label!: string;

  @ApiProperty()
  chain!: string;

  @ApiProperty({ enum: WalletCategory })
  category!: WalletCategory;

  @ApiProperty({ nullable: true })
  notes!: string | null;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
