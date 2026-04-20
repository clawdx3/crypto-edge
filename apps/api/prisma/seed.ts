import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Create 3 assets
  const eth = await prisma.asset.create({
    data: {
      symbol: 'ETH',
      name: 'Ethereum',
      chain: 'ethereum',
      category: 'infra',
      isActive: true,
    },
  });

  const wbtc = await prisma.asset.create({
    data: {
      symbol: 'WBTC',
      name: 'Wrapped Bitcoin',
      chain: 'ethereum',
      contractAddress: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
      category: 'other',
      isActive: true,
    },
  });

  const uni = await prisma.asset.create({
    data: {
      symbol: 'UNI',
      name: 'Uniswap',
      chain: 'ethereum',
      contractAddress: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984',
      category: 'defi',
      isActive: true,
    },
  });

  // Create 2 wallets
  const smartTrader = await prisma.wallet.create({
    data: {
      address: '0x742d35Cc6634C0532925a3b844Bc9e7595f1B2Eb',
      label: 'Smart Trader Alpha',
      chain: 'ethereum',
      category: 'smart_trader',
      notes: 'High conviction DeFi trader with strong timing',
      isActive: true,
    },
  });

  const treasury = await prisma.wallet.create({
    data: {
      address: '0x47ac0Fb4F2D84898e4D9E7b4DaB3C24507a6D503',
      label: 'Protocol Treasury',
      chain: 'ethereum',
      category: 'treasury',
      notes: 'Multi-sig treasury wallet',
      isActive: true,
    },
  });

  // Create 2 catalysts
  const unlockCatalyst = await prisma.catalyst.create({
    data: {
      assetId: uni.id,
      type: 'unlock',
      title: 'UNI Token Unlock - May 2026',
      description: 'Scheduled unlock of 15% of total UNI supply for investors and team',
      sourceName: 'Token Unlocks',
      effectiveAt: new Date('2026-05-01T00:00:00Z'),
      status: 'upcoming',
      impactScore: 7.5,
      confidenceScore: 0.85,
      urgencyScore: 6.0,
      rankScore: 72.0,
      isManual: true,
    },
  });

  const listingCatalyst = await prisma.catalyst.create({
    data: {
      assetId: eth.id,
      type: 'listing',
      title: 'ETH Staking ETF Approval Expected',
      description: 'SEC decision expected on ETH staking ETF products',
      sourceName: 'Regulatory Watch',
      effectiveAt: new Date('2026-04-25T00:00:00Z'),
      status: 'upcoming',
      impactScore: 8.0,
      confidenceScore: 0.65,
      urgencyScore: 8.5,
      rankScore: 85.0,
      isManual: false,
    },
  });

  // Create 1 open position (UNI)
  const position = await prisma.position.create({
    data: {
      assetId: uni.id,
      status: 'open',
      thesis: 'UNI benefits from increased DEX volume and protocol fee switches',
      entryReason: 'Technical breakout with bullish divergence',
      invalidation: 'Daily close below $8.50',
      catalystWindowStart: new Date('2026-05-01T00:00:00Z'),
      catalystWindowEnd: new Date('2026-06-01T00:00:00Z'),
      maxSizePct: 10.0,
      entryPrice: 9.25,
      currentPrice: 9.80,
      currentConviction: 'medium',
      reviewFrequencyDays: 7,
      lastReviewedAt: new Date('2026-04-15T00:00:00Z'),
      nextReviewAt: new Date('2026-04-22T00:00:00Z'),
      notes: 'Position sizing at 8% of portfolio. Will add on pullbacks.',
    },
  });

  console.log('Seed data created successfully:');
  console.log(`- Assets: ETH (${eth.id}), WBTC (${wbtc.id}), UNI (${uni.id})`);
  console.log(`- Wallets: Smart Trader (${smartTrader.id}), Treasury (${treasury.id})`);
  console.log(`- Catalysts: Unlock (${unlockCatalyst.id}), Listing (${listingCatalyst.id})`);
  console.log(`- Position: UNI (${position.id})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
