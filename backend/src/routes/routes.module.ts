import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RoutesController } from './routes.controller';
import { RoutesService } from './routes.service';
import { LocationPoint } from '../gps/entities/location-point.entity';
import { DistributorProfile } from '../distributors/entities/distributor-profile.entity';

@Module({
  imports: [TypeOrmModule.forFeature([LocationPoint, DistributorProfile])],
  controllers: [RoutesController],
  providers: [RoutesService],
})
export class RoutesModule {}
