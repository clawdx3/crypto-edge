import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEnum, IsOptional, IsBoolean } from 'class-validator';
import { WalletCategory } from '@crypto-edge/shared';

export class CreateWalletDto {
  @ApiProperty({ example: '0x...' })
  @IsString()
  address!: string;

  @ApiProperty({ example: 'Smart Money Whale' })
  @IsString()
  label!: string;

  @ApiProperty({ example: 'ethereum' })
  @IsString()
  chain!: string;

  @ApiProperty({ enum: WalletCategory })
  @IsEnum(WalletCategory)
  category!: WalletCategory;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
