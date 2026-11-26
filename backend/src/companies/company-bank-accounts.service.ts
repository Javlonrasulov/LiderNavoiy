import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Company } from './entities/company.entity';
import { CompanyBankAccount } from './entities/company-bank-account.entity';
import { PaymentTerminal } from '../terminals/entities/payment-terminal.entity';
import {
  CreateCompanyBankAccountDto,
  UpdateCompanyBankAccountDto,
} from './dto/company-bank-account.dto';

@Injectable()
export class CompanyBankAccountsService {
  constructor(
    @InjectRepository(CompanyBankAccount)
    private readonly repo: Repository<CompanyBankAccount>,
    @InjectRepository(Company)
    private readonly companyRepo: Repository<Company>,
    @InjectRepository(PaymentTerminal)
    private readonly terminalRepo: Repository<PaymentTerminal>,
  ) {}

  private async assertCompany(companyId: string) {
    const company = await this.companyRepo.findOne({
      where: { id: companyId, isActive: true },
    });
    if (!company) throw new NotFoundException('Organization not found');
    return company;
  }

  findAll(companyId: string) {
    return this.repo.find({
      where: { companyId, isActive: true },
      order: { isPrimary: 'DESC', createdAt: 'ASC' },
    });
  }

  async create(companyId: string, dto: CreateCompanyBankAccountDto) {
    await this.assertCompany(companyId);
    const row = this.repo.create({
      companyId,
      code: dto.code?.trim() || null,
      name: dto.name.trim(),
      accountNumber: dto.accountNumber.trim(),
      bankName: dto.bankName?.trim() || null,
      mfo: dto.mfo?.trim() || null,
      isPrimary: !!dto.isPrimary,
      isActive: true,
    });
    const saved = await this.repo.save(row);
    if (saved.isPrimary) {
      await this.setPrimary(companyId, saved.id);
      return this.repo.findOneOrFail({ where: { id: saved.id } });
    }
    return saved;
  }

  async update(
    companyId: string,
    id: string,
    dto: UpdateCompanyBankAccountDto,
  ) {
    await this.assertCompany(companyId);
    const row = await this.repo.findOne({ where: { id, companyId } });
    if (!row) throw new NotFoundException('Bank account not found');

    if (dto.code !== undefined) row.code = dto.code?.trim() || null;
    if (dto.name !== undefined) row.name = dto.name.trim();
    if (dto.accountNumber !== undefined) {
      row.accountNumber = dto.accountNumber.trim();
    }
    if (dto.bankName !== undefined) row.bankName = dto.bankName?.trim() || null;
    if (dto.mfo !== undefined) row.mfo = dto.mfo?.trim() || null;
    if (dto.isActive !== undefined) row.isActive = dto.isActive;

    const saved = await this.repo.save(row);

    if (dto.isPrimary === true) {
      await this.setPrimary(companyId, saved.id);
      return this.repo.findOneOrFail({ where: { id: saved.id } });
    }
    if (dto.isPrimary === false && saved.isPrimary) {
      saved.isPrimary = false;
      await this.repo.save(saved);
      const company = await this.companyRepo.findOne({ where: { id: companyId } });
      if (company?.primaryBankAccountId === saved.id) {
        company.primaryBankAccountId = null;
        await this.companyRepo.save(company);
      }
    }
    return saved;
  }

  async remove(companyId: string, id: string) {
    await this.assertCompany(companyId);
    const row = await this.repo.findOne({ where: { id, companyId } });
    if (!row) throw new NotFoundException('Bank account not found');

    const company = await this.companyRepo.findOne({ where: { id: companyId } });
    if (row.isPrimary || company?.primaryBankAccountId === id) {
      throw new BadRequestException(
        'Asosiy hisob raqamini o‘chirib bo‘lmaydi. Avval boshqa hisobni asosiy qiling.',
      );
    }

    const linked = await this.terminalRepo.count({
      where: { bankAccountId: id },
    });
    if (linked > 0) {
      throw new BadRequestException(
        `Bu hisob ${linked} ta terminalga bog‘langan. Avval terminallardagi bog‘lanishni olib tashlang.`,
      );
    }

    row.isActive = false;
    return this.repo.save(row);
  }

  /** Bir hisobni asosiy qiladi — qolganlarini va company.primaryBankAccountId ni yangilaydi */
  async setPrimary(companyId: string, accountId: string) {
    const company = await this.assertCompany(companyId);
    const account = await this.repo.findOne({
      where: { id: accountId, companyId, isActive: true },
    });
    if (!account) throw new NotFoundException('Bank account not found');

    await this.repo
      .createQueryBuilder()
      .update(CompanyBankAccount)
      .set({ isPrimary: false })
      .where('"companyId" = :companyId', { companyId })
      .execute();

    account.isPrimary = true;
    await this.repo.save(account);

    company.primaryBankAccountId = account.id;
    await this.companyRepo.save(company);
    return account;
  }
}
