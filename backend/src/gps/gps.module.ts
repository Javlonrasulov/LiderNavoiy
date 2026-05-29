import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GpsController } from './gps.controller';
import { GpsService } from './gps.service';
import { LocationPoint } from './entities/location-point.entity';
import { DistributorProfile } from '../distributors/entities/distributor-profile.entity';
import { TrackingModule } from '../tracking/tracking.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([LocationPoint, DistributorProfile]),
    forwardRef(() => TrackingModule),
  ],
  controllers: [GpsController],
  providers: [GpsService],
  exports: [GpsService],
})
export class GpsModule {}
