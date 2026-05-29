import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RoutesController } from './routes.controller';
import { RoutesService } from './routes.service';
import { LocationPoint } from '../gps/entities/location-point.entity';

@Module({
  imports: [TypeOrmModule.forFeature([LocationPoint])],
  controllers: [RoutesController],
  providers: [RoutesService],
})
export class RoutesModule {}
