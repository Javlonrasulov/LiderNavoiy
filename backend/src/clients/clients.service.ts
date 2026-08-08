import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Client } from './entities/client.entity';
import { UserClientMembership } from './entities/user-client-membership.entity';
import { CreateClientDto, TransferClientsDto, UpdateClientDto } from './dto/client.dto';
import { LinesService } from '../lines/lines.service';
import { Order } from '../orders/entities/order.entity';
import { OrderStatus } from '../common/enums';
import { User } from '../auth/entities/user.entity';

function normalizeInn(inn?: string | null): string | null {
  const v = inn?.trim();
  return v ? v : null;
}

function toNum(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function sameCoord(a: number | null | undefined, b: number | null | undefined): boolean {
  if (a == null && b == null) return true;
  if (a == null || b == null) return false;
  return Math.abs(Number(a) - Number(b)) < 1e-7;
}

function actorLabel(actor?: User | null): string | null {
  if (!actor) return null;
  return actor.fullName?.trim() || actor.username?.trim() || null;
}

@Injectable()
export class ClientsService {
  constructor(
    @InjectRepository(Client)
    private readonly repo: Repository<Client>,
    @InjectRepository(UserClientMembership)
    private readonly membershipRepo: Repository<UserClientMembership>,
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly linesService: LinesService,
  ) {}

  private baseQuery() {
    return this.repo
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.distributor', 'distributor')
      .leftJoinAndSelect('distributor.user', 'agentUser');
  }

  private notDeleted(qb: ReturnType<ClientsService['baseQuery']>) {
    return qb.andWhere('c.deletedAt IS NULL');
  }

  /** client.balance ko‘pincha 0 — qarzni yetkazilgan to‘lanmagan buyurtmalardan hisoblaymiz. */
  private async unpaidDebtsByClientIds(ids: string[]): Promise<Map<string, number>> {
    const map = new Map<string, number>();
    if (!ids.length) return map;
    const orders = await this.orderRepo.find({
      where: { clientId: In(ids), status: OrderStatus.DELIVERED },
      select: ['clientId', 'totalAmount', 'paidAmount', 'returnedAmount'],
    });
    for (const o of orders) {
      const total = toNum(o.totalAmount) - toNum(o.returnedAmount);
      const paid = toNum(o.paidAmount);
      const unpaid = Math.max(0, total - paid);
      if (unpaid <= 0) continue;
      map.set(o.clientId, (map.get(o.clientId) ?? 0) + unpaid);
    }
    return map;
  }

  private async withDebts(clients: Client[]): Promise<Client[]> {
    if (!clients.length) return clients;
    const unpaidMap = await this.unpaidDebtsByClientIds(clients.map((c) => c.id));
    for (const c of clients) {
      const stored = toNum(c.balance);
      const unpaid = unpaidMap.get(c.id) ?? 0;
      const fromBalance = Math.abs(stored);
      const debt = Math.max(fromBalance, unpaid);
      if (Math.abs(stored) < 0.005 && debt > 0.005) {
        c.balance = -debt;
      } else if (stored > 0.005 && unpaid > stored) {
        c.balance = -Math.max(stored, unpaid);
      } else if (stored < -0.005 && unpaid > Math.abs(stored)) {
        c.balance = -unpaid;
      }
      (c as Client & { debt?: number }).debt = debt;
    }
    return clients;
  }

  async findAll(
    companyId?: string | string[],
    lineCode?: string,
    distributorId?: string,
  ) {
    const qb = this.notDeleted(this.baseQuery().where('c.isActive = true'));
    const ids = Array.isArray(companyId)
      ? companyId.map((id) => id?.trim()).filter(Boolean)
      : companyId?.trim()
        ? [companyId.trim()]
        : [];
    if (ids.length === 1) {
      qb.andWhere(
        '(c.companyId = :companyId OR (c.companyId IS NULL AND distributor.companyId = :companyId))',
        { companyId: ids[0] },
      );
    } else if (ids.length > 1) {
      qb.andWhere(
        '(c.companyId IN (:...companyIds) OR (c.companyId IS NULL AND distributor.companyId IN (:...companyIds)))',
        { companyIds: ids },
      );
    }
    if (lineCode) qb.andWhere('c.lineCode = :lineCode', { lineCode });
    if (distributorId) qb.andWhere('c.distributorId = :distributorId', { distributorId });
    const clients = await qb.orderBy('c.name', 'ASC').getMany();
    return this.withDebts(clients);
  }

  /** Faqat admin korzinka — o'chirilgan mijozlar */
  async findTrash(companyId?: string) {
    const qb = this.baseQuery().where('c.deletedAt IS NOT NULL');
    if (companyId) {
      qb.andWhere(
        '(c.companyId = :companyId OR (c.companyId IS NULL AND distributor.companyId = :companyId))',
        { companyId },
      );
    }
    const clients = await qb.orderBy('c.deletedAt', 'DESC').getMany();
    return this.withDebts(clients);
  }

  async findOne(
    id: string,
    distributorId?: string,
    opts?: { includeDeleted?: boolean },
  ) {
    const qb = this.baseQuery().where('c.id = :id', { id });
    if (!opts?.includeDeleted) {
      this.notDeleted(qb);
    }
    const client = await qb.getOne();
    if (!client) throw new NotFoundException('Client not found');
    if (distributorId && client.distributorId !== distributorId) {
      throw new NotFoundException('Client not found');
    }
    if (client.deletedAt && !opts?.includeDeleted) {
      throw new NotFoundException('Client not found');
    }
    const [enriched] = await this.withDebts([client]);
    return enriched;
  }

  findByInn(inn: string) {
    const normalized = normalizeInn(inn);
    if (!normalized) return null;
    return this.notDeleted(this.baseQuery().where('c.isActive = true'))
      .andWhere('c.inn = :inn', { inn: normalized })
      .getOne();
  }

  findByInnInCompany(inn: string, companyId: string, excludeClientId?: string) {
    const normalized = normalizeInn(inn);
    if (!normalized || !companyId) return Promise.resolve(null);
    const qb = this.notDeleted(this.baseQuery().where('c.isActive = true'))
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

  async search(query: string, distributorId?: string) {
    const qb = this.notDeleted(this.baseQuery().where('c.isActive = true'))
      .andWhere('(c.name ILIKE :q OR c.code ILIKE :q)', { q: `%${query}%` });
    if (distributorId) qb.andWhere('c.distributorId = :distributorId', { distributorId });
    const clients = await qb.limit(50).getMany();
    return this.withDebts(clients);
  }

  findLines(companyId?: string) {
    return this.linesService.findAll(companyId);
  }

  async create(
    dto: CreateClientDto,
    actor?: User,
    createdByOverride?: { id?: string | null; name?: string | null },
  ) {
    const code =
      dto.code?.trim() ||
      `A${Date.now().toString(36).slice(-7).toUpperCase()}`;
    const hasLocation = dto.latitude != null || dto.longitude != null;
    const createdById = createdByOverride?.id ?? actor?.id ?? null;
    const createdByName =
      createdByOverride?.name?.trim() ||
      actorLabel(actor) ||
      null;
    const client = this.repo.create({
      code,
      onTradeId: dto.onTradeId?.trim() || code,
      name: dto.name,
      fullName: dto.fullName ?? dto.name,
      phone: dto.phone ?? null,
      extraPhones: Array.isArray(dto.extraPhones)
        ? dto.extraPhones
            .filter((p) => p?.phone?.trim())
            .map((p) => ({
              phone: p.phone.trim(),
              note: p.note?.trim() || undefined,
            }))
        : [],
      address: dto.address ?? null,
      companyId: dto.companyId ?? null,
      lineCode: dto.lineCode ?? null,
      latitude: dto.latitude ?? null,
      longitude: dto.longitude ?? null,
      orderRadiusMeters:
        dto.orderRadiusMeters != null && Number(dto.orderRadiusMeters) >= 10
          ? Math.round(Number(dto.orderRadiusMeters))
          : 100,
      locationUpdatedAt: hasLocation ? new Date() : null,
      locationUpdatedById: hasLocation ? actor?.id ?? null : null,
      locationUpdatedByName: hasLocation ? actorLabel(actor) : null,
      category: dto.category ?? 'Standard',
      distributorId: dto.distributorId ?? null,
      inn: normalizeInn(dto.inn),
      contactPerson: dto.contactPerson ?? null,
      territory: dto.territory ?? null,
      clientClass: dto.clientClass ?? null,
      priceCategory: dto.priceCategory ?? null,
      photoUrl: dto.photoUrl ?? null,
      canSeePromotions: dto.canSeePromotions === true,
      isActive: true,
      createdById,
      createdByName,
      deletedAt: null,
      deletedById: null,
      deletedByName: null,
    });
    const saved = await this.repo.save(client);
    return this.findOne(saved.id);
  }

  async update(id: string, dto: UpdateClientDto, actor?: User) {
    const client = await this.findOne(id);
    if (dto.code !== undefined) client.code = dto.code;
    if (dto.onTradeId !== undefined) client.onTradeId = dto.onTradeId?.trim() || null;
    if (dto.name !== undefined) client.name = dto.name;
    if (dto.fullName !== undefined) client.fullName = dto.fullName;
    if (dto.phone !== undefined) client.phone = dto.phone;
    if (dto.extraPhones !== undefined) {
      client.extraPhones = Array.isArray(dto.extraPhones)
        ? dto.extraPhones
            .filter((p) => p?.phone?.trim())
            .map((p) => ({
              phone: p.phone.trim(),
              note: p.note?.trim() || undefined,
            }))
        : [];
    }
    if (dto.address !== undefined) client.address = dto.address;
    if (dto.lineCode !== undefined) client.lineCode = dto.lineCode;

    const prevLat = client.latitude;
    const prevLng = client.longitude;
    if (dto.latitude !== undefined) client.latitude = dto.latitude;
    if (dto.longitude !== undefined) client.longitude = dto.longitude;
    if (dto.orderRadiusMeters !== undefined) {
      client.orderRadiusMeters =
        dto.orderRadiusMeters != null && Number(dto.orderRadiusMeters) >= 10
          ? Math.round(Number(dto.orderRadiusMeters))
          : null;
    }
    const locationChanged =
      (dto.latitude !== undefined && !sameCoord(prevLat, dto.latitude)) ||
      (dto.longitude !== undefined && !sameCoord(prevLng, dto.longitude));
    if (locationChanged) {
      client.locationUpdatedAt = new Date();
      client.locationUpdatedById = actor?.id ?? null;
      client.locationUpdatedByName = actorLabel(actor);
    }

    if (dto.category !== undefined) client.category = dto.category;
    if (dto.distributorId !== undefined) client.distributorId = dto.distributorId;
    if (dto.inn !== undefined) client.inn = normalizeInn(dto.inn);
    if (dto.contactPerson !== undefined) client.contactPerson = dto.contactPerson;
    if (dto.territory !== undefined) client.territory = dto.territory;
    if (dto.clientClass !== undefined) client.clientClass = dto.clientClass;
    if (dto.priceCategory !== undefined) client.priceCategory = dto.priceCategory;
    if (dto.photoUrl !== undefined) client.photoUrl = dto.photoUrl;
    if (dto.canSeePromotions !== undefined) client.canSeePromotions = !!dto.canSeePromotions;
    if (dto.isActive !== undefined) client.isActive = dto.isActive;
    await this.repo.save(client);
    return this.findOne(id);
  }

  /** Korzinkaga o'tkazish — ma'lumotlar saqlanadi, APKlar ko'rmaydi */
  async softDelete(id: string, actor: User) {
    const client = await this.findOne(id);
    client.deletedAt = new Date();
    client.deletedById = actor.id;
    client.deletedByName = actorLabel(actor);
    await this.repo.save(client);
    await this.userRepo.update({ clientId: id }, { isActive: false });
    return { ok: true as const, id: client.id };
  }

  async softDeleteMany(ids: string[], actor: User) {
    const unique = [...new Set(ids.filter(Boolean))];
    if (unique.length === 0) {
      throw new BadRequestException('clientIds kerak');
    }
    const results: { id: string; ok: boolean }[] = [];
    for (const id of unique) {
      try {
        await this.softDelete(id, actor);
        results.push({ id, ok: true });
      } catch {
        results.push({ id, ok: false });
      }
    }
    return {
      deletedCount: results.filter((r) => r.ok).length,
      results,
    };
  }

  /** Korzinkadan qaytarish */
  async restore(id: string) {
    const client = await this.findOne(id, undefined, { includeDeleted: true });
    if (!client.deletedAt) {
      throw new BadRequestException('Mijoz korzinkada emas');
    }
    client.deletedAt = null;
    client.deletedById = null;
    client.deletedByName = null;
    client.isActive = true;
    await this.repo.save(client);
    await this.userRepo.update({ clientId: id }, { isActive: true });
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
      clients = await this.notDeleted(this.baseQuery().where('c.id IN (:...ids)', { ids }))
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
