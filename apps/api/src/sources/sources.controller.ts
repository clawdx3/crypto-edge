import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { ApiCreatedResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SourcesService } from './sources.service';
import { CreateSourceDto } from './dto/create-source.dto';
import { UpdateSourceDto } from './dto/update-source.dto';
import { Source } from './entities/source.entity';

@ApiTags('sources')
@Controller('sources')
export class SourcesController {
  constructor(private readonly sourcesService: SourcesService) {}

  @Get()
  @ApiOperation({ summary: 'List all sources' })
  @ApiOkResponse({ type: Source, isArray: true })
  async findAll() {
    return this.sourcesService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get source by ID' })
  @ApiOkResponse({ type: Source })
  @ApiNotFoundResponse({ description: 'Source not found' })
  async findOne(@Param('id') id: string) {
    return this.sourcesService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new source' })
  @ApiCreatedResponse({ type: Source })
  async create(@Body() dto: CreateSourceDto) {
    return this.sourcesService.create(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update an existing source' })
  @ApiOkResponse({ type: Source })
  async update(@Param('id') id: string, @Body() dto: UpdateSourceDto) {
    return this.sourcesService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a source' })
  @ApiOkResponse({ description: 'Source deleted successfully' })
  async remove(@Param('id') id: string) {
    await this.sourcesService.remove(id);
  }
}
