import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsEnum, IsOptional, IsBoolean } from 'class-validator';
import { AssetCategory } from '@crypto-edge/shared';

export class UpdateAssetDto {
  @ApiPropertyOptional({ example: 'ETH' })
  @IsOptional()
  @IsString()
  symbol?: string;

  @ApiPropertyOptional({ example: 'Ethereum' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'ethereum' })
  @IsOptional()
  @IsString()
  chain?: string;

  @ApiPropertyOptional({ example: '0x...' })
  @IsOptional()
  @IsString()
  contractAddress?: string;

  @ApiPropertyOptional({ enum: AssetCategory })
  @IsOptional()
  @IsEnum(AssetCategory)
  category?: AssetCategory;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
