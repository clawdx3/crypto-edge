import { Body, Controller, Get, Param, Post, Put, Query } from '@nestjs/common';
import { ApiCreatedResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AlertsService } from './alerts.service';
import { CreateAlertDto } from './dto/create-alert.dto';
import { UpdateAlertDto } from './dto/update-alert.dto';
import { Alert } from './entities/alert.entity';
import { AlertFiltersDto } from './dto/alert-filters.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';

@ApiTags('alerts')
@Controller('alerts')
export class AlertsController {
  constructor(private readonly alertsService: AlertsService) {}

  @Get()
  @ApiOperation({ summary: 'List alerts with filters and pagination' })
  @ApiOkResponse({ description: 'Paginated list of alerts' })
  async findAll(@Query() filters: AlertFiltersDto, @Query() pagination: PaginationQueryDto) {
    return this.alertsService.findAll(filters, pagination);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get alert by ID' })
  @ApiOkResponse({ type: Alert })
  @ApiNotFoundResponse({ description: 'Alert not found' })
  async findOne(@Param('id') id: string) {
    return this.alertsService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new alert' })
  @ApiCreatedResponse({ type: Alert })
  async create(@Body() dto: CreateAlertDto) {
    return this.alertsService.create(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update an existing alert' })
  @ApiOkResponse({ type: Alert })
  async update(@Param('id') id: string, @Body() dto: UpdateAlertDto) {
    return this.alertsService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an alert' })
  @ApiOkResponse({ description: 'Alert deleted successfully' })
  async remove(@Param('id') id: string) {
    await this.alertsService.remove(id);
  }

  @Post('test-daily-brief')
  @ApiOperation({ summary: 'Send test daily brief alert' })
  @ApiOkResponse({ description: 'Test daily brief sent' })
  async testDailyBrief() {
    return this.alertsService.testDailyBrief();
  }

  @Post('test-risk-alert')
  @ApiOperation({ summary: 'Send test risk alert' })
  @ApiOkResponse({ description: 'Test risk alert sent' })
  async testRiskAlert() {
    return this.alertsService.testRiskAlert();
  }
}
