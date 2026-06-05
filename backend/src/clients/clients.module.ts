import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientsController } from './clients.controller';
import { ClientRequestsController } from './client-requests.controller';
import { ClientsService } from './clients.service';
import { ClientRequestsService } from './client-requests.service';
import { ClientsUploadService } from './clients-upload.service';
import { Client } from './entities/client.entity';
import { ClientRequest } from './entities/client-request.entity';
import { DistributorProfile } from '../distributors/entities/distributor-profile.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Client, ClientRequest, DistributorProfile])],
  controllers: [ClientsController, ClientRequestsController],
  providers: [ClientsService, ClientRequestsService, ClientsUploadService],
  exports: [ClientsService, ClientRequestsService],
})
export class ClientsModule {}
