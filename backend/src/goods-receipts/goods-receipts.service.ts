import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  GoodsReceipt,
  GoodsReceiptItem,
  GoodsReceiptType,
} from './entities/goods-receipt.entity';
import {
  FactoryOrderItem,
  FactoryReconciliation,
} from './entities/factory-reconciliation.entity';
import {
  CreateGoodsReceiptDto,
  UpsertFactoryReconciliationDto,
} from './dto/goods-receipt.dto';

function n(v: unknown, fallback = 0): number {
  const x = Number(v);
  return Number.isFinite(x) ? x : fallback;
}

function matchKey(productId?: string | null, artikul?: string | null, name?: string | null) {
  if (productId) return `id:${productId}`;
  const a = (artikul || '').trim().toLowerCase();
  if (a) return `art:${a}`;
  return `name:${(name || '').trim().toLowerCase()}`;
}

function receivedQty(item: GoodsReceiptItem): number {
  return Math.max(0, n(item.kolFakt) - n(item.kolBrak));
}

@Injectable()
export class GoodsReceiptsService {
  constructor(
    @InjectRepository(GoodsReceipt)
    private readonly receiptRepo: Repository<GoodsReceipt>,
    @InjectRepository(FactoryReconciliation)
    private readonly reconRepo: Repository<FactoryReconciliation>,
  ) {}

  private normalizeItems(items: CreateGoodsReceiptDto['items']): GoodsReceiptItem[] {
    return (items || []).map((i) => ({
      productId: i.productId || null,
      tovar: i.tovar,
      artikul: i.artikul || null,
      kolFakt: n(i.kolFakt),
      kolBrak: n(i.kolBrak),
      upakovka: i.upakovka || null,
      tsenaPost: n(i.tsenaPost),
      skid: n(i.skid),
      tsenaPriv: n(i.tsenaPriv, n(i.tsenaPost)),
      summa: n(i.summa, n(i.kolFakt) * n(i.tsenaPost)),
      ves: n(i.ves),
      unit: i.unit || null,
    }));
  }

  async create(dto: CreateGoodsReceiptDto, authorId?: string) {
    const type = (dto.type === 'chakana' || dto.type === 'ishlab' ? dto.type : 'opt') as GoodsReceiptType;
    const row = this.receiptRepo.create({
      legacyId: dto.legacyId != null ? String(dto.legacyId) : null,
      companyId: dto.companyId?.trim() || null,
      date: dto.date,
      num: dto.num,
      ox: dto.ox ?? true,
      supplier: dto.supplier || '',
      org: dto.org || '',
      warehouse: dto.warehouse || '',
      wagon: dto.wagon || '',
      dir: dto.dir || '',
      invoice: dto.invoice || '',
      sum: n(dto.sum),
      netto: n(dto.netto),
      type,
      author: dto.author || '',
      authorId: dto.authorId || authorId || null,
      items: this.normalizeItems(dto.items),
    });
    return this.receiptRepo.save(row);
  }

  async importMany(rows: CreateGoodsReceiptDto[], authorId?: string) {
    let created = 0;
    let skipped = 0;
    for (const dto of rows) {
      if (dto.legacyId != null) {
        const exists = await this.receiptRepo.findOne({
          where: { legacyId: String(dto.legacyId) },
        });
        if (exists) {
          skipped++;
          continue;
        }
      }
      await this.create(dto, authorId);
      created++;
    }
    return { created, skipped };
  }

  async findAll(opts: { companyId?: string | string[] | null; ox?: boolean }) {
    const qb = this.receiptRepo.createQueryBuilder('r').orderBy('r.createdAt', 'DESC');
    const ids = Array.isArray(opts.companyId)
      ? opts.companyId.map((id) => id?.trim()).filter(Boolean)
      : opts.companyId?.trim()
        ? [opts.companyId.trim()]
        : [];
    if (Array.isArray(opts.companyId) && ids.length === 0) {
      qb.andWhere('1 = 0');
    } else if (ids.length === 1) {
      qb.andWhere('r.companyId = :companyId', { companyId: ids[0] });
    } else if (ids.length > 1) {
      qb.andWhere('r.companyId IN (:...companyIds)', { companyIds: ids });
    }
    if (opts.ox !== undefined) {
      qb.andWhere('r.ox = :ox', { ox: opts.ox });
    }
    const rows = await qb.getMany();
    const reconMap = await this.reconStatusMap(rows.map((r) => r.id));
    return rows.map((r) => this.toReceiptDto(r, reconMap.get(r.id)));
  }

  async findOne(id: string) {
    const row = await this.receiptRepo.findOne({ where: { id } });
    if (!row) throw new NotFoundException('Goods receipt not found');
    const recon = await this.reconRepo.findOne({ where: { receiptId: id } });
    return this.toReceiptDto(row, recon ? { status: recon.status, id: recon.id } : undefined);
  }

  private async reconStatusMap(receiptIds: string[]) {
    const map = new Map<string, { status: string; id: string }>();
    if (receiptIds.length === 0) return map;
    const rows = await this.reconRepo
      .createQueryBuilder('f')
      .where('f.receiptId IN (:...ids)', { ids: receiptIds })
      .getMany();
    for (const r of rows) {
      map.set(r.receiptId, { status: r.status, id: r.id });
    }
    return map;
  }

  private toReceiptDto(
    r: GoodsReceipt,
    recon?: { status: string; id: string },
  ) {
    return {
      id: r.id,
      legacyId: r.legacyId,
      companyId: r.companyId,
      date: r.date,
      num: r.num,
      ox: r.ox,
      supplier: r.supplier,
      org: r.org,
      warehouse: r.warehouse,
      wagon: r.wagon,
      dir: r.dir,
      invoice: r.invoice,
      sum: n(r.sum),
      netto: n(r.netto),
      type: r.type,
      author: r.author,
      authorId: r.authorId,
      items: r.items || [],
      reconciliationStatus: recon?.status || null,
      reconciliationId: recon?.id || null,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    };
  }

  compare(
    receiptItems: GoodsReceiptItem[],
    ordered: FactoryOrderItem[],
  ): {
    items: FactoryOrderItem[];
    totalOrderedQty: number;
    totalOrderedSum: number;
    totalReceivedQty: number;
    totalMissingQty: number;
    totalMissingSum: number;
    extras: { name: string; artikul?: string | null; receivedQty: number; summa: number }[];
  } {
    const recvMap = new Map<string, { qty: number; price: number; name: string; artikul?: string | null }>();
    for (const it of receiptItems || []) {
      const key = matchKey(it.productId, it.artikul, it.tovar);
      const prev = recvMap.get(key);
      const qty = receivedQty(it);
      const price = n(it.tsenaPost);
      if (prev) {
        prev.qty += qty;
      } else {
        recvMap.set(key, {
          qty,
          price,
          name: it.tovar,
          artikul: it.artikul,
        });
      }
    }

    const used = new Set<string>();
    const items: FactoryOrderItem[] = [];
    let totalOrderedQty = 0;
    let totalOrderedSum = 0;
    let totalReceivedQty = 0;
    let totalMissingQty = 0;
    let totalMissingSum = 0;

    for (const o of ordered) {
      const key = matchKey(o.productId, o.artikul, o.name);
      used.add(key);
      const recv = recvMap.get(key);
      const orderedQty = n(o.orderedQty);
      const orderedPrice = n(o.orderedPrice);
      const orderedSum = n(o.orderedSum, orderedQty * orderedPrice);
      const received = recv ? recv.qty : 0;
      const missingQty = Math.max(0, orderedQty - received);
      const missingSum = missingQty * orderedPrice;
      items.push({
        ...o,
        orderedQty,
        orderedPrice,
        orderedSum,
        orderedUnit: o.orderedUnit || 'pcs',
        receivedQty: received,
        missingQty,
        missingSum,
      });
      totalOrderedQty += orderedQty;
      totalOrderedSum += orderedSum;
      totalReceivedQty += Math.min(orderedQty, received);
      totalMissingQty += missingQty;
      totalMissingSum += missingSum;
    }

    const extras: { name: string; artikul?: string | null; receivedQty: number; summa: number }[] = [];
    for (const [key, v] of recvMap) {
      if (used.has(key)) continue;
      extras.push({
        name: v.name,
        artikul: v.artikul,
        receivedQty: v.qty,
        summa: v.qty * v.price,
      });
    }

    return {
      items,
      totalOrderedQty,
      totalOrderedSum,
      totalReceivedQty,
      totalMissingQty,
      totalMissingSum,
      extras,
    };
  }

  async getReconciliationByReceipt(receiptId: string) {
    await this.findOne(receiptId);
    const recon = await this.reconRepo.findOne({ where: { receiptId } });
    if (!recon) return null;
    const receipt = await this.receiptRepo.findOne({ where: { id: receiptId } });
    const compared = this.compare(receipt?.items || [], recon.items || []);
    return {
      ...recon,
      totalOrderedQty: n(recon.totalOrderedQty),
      totalOrderedSum: n(recon.totalOrderedSum),
      totalReceivedQty: n(recon.totalReceivedQty),
      totalMissingQty: n(recon.totalMissingQty),
      totalMissingSum: n(recon.totalMissingSum),
      extras: compared.extras,
    };
  }

  async upsertReconciliation(
    receiptId: string,
    dto: UpsertFactoryReconciliationDto,
    managerId?: string,
  ) {
    const receipt = await this.receiptRepo.findOne({ where: { id: receiptId } });
    if (!receipt) throw new NotFoundException('Goods receipt not found');

    const rawItems: FactoryOrderItem[] = (dto.items || []).map((i) => ({
      productId: i.productId || null,
      name: i.name,
      artikul: i.artikul || null,
      orderedQty: n(i.orderedQty),
      orderedUnit: i.orderedUnit || 'pcs',
      orderedPrice: n(i.orderedPrice),
      orderedSum: n(i.orderedSum, n(i.orderedQty) * n(i.orderedPrice)),
    }));

    const compared = this.compare(receipt.items || [], rawItems);
    let recon = await this.reconRepo.findOne({ where: { receiptId } });
    if (!recon) {
      recon = this.reconRepo.create({
        receiptId,
        companyId: dto.companyId?.trim() || receipt.companyId,
        managerId: managerId || null,
      });
    }

    recon.companyId = dto.companyId?.trim() || receipt.companyId;
    recon.managerId = managerId || recon.managerId;
    recon.status = dto.status === 'draft' ? 'draft' : 'done';
    recon.note = dto.note ?? recon.note;
    recon.items = compared.items;
    recon.totalOrderedQty = compared.totalOrderedQty;
    recon.totalOrderedSum = compared.totalOrderedSum;
    recon.totalReceivedQty = compared.totalReceivedQty;
    recon.totalMissingQty = compared.totalMissingQty;
    recon.totalMissingSum = compared.totalMissingSum;

    const saved = await this.reconRepo.save(recon);
    return {
      ...saved,
      extras: compared.extras,
    };
  }

  async stats(companyId?: string | string[] | null) {
    const qb = this.reconRepo.createQueryBuilder('f').where("f.status = 'done'");
    const ids = Array.isArray(companyId)
      ? companyId.map((id) => id?.trim()).filter(Boolean)
      : companyId?.trim()
        ? [companyId.trim()]
        : [];
    if (Array.isArray(companyId) && ids.length === 0) {
      qb.andWhere('1 = 0');
    } else if (ids.length === 1) {
      qb.andWhere('f.companyId = :companyId', { companyId: ids[0] });
    } else if (ids.length > 1) {
      qb.andWhere('f.companyId IN (:...companyIds)', { companyIds: ids });
    }
    const rows = await qb.getMany();

    type Agg = {
      productId: string | null;
      name: string;
      artikul: string | null;
      timesMissing: number;
      totalMissingQty: number;
      totalMissingSum: number;
      timesOrdered: number;
    };
    const map = new Map<string, Agg>();

    for (const row of rows) {
      for (const it of row.items || []) {
        const key = matchKey(it.productId, it.artikul, it.name);
        let agg = map.get(key);
        if (!agg) {
          agg = {
            productId: it.productId || null,
            name: it.name,
            artikul: it.artikul || null,
            timesMissing: 0,
            totalMissingQty: 0,
            totalMissingSum: 0,
            timesOrdered: 0,
          };
          map.set(key, agg);
        }
        agg.timesOrdered += 1;
        const miss = n(it.missingQty);
        if (miss > 0) {
          agg.timesMissing += 1;
          agg.totalMissingQty += miss;
          agg.totalMissingSum += n(it.missingSum);
        }
      }
    }

    return Array.from(map.values())
      .filter((a) => a.timesMissing > 0)
      .sort((a, b) => b.totalMissingSum - a.totalMissingSum || b.timesMissing - a.timesMissing);
  }
}
