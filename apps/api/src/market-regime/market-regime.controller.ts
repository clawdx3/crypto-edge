import { Controller, Get, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { MarketRegimeService } from './market-regime.service';
import { MarketRegimeResponseDto } from './dto/market-regime-response.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';

@ApiTags('market-regime')
@Controller('market-regime')
export class MarketRegimeController {
  constructor(private readonly marketRegimeService: MarketRegimeService) {}

  @Get('current')
  @ApiOperation({ summary: 'Get the latest market regime snapshot' })
  @ApiOkResponse({ type: MarketRegimeResponseDto })
  async getCurrent() {
    return this.marketRegimeService.getCurrent();
  }

  @Get('history')
  @ApiOperation({ summary: 'Get market regime history' })
  @ApiOkResponse({ description: 'Paginated history of regime snapshots' })
  async getHistory(@Query() pagination: PaginationQueryDto) {
    return this.marketRegimeService.getHistory(pagination);
  }
}
