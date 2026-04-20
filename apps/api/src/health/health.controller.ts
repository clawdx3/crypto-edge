import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { HealthService } from './health.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get('live')
  @ApiOperation({ summary: 'Liveness probe' })
  @ApiOkResponse({ description: 'Service is alive' })
  liveness(): Promise<{ status: string }> {
    return this.healthService.liveness();
  }

  @Get('ready')
  @ApiOperation({ summary: 'Readiness probe' })
  @ApiOkResponse({ description: 'Service readiness status' })
  readiness(): Promise<{ status: string; database: boolean }> {
    return this.healthService.readiness();
  }

  @Get()
  @ApiOperation({ summary: 'Basic health check' })
  @ApiOkResponse({ description: 'Service health status' })
  check(): Promise<{ status: string }> {
    return this.healthService.liveness();
  }
}
