import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientsController } from './clients.controller';
import { ClientRequestsController } from './client-requests.controller';
import { ClientsService } from './clients.service';
import { ClientRequestsService } from './client-requests.service';
import { ClientsUploadService } from './clients-upload.service';
import { ClientReconciliationService } from './client-reconciliation.service';
import { Client } from './entities/client.entity';
import { ClientRequest } from './entities/client-request.entity';
import { Order } from '../orders/entities/order.entity';
import { DistributorProfile } from '../distributors/entities/distributor-profile.entity';
import { LinesModule } from '../lines/lines.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Client, ClientRequest, Order, DistributorProfile]),
    LinesModule,
  ],
  controllers: [ClientsController, ClientRequestsController],
  providers: [
    ClientsService,
    ClientRequestsService,
    ClientsUploadService,
    ClientReconciliationService,
  ],
  exports: [ClientsService, ClientRequestsService],
})
export class ClientsModule {}
