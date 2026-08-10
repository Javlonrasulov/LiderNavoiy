import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TrackingGateway } from './tracking.gateway';
import { GpsModule } from '../gps/gps.module';
import { DistributorProfile } from '../distributors/entities/distributor-profile.entity';

@Module({
  imports: [
    ConfigModule,
    JwtModule.register({}),
    TypeOrmModule.forFeature([DistributorProfile]),
    forwardRef(() => GpsModule),
  ],
  providers: [TrackingGateway],
  exports: [TrackingGateway],
})
export class TrackingModule {}
