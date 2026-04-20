import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { OverviewResponseDto } from './dto/overview-response.dto';
import { OverviewService } from './overview.service';

@ApiTags('overview')
@Controller('overview')
export class OverviewController {
  constructor(private readonly overviewService: OverviewService) {}

  @Get()
  @ApiOperation({ summary: 'Get dashboard overview placeholder data' })
  @ApiOkResponse({ type: OverviewResponseDto })
  getOverview(): OverviewResponseDto {
    const overview = this.overviewService.getOverview();

    return {
      regime: {
        id: 'regime-current',
        capturedAt: new Date().toISOString(),
        label: overview.regime.label,
        totalScore: overview.regime.totalScore,
        notes: 'Overview response uses scaffold data.',
      },
      catalysts: overview.catalysts,
      wallets: overview.wallets,
      alerts: overview.alerts,
    };
  }
}
