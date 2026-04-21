import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ShadowWalletsService } from './shadow-wallets.service';
import { CreateShadowWalletDto } from './dto/create-shadow-wallet.dto';
import { UpdateShadowWalletDto } from './dto/update-shadow-wallet.dto';
import { ShadowWalletResponseDto } from './dto/shadow-wallet-response.dto';
import { ShadowPositionQueryDto } from './dto/shadow-position-query.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';

@ApiTags('shadow-wallets')
@Controller('shadow-wallets')
export class ShadowWalletsController {
  constructor(private readonly shadowWalletsService: ShadowWalletsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new tracked shadow wallet' })
  @ApiCreatedResponse({ type: ShadowWalletResponseDto })
  async create(@Body() dto: CreateShadowWalletDto) {
    return this.shadowWalletsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List shadow wallets with optional filters' })
  @ApiOkResponse({ type: ShadowWalletResponseDto, isArray: true })
  async findAll(
    @Query() pagination: PaginationQueryDto,
    @Query('chain') chain?: string,
    @Query('category') category?: string,
    @Query('isActive') isActive?: string,
  ) {
    const parsedIsActive: boolean | undefined =
      isActive === undefined ? undefined : isActive === 'true' || isActive === '1';
    return this.shadowWalletsService.findAll(pagination, {
      chain,
      category,
      isActive: parsedIsActive,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single shadow wallet with positions' })
  @ApiOkResponse({ type: ShadowWalletResponseDto })
  @ApiNotFoundResponse({ description: 'Shadow wallet not found' })
  async findOne(@Param('id') id: string) {
    return this.shadowWalletsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a shadow wallet' })
  @ApiOkResponse({ type: ShadowWalletResponseDto })
  async update(@Param('id') id: string, @Body() dto: UpdateShadowWalletDto) {
    return this.shadowWalletsService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft-delete a shadow wallet (set isActive=false)' })
  @ApiOkResponse({ type: ShadowWalletResponseDto })
  async remove(@Param('id') id: string) {
    return this.shadowWalletsService.softDelete(id);
  }

  @Get(':id/positions')
  @ApiOperation({ summary: 'List positions for a shadow wallet' })
  @ApiOkResponse({ description: 'Paginated list of positions' })
  async getPositions(@Param('id') id: string, @Query() query: ShadowPositionQueryDto) {
    return this.shadowWalletsService.getPositions(id, query);
  }

  @Post(':id/sync')
  @ApiOperation({ summary: 'Manually sync positions for a shadow wallet from DexScreener' })
  @ApiOkResponse({ description: 'Sync result summary' })
  async sync(@Param('id') id: string) {
    return this.shadowWalletsService.syncWalletPositions(id);
  }
}
