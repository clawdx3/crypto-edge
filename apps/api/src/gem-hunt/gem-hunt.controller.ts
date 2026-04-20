import { Controller, Get, Post, Patch, Query, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam } from '@nestjs/swagger';
import { GemHuntService } from './gem-hunt.service';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('gem-hunt')
@Controller('gem-hunt')
export class GemHuntController {
  constructor(
    private readonly gemHuntService: GemHuntService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('scan')
  @ApiOperation({ summary: 'Trigger a gem hunt scan manually (social-first flow)' })
  async triggerScan(@Query('chain') chain: string = 'solana') {
    return this.gemHuntService.triggerScan(chain);
  }

  @Get('gems')
  @ApiOperation({ summary: 'List discovered gems' })
  async getGems(
    @Query('status') status?: string,
    @Query('chain') chain?: string,
    @Query('minScore') minScore?: string,
  ) {
    return this.prisma.discoveredGem.findMany({
      where: {
        ...(status && { status }),
        ...(chain && { chain }),
        ...(minScore && { gemScore: { gte: parseFloat(minScore) } }),
      },
      orderBy: { gemScore: 'desc' },
      take: 50,
    });
  }

  @Patch('gems/:id')
  @ApiOperation({ summary: 'Update gem status (pass/trigger/skip)' })
  async updateGem(@Param('id') id: string, @Body('status') status: string) {
    return this.prisma.discoveredGem.update({
      where: { id },
      data: {
        status,
        triggeredAt: status === 'triggered' ? new Date() : null,
      },
    });
  }

  @Get('config')
  @ApiOperation({ summary: 'Get gem hunt config' })
  async getConfig() {
    return this.prisma.gemHuntConfig.findMany({ where: { isActive: true } });
  }

  @Post('config')
  @ApiOperation({ summary: 'Create or update gem hunt config' })
  async saveConfig(@Body() body: any) {
    const { id, ...data } = body;
    if (id) {
      return this.prisma.gemHuntConfig.update({ where: { id }, data });
    }
    return this.prisma.gemHuntConfig.create({ data });
  }

  // ─── Social-First v2 Endpoints ───────────────────────────────────────────

  @Get('research/:chain/:address')
  @ApiOperation({ summary: 'Get full research report for a token (on-chain + social + contract safety)' })
  @ApiParam({ name: 'chain', description: 'Blockchain (solana, ethereum, base)' })
  @ApiParam({ name: 'address', description: 'Token contract address' })
  async getResearchReport(
    @Param('chain') chain: string,
    @Param('address') address: string,
  ) {
    return this.gemHuntService.getResearchReport(chain, address);
  }

  @Get('trending')
  @ApiOperation({ summary: 'Get current trending themes from TrendRadar' })
  async getTrendingThemes(
    @Query('limit') limit?: string,
    @Query('momentum') momentum?: string,
  ) {
    return this.prisma.trendingTheme.findMany({
      where: {
        ...(momentum && { momentum }),
      },
      orderBy: { detectedAt: 'desc' },
      take: limit ? parseInt(limit, 10) : 20,
    });
  }

  @Get('social-signals')
  @ApiOperation({ summary: 'Get recent social signals across platforms' })
  async getSocialSignals(
    @Query('keyword') keyword?: string,
    @Query('platform') platform?: string,
    @Query('trending') trending?: string,
    @Query('limit') limit?: string,
  ) {
    return this.prisma.socialSignal.findMany({
      where: {
        ...(keyword && { keyword: { contains: keyword } }),
        ...(platform && { platform }),
        ...(trending !== undefined && { trending: trending === 'true' }),
      },
      orderBy: { discoveredAt: 'desc' },
      take: limit ? parseInt(limit, 10) : 50,
    });
  }

  @Post('scan-theme')
  @ApiOperation({ summary: 'Manually trigger a scan on a specific keyword/theme' })
  async scanTheme(@Body('keyword') keyword: string) {
    if (!keyword) {
      return { error: 'keyword is required' };
    }
    return this.gemHuntService.triggerThemeScan(keyword);
  }

  @Get('research-reports')
  @ApiOperation({ summary: 'List all token research reports' })
  async getResearchReports(
    @Query('thesis') thesis?: string,
    @Query('riskLevel') riskLevel?: string,
    @Query('chain') chain?: string,
    @Query('limit') limit?: string,
  ) {
    return this.prisma.tokenResearchReport.findMany({
      where: {
        ...(thesis && { thesis }),
        ...(riskLevel && { riskLevel }),
        ...(chain && { chain }),
      },
      orderBy: { thesisStrength: 'desc' },
      take: limit ? parseInt(limit, 10) : 50,
    });
  }

  @Get('research-reports/buy-signals')
  @ApiOperation({ summary: 'Get all BUY thesis reports with strength > 70' })
  async getBuySignals(@Query('limit') limit?: string) {
    return this.prisma.tokenResearchReport.findMany({
      where: {
        thesis: 'BUY',
        thesisStrength: { gte: 70 },
      },
      orderBy: { thesisStrength: 'desc' },
      take: limit ? parseInt(limit, 10) : 20,
    });
  }
}
