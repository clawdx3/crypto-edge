import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { PrismaService } from '../prisma/prisma.service';

export interface WhaleWallet {
  name: string;
  address: string;
  chain: string;
}

export interface WhaleTransfer {
  walletAddress: string;
  walletName: string;
  chain: string;
  tokenAddress: string | null;
  tokenSymbol: string | null;
  type: 'buy' | 'sell' | 'transfer';
  amountUsd: number | null;
  txHash: string | null;
  blockTimestamp: Date | null;
}

// Known whale wallets — user can add more via WHALE_WALLETS env var
// Format: name:address:chain (comma-separated)
const DEFAULT_WHALES: WhaleWallet[] = [
  { name: 'Vitalik Buterin', address: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045', chain: 'ethereum' },
  { name: 'Puzzle Whale', address: '0x28C6c06298d514Db089934071355E5743bf21d60', chain: 'ethereum' },
  { name: 'Binance Hot Wallet', address: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045', chain: 'ethereum' }, // placeholder
  { name: 'Coinbase Hot Wallet', address: '0x503828976D22510aadF0208a04FF24e4b25A81e4', chain: 'ethereum' },
  { name: 'Solana Trader VIP', address: '7EqPAdgdrNywLr2MF9J3xbfbJ9eR3z9U8K7qTwZMqYhx', chain: 'solana' },
];

@Injectable()
export class WhaleTracker {
  private readonly logger = new Logger(WhaleTracker.name);
  private readonly spotOnChainBase = 'https://api.spotonchain.com/api/v1';

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get whale wallets list (from env + defaults).
   */
  getWhaleWallets(): WhaleWallet[] {
    const envWhales = process.env['WHALE_WALLETS'] ?? '';
    if (!envWhales) return DEFAULT_WHALES;

    const parsed: WhaleWallet[] = envWhales.split(',').map((entry) => {
      const [name, address, chain] = entry.trim().split(':');
      return { name: name ?? 'Unknown', address: address ?? entry, chain: chain ?? 'ethereum' };
    });

    return [...DEFAULT_WHALES, ...parsed];
  }

  /**
   * Get recent transfers for a specific wallet using Spot on Chain API.
   * GET /api/v1/wallets/{chain}/{address}/transfers?limit=20
   */
  async getWalletTransfers(address: string, chain: string, limit: number = 20): Promise<WhaleTransfer[]> {
    try {
      const { data } = await axios.get(
        `${this.spotOnChainBase}/wallets/${chain}/${address}/transfers`,
        { params: { limit }, timeout: 15_000 },
      );

      const transfers: WhaleTransfer[] = (data?.data ?? []).map((item: any) => {
        const attrs = item.attributes ?? item;
        const isIncoming = attrs.to_address?.toLowerCase() === address.toLowerCase();

        return {
          walletAddress: address,
          walletName: this.getWalletName(address),
          chain,
          tokenAddress: attrs.token_address ?? null,
          tokenSymbol: attrs.token_symbol ?? null,
          type: isIncoming ? 'buy' : 'sell',
          amountUsd: attrs.amount_usd ? parseFloat(attrs.amount_usd) : null,
          txHash: attrs.tx_hash ?? null,
          blockTimestamp: attrs.block_timestamp ? new Date(attrs.block_timestamp) : null,
        };
      });

      return transfers;
    } catch (err: any) {
      this.logger.warn(`Whale tracker: failed to fetch transfers for ${address} on ${chain}: ${err.message}`);
      return [];
    }
  }

  /**
   * Scan multiple whale wallets for recent buys/sells.
   * Returns all whale moves in the last N transfers per wallet.
   */
  async getRecentWhaleMoves(): Promise<WhaleTransfer[]> {
    const wallets = this.getWhaleWallets();
    const allMoves: WhaleTransfer[] = [];

    for (const wallet of wallets) {
      const transfers = await this.getWalletTransfers(wallet.address, wallet.chain, 20);
      allMoves.push(...transfers);
    }

    // Store in DB
    for (const move of allMoves) {
      await this.storeWhaleMove(move);
    }

    this.logger.log(`WhaleTracker: scanned ${wallets.length} wallets, found ${allMoves.length} recent moves`);
    return allMoves;
  }

  /**
   * Check if a known whale just bought a specific token.
   * Returns the whale move if found, null otherwise.
   */
  async isNewWhaleEntry(tokenAddress: string): Promise<WhaleTransfer | null> {
    const wallets = this.getWhaleWallets();
    const recentMoves = await this.getRecentWhaleMoves();

    // Look for a recent buy of this token (within last hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    const entry = recentMoves.find(
      (m) =>
        m.tokenAddress?.toLowerCase() === tokenAddress.toLowerCase() &&
        m.type === 'buy' &&
        m.blockTimestamp &&
        m.blockTimestamp > oneHourAgo,
    );

    return entry ?? null;
  }

  /**
   * Get all whale moves for a specific token.
   */
  async getWhaleMovesForToken(tokenAddress: string): Promise<WhaleTransfer[]> {
    const recentMoves = await this.getRecentWhaleMoves();
    return recentMoves.filter(
      (m) => m.tokenAddress?.toLowerCase() === tokenAddress.toLowerCase(),
    );
  }

  private getWalletName(address: string): string {
    const wallet = this.getWhaleWallets().find(
      (w) => w.address.toLowerCase() === address.toLowerCase(),
    );
    return wallet?.name ?? 'Unknown Whale';
  }

  private async storeWhaleMove(move: WhaleTransfer): Promise<void> {
    try {
      await this.prisma.whaleMove.create({
        data: {
          walletAddress: move.walletAddress,
          walletName: move.walletName,
          chain: move.chain,
          tokenAddress: move.tokenAddress,
          tokenSymbol: move.tokenSymbol,
          type: move.type,
          amountUsd: move.amountUsd,
          txHash: move.txHash,
        },
      });
    } catch (err: any) {
      // Ignore duplicate txHash inserts
      if (!err.message?.includes('Unique constraint')) {
        this.logger.warn(`Failed to store whale move: ${err.message}`);
      }
    }
  }
}
