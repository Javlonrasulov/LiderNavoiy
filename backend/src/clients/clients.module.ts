import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientsController } from './clients.controller';
import { ClientRequestsController } from './client-requests.controller';
import { ClientPortalController } from './client-portal.controller';
import { ClientsService } from './clients.service';
import { ClientRequestsService } from './client-requests.service';
import { ClientsUploadService } from './clients-upload.service';
import { ClientReconciliationService } from './client-reconciliation.service';
import { ClientCredentialsService } from './client-credentials.service';
import { ClientPortalService } from './client-portal.service';
import { ClientStatsService } from './client-stats.service';
import { Client } from './entities/client.entity';
import { ClientRequest } from './entities/client-request.entity';
import { Order } from '../orders/entities/order.entity';
import { DistributorProfile } from '../distributors/entities/distributor-profile.entity';
import { User } from '../auth/entities/user.entity';
import { LinesModule } from '../lines/lines.module';
import { AuthModule } from '../auth/auth.module';
import { OrdersModule } from '../orders/orders.module';
import { ProductsModule } from '../products/products.module';
import { GpsModule } from '../gps/gps.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Client, ClientRequest, Order, DistributorProfile, User]),
    LinesModule,
    AuthModule,
    OrdersModule,
    ProductsModule,
    GpsModule,
  ],
  controllers: [ClientsController, ClientRequestsController, ClientPortalController],
  providers: [
    ClientsService,
    ClientRequestsService,
    ClientsUploadService,
    ClientReconciliationService,
    ClientCredentialsService,
    ClientPortalService,
    ClientStatsService,
  ],
  exports: [ClientsService, ClientRequestsService, ClientCredentialsService],
})
export class ClientsModule {}
