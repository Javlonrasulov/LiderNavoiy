import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SalesLine } from './entities/sales-line.entity';
import { Client } from '../clients/entities/client.entity';
import { LinesController } from './lines.controller';
import { LinesService } from './lines.service';

@Module({
  imports: [TypeOrmModule.forFeature([SalesLine, Client])],
  controllers: [LinesController],
  providers: [LinesService],
  exports: [LinesService],
})
export class LinesModule {}
