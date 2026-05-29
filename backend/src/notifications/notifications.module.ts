import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { FirebaseAdminService } from './firebase-admin.service';
import { User } from '../auth/entities/user.entity';
import { DistributorProfile } from '../distributors/entities/distributor-profile.entity';
import { PushNotification } from './entities/push-notification.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, DistributorProfile, PushNotification]),
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService, FirebaseAdminService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
