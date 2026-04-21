import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCatalystDto } from './dto/create-catalyst.dto';
import { UpdateCatalystDto } from './dto/update-catalyst.dto';
import { Catalyst } from './entities/catalyst.entity';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';

@Injectable()
export class CatalystsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(pagination: PaginationQueryDto): Promise<{ data: Catalyst[]; total: number }> {
    const { page = 1, limit = 20 } = pagination;
    const skip = (page - 1) * limit;

    const [catalysts, total] = await Promise.all([
      this.prisma.catalyst.findMany({
        skip,
        take: limit,
        orderBy: { rankScore: 'desc' },
        include: { asset: true },
      }),
      this.prisma.catalyst.count(),
    ]);

    return { data: catalysts as unknown as Catalyst[], total };
  }

  async findOne(id: string): Promise<Catalyst> {
    const catalyst = await this.prisma.catalyst.findUnique({
      where: { id },
      include: { asset: true },
    });
    if (!catalyst) {
      throw new NotFoundException(`Catalyst with id ${id} not found`);
    }
    return catalyst as unknown as Catalyst;
  }

  async create(dto: CreateCatalystDto): Promise<Catalyst> {
    return this.prisma.catalyst.create({
      data: {
        assetId: dto.assetId,
        type: dto.type as any,
        title: dto.title,
        description: dto.description,
        sourceUrl: dto.sourceUrl,
        sourceName: dto.sourceName,
        effectiveAt: new Date(dto.effectiveAt),
        status: dto.status as any,
        impactScore: dto.impactScore ?? 50,
        confidenceScore: dto.confidenceScore ?? 50,
        urgencyScore: dto.urgencyScore ?? 50,
        rankScore: 0,
        isManual: dto.isManual ?? true,
      },
    }) as unknown as Catalyst;
  }

  async update(id: string, dto: UpdateCatalystDto): Promise<Catalyst> {
    const catalyst = await this.prisma.catalyst.update({
      where: { id },
      data: {
        ...dto,
        type: dto.type as any,
        status: dto.status as any,
        effectiveAt: dto.effectiveAt ? new Date(dto.effectiveAt) : undefined,
      },
    });
    return catalyst as unknown as Catalyst;
  }

  async remove(id: string): Promise<void> {
    await this.prisma.catalyst.delete({ where: { id } });
  }

  async recalculate(id: string): Promise<{ message: string }> {
    const catalyst = await this.findOne(id);
    // Placeholder: scoring logic would go here
    return { message: `Recalculation triggered for catalyst ${id}: ${catalyst.title}` };
  }
}
