import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientCategory } from './entities/client-category.entity';
import { Client } from '../clients/entities/client.entity';
import { ClientCategoriesController } from './client-categories.controller';
import { ClientCategoriesService } from './client-categories.service';

@Module({
  imports: [TypeOrmModule.forFeature([ClientCategory, Client])],
  controllers: [ClientCategoriesController],
  providers: [ClientCategoriesService],
  exports: [ClientCategoriesService],
})
export class ClientCategoriesModule {}
