import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Company } from './entities/company.entity';
import { DistributorProfile } from '../distributors/entities/distributor-profile.entity';
import { Client } from '../clients/entities/client.entity';
import { CompaniesController } from './companies.controller';
import { CompaniesService } from './companies.service';
import { CompaniesUploadService } from './companies-upload.service';

@Module({
  imports: [TypeOrmModule.forFeature([Company, DistributorProfile, Client])],
  controllers: [CompaniesController],
  providers: [CompaniesService, CompaniesUploadService],
  exports: [CompaniesService],
})
export class CompaniesModule {}
