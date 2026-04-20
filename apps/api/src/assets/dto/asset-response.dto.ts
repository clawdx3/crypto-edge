import { ApiProperty } from '@nestjs/swagger';
import { AssetCategory } from '@crypto-edge/shared';

export class AssetResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  symbol!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  chain!: string;

  @ApiProperty({ enum: AssetCategory })
  category!: AssetCategory;

  @ApiProperty()
  isActive!: boolean;
}
