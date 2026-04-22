import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import axios from 'axios';
import { PrismaService } from '../prisma/prisma.service';
import { CreateShadowWalletDto } from './dto/create-shadow-wallet.dto';
import { UpdateShadowWalletDto } from './dto/update-shadow-wallet.dto';
import { CreateShadowPositionDto } from './dto/create-shadow-position.dto';
import { ShadowPositionQueryDto } from './dto/shadow-position-query.dto';
import { ShadowWalletListQueryDto } from './dto/shadow-wallet-list-query.dto';
import { getBalanceFetcher } from './balance-fetchers/balance-fetcher.factory';
import { IBalanceFetcher } from './balance-fetchers/balance-fetcher.interface';

import { ShadowWallet, ShadowPosition, Prisma } from '@prisma/client';

@Injectable()
export class ShadowWalletsService {
  private readonly logger = new Logger(ShadowWalletsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** ─── CRUD ─── */

  async create(dto: CreateShadowWalletDto): Promise<ShadowWallet> {
    return this.prisma.shadowWallet.create({
      data: {
        address: dto.address,
        label: dto.label,
        chain: dto.chain ?? 'ethereum',
        alias: dto.alias ?? null,
        category: dto.category ?? 'unknown',
        notes: dto.notes ?? null,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async findAll(query: ShadowWalletListQueryDto) {
    const { page = 1, limit = 20, chain, category, isActive } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.ShadowWalletWhereInput = {};
    if (chain) where.chain = chain;
    if (category) where.category = category;
    if (isActive !== undefined) where.isActive = isActive;

    const [data, total] = await Promise.all([
      this.prisma.shadowWallet.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
      this.prisma.shadowWallet.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async findOne(id: string): Promise<ShadowWallet & { positions: ShadowPosition[] }> {
    const wallet = await this.prisma.shadowWallet.findUnique({
      where: { id },
      include: { positions: { orderBy: { firstSeenAt: 'desc' } } },
    });
    if (!wallet) throw new NotFoundException(`ShadowWallet ${id} not found`);
    return wallet;
  }

  async update(id: string, dto: UpdateShadowWalletDto): Promise<ShadowWallet> {
    return this.prisma.shadowWallet.update({
      where: { id },
      data: {
        ...dto,
        updatedAt: new Date(),
      },
    });
  }

  async softDelete(id: string): Promise<ShadowWallet> {
    return this.prisma.shadowWallet.update({
      where: { id },
      data: { isActive: false, updatedAt: new Date() },
    });
  }

  /** ─── Positions helpers ─── */

  async getPositions(walletId: string, query: ShadowPositionQueryDto) {
    const { page = 1, limit = 20, chain, status, isNew } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.ShadowPositionWhereInput = { shadowWalletId: walletId };
    if (chain) where.chain = chain;
    if (status) where.status = status;
    if (isNew !== undefined) where.isNew = isNew;

    const [data, total] = await Promise.all([
      this.prisma.shadowPosition.findMany({ where, skip, take: limit, orderBy: { firstSeenAt: 'desc' } }),
      this.prisma.shadowPosition.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async upsertPosition(dto: CreateShadowPositionDto): Promise<ShadowPosition> {
    const existing = await this.prisma.shadowPosition.findFirst({
      where: { shadowWalletId: dto.shadowWalletId, tokenAddress: dto.tokenAddress },
    });

    if (existing) {
      return this.prisma.shadowPosition.update({
        where: { id: existing.id },
        data: {
          tokenSymbol: dto.tokenSymbol,
          chain: dto.chain ?? existing.chain,
          entryPrice: dto.entryPrice ?? existing.entryPrice,
          currentPrice: dto.currentPrice ?? existing.currentPrice,
          amountHolding: dto.amountHolding ?? existing.amountHolding,
          usdValue: dto.usdValue ?? existing.usdValue,
          status: dto.status ?? existing.status,
          notes: dto.notes ?? existing.notes,
          isNew: false,
          lastUpdatedAt: new Date(),
        },
      });
    }

    return this.prisma.shadowPosition.create({
      data: {
        shadowWalletId: dto.shadowWalletId,
        tokenAddress: dto.tokenAddress,
        tokenSymbol: dto.tokenSymbol,
        chain: dto.chain ?? 'ethereum',
        entryPrice: dto.entryPrice ?? null,
        currentPrice: dto.currentPrice ?? null,
        amountHolding: dto.amountHolding ?? null,
        usdValue: dto.usdValue ?? null,
        status: dto.status ?? 'active',
        notes: dto.notes ?? null,
        isNew: true,
      },
    });
  }

  /** ─── On-chain balance sync ─── */

  async syncWalletPositions(walletId: string): Promise<{
    walletId: string;
    newPositions: number;
    updatedPositions: number;
    holdingsFound: number;
  }> {
    const wallet = await this.prisma.shadowWallet.findUnique({ where: { id: walletId } });
    if (!wallet) throw new NotFoundException(`ShadowWallet ${walletId} not found`);

    let holdings: import('./balance-fetchers/balance-fetcher.interface').WalletTokenHolding[] = [];
    try {
      const fetcher = getBalanceFetcher(wallet.chain);
      holdings = await fetcher.fetchHoldings(wallet.address);
    } catch (err: any) {
      this.logger.warn(`Balance fetch failed for ${wallet.address} (${wallet.chain}): ${err.message}`);
      return { walletId, newPositions: 0, updatedPositions: 0, holdingsFound: 0 };
    }

    let newPositions = 0;
    let updatedPositions = 0;

    for (const h of holdings) {
      const existing = await this.prisma.shadowPosition.findFirst({
        where: { shadowWalletId: walletId, tokenAddress: h.tokenAddress },
      });

      if (existing) {
        await this.prisma.shadowPosition.update({
          where: { id: existing.id },
          data: {
            amountHolding: h.balance,
            isNew: false,
            lastUpdatedAt: new Date(),
          },
        });
        updatedPositions++;
      } else {
        await this.prisma.shadowPosition.create({
          data: {
            shadowWalletId: walletId,
            tokenAddress: h.tokenAddress,
            tokenSymbol: h.symbol ?? 'UNKNOWN',
            chain: wallet.chain,
            amountHolding: h.balance,
            status: 'active',
            isNew: true,
          },
        });
        newPositions++;
      }
    }

    this.logger.log(
      `Synced ${wallet.address}: ${holdings.length} holdings, ${newPositions} new, ${updatedPositions} updated`,
    );

    return { walletId, newPositions, updatedPositions, holdingsFound: holdings.length };
  }

  async scanAllWallets(): Promise<{
    scanned: number;
    totalNew: number;
    totalUpdated: number;
    wallets: Array<{ walletId: string; newPositions: number; updatedPositions: number; holdingsFound: number }>;
  }> {
    const wallets = await this.prisma.shadowWallet.findMany({ where: { isActive: true } });
    const results: Array<{ walletId: string; newPositions: number; updatedPositions: number; holdingsFound: number }> = [];
    let totalNew = 0;
    let totalUpdated = 0;

    for (const wallet of wallets) {
      try {
        const res = await this.syncWalletPositions(wallet.id);
        results.push(res);
        totalNew += res.newPositions;
        totalUpdated += res.updatedPositions;
      } catch (err: any) {
        this.logger.warn(`scanAllWallets error for ${wallet.id}: ${err.message}`);
      }
    }

    this.logger.log(`scanAllWallets complete: ${wallets.length} wallets, ${totalNew} new positions`);

    return { scanned: wallets.length, totalNew, totalUpdated, wallets: results };
  }
}
