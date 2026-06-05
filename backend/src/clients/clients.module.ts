import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientsController } from './clients.controller';
import { ClientsService } from './clients.service';
import { Client } from './entities/client.entity';
import { DistributorProfile } from '../distributors/entities/distributor-profile.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Client, DistributorProfile])],
  controllers: [ClientsController],
  providers: [ClientsService],
  exports: [ClientsService],
})
export class ClientsModule {}
