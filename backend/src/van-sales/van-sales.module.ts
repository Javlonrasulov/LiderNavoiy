import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VanLoad } from './entities/van-load.entity';
import { VanLoadItem } from './entities/van-load-item.entity';
import { Product } from '../products/entities/product.entity';
import { Order } from '../orders/entities/order.entity';
import { OrderPayment } from '../payments/entities/order-payment.entity';
import { PaymentTerminal } from '../terminals/entities/payment-terminal.entity';
import { Client } from '../clients/entities/client.entity';
import { DistributorProfile } from '../distributors/entities/distributor-profile.entity';
import { SalesLine } from '../lines/entities/sales-line.entity';
import { Visit } from '../visits/entities/visit.entity';
import { User } from '../auth/entities/user.entity';
import { PaymentsModule } from '../payments/payments.module';
import { VanSalesService } from './van-sales.service';
import { VanSalesController } from './van-sales.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      VanLoad,
      VanLoadItem,
      Product,
      Order,
      OrderPayment,
      PaymentTerminal,
      Client,
      DistributorProfile,
      SalesLine,
      Visit,
      User,
    ]),
    PaymentsModule,
  ],
  controllers: [VanSalesController],
  providers: [VanSalesService],
  exports: [VanSalesService],
})
export class VanSalesModule {}
