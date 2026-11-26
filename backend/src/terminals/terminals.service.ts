import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { PaymentTerminal } from './entities/payment-terminal.entity';
import { CreateTerminalDto, UpdateTerminalDto } from './dto/terminal.dto';
import { DistributorProfile } from '../distributors/entities/distributor-profile.entity';
import { CompanyBankAccount } from '../companies/entities/company-bank-account.entity';

@Injectable()
export class TerminalsService {
  constructor(
    @InjectRepository(PaymentTerminal)
    private readonly repo: Repository<PaymentTerminal>,
    @InjectRepository(DistributorProfile)
    private readonly profileRepo: Repository<DistributorProfile>,
    @InjectRepository(CompanyBankAccount)
    private readonly bankAccountRepo: Repository<CompanyBankAccount>,
  ) {}

  async findAll(companyId?: string | string[]) {
    const where =
      companyId == null
        ? {}
        : Array.isArray(companyId)
          ? companyId.length
            ? { companyId: In(companyId) }
            : { companyId: In(['__none__']) }
          : { companyId };
    const list = await this.repo.find({
      where,
      order: { createdAt: 'DESC' },
    });
    return this.enrich(list);
  }

  async findMy(distributorId: string) {
    const list = await this.repo.find({
      where: {
        assignedDistributorId: distributorId,
        isActive: true,
      },
      order: { name: 'ASC' },
    });
    return this.enrich(list);
  }

  async findOne(id: string) {
    const row = await this.repo.findOne({ where: { id } });
    if (!row) throw new NotFoundException('Terminal not found');
    const [enriched] = await this.enrich([row]);
    return enriched;
  }

  private async resolveBankAccount(
    companyId: string | null | undefined,
    bankAccountId: string | null | undefined,
  ): Promise<string | null> {
    if (!bankAccountId) return null;
    if (!companyId) {
      throw new BadRequestException(
        'Hisob bog‘lash uchun tashkilot ko‘rsatilishi kerak',
      );
    }
    const acc = await this.bankAccountRepo.findOne({
      where: { id: bankAccountId, companyId, isActive: true },
    });
    if (!acc) {
      throw new BadRequestException(
        'Hisob-kitob hisobi faqat shu tashkilotning hisoblaridan tanlanadi',
      );
    }
    return acc.id;
  }

  async create(dto: CreateTerminalDto) {
    const companyId = dto.companyId ?? null;
    const bankAccountId = await this.resolveBankAccount(
      companyId,
      dto.bankAccountId,
    );
    const row = this.repo.create({
      name: dto.name.trim(),
      code: dto.code?.trim() || null,
      externalId: dto.externalId?.trim() || null,
      account23510: dto.account23510?.trim() || null,
      bankAccountId,
      companyId,
      assignedDistributorId: dto.assignedDistributorId ?? null,
      isActive: dto.isActive ?? true,
    });
    const saved = await this.repo.save(row);
    return this.findOne(saved.id);
  }

  async update(id: string, dto: UpdateTerminalDto) {
    const row = await this.repo.findOne({ where: { id } });
    if (!row) throw new NotFoundException('Terminal not found');
    if (dto.name !== undefined) row.name = dto.name.trim();
    if (dto.code !== undefined) row.code = dto.code?.trim() || null;
    if (dto.externalId !== undefined) {
      row.externalId = dto.externalId?.trim() || null;
    }
    if (dto.account23510 !== undefined) {
      row.account23510 = dto.account23510?.trim() || null;
    }
    if (dto.companyId !== undefined) row.companyId = dto.companyId;
    if (dto.assignedDistributorId !== undefined) {
      row.assignedDistributorId = dto.assignedDistributorId;
    }
    if (dto.isActive !== undefined) row.isActive = dto.isActive;

    if (dto.bankAccountId !== undefined) {
      row.bankAccountId = await this.resolveBankAccount(
        row.companyId,
        dto.bankAccountId,
      );
    } else if (dto.companyId !== undefined && row.bankAccountId) {
      // Tashkilot o‘zgarsa — hisob shu orgga tegishli ekanini qayta tekshir
      row.bankAccountId = await this.resolveBankAccount(
        row.companyId,
        row.bankAccountId,
      );
    }

    await this.repo.save(row);
    return this.findOne(id);
  }

  async remove(id: string) {
    const row = await this.repo.findOne({ where: { id } });
    if (!row) throw new NotFoundException('Terminal not found');
    row.isActive = false;
    await this.repo.save(row);
    return this.findOne(id);
  }

  private async enrich(list: PaymentTerminal[]) {
    if (list.length === 0) return [];
    const ids = [
      ...new Set(
        list
          .map((t) => t.assignedDistributorId)
          .filter((id): id is string => !!id),
      ),
    ];
    const bankIds = [
      ...new Set(
        list.map((t) => t.bankAccountId).filter((id): id is string => !!id),
      ),
    ];
    const profiles =
      ids.length > 0
        ? await this.profileRepo.find({
            where: { id: In(ids) },
            relations: ['user'],
          })
        : [];
    const accounts =
      bankIds.length > 0
        ? await this.bankAccountRepo.find({ where: { id: In(bankIds) } })
        : [];
    const map = new Map(profiles.map((p) => [p.id, p]));
    const accMap = new Map(accounts.map((a) => [a.id, a]));
    return list.map((t) => {
      const p = t.assignedDistributorId
        ? map.get(t.assignedDistributorId)
        : null;
      const acc = t.bankAccountId ? accMap.get(t.bankAccountId) : null;
      return {
        ...t,
        assignedName:
          p?.user?.fullName ?? p?.user?.username ?? p?.companyName ?? null,
        bankAccountName: acc?.name ?? null,
        bankAccountNumber: acc?.accountNumber ?? null,
        bankName: acc?.bankName ?? null,
        bankMfo: acc?.mfo ?? null,
      };
    });
  }
}
