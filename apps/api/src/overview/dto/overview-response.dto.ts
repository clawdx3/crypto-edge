import { ApiProperty } from '@nestjs/swagger';
import { AlertResponseDto } from '../../alerts/dto/alert-response.dto';
import { CatalystResponseDto } from '../../catalysts/dto/catalyst-response.dto';
import { MarketRegimeResponseDto } from '../../market-regime/dto/market-regime-response.dto';
import { WalletResponseDto } from '../../wallets/dto/wallet-response.dto';

export class OverviewResponseDto {
  @ApiProperty({ type: MarketRegimeResponseDto })
  regime!: MarketRegimeResponseDto;

  @ApiProperty({ type: CatalystResponseDto, isArray: true })
  catalysts!: CatalystResponseDto[];

  @ApiProperty({ type: WalletResponseDto, isArray: true })
  wallets!: WalletResponseDto[];

  @ApiProperty({ type: AlertResponseDto, isArray: true })
  alerts!: AlertResponseDto[];
}
