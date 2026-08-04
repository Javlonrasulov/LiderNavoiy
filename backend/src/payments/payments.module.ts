import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrderPayment } from './entities/order-payment.entity';
import { Order } from '../orders/entities/order.entity';
import { PaymentTerminal } from '../terminals/entities/payment-terminal.entity';
import { Client } from '../clients/entities/client.entity';
import { User } from '../auth/entities/user.entity';
import { UserClientMembership } from '../clients/entities/user-client-membership.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { PaymentPhotoUploadService } from './payment-photo-upload.service';
import { PaymentReminderCron } from './payment-reminder.cron';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      OrderPayment,
      Order,
      PaymentTerminal,
      Client,
      User,
      UserClientMembership,
    ]),
    NotificationsModule,
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService, PaymentPhotoUploadService, PaymentReminderCron],
  exports: [PaymentsService, PaymentPhotoUploadService],
})
export class PaymentsModule {}
