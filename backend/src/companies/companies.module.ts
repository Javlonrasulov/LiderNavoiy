import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Company } from './entities/company.entity';
import { CompanyBankAccount } from './entities/company-bank-account.entity';
import { CompanySocialLink } from './entities/company-social-link.entity';
import { PaymentTerminal } from '../terminals/entities/payment-terminal.entity';
import { DistributorProfile } from '../distributors/entities/distributor-profile.entity';
import { Client } from '../clients/entities/client.entity';
import { CompaniesController } from './companies.controller';
import { CompaniesService } from './companies.service';
import { CompaniesUploadService } from './companies-upload.service';
import { CompanyBankAccountsController } from './company-bank-accounts.controller';
import { CompanyBankAccountsService } from './company-bank-accounts.service';
import { CompanySocialLinksController } from './company-social-links.controller';
import { CompanySocialLinksService } from './company-social-links.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Company,
      CompanyBankAccount,
      CompanySocialLink,
      PaymentTerminal,
      DistributorProfile,
      Client,
    ]),
  ],
  controllers: [
    CompaniesController,
    CompanyBankAccountsController,
    CompanySocialLinksController,
  ],
  providers: [
    CompaniesService,
    CompaniesUploadService,
    CompanyBankAccountsService,
    CompanySocialLinksService,
  ],
  exports: [CompaniesService, CompanyBankAccountsService],
})
export class CompaniesModule {}
