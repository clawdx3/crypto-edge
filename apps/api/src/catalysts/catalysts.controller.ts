import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { ApiCreatedResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { CatalystsService } from './catalysts.service';
import { CreateCatalystDto } from './dto/create-catalyst.dto';
import { UpdateCatalystDto } from './dto/update-catalyst.dto';
import { Catalyst } from './entities/catalyst.entity';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';

@ApiTags('catalysts')
@Controller('catalysts')
export class CatalystsController {
  constructor(
    private readonly catalystsService: CatalystsService,
    @InjectQueue('scoring') private readonly scoringQueue: Queue,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List all catalysts with pagination' })
  @ApiOkResponse({ description: 'Paginated list of catalysts' })
  async findAll(@Query() pagination: PaginationQueryDto) {
    return this.catalystsService.findAll(pagination);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get catalyst by ID' })
  @ApiOkResponse({ type: Catalyst })
  @ApiNotFoundResponse({ description: 'Catalyst not found' })
  async findOne(@Param('id') id: string) {
    return this.catalystsService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new catalyst' })
  @ApiCreatedResponse({ type: Catalyst })
  async create(@Body() dto: CreateCatalystDto) {
    return this.catalystsService.create(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update an existing catalyst' })
  @ApiOkResponse({ type: Catalyst })
  async update(@Param('id') id: string, @Body() dto: UpdateCatalystDto) {
    return this.catalystsService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a catalyst' })
  @ApiOkResponse({ description: 'Catalyst deleted successfully' })
  async remove(@Param('id') id: string) {
    await this.catalystsService.remove(id);
  }

  @Post(':id/recalculate')
  @ApiOperation({ summary: 'Recalculate catalyst scores' })
  @ApiOkResponse({ description: 'Recalculation triggered' })
  async recalculate(@Param('id') id: string) {
    // Enqueue BullMQ job for async processing
    await this.scoringQueue.add('recalculate-catalyst-rank', { catalystId: id });
    const catalyst = await this.catalystsService.findOne(id);
    return { message: `Recalculation job enqueued for catalyst: ${catalyst.title}`, catalystId: id };
  }
}
