import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CashFlowController } from './cash-flow.controller';
import { CashFlowService } from './cash-flow.service';
import { CashCategory } from './entities/cash-category.entity';
import { CashMovement } from './entities/cash-movement.entity';
import { Order } from '../orders/entities/order.entity';
import { OrderPayment } from '../payments/entities/order-payment.entity';
import { OrderReturn } from '../returns/entities/order-return.entity';
import { Client } from '../clients/entities/client.entity';
import { Product } from '../products/entities/product.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CashCategory,
      CashMovement,
      Order,
      OrderPayment,
      OrderReturn,
      Client,
      Product,
    ]),
  ],
  controllers: [CashFlowController],
  providers: [CashFlowService],
  exports: [CashFlowService],
})
export class CashFlowModule {}
