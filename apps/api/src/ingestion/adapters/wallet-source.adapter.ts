import { Injectable } from '@nestjs/common';

@Injectable()
export class WalletSourceAdapter {
  readonly name = 'wallets';
}
