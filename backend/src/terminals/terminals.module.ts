import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentTerminal } from './entities/payment-terminal.entity';
import { DistributorProfile } from '../distributors/entities/distributor-profile.entity';
import { TerminalsController } from './terminals.controller';
import { TerminalsService } from './terminals.service';

@Module({
  imports: [TypeOrmModule.forFeature([PaymentTerminal, DistributorProfile])],
  controllers: [TerminalsController],
  providers: [TerminalsService],
  exports: [TerminalsService],
})
export class TerminalsModule {}
