import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TerminusModule } from '@nestjs/terminus';
import appConfig from './config/app.config';
import { AlertsModule } from './alerts/alerts.module';
import { AssetsModule } from './assets/assets.module';
import { CatalystsModule } from './catalysts/catalysts.module';
import { HealthModule } from './health/health.module';
import { IngestionModule } from './ingestion/ingestion.module';
import { MarketRegimeModule } from './market-regime/market-regime.module';
import { OverviewModule } from './overview/overview.module';
import { PositionsModule } from './positions/positions.module';
import { PrismaModule } from './prisma/prisma.module';
import { ScoringModule } from './scoring/scoring.module';
import { SourcesModule } from './sources/sources.module';
import { TelegramModule } from './telegram/telegram.module';
import { WalletsModule } from './wallets/wallets.module';
import { GemHuntModule } from './gem-hunt/gem-hunt.module';
import { ShadowWalletsModule } from './shadow-wallets/shadow-wallets.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [appConfig] }),
    TerminusModule,
    PrismaModule,
    HealthModule,
    AssetsModule,
    SourcesModule,
    IngestionModule,
    ScoringModule,
    MarketRegimeModule,
    CatalystsModule,
    WalletsModule,
    PositionsModule,
    AlertsModule,
    TelegramModule,
    OverviewModule,
    GemHuntModule,
    ShadowWalletsModule,
  ],
})
export class AppModule {}

