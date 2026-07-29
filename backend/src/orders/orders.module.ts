import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { Order } from './entities/order.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { VisitsModule } from '../visits/visits.module';
import { DistributorProfile } from '../distributors/entities/distributor-profile.entity';
import { Client } from '../clients/entities/client.entity';
import { User } from '../auth/entities/user.entity';
import { PromotionsModule } from '../promotions/promotions.module';
import { TrackingModule } from '../tracking/tracking.module';
import { OrderPayment } from '../payments/entities/order-payment.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, DistributorProfile, Client, User, OrderPayment]),
    NotificationsModule,
    VisitsModule,
    PromotionsModule,
    TrackingModule,
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
