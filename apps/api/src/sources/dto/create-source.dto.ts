import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEnum, IsOptional, IsBoolean, IsInt } from 'class-validator';
import { SourceKind } from '@crypto-edge/shared';

export class CreateSourceDto {
  @ApiProperty({ example: 'CoinGecko' })
  @IsString()
  name!: string;

  @ApiProperty({ enum: SourceKind })
  @IsEnum(SourceKind)
  kind!: SourceKind;

  @ApiProperty({ required: false, example: 'https://api.coingecko.com' })
  @IsOptional()
  @IsString()
  baseUrl?: string;

  @ApiProperty({ default: true })
  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;

  @ApiProperty({ required: false, default: 60 })
  @IsOptional()
  @IsInt()
  rateLimitPerMin?: number;
}
