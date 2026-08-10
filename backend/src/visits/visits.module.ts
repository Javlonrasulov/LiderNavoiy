import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VisitsController } from './visits.controller';
import { VisitsService } from './visits.service';
import { Visit } from './entities/visit.entity';
import { Client } from '../clients/entities/client.entity';
import { Order } from '../orders/entities/order.entity';
import { DistributorProfile } from '../distributors/entities/distributor-profile.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Visit, Client, Order, DistributorProfile])],
  controllers: [VisitsController],
  providers: [VisitsService],
  exports: [VisitsService],
})
export class VisitsModule {}
