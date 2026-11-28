import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { RecordingsService } from './recordings.service';

@Injectable()
export class RecordingsCleanupCron {
  private readonly logger = new Logger(RecordingsCleanupCron.name);
  private running = false;

  constructor(private readonly recordings: RecordingsService) {}

  /** Har soatda muddati o‘tgan audio fayllarni o‘chiradi (idempotent) */
  @Cron(CronExpression.EVERY_HOUR)
  async handle() {
    if (this.running) return;
    this.running = true;
    try {
      const result = await this.recordings.cleanupExpired();
      if (result.marked > 0) {
        this.logger.log(
          `Recordings cleanup: marked=${result.marked} deletedFiles=${result.deletedFiles}`,
        );
      }
    } catch (e) {
      this.logger.warn(`Recordings cleanup failed: ${(e as Error).message}`);
    } finally {
      this.running = false;
    }
  }
}
