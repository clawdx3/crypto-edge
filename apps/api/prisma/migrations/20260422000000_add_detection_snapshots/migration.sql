-- Add detection snapshot fields to TokenResearchReport
ALTER TABLE "TokenResearchReport"
  ADD COLUMN IF NOT EXISTS "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "detectedPrice" TEXT,
  ADD COLUMN IF NOT EXISTS "detectedMarketCap" TEXT,
  ADD COLUMN IF NOT EXISTS "detectedLiquidity" TEXT,
  ADD COLUMN IF NOT EXISTS "detectedVolume24h" TEXT;

-- Create GemPerformanceSnapshot table
CREATE TABLE IF NOT EXISTS "GemPerformanceSnapshot" (
  "id" TEXT NOT NULL,
  "gemId" TEXT NOT NULL,
  "tokenAddress" TEXT NOT NULL,
  "chain" TEXT NOT NULL,
  "snapshotAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "priceUsd" DOUBLE PRECISION,
  "marketCapUsd" DOUBLE PRECISION,
  "liquidityUsd" DOUBLE PRECISION,
  "volume24h" DOUBLE PRECISION,
  "roiPct" DOUBLE PRECISION,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "GemPerformanceSnapshot_pkey" PRIMARY KEY ("id")
);

-- Create index for efficient token snapshot queries
CREATE INDEX IF NOT EXISTS "GemPerformanceSnapshot_tokenAddress_snapshotAt_idx" ON "GemPerformanceSnapshot"("tokenAddress", "snapshotAt");
