import { Injectable } from '@nestjs/common';

@Injectable()
export class MarketSourceAdapter {
  readonly name = 'market';
}
