import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class SyncIngestionDto {
  @ApiPropertyOptional({ description: 'Specific wallet ID to sync' })
  @IsOptional()
  @IsString()
  walletId?: string;

  @ApiPropertyOptional({ description: 'Force sync even if recently synced' })
  @IsOptional()
  force?: boolean;
}
