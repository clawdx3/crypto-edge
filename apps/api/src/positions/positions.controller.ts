import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { ApiCreatedResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PositionsService } from './positions.service';
import { CreatePositionDto } from './dto/create-position.dto';
import { UpdatePositionDto } from './dto/update-position.dto';
import { Position } from './entities/position.entity';
import { PositionListQueryDto } from './dto/position-list-query.dto';

@ApiTags('positions')
@Controller('positions')
export class PositionsController {
  constructor(
    private readonly positionsService: PositionsService,
    @InjectQueue('scoring') private readonly scoringQueue: Queue,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List all positions with pagination and filters' })
  @ApiOkResponse({ description: 'Paginated list of positions' })
  async findAll(@Query() query: PositionListQueryDto) {
    return this.positionsService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get position by ID' })
  @ApiOkResponse({ type: Position })
  @ApiNotFoundResponse({ description: 'Position not found' })
  async findOne(@Param('id') id: string) {
    return this.positionsService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new position' })
  @ApiCreatedResponse({ type: Position })
  async create(@Body() dto: CreatePositionDto) {
    return this.positionsService.create(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update an existing position' })
  @ApiOkResponse({ type: Position })
  async update(@Param('id') id: string, @Body() dto: UpdatePositionDto) {
    return this.positionsService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a position' })
  @ApiOkResponse({ description: 'Position deleted successfully' })
  async remove(@Param('id') id: string) {
    await this.positionsService.remove(id);
  }

  @Post(':id/archive')
  @ApiOperation({ summary: 'Archive a position' })
  @ApiOkResponse({ description: 'Position archived successfully' })
  async archive(@Param('id') id: string) {
    return this.positionsService.archive(id);
  }

  @Post(':id/review')
  @ApiOperation({ summary: 'Mark position as reviewed' })
  @ApiOkResponse({ description: 'Position reviewed successfully' })
  async review(@Param('id') id: string) {
    return this.positionsService.review(id);
  }

  @Post(':id/recalculate')
  @ApiOperation({ summary: 'Recalculate position risk score' })
  @ApiOkResponse({ description: 'Recalculation triggered' })
  async recalculate(@Param('id') id: string) {
    // Enqueue BullMQ job for async processing
    await this.scoringQueue.add('recalculate-position-risk', { positionId: id });
    const position = await this.positionsService.findOne(id);
    return { message: `Recalculation job enqueued for position: ${position.id}`, positionId: id };
  }
}
