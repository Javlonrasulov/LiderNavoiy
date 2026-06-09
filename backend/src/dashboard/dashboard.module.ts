import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { Client } from '../clients/entities/client.entity';
import { Visit } from '../visits/entities/visit.entity';
import { Order } from '../orders/entities/order.entity';
import { DistributorProfile } from '../distributors/entities/distributor-profile.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Client, Visit, Order, DistributorProfile])],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
