import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsEnum, IsOptional, IsBoolean, IsInt } from 'class-validator';
import { SourceKind } from '@crypto-edge/shared';

export class UpdateSourceDto {
  @ApiPropertyOptional({ example: 'CoinGecko' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ enum: SourceKind })
  @IsOptional()
  @IsEnum(SourceKind)
  kind?: SourceKind;

  @ApiPropertyOptional({ example: 'https://api.coingecko.com' })
  @IsOptional()
  @IsString()
  baseUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;

  @ApiPropertyOptional({ default: 60 })
  @IsOptional()
  @IsInt()
  rateLimitPerMin?: number;
}
