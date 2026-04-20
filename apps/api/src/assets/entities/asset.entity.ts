import { ApiProperty } from '@nestjs/swagger';
import { AssetCategory } from '@crypto-edge/shared';

export class Asset {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  symbol!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  chain!: string;

  @ApiProperty({ nullable: true })
  contractAddress!: string | null;

  @ApiProperty({ enum: AssetCategory })
  category!: AssetCategory;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
