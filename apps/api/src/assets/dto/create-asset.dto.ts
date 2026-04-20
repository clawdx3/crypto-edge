import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEnum, IsOptional, IsBoolean } from 'class-validator';
import { AssetCategory } from '@crypto-edge/shared';

export class CreateAssetDto {
  @ApiProperty({ example: 'ETH' })
  @IsString()
  symbol!: string;

  @ApiProperty({ example: 'Ethereum' })
  @IsString()
  name!: string;

  @ApiProperty({ example: 'ethereum' })
  @IsString()
  chain!: string;

  @ApiProperty({ required: false, example: '0x...' })
  @IsOptional()
  @IsString()
  contractAddress?: string;

  @ApiProperty({ enum: AssetCategory })
  @IsEnum(AssetCategory)
  category!: AssetCategory;

  @ApiProperty({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
