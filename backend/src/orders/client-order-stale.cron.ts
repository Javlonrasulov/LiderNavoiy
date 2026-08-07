import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { OrdersService } from './orders.service';

@Injectable()
export class ClientOrderStaleCron {
  private readonly logger = new Logger(ClientOrderStaleCron.name);

  constructor(private readonly orders: OrdersService) {}

  /** Har 10 daqiqada: 1 soatdan ortiq pending klient buyurtmalari */
  @Cron(CronExpression.EVERY_10_MINUTES)
  async handle() {
    try {
      const result = await this.orders.processStaleClientOrderAlerts();
      if (result.notified > 0) {
        this.logger.log(
          `Client-order stale alerts: notified=${result.notified} checked=${result.checked}`,
        );
      }
    } catch (e) {
      this.logger.warn('Client-order stale cron failed', e);
    }
  }
}
