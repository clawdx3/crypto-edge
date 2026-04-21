import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWalletDto } from './dto/create-wallet.dto';
import { UpdateWalletDto } from './dto/update-wallet.dto';
import { Wallet } from './entities/wallet.entity';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { WalletCategory } from '@crypto-edge/shared';

function toWallet(raw: any): Wallet {
  return { ...raw, category: raw.category as WalletCategory, chain: raw.chain as string };
}

@Injectable()
export class WalletsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(pagination: PaginationQueryDto): Promise<{ data: Wallet[]; total: number }> {
    const { page = 1, limit = 20 } = pagination;
    const skip = (page - 1) * limit;

    const [wallets, total] = await Promise.all([
      this.prisma.wallet.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.wallet.count(),
    ]);

    return { data: wallets.map(toWallet), total };
  }

  async findOne(id: string): Promise<Wallet> {
    const wallet = await this.prisma.wallet.findUnique({
      where: { id },
      include: { scores: { orderBy: { calculatedAt: 'desc' }, take: 1 } },
    });
    if (!wallet) {
      throw new NotFoundException(`Wallet with id ${id} not found`);
    }
    return toWallet(wallet);
  }

  async create(dto: CreateWalletDto): Promise<Wallet> {
    const wallet = await this.prisma.wallet.create({
      data: {
        address: dto.address,
        label: dto.label,
        chain: dto.chain,
        category: dto.category,
        notes: dto.notes,
        isActive: dto.isActive ?? true,
      },
    });
    return toWallet(wallet);
  }

  async update(id: string, dto: UpdateWalletDto): Promise<Wallet> {
    const wallet = await this.prisma.wallet.update({
      where: { id },
      data: dto,
    });
    return toWallet(wallet);
  }

  async remove(id: string): Promise<void> {
    await this.prisma.wallet.delete({ where: { id } });
  }

  async getEvents(id: string, pagination: PaginationQueryDto): Promise<{ data: unknown[]; total: number }> {
    await this.findOne(id);
    const { page = 1, limit = 20 } = pagination;
    const skip = (page - 1) * limit;

    const [events, total] = await Promise.all([
      this.prisma.walletEvent.findMany({
        where: { walletId: id },
        skip,
        take: limit,
        orderBy: { blockTimestamp: 'desc' },
        include: { asset: true },
      }),
      this.prisma.walletEvent.count({ where: { walletId: id } }),
    ]);

    return { data: events, total };
  }
}
