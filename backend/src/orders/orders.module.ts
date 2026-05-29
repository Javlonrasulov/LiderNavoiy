import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { Order } from './entities/order.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { DistributorProfile } from '../distributors/entities/distributor-profile.entity';
import { Client } from '../clients/entities/client.entity';
import { User } from '../auth/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, DistributorProfile, Client, User]),
    NotificationsModule,
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
