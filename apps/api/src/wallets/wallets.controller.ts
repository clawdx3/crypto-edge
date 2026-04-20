import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { ApiCreatedResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { WalletsService } from './wallets.service';
import { CreateWalletDto } from './dto/create-wallet.dto';
import { UpdateWalletDto } from './dto/update-wallet.dto';
import { Wallet } from './entities/wallet.entity';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';

@ApiTags('wallets')
@Controller('wallets')
export class WalletsController {
  constructor(
    private readonly walletsService: WalletsService,
    @InjectQueue('scoring') private readonly scoringQueue: Queue,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List all wallets with pagination' })
  @ApiOkResponse({ description: 'Paginated list of wallets' })
  async findAll(@Query() pagination: PaginationQueryDto) {
    return this.walletsService.findAll(pagination);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get wallet by ID' })
  @ApiOkResponse({ type: Wallet })
  @ApiNotFoundResponse({ description: 'Wallet not found' })
  async findOne(@Param('id') id: string) {
    return this.walletsService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new wallet' })
  @ApiCreatedResponse({ type: Wallet })
  async create(@Body() dto: CreateWalletDto) {
    return this.walletsService.create(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update an existing wallet' })
  @ApiOkResponse({ type: Wallet })
  async update(@Param('id') id: string, @Body() dto: UpdateWalletDto) {
    return this.walletsService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a wallet' })
  @ApiOkResponse({ description: 'Wallet deleted successfully' })
  async remove(@Param('id') id: string) {
    await this.walletsService.remove(id);
  }

  @Get(':id/events')
  @ApiOperation({ summary: 'Get wallet transaction events' })
  @ApiOkResponse({ description: 'Paginated wallet events' })
  async getEvents(@Param('id') id: string, @Query() pagination: PaginationQueryDto) {
    return this.walletsService.getEvents(id, pagination);
  }

  @Post(':id/recalculate')
  @ApiOperation({ summary: 'Recalculate wallet score' })
  @ApiOkResponse({ description: 'Recalculation triggered' })
  async recalculate(@Param('id') id: string) {
    // Enqueue BullMQ job for async processing
    await this.scoringQueue.add('recalculate-wallet-score', { walletId: id });
    const wallet = await this.walletsService.findOne(id);
    return { message: `Recalculation job enqueued for wallet: ${wallet.label ?? wallet.address}`, walletId: id };
  }
}
