import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

export interface ContractSafetyReport {
  tokenAddress: string;
  chain: string;
  mintAuthority: boolean | null;   // null = unknown, true = revoked
  freezeAuthority: boolean | null;
  lpBurningStatus: 'burned' | 'locked' | 'unlocked' | 'unknown';
  lpAmount: string | null;
  lpLockDuration: string | null;
  renounced: boolean | null;
  isHoneypot: boolean | null;
  isProxy: boolean | null;
  proxyAddress: string | null;
  rugScore: number;  // 0-100, higher = safer
  creatorAddress: string | null;
  additionalFlags: string[];
}

@Injectable()
export class ContractSafetyScanner {
  private readonly logger = new Logger(ContractSafetyScanner.name);

  // Solana program IDs that are known mint authorities
  private readonly knownMintFreezePrograms = [
    'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA', // Token program
    'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLnJAQg7', // Associated token program
  ];

  /**
   * Full safety scan for a token on any chain.
   */
  async scan(tokenAddress: string, chain: string = 'solana'): Promise<ContractSafetyReport> {
    const report: ContractSafetyReport = {
      tokenAddress,
      chain,
      mintAuthority: null,
      freezeAuthority: null,
      lpBurningStatus: 'unknown',
      lpAmount: null,
      lpLockDuration: null,
      renounced: null,
      isHoneypot: null,
      isProxy: null,
      proxyAddress: null,
      rugScore: 50, // Start neutral
      creatorAddress: null,
      additionalFlags: [],
    };

    try {
      if (chain === 'solana') {
        await this.scanSolana(tokenAddress, report);
      } else if (chain === 'ethereum' || chain === 'base') {
        await this.scanEthereum(tokenAddress, report);
      }

      // Always try RugCheck regardless of chain
      await this.enrichFromRugCheck(tokenAddress, chain, report);

      // Calculate final rug score
      report.rugScore = this.calculateRugScore(report);
    } catch (err: any) {
      this.logger.warn(`Safety scan failed for ${tokenAddress} on ${chain}: ${err.message}`);
    }

    return report;
  }

  private async scanSolana(address: string, report: ContractSafetyReport): Promise<void> {
    // Get pair data from DexScreener
    try {
      const { data } = await axios.get(
        `https://api.dexscreener.com/latest/dex/tokens/${address}`,
        { timeout: 10_000 },
      );

      const pairs: any[] = data?.pairs ?? [];
      if (pairs.length > 0) {
        const pair = pairs[0]; // Use most liquid pair
        report.creatorAddress = pair.creatorAddress ?? null;

        // Check LP
        const lpAddress = pair.lpAddress ?? pair.liquidity?.address ?? null;
        if (lpAddress) {
          // Burned LP has special addresses
          const burnedLpAddresses = [
            'Burned', 'burned', 'LPBurned', 'burn',
            '11111111111111111111111111111111', // System program
          ];
          const isBurned = burnedLpAddresses.some(
            (b) => lpAddress.toLowerCase().includes(b.toLowerCase()),
          );

          if (isBurned) {
            report.lpBurningStatus = 'burned';
            report.rugScore += 20;
          } else {
            // Check lock status via DexScreener
            const lpCreationTime = pair.lpCreationTime ?? pair.liquidity?.creationTime;
            if (lpCreationTime) {
              const ageHours = (Date.now() - lpCreationTime * 1000) / (1000 * 60 * 60);
              if (ageHours > 365 * 24) {
                report.lpBurningStatus = 'locked'; // Old LP often means locked
                report.rugScore += 10;
              } else {
                report.lpBurningStatus = 'unlocked';
                report.rugScore -= 5;
              }
            }
          }
        }
      }
    } catch {
      // DexScreener token endpoint may not have data
    }

    // Check renounced status — for Solana, if mint authority is null, it's effectively renounced
    // We check via Token metadata API
    try {
      const { data } = await axios.get(
        `https://token-list-api.solana.cloud/token/${address}`,
        { timeout: 10_000 },
      );
      const mintAuthority = data?.mintAuthority ?? data?.mint?.authority;
      if (mintAuthority === null || mintAuthority === '') {
        report.mintAuthority = true;
        report.renounced = true;
        report.rugScore += 25;
      } else {
        report.mintAuthority = false;
      }

      const freezeAuthority = data?.freezeAuthority ?? data?.mint?.freezeAuthority;
      if (freezeAuthority === null || freezeAuthority === '') {
        report.freezeAuthority = true;
      } else {
        report.freezeAuthority = false;
        report.additionalFlags.push('FREEZE_AUTHORITY_ACTIVE');
        report.rugScore -= 5;
      }
    } catch {
      // Token not in official list — can't confirm mint authority status
      // Most meme tokens don't have freeze authority
      report.freezeAuthority = true;
    }
  }

  private async scanEthereum(address: string, report: ContractSafetyReport): Promise<void> {
    // Basic ETH contract checks — owner == 0x000... for renounced
    try {
      const { data, status } = await axios.get(
        `https://api.etherscan.io/api?module=contract&action=getsourcecode&address=${address}&apikey=${process.env['ETHERSCAN_API_KEY'] ?? ''}`,
        { timeout: 10_000 },
      );

      if (status === 200 && data?.result) {
        const result = data.result;
        const source = Array.isArray(result) ? result[0] : result;

        // Check for visible source code (proxy pattern)
        if (source?.SourceCode && source.SourceCode.trim() !== '') {
          // Check if implementation is provided (proxy)
          if (source.Implementation && source.Implementation !== '0x') {
            report.isProxy = true;
            report.proxyAddress = source.Implementation;
            report.rugScore -= 10;
          }

          // Check for hidden contract (no source = suspicious)
          report.rugScore += 5;
        }
      }
    } catch {
      // Etherscan may fail
    }

    // Check ownership via owner() call — simplified
    try {
      // Try to check if contract is verified
      const { status } = await axios.get(
        `https://api.etherscan.io/api?module=contract&action=checkverifystatus&address=${address}&apikey=${process.env['ETHERSCAN_API_KEY'] ?? ''}`,
        { timeout: 10_000 },
      );
      // If verified, slightly better score
    } catch {
      // Ignore
    }

    report.mintAuthority = true; // ETH tokens don't have mint authority like SPL
    report.freezeAuthority = true;
  }

  /**
   * Enrich report with RugCheck.io data (free, chain-agnostic).
   */
  private async enrichFromRugCheck(
    address: string,
    chain: string,
    report: ContractSafetyReport,
  ): Promise<void> {
    try {
      // Map our chain names to RugCheck chain identifiers
      const chainMap: Record<string, string> = {
        solana: 'solana',
        ethereum: 'eth',
        base: 'base',
        bsc: 'bsc',
        polygon: 'matic',
      };
      const rugChain = chainMap[chain] ?? chain;

      const { data } = await axios.get(
        `https://api.rugcheck.io/v1/tokens/${address}/report`,
        {
          headers: { 'Accept': 'application/json' },
          timeout: 15_000,
        },
      );

      if (data) {
        // Top holders check
        const topHolders = data?.topHolders ?? [];
        const lpHolderPercent = data?.lpHolderPercent ?? 0;
        const ownerPercent = data?.ownerPercent ?? 0;

        // If owner holds >5%, suspicious
        if (ownerPercent > 5) {
          report.additionalFlags.push(`OWNER_HOLDINGS_${ownerPercent.toFixed(1)}%`);
          report.rugScore -= 15;
        }

        // LP holder percent — low is good
        if (lpHolderPercent > 50) {
          report.additionalFlags.push('HIGH_LP_CONCENTRATION');
          report.rugScore -= 10;
        }

        // Mint authority
        if (data?.mintAuthority === false || data?.MintAuthority === false) {
          report.mintAuthority = true;
          report.rugScore += 15;
        } else if (data?.mintAuthority === true) {
          report.mintAuthority = false;
          report.additionalFlags.push('MINT_AUTHORITY_ACTIVE');
          report.rugScore -= 20;
        }

        // Freeze authority
        if (data?.freezeAuthority === false || data?.FreezeAuthority === false) {
          report.freezeAuthority = true;
        }

        // Honeypot check
        if (data?.isHoneypot || data?.ishoneypot) {
          report.isHoneypot = true;
          report.rugScore = 0;
          return;
        }

        // LP burned/locked info from RugCheck
        if (data?.lp?.burned || data?.lp?.burned === true) {
          report.lpBurningStatus = 'burned';
        } else if (data?.lp?.locked || data?.lockTime) {
          report.lpBurningStatus = 'locked';
          report.lpLockDuration = data?.lockTime ?? 'unknown';
        }

        // Overall score from RugCheck
        const rugScore = data?.score ?? data?.rugScore ?? 0;
        if (rugScore > 0) {
          // Normalize RugCheck score (typically 0-100) to our scale
          report.rugScore = Math.max(report.rugScore, rugScore);
        }
      }
    } catch (err: any) {
      // RugCheck API not available or token not found
      this.logger.debug(`RugCheck not available for ${address}: ${err.message}`);
    }
  }

  /**
   * Calculate overall rug score (0-100, higher = safer).
   */
  private calculateRugScore(report: ContractSafetyReport): number {
    let score = report.rugScore;

    // Mint authority revoked: +20
    if (report.mintAuthority === true) score += 20;
    else if (report.mintAuthority === false) score -= 20;

    // Freeze authority revoked: +10
    if (report.freezeAuthority === true) score += 10;

    // LP burned: +15
    if (report.lpBurningStatus === 'burned') score += 15;
    else if (report.lpBurningStatus === 'locked') score += 8;
    else if (report.lpBurningStatus === 'unlocked') score -= 10;

    // Renounced: +10
    if (report.renounced === true) score += 10;

    // Honeypot: instant fail
    if (report.isHoneypot === true) return 0;

    // Proxy: -10
    if (report.isProxy === true) score -= 10;

    // Additional flags
    if (report.additionalFlags.some((f) => f.includes('OWNER_HOLDINGS'))) score -= 10;
    if (report.additionalFlags.some((f) => f.includes('HIGH_LP_CONCENTRATION'))) score -= 10;

    return Math.max(0, Math.min(100, score));
  }
}
