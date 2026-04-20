import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import axios from 'axios';

export interface WalletTx {
  hash: string;
  from: string;
  to: string;
  value: string;       // in ETH
  timestamp: number;
  gasUsed: string;
  isError: string;
}

export interface ParsedWalletEvent {
  txHash: string;
  walletAddress: string;
  eventType: 'buy' | 'sell' | 'transfer' | 'bridge' | 'stake' | 'unstake' | 'contract_deploy';
  assetAddress: string | null;
  assetSymbol: string | null;
  amount: string | null;
  usdValue: number | null;
  blockTimestamp: Date;
}

@Injectable()
export class WalletSourceAdapter {
  private readonly logger = new Logger(WalletSourceAdapter.name);
  private readonly etherscanBase = 'https://api.etherscan.io/api';

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Sync transactions for all active wallets.
   * Fetches ETH txns + ERC-20 token txns from Etherscan.
   */
  async syncAllWallets(): Promise<{ synced: number; newEvents: number }> {
    const wallets = await this.prisma.wallet.findMany({ where: { isActive: true } });
    let totalNew = 0;

    for (const wallet of wallets) {
      const newEvents = await this.syncWalletTransactions(wallet.address, wallet.id);
      totalNew += newEvents;
    }

    return { synced: wallets.length, newEvents: totalNew };
  }

  /**
   * Sync transactions for a single wallet address.
   * Deduplicates by txHash.
   */
  async syncWalletTransactions(
    address: string,
    walletId: string,
  ): Promise<number> {
    const apiKey = this.configService.get<string>('ETHERSCAN_API_KEY');
    let newEvents = 0;

    // Fetch normal ETH transfers
    const ethTxns = await this.fetchEthTransfers(address, apiKey);
    for (const tx of ethTxns) {
      const exists = await this.prisma.walletEvent.findFirst({
        where: { walletId, txHash: tx.hash },
      });
      if (!exists) {
        await this.createWalletEvent(walletId, {
          txHash: tx.hash,
          walletAddress: address,
          eventType: 'transfer',
          assetAddress: null,
          assetSymbol: 'ETH',
          amount: tx.value,
          usdValue: null, // would need price at timestamp for USD
          blockTimestamp: new Date(tx.timestamp * 1000),
        });
        newEvents++;
      }
    }

    // Fetch ERC-20 token transfers
    const tokenTxns = await this.fetchErc20Transfers(address, apiKey);
    for (const tx of tokenTxns) {
      const exists = await this.prisma.walletEvent.findFirst({
        where: { walletId, txHash: tx.hash },
      });
      if (!exists) {
        const eventType = this.classifyTransfer(tx.to, tx.from, address);
        await this.createWalletEvent(walletId, {
          txHash: tx.hash,
          walletAddress: address,
          eventType,
          assetAddress: tx.contractAddress,
          assetSymbol: tx.tokenSymbol,
          amount: tx.value,
          usdValue: null,
          blockTimestamp: new Date(tx.timeStamp * 1000),
        });
        newEvents++;
      }
    }

    this.logger.log(`Synced ${address}: ${newEvents} new events`);
    return newEvents;
  }

  private async fetchEthTransfers(
    address: string,
    apiKey?: string,
  ): Promise<WalletTx[]> {
    try {
      const params: Record<string, string> = {
        module: 'account',
        action: 'txlist',
        address,
        startblock: '0',
        endblock: '99999999',
        page: '1',
        offset: '100',
        sort: 'desc',
      };
      if (apiKey) params.apikey = apiKey;

      const { data } = await axios.get(this.etherscanBase, { params });
      if (data.status !== '1' || !data.result) return [];
      // Filter only transfers (to != address means outgoing, from == address means incoming)
      return (data.result as WalletTx[]).filter(
        (tx) => tx.value !== '0' || tx.methodId === '0x',
      );
    } catch (err) {
      this.logger.error(`Failed to fetch ETH txs for ${address}: ${err.message}`);
      return [];
    }
  }

  private async fetchErc20Transfers(
    address: string,
    apiKey?: string,
  ): Promise<Array<WalletTx & { contractAddress: string; tokenSymbol: string; value: string }>> {
    try {
      const params: Record<string, string> = {
        module: 'account',
        action: 'tokentx',
        address,
        startblock: '0',
        endblock: '99999999',
        page: '1',
        offset: '100',
        sort: 'desc',
      };
      if (apiKey) params.apikey = apiKey;

      const { data } = await axios.get(this.etherscanBase, { params });
      if (data.status !== '1' || !data.result) return [];
      return data.result;
    } catch (err) {
      this.logger.error(`Failed to fetch ERC20 txs for ${address}: ${err.message}`);
      return [];
    }
  }

  private classifyTransfer(
    to: string,
    from: string,
    walletAddress: string,
  ): 'buy' | 'sell' | 'transfer' | 'bridge' | 'stake' | 'unstake' {
    const isIncoming = to.toLowerCase() === walletAddress.toLowerCase();
    const isOutgoing = from.toLowerCase() === walletAddress.toLowerCase();

    if (!isIncoming && !isOutgoing) return 'transfer';

    // Heuristic: if the other address is a known DEX contract → buy/sell
    const knownDexes = [
      '0x7a250d5630b4cf539739df2c5dacb4c659f2488d', // Uniswap V2 Router
      '0xe592427a0aece92de3edee1f18e0157c05861564', // Uniswap V3 Router
      '0xdef1c0ded9bec7f1a1670819833240f027b25eff', // 0x Exchange Proxy
    ];

    const otherAddress = isIncoming ? from : to;
    const isDex = knownDexes.some((dex) => otherAddress.toLowerCase().startsWith(dex.toLowerCase().slice(0, 10)));

    if (isDex) {
      return isIncoming ? 'buy' : 'sell';
    }

    // Known staking/bridging contracts → stake/unstake
    const knownStaking = ['0xae7ab96520de3a18e5e111b5eaab095312d7fe84']; // stETH
    const isStaking = knownStaking.some((s) => otherAddress.toLowerCase().startsWith(s.slice(0, 10)));
    if (isStaking) return isIncoming ? 'unstake' : 'stake';

    return 'transfer';
  }

  private async createWalletEvent(
    walletId: string,
    event: ParsedWalletEvent,
  ): Promise<void> {
    // Try to find or create the asset
    let assetId: string | null = null;
    if (event.assetAddress && event.assetSymbol) {
      const asset = await this.prisma.asset.findFirst({
        where: {
          OR: [
            { contractAddress: event.assetAddress.toLowerCase() },
            { symbol: event.assetSymbol.toUpperCase() },
          ],
        },
      });
      assetId = asset?.id ?? null;
    }

    await this.prisma.walletEvent.create({
      data: {
        walletId,
        assetId,
        txHash: event.txHash,
        eventType: event.eventType,
        amount: event.amount,
        usdValue: event.usdValue,
        blockTimestamp: event.blockTimestamp,
        summary: `${event.eventType} ${event.amount ?? ''} ${event.assetSymbol ?? 'ETH'}`.trim(),
        rawDataJson: JSON.stringify(event),
      },
    });
  }
}
