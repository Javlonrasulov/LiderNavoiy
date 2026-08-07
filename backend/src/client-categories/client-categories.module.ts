import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientCategory } from './entities/client-category.entity';
import { ClientCategoriesController } from './client-categories.controller';
import { ClientCategoriesService } from './client-categories.service';

@Module({
  imports: [TypeOrmModule.forFeature([ClientCategory])],
  controllers: [ClientCategoriesController],
  providers: [ClientCategoriesService],
  exports: [ClientCategoriesService],
})
export class ClientCategoriesModule {}
