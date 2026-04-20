import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IngestionStatusDto } from './dto/ingestion-status.dto';
import { IngestionService } from './ingestion.service';

@ApiTags('ingestion')
@Controller('ingestion')
export class IngestionController {
  constructor(private readonly ingestionService: IngestionService) {}

  @Get('status')
  @ApiOperation({ summary: 'Inspect ingestion scaffold status' })
  @ApiOkResponse({ type: IngestionStatusDto })
  getStatus(): IngestionStatusDto {
    return this.ingestionService.getStatus();
  }
}
