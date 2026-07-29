import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PaymentsService } from './payments.service';

@Injectable()
export class PaymentReminderCron {
  private readonly logger = new Logger(PaymentReminderCron.name);

  constructor(private readonly payments: PaymentsService) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async handle() {
    try {
      await this.payments.processReminders();
    } catch (e) {
      this.logger.warn('Payment reminder cron failed', e);
    }
  }
}
