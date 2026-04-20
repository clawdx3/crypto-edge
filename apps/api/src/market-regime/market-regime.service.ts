import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MarketRegimeResponseDto } from './dto/market-regime-response.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';

@Injectable()
export class MarketRegimeService {
  constructor(private readonly prisma: PrismaService) {}

  async getCurrent(): Promise<MarketRegimeResponseDto> {
    const snapshot = await this.prisma.marketRegimeSnapshot.findFirst({
      orderBy: { capturedAt: 'desc' },
    });

    if (!snapshot) {
      return {
        id: 'pending',
        capturedAt: new Date().toISOString(),
        label: 'neutral' as const,
        totalScore: 0,
        notes: 'No regime snapshot available yet. Ingestion pipeline pending.',
      };
    }

    return snapshot as MarketRegimeResponseDto;
  }

  async getHistory(pagination: PaginationQueryDto): Promise<{ data: MarketRegimeResponseDto[]; total: number }> {
    const { page = 1, limit = 20 } = pagination;
    const skip = (page - 1) * limit;

    const [snapshots, total] = await Promise.all([
      this.prisma.marketRegimeSnapshot.findMany({
        skip,
        take: limit,
        orderBy: { capturedAt: 'desc' },
      }),
      this.prisma.marketRegimeSnapshot.count(),
    ]);

    return {
      data: snapshots as MarketRegimeResponseDto[],
      total,
    };
  }
}
