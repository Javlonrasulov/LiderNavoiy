import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DebtsController } from './debts.controller';
import { DebtsService } from './debts.service';
import { Order } from '../orders/entities/order.entity';
import { Client } from '../clients/entities/client.entity';
import { Company } from '../companies/entities/company.entity';
import { DistributorProfile } from '../distributors/entities/distributor-profile.entity';
import { User } from '../auth/entities/user.entity';
import { OrderPayment } from '../payments/entities/order-payment.entity';
import { OrderReturn } from '../returns/entities/order-return.entity';
import { OrderAuditEvent } from '../orders/entities/order-audit-event.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Order,
      Client,
      Company,
      DistributorProfile,
      User,
      OrderPayment,
      OrderReturn,
      OrderAuditEvent,
    ]),
  ],
  controllers: [DebtsController],
  providers: [DebtsService],
  exports: [DebtsService],
})
export class DebtsModule {}
