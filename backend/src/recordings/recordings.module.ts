import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VisitRecording } from './entities/visit-recording.entity';
import { Visit } from '../visits/entities/visit.entity';
import { DistributorProfile } from '../distributors/entities/distributor-profile.entity';
import { Client } from '../clients/entities/client.entity';
import { Order } from '../orders/entities/order.entity';
import { RecordingsService } from './recordings.service';
import { RecordingsController } from './recordings.controller';
import { RecordingUploadService } from './recording-upload.service';
import { RecordingsCleanupCron } from './recordings-cleanup.cron';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      VisitRecording,
      Visit,
      DistributorProfile,
      Client,
      Order,
    ]),
  ],
  controllers: [RecordingsController],
  providers: [RecordingsService, RecordingUploadService, RecordingsCleanupCron],
  exports: [RecordingsService],
})
export class RecordingsModule {}
