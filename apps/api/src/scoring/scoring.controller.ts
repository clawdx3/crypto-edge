import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ScoringStatusDto } from './dto/scoring-status.dto';
import { ScoringService } from './scoring.service';

@ApiTags('scoring')
@Controller('scoring')
export class ScoringController {
  constructor(private readonly scoringService: ScoringService) {}

  @Get('status')
  @ApiOperation({ summary: 'Inspect scoring scaffold status' })
  @ApiOkResponse({ type: ScoringStatusDto })
  getStatus(): ScoringStatusDto {
    return this.scoringService.getStatus();
  }
}
