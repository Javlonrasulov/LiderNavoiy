import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RoutesController } from './routes.controller';
import { RoutesService } from './routes.service';
import { LocationPoint } from '../gps/entities/location-point.entity';
import { DistributorProfile } from '../distributors/entities/distributor-profile.entity';
import { Client } from '../clients/entities/client.entity';
import { SalesLine } from '../lines/entities/sales-line.entity';
import { Order } from '../orders/entities/order.entity';
import { Visit } from '../visits/entities/visit.entity';
import { AgentTrackingService } from './agent-tracking.service';

@Module({
  imports: [TypeOrmModule.forFeature([LocationPoint, DistributorProfile, Client, SalesLine, Order, Visit])],
  controllers: [RoutesController],
  providers: [RoutesService, AgentTrackingService],
})
export class RoutesModule {}
