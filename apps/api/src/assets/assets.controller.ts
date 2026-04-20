import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { ApiCreatedResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AssetsService } from './assets.service';
import { CreateAssetDto } from './dto/create-asset.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';
import { AssetResponseDto } from './dto/asset-response.dto';

@ApiTags('assets')
@Controller('assets')
export class AssetsController {
  constructor(private readonly assetsService: AssetsService) {}

  @Get()
  @ApiOperation({ summary: 'List all assets with pagination' })
  @ApiOkResponse({ description: 'Paginated list of assets' })
  async findAll(@Query() pagination: PaginationQueryDto) {
    return this.assetsService.findAll(pagination);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get asset by ID' })
  @ApiOkResponse({ type: AssetResponseDto })
  @ApiNotFoundResponse({ description: 'Asset not found' })
  async findOne(@Param('id') id: string) {
    return this.assetsService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new asset' })
  @ApiCreatedResponse({ type: AssetResponseDto })
  async create(@Body() dto: CreateAssetDto) {
    return this.assetsService.create(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update an existing asset' })
  @ApiOkResponse({ type: AssetResponseDto })
  async update(@Param('id') id: string, @Body() dto: UpdateAssetDto) {
    return this.assetsService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an asset' })
  @ApiOkResponse({ description: 'Asset deleted successfully' })
  async remove(@Param('id') id: string) {
    await this.assetsService.remove(id);
  }
}
