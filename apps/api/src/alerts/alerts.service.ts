import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAlertDto } from './dto/create-alert.dto';
import { UpdateAlertDto } from './dto/update-alert.dto';
import { Alert } from './entities/alert.entity';
import { AlertFiltersDto } from './dto/alert-filters.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';

@Injectable()
export class AlertsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    filters: AlertFiltersDto,
    pagination: PaginationQueryDto,
  ): Promise<{ data: Alert[]; total: number }> {
    const { page = 1, limit = 20 } = pagination;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (filters.status) where.status = filters.status;
    if (filters.type) where.type = filters.type;
    if (filters.severity) where.severity = filters.severity;

    const [alerts, total] = await Promise.all([
      this.prisma.alert.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.alert.count({ where }),
    ]);

    return { data: alerts as unknown as Alert[], total };
  }

  async findOne(id: string): Promise<Alert> {
    const alert = await this.prisma.alert.findUnique({ where: { id } });
    if (!alert) {
      throw new NotFoundException(`Alert with id ${id} not found`);
    }
    return alert as unknown as Alert;
  }

  async create(dto: CreateAlertDto): Promise<Alert> {
    return this.prisma.alert.create({
      data: {
        type: dto.type,
        severity: dto.severity,
        title: dto.title,
        body: dto.body,
        entityType: dto.entityType,
        entityId: dto.entityId,
        dedupeKey: dto.dedupeKey ?? `${dto.type}-${Date.now()}`,
        status: 'pending' as any,
      },
    }) as unknown as Alert;
  }

  async update(id: string, dto: UpdateAlertDto): Promise<Alert> {
    const alert = await this.prisma.alert.update({
      where: { id },
      data: dto,
    });
    return alert as unknown as Alert;
  }

  async remove(id: string): Promise<void> {
    await this.prisma.alert.delete({ where: { id } });
  }

  async testDailyBrief(): Promise<{ message: string }> {
    return { message: 'Daily brief test triggered (scaffold)' };
  }

  async testRiskAlert(): Promise<{ message: string }> {
    return { message: 'Risk alert test triggered (scaffold)' };
  }
}
