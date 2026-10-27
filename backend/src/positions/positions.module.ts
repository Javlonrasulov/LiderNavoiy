import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DistributorProfile } from '../distributors/entities/distributor-profile.entity';
import { StaffPosition } from './entities/staff-position.entity';
import { PositionsController } from './positions.controller';
import { PositionsService } from './positions.service';

@Module({
  imports: [TypeOrmModule.forFeature([StaffPosition, DistributorProfile])],
  controllers: [PositionsController],
  providers: [PositionsService],
  exports: [PositionsService],
})
export class PositionsModule {}
