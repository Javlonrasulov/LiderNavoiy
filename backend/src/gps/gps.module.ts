import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GpsController } from './gps.controller';
import { GpsService } from './gps.service';
import { CourierNearbyService } from './courier-nearby.service';
import { LocationPoint } from './entities/location-point.entity';
import { DistributorProfile } from '../distributors/entities/distributor-profile.entity';
import { Order } from '../orders/entities/order.entity';
import { Client } from '../clients/entities/client.entity';
import { User } from '../auth/entities/user.entity';
import { UserClientMembership } from '../clients/entities/user-client-membership.entity';
import { TrackingModule } from '../tracking/tracking.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      LocationPoint,
      DistributorProfile,
      Order,
      Client,
      User,
      UserClientMembership,
    ]),
    forwardRef(() => TrackingModule),
    NotificationsModule,
  ],
  controllers: [GpsController],
  providers: [GpsService, CourierNearbyService],
  exports: [GpsService, CourierNearbyService],
})
export class GpsModule {}
