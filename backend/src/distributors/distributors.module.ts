import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DistributorsController } from './distributors.controller';
import { DistributorsService } from './distributors.service';
import { DistributorProfile } from './entities/distributor-profile.entity';

@Module({
  imports: [TypeOrmModule.forFeature([DistributorProfile])],
  controllers: [DistributorsController],
  providers: [DistributorsService],
  exports: [DistributorsService],
})
export class DistributorsModule {}
