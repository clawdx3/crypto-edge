import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class HealthService {
  constructor(private readonly prismaService: PrismaService) {}

  async checkDb(): Promise<boolean> {
    try {
      await this.prismaService.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }

  async liveness(): Promise<{ status: string }> {
    return { status: 'ok' };
  }

  async readiness(): Promise<{ status: string; database: boolean }> {
    const dbHealthy = await this.checkDb();
    return {
      status: dbHealthy ? 'ok' : 'degraded',
      database: dbHealthy,
    };
  }
}
