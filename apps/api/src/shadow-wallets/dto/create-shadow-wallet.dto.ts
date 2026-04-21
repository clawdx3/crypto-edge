import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsNumber, IsInt } from 'class-validator';

export class CreateShadowWalletDto {
  @ApiProperty({ example: '0x1234...' })
  @IsString()
  address!: string;

  @ApiProperty({ example: 'Smart Money Whale' })
  @IsString()
  label!: string;

  @ApiProperty({ example: 'ethereum', default: 'ethereum' })
  @IsString()
  chain!: string;

  @ApiPropertyOptional({ example: 'whale-sigma' })
  @IsOptional()
  @IsString()
  alias?: string;

  @ApiPropertyOptional({ example: 'whale', default: 'unknown' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ example: 'Top performer in AI tokens' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
