import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Client } from './entities/client.entity';
import { UserClientMembership } from './entities/user-client-membership.entity';
import { CreateClientDto, TransferClientsDto, UpdateClientDto } from './dto/client.dto';
import { LinesService } from '../lines/lines.service';

function normalizeInn(inn?: string | null): string | null {
  const v = inn?.trim();
  return v ? v : null;
}

@Injectable()
export class ClientsService {
  constructor(
    @InjectRepository(Client)
    private readonly repo: Repository<Client>,
    @InjectRepository(UserClientMembership)
    private readonly membershipRepo: Repository<UserClientMembership>,
    private readonly linesService: LinesService,
  ) {}

  private baseQuery() {
    return this.repo
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.distributor', 'distributor')
      .leftJoinAndSelect('distributor.user', 'agentUser');
  }

  findAll(companyId?: string, lineCode?: string, distributorId?: string) {
    const qb = this.baseQuery().where('c.isActive = true');
    if (companyId) {
      qb.andWhere(
        '(c.companyId = :companyId OR (c.companyId IS NULL AND distributor.companyId = :companyId))',
        { companyId },
      );
    }
    if (lineCode) qb.andWhere('c.lineCode = :lineCode', { lineCode });
    if (distributorId) qb.andWhere('c.distributorId = :distributorId', { distributorId });
    return qb.orderBy('c.name', 'ASC').getMany();
  }

  async findOne(id: string, distributorId?: string) {
    const client = await this.baseQuery().where('c.id = :id', { id }).getOne();
    if (!client) throw new NotFoundException('Client not found');
    if (distributorId && client.distributorId !== distributorId) {
      throw new NotFoundException('Client not found');
    }
    return client;
  }

  findByInn(inn: string) {
    const normalized = normalizeInn(inn);
    if (!normalized) return null;
    return this.baseQuery()
      .where('c.isActive = true')
      .andWhere('c.inn = :inn', { inn: normalized })
      .getOne();
  }

  findByInnInCompany(inn: string, companyId: string, excludeClientId?: string) {
    const normalized = normalizeInn(inn);
    if (!normalized || !companyId) return Promise.resolve(null);
    const qb = this.baseQuery()
      .where('c.isActive = true')
      .andWhere('c.inn = :inn', { inn: normalized })
      .andWhere(
        '(c.companyId = :companyId OR (c.companyId IS NULL AND distributor.companyId = :companyId))',
        { companyId },
      );
    if (excludeClientId) {
      qb.andWhere('c.id != :excludeClientId', { excludeClientId });
    }
    return qb.getOne();
  }

  search(query: string, distributorId?: string) {
    const qb = this.baseQuery()
      .where('c.isActive = true')
      .andWhere('(c.name ILIKE :q OR c.code ILIKE :q)', { q: `%${query}%` });
    if (distributorId) qb.andWhere('c.distributorId = :distributorId', { distributorId });
    return qb.limit(50).getMany();
  }

  findLines(companyId?: string) {
    return this.linesService.findAll(companyId);
  }

  async create(dto: CreateClientDto) {
    const code =
      dto.code?.trim() ||
      `A${Date.now().toString(36).slice(-7).toUpperCase()}`;
    const client = this.repo.create({
      code,
      onTradeId: dto.onTradeId?.trim() || code,
      name: dto.name,
      fullName: dto.fullName ?? dto.name,
      phone: dto.phone ?? null,
      address: dto.address ?? null,
      companyId: dto.companyId ?? null,
      lineCode: dto.lineCode ?? null,
      latitude: dto.latitude ?? null,
      longitude: dto.longitude ?? null,
      category: dto.category ?? 'Standard',
      distributorId: dto.distributorId ?? null,
      inn: normalizeInn(dto.inn),
      contactPerson: dto.contactPerson ?? null,
      territory: dto.territory ?? null,
      clientClass: dto.clientClass ?? null,
      priceCategory: dto.priceCategory ?? null,
      photoUrl: dto.photoUrl ?? null,
      isActive: true,
    });
    const saved = await this.repo.save(client);
    return this.findOne(saved.id);
  }

  async update(id: string, dto: UpdateClientDto) {
    const client = await this.findOne(id);
    if (dto.code !== undefined) client.code = dto.code;
    if (dto.onTradeId !== undefined) client.onTradeId = dto.onTradeId?.trim() || null;
    if (dto.name !== undefined) client.name = dto.name;
    if (dto.fullName !== undefined) client.fullName = dto.fullName;
    if (dto.phone !== undefined) client.phone = dto.phone;
    if (dto.address !== undefined) client.address = dto.address;
    if (dto.lineCode !== undefined) client.lineCode = dto.lineCode;
    if (dto.latitude !== undefined) client.latitude = dto.latitude;
    if (dto.longitude !== undefined) client.longitude = dto.longitude;
    if (dto.category !== undefined) client.category = dto.category;
    if (dto.distributorId !== undefined) client.distributorId = dto.distributorId;
    if (dto.inn !== undefined) client.inn = normalizeInn(dto.inn);
    if (dto.contactPerson !== undefined) client.contactPerson = dto.contactPerson;
    if (dto.territory !== undefined) client.territory = dto.territory;
    if (dto.clientClass !== undefined) client.clientClass = dto.clientClass;
    if (dto.priceCategory !== undefined) client.priceCategory = dto.priceCategory;
    if (dto.photoUrl !== undefined) client.photoUrl = dto.photoUrl;
    if (dto.isActive !== undefined) client.isActive = dto.isActive;
    await this.repo.save(client);
    return this.findOne(id);
  }

  /**
   * Mijozlarni boshqa tashkilotga o'tkazish.
   * Maqsad orgda bir xil INN bo'lsa — o'tkazilmaydi (dublikat).
   */
  async transfer(dto: TransferClientsDto) {
    const targetCompanyId = dto.targetCompanyId?.trim();
    if (!targetCompanyId) {
      throw new BadRequestException('targetCompanyId majburiy');
    }

    const transferAll = !!dto.transferAll;
    let clients: Client[];

    if (transferAll) {
      const sourceCompanyId = dto.sourceCompanyId?.trim();
      if (!sourceCompanyId) {
        throw new BadRequestException('transferAll uchun sourceCompanyId majburiy');
      }
      if (sourceCompanyId === targetCompanyId) {
        throw new BadRequestException('Manba va maqsad tashkilot bir xil');
      }
      clients = await this.findAll(sourceCompanyId);
    } else {
      const ids = [...new Set((dto.clientIds ?? []).filter(Boolean))];
      if (ids.length === 0) {
        throw new BadRequestException('clientIds yoki transferAll kerak');
      }
      clients = await this.baseQuery()
        .where('c.id IN (:...ids)', { ids })
        .andWhere('c.isActive = true')
        .getMany();
      if (clients.length === 0) {
        throw new NotFoundException('Mijozlar topilmadi');
      }
    }

    const transferred: { id: string; name: string; code: string }[] = [];
    const skipped: {
      id: string;
      name: string;
      code: string;
      inn: string | null;
      reason: string;
    }[] = [];

    for (const client of clients) {
      const currentCompany =
        client.companyId ?? client.distributor?.companyId ?? null;

      if (currentCompany === targetCompanyId) {
        skipped.push({
          id: client.id,
          name: client.name,
          code: client.code,
          inn: client.inn,
          reason: 'already_in_target',
        });
        continue;
      }

      const inn = normalizeInn(client.inn);
      if (inn) {
        const dup = await this.findByInnInCompany(inn, targetCompanyId, client.id);
        if (dup) {
          skipped.push({
            id: client.id,
            name: client.name,
            code: client.code,
            inn,
            reason: 'inn_duplicate',
          });
          continue;
        }
      }

      client.companyId = targetCompanyId;
      // Boshqa org agentiga bog'liq qolmasin
      client.distributorId = null;
      await this.repo.save(client);
      await this.syncMembershipCompany(client.id, targetCompanyId);
      transferred.push({ id: client.id, name: client.name, code: client.code });
    }

    return {
      targetCompanyId,
      transferredCount: transferred.length,
      skippedCount: skipped.length,
      transferred,
      skipped,
    };
  }

  private async syncMembershipCompany(clientId: string, targetCompanyId: string) {
    const rows = await this.membershipRepo.find({ where: { clientId } });
    for (const row of rows) {
      if (row.companyId === targetCompanyId) continue;
      const clash = await this.membershipRepo.findOne({
        where: { userId: row.userId, companyId: targetCompanyId },
      });
      if (clash) {
        // Foydalanuvchi allaqachon maqsad orgda boshqa mijozga bog'langan
        if (clash.clientId !== clientId) {
          await this.membershipRepo.remove(row);
        }
        continue;
      }
      row.companyId = targetCompanyId;
      await this.membershipRepo.save(row);
    }
  }
}
