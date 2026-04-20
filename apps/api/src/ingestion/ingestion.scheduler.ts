import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class IngestionScheduler {
  private readonly logger = new Logger(IngestionScheduler.name);

  describe(): string {
    this.logger.debug('Ingestion scheduler scaffold loaded.');
    return 'scheduler-scaffold';
  }
}
