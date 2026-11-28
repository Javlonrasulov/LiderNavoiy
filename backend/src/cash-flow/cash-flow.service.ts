import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { CashCategory } from './entities/cash-category.entity';
import { CashMovement } from './entities/cash-movement.entity';
import {
  CreateCashCategoryDto,
  CreateCashMovementDto,
  UpdateCashMovementDto,
} from './dto/cash-flow.dto';
import { Order, OrderItem } from '../orders/entities/order.entity';
import { OrderPayment } from '../payments/entities/order-payment.entity';
import { OrderReturn } from '../returns/entities/order-return.entity';
import { Client } from '../clients/entities/client.entity';
import { Product } from '../products/entities/product.entity';
import {
  OrderReturnStatus,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
} from '../common/enums';

export type CashFlowQuery = {
  companyIds?: string[] | null;
  from?: string;
  to?: string;
  type?: 'income' | 'expense' | 'all';
  categoryId?: string;
  categoryPath?: string;
  method?: string;
  search?: string;
  productId?: string;
  productCategory?: string;
  agentId?: string;
  sort?: string;
  page?: number;
  pageSize?: number;
};

type LedgerRow = {
  id: string;
  companyId: string;
  type: 'income' | 'expense';
  categoryId: string | null;
  categoryPath: string | null;
  amount: number;
  method: string;
  cashbox: string | null;
  counterparty: string | null;
  note: string | null;
  occurredAt: string;
  sourceType: string;
  sourceId: string | null;
  orderId: string | null;
  editable: boolean;
};

function n(v: unknown, fallback = 0): number {
  const x = Number(v);
  return Number.isFinite(x) ? x : fallback;
}

function parseDayStart(iso?: string): Date | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  d.setHours(0, 0, 0, 0);
  return d;
}

function parseDayEnd(iso?: string): Date | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  d.setHours(23, 59, 59, 999);
  return d;
}

function inRange(at: Date, from: Date | null, to: Date | null): boolean {
  const t = at.getTime();
  if (from && t < from.getTime()) return false;
  if (to && t > to.getTime()) return false;
  return true;
}

function dayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function onlyUuids(ids: Iterable<string>): string[] {
  return [...new Set([...ids].filter((id) => UUID_RE.test(id)))];
}

@Injectable()
export class CashFlowService {
  constructor(
    @InjectRepository(CashMovement)
    private readonly movementRepo: Repository<CashMovement>,
    @InjectRepository(CashCategory)
    private readonly categoryRepo: Repository<CashCategory>,
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @InjectRepository(OrderPayment)
    private readonly paymentRepo: Repository<OrderPayment>,
    @InjectRepository(OrderReturn)
    private readonly returnRepo: Repository<OrderReturn>,
    @InjectRepository(Client)
    private readonly clientRepo: Repository<Client>,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
  ) {}

  // ─── Categories ────────────────────────────────────────────────────────────

  async listCategories(companyIds?: string[] | null) {
    const qb = this.categoryRepo
      .createQueryBuilder('c')
      .where('c.isActive = true')
      .orderBy('c.sortOrder', 'ASC')
      .addOrderBy('c.name', 'ASC');
    if (companyIds?.length) {
      qb.andWhere('(c.companyId IS NULL OR c.companyId IN (:...ids))', {
        ids: companyIds,
      });
    }
    return qb.getMany();
  }

  async createCategory(dto: CreateCashCategoryDto) {
    const row = this.categoryRepo.create({
      companyId: dto.companyId?.trim() || null,
      parentId: dto.parentId ?? null,
      name: dto.name.trim(),
      kind: dto.kind ?? 'expense',
      sortOrder: dto.sortOrder ?? 0,
      isActive: true,
    });
    return this.categoryRepo.save(row);
  }

  // ─── Manual movements CRUD ─────────────────────────────────────────────────

  async createMovement(
    dto: CreateCashMovementDto,
    userId?: string,
    userName?: string,
  ) {
    const amount = n(dto.amount);
    if (!(amount > 0)) throw new BadRequestException('Invalid amount');
    const occurredAt = new Date(dto.occurredAt);
    if (Number.isNaN(occurredAt.getTime())) {
      throw new BadRequestException('Invalid occurredAt');
    }
    let categoryPath = dto.categoryPath?.trim() || null;
    if (dto.categoryId && !categoryPath) {
      categoryPath = await this.buildCategoryPath(dto.categoryId);
    }
    const row = this.movementRepo.create({
      companyId: dto.companyId.trim(),
      type: dto.type,
      amount,
      occurredAt,
      categoryId: dto.categoryId ?? null,
      categoryPath,
      method: dto.method ?? 'cash',
      cashbox: dto.cashbox ?? null,
      counterparty: dto.counterparty ?? null,
      note: dto.note ?? null,
      sourceType: 'manual',
      sourceId: null,
      orderId: null,
      createdByUserId: userId ?? null,
      createdByName: userName ?? null,
      isDeleted: false,
    });
    return this.movementRepo.save(row);
  }

  async updateMovement(id: string, dto: UpdateCashMovementDto) {
    const row = await this.movementRepo.findOne({ where: { id, isDeleted: false } });
    if (!row) throw new NotFoundException('Movement not found');
    if (row.sourceType !== 'manual') {
      throw new BadRequestException('Only manual movements can be edited');
    }
    if (dto.type) row.type = dto.type;
    if (dto.amount != null) {
      const amount = n(dto.amount);
      if (!(amount > 0)) throw new BadRequestException('Invalid amount');
      row.amount = amount;
    }
    if (dto.occurredAt) {
      const occurredAt = new Date(dto.occurredAt);
      if (Number.isNaN(occurredAt.getTime())) {
        throw new BadRequestException('Invalid occurredAt');
      }
      row.occurredAt = occurredAt;
    }
    if (dto.categoryId !== undefined) {
      row.categoryId = dto.categoryId;
      row.categoryPath =
        dto.categoryPath?.trim() ||
        (dto.categoryId ? await this.buildCategoryPath(dto.categoryId) : null);
    } else if (dto.categoryPath !== undefined) {
      row.categoryPath = dto.categoryPath;
    }
    if (dto.method) row.method = dto.method;
    if (dto.cashbox !== undefined) row.cashbox = dto.cashbox;
    if (dto.counterparty !== undefined) row.counterparty = dto.counterparty;
    if (dto.note !== undefined) row.note = dto.note;
    return this.movementRepo.save(row);
  }

  async deleteMovement(id: string) {
    const row = await this.movementRepo.findOne({ where: { id, isDeleted: false } });
    if (!row) throw new NotFoundException('Movement not found');
    if (row.sourceType !== 'manual') {
      throw new BadRequestException('Only manual movements can be deleted');
    }
    row.isDeleted = true;
    await this.movementRepo.save(row);
    return { ok: true };
  }

  private async buildCategoryPath(categoryId: string): Promise<string | null> {
    const parts: string[] = [];
    let id: string | null = categoryId;
    const guard = new Set<string>();
    while (id && !guard.has(id)) {
      guard.add(id);
      const cat = await this.categoryRepo.findOne({ where: { id } });
      if (!cat) break;
      parts.unshift(cat.name);
      id = cat.parentId;
    }
    return parts.length ? parts.join(' / ') : null;
  }

  // ─── Unified ledger ────────────────────────────────────────────────────────

  async buildLedger(q: CashFlowQuery): Promise<LedgerRow[]> {
    const from = parseDayStart(q.from);
    const to = parseDayEnd(q.to);
    const companyIds = q.companyIds?.length ? q.companyIds : null;

    const manualQb = this.movementRepo
      .createQueryBuilder('m')
      .where('m.isDeleted = false')
      .andWhere("m.sourceType = 'manual'");
    if (companyIds) {
      manualQb.andWhere('m.companyId IN (:...cids)', { cids: companyIds });
    }
    if (from) manualQb.andWhere('m.occurredAt >= :from', { from });
    if (to) manualQb.andWhere('m.occurredAt <= :to', { to });
    if (q.type && q.type !== 'all') {
      manualQb.andWhere('m.type = :type', { type: q.type });
    }
    if (q.categoryId) {
      manualQb.andWhere('m.categoryId = :categoryId', { categoryId: q.categoryId });
    }
    if (q.categoryPath) {
      manualQb.andWhere('m.categoryPath ILIKE :cpath', {
        cpath: `%${q.categoryPath}%`,
      });
    }
    if (q.method && q.method !== 'all') {
      manualQb.andWhere('m.method = :method', { method: q.method });
    }
    if (q.search) {
      manualQb.andWhere(
        '(m.counterparty ILIKE :s OR m.note ILIKE :s OR m.categoryPath ILIKE :s)',
        { s: `%${q.search}%` },
      );
    }
    const manuals = await manualQb.getMany();

    const rows: LedgerRow[] = manuals.map((m) => ({
      id: m.id,
      companyId: m.companyId,
      type: m.type,
      categoryId: m.categoryId,
      categoryPath: m.categoryPath,
      amount: n(m.amount),
      method: m.method,
      cashbox: m.cashbox,
      counterparty: m.counterparty,
      note: m.note,
      occurredAt: m.occurredAt.toISOString(),
      sourceType: m.sourceType,
      sourceId: m.sourceId,
      orderId: m.orderId,
      editable: true,
    }));

    // Auto income from real collected payments (cash/terminal only; deferred unpaid skipped)
    if (!q.type || q.type === 'all' || q.type === 'income') {
      const payRows = await this.loadPaymentIncomes(companyIds, from, to, q);
      rows.push(...payRows);
    }

    rows.sort(
      (a, b) =>
        new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime(),
    );
    return rows;
  }

  private async loadPaymentIncomes(
    companyIds: string[] | null,
    from: Date | null,
    to: Date | null,
    q: CashFlowQuery,
  ): Promise<LedgerRow[]> {
    const qb = this.paymentRepo
      .createQueryBuilder('p')
      .innerJoin(Order, 'o', 'o.id = p.orderId')
      .where('p.paidAmount > 0')
      .andWhere('p.status IN (:...st)', {
        st: [PaymentStatus.PAID, PaymentStatus.PARTIAL],
      })
      .andWhere('p.method IN (:...methods)', {
        methods: [PaymentMethod.CASH, PaymentMethod.TERMINAL],
      })
      .select([
        'p.id AS id',
        'p.paidAmount AS "paidAmount"',
        'p.method AS method',
        'p.createdAt AS "createdAt"',
        'p.updatedAt AS "updatedAt"',
        'p.paidAt AS "paidAt"',
        'p.clientId AS "clientId"',
        'o.id AS "orderId"',
        'o.companyId AS "companyId"',
      ]);

    if (companyIds?.length) {
      qb.andWhere('o.companyId IN (:...cids)', { cids: companyIds });
    }
    // Haqiqiy pul kelgan sana: paidAt → updatedAt → createdAt
    if (from) {
      qb.andWhere(
        'COALESCE(p."paidAt", GREATEST(p."updatedAt", p."createdAt")) >= :from',
        { from },
      );
    }
    if (to) {
      qb.andWhere(
        'COALESCE(p."paidAt", GREATEST(p."updatedAt", p."createdAt")) <= :to',
        { to },
      );
    }
    if (q.method && q.method !== 'all') {
      qb.andWhere('p.method = :method', { method: q.method });
    }

    const raw = await qb.getRawMany<{
      id: string;
      paidAmount: string;
      method: string;
      createdAt: Date;
      updatedAt: Date;
      paidAt: Date | null;
      clientId: string;
      orderId: string;
      companyId: string;
    }>();

    if (!raw.length) return [];

    const clientIds = onlyUuids(raw.map((r) => r.clientId).filter(Boolean));
    const clients = clientIds.length
      ? await this.clientRepo.find({ where: { id: In(clientIds) } })
      : [];
    const clientMap = new Map(clients.map((c) => [c.id, c.name || c.fullName || c.code]));

    const search = q.search?.trim().toLowerCase();
    const out: LedgerRow[] = [];
    for (const r of raw) {
      const occurred = r.paidAt
        ? new Date(r.paidAt)
        : new Date(
            Math.max(
              new Date(r.updatedAt).getTime(),
              new Date(r.createdAt).getTime(),
            ),
          );
      if (!inRange(occurred, from, to)) continue;
      const counterparty = clientMap.get(r.clientId) ?? null;
      const note = `Buyurtma to‘lovi`;
      if (search) {
        const hay = `${counterparty ?? ''} ${note} ${r.orderId}`.toLowerCase();
        if (!hay.includes(search)) continue;
      }
      if (q.categoryPath && !'Mijoz to‘lovlari'.toLowerCase().includes(q.categoryPath.toLowerCase())) {
        continue;
      }
      out.push({
        id: `pay:${r.id}`,
        companyId: r.companyId,
        type: 'income',
        categoryId: null,
        categoryPath: 'Mijoz to‘lovlari',
        amount: n(r.paidAmount),
        method: r.method === PaymentMethod.TERMINAL ? 'terminal' : 'cash',
        cashbox: null,
        counterparty,
        note,
        occurredAt: occurred.toISOString(),
        sourceType: 'order_payment',
        sourceId: r.id,
        orderId: r.orderId,
        editable: false,
      });
    }
    return out;
  }

  async listMovements(q: CashFlowQuery) {
    const all = await this.buildLedger(q);
    const page = Math.max(1, q.page ?? 1);
    const pageSize = Math.min(200, Math.max(1, q.pageSize ?? 50));
    const start = (page - 1) * pageSize;
    return {
      items: all.slice(start, start + pageSize),
      total: all.length,
      page,
      pageSize,
      incomeTotal: all.filter((r) => r.type === 'income').reduce((s, r) => s + r.amount, 0),
      expenseTotal: all.filter((r) => r.type === 'expense').reduce((s, r) => s + r.amount, 0),
    };
  }

  async groups(q: CashFlowQuery) {
    const all = await this.buildLedger({ ...q, type: q.type ?? 'expense' });
    type Node = {
      name: string;
      path: string;
      amount: number;
      count: number;
      children: Map<string, Node>;
      operations: LedgerRow[];
    };
    const root = new Map<string, Node>();

    const ensure = (map: Map<string, Node>, name: string, path: string): Node => {
      let n0 = map.get(name);
      if (!n0) {
        n0 = { name, path, amount: 0, count: 0, children: new Map(), operations: [] };
        map.set(name, n0);
      }
      return n0;
    };

    for (const row of all) {
      const parts = (row.categoryPath || 'Boshqa')
        .split('/')
        .map((s) => s.trim())
        .filter(Boolean);
      if (!parts.length) parts.push('Boshqa');
      let map = root;
      let pathAcc = '';
      let node: Node | null = null;
      for (let i = 0; i < parts.length; i++) {
        pathAcc = pathAcc ? `${pathAcc} / ${parts[i]}` : parts[i];
        node = ensure(map, parts[i], pathAcc);
        node.amount += row.amount;
        node.count += 1;
        map = node.children;
      }
      if (node) node.operations.push(row);
    }

    const toJson = (map: Map<string, Node>): any[] =>
      [...map.values()]
        .sort((a, b) => b.amount - a.amount)
        .map((n0) => ({
          name: n0.name,
          path: n0.path,
          amount: n0.amount,
          count: n0.count,
          children: toJson(n0.children),
          operations: n0.children.size ? [] : n0.operations,
        }));

    const tree = toJson(root);
    const total = all.reduce((s, r) => s + r.amount, 0);
    return { total, groups: tree };
  }

  // ─── Summary (Umumiy) ──────────────────────────────────────────────────────

  async summary(q: CashFlowQuery) {
    const ledger = await this.buildLedger({ ...q, type: 'all' });
    const incomeTotal = ledger
      .filter((r) => r.type === 'income')
      .reduce((s, r) => s + r.amount, 0);
    const expenseTotal = ledger
      .filter((r) => r.type === 'expense')
      .reduce((s, r) => s + r.amount, 0);
    const netCash = incomeTotal - expenseTotal;

    const profit = await this.salesProfit(q);
    const grossProfit = profit.totals.grossProfit;

    const byDay = new Map<string, { date: string; income: number; expense: number }>();
    for (const row of ledger) {
      const key = dayKey(new Date(row.occurredAt));
      let slot = byDay.get(key);
      if (!slot) {
        slot = { date: key, income: 0, expense: 0 };
        byDay.set(key, slot);
      }
      if (row.type === 'income') slot.income += row.amount;
      else slot.expense += row.amount;
    }
    const chart = [...byDay.values()].sort((a, b) => a.date.localeCompare(b.date));

    const expenseGroups = new Map<string, number>();
    for (const row of ledger.filter((r) => r.type === 'expense')) {
      const top = (row.categoryPath || 'Boshqa').split('/')[0].trim() || 'Boshqa';
      expenseGroups.set(top, (expenseGroups.get(top) ?? 0) + row.amount);
    }
    const topExpenseGroups = [...expenseGroups.entries()]
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 8);

    return {
      incomeTotal,
      expenseTotal,
      netCash,
      grossProfit,
      chart,
      topExpenseGroups,
      profitMeta: {
        missingCostLines: profit.totals.missingCostLines,
        totalLines: profit.totals.totalLines,
        partial: profit.totals.missingCostLines > 0,
      },
    };
  }

  // ─── Sales profit ──────────────────────────────────────────────────────────

  async salesProfit(q: CashFlowQuery) {
    const from = parseDayStart(q.from);
    const to = parseDayEnd(q.to);
    const companyIds = q.companyIds?.length ? q.companyIds : null;

    const orderQb = this.orderRepo
      .createQueryBuilder('o')
      .where('o.status = :st', { st: OrderStatus.DELIVERED })
      .andWhere('o.deliveredAt IS NOT NULL');
    if (companyIds) {
      orderQb.andWhere('o.companyId IN (:...cids)', { cids: companyIds });
    }
    if (from) orderQb.andWhere('o.deliveredAt >= :from', { from });
    if (to) orderQb.andWhere('o.deliveredAt <= :to', { to });
    if (q.agentId) {
      orderQb.andWhere('o.distributorId = :agentId', { agentId: q.agentId });
    }
    const orders = await orderQb.getMany();

    const orderIds = orders.map((o) => o.id);
    const returns = orderIds.length
      ? await this.returnRepo.find({
          where: {
            orderId: In(orderIds),
            status: OrderReturnStatus.ACCEPTED,
          },
        })
      : [];
    const returnsByOrder = new Map<string, OrderReturn[]>();
    for (const r of returns) {
      const list = returnsByOrder.get(r.orderId) ?? [];
      list.push(r);
      returnsByOrder.set(r.orderId, list);
    }

    const productIds = new Set<string>();
    for (const o of orders) {
      for (const it of o.items || []) {
        if (it.productId) productIds.add(it.productId);
      }
    }
    const uuidProductIds = onlyUuids(productIds);
    const products = uuidProductIds.length
      ? await this.productRepo.find({ where: { id: In(uuidProductIds) } })
      : [];
    const productMap = new Map(products.map((p) => [p.id, p]));

    type Agg = {
      productId: string;
      productCode: string;
      productName: string;
      category: string | null;
      unit: string;
      qty: number;
      netSales: number;
      cogs: number;
      grossProfit: number;
      missingCostQty: number;
      lines: {
        orderId: string;
        deliveredAt: string | null;
        qty: number;
        netSales: number;
        unitCost: number | null;
        cogs: number | null;
        grossProfit: number | null;
        costMissing: boolean;
      }[];
    };

    const byProduct = new Map<string, Agg>();
    let totalLines = 0;
    let missingCostLines = 0;

    for (const order of orders) {
      const retItems = (returnsByOrder.get(order.id) ?? []).flatMap((r) => r.items || []);
      const returnedQty = new Map<string, number>();
      for (const ri of retItems) {
        const key = ri.productId || ri.productCode || ri.productName;
        returnedQty.set(key, (returnedQty.get(key) ?? 0) + n(ri.quantity));
      }

      for (const it of order.items || []) {
        if (q.productId && it.productId !== q.productId) continue;
        const product = it.productId ? productMap.get(it.productId) : undefined;
        if (q.productCategory) {
          const cat = product?.category ?? '';
          if (!cat.toLowerCase().includes(q.productCategory.toLowerCase())) continue;
        }

        const soldQty = n(it.actualQuantity ?? it.quantity);
        const key = it.productId || it.productCode || it.productName;
        const retQty = Math.min(soldQty, returnedQty.get(key) ?? 0);
        if (retQty > 0) returnedQty.set(key, (returnedQty.get(key) ?? 0) - retQty);
        const netQty = Math.max(0, soldQty - retQty);
        if (!(netQty > 0) && !(soldQty > 0)) continue;

        const unitPrice = n(it.price);
        // Free promo lines: price 0 → no sales, still track qty if needed
        const netSales = netQty * unitPrice;
        totalLines += 1;

        let unitCost: number | null = null;
        let costMissing = false;
        if (it.unitCost != null && Number.isFinite(Number(it.unitCost))) {
          unitCost = n(it.unitCost);
        } else if (product && n(product.costPrice) > 0) {
          // Fallback only flagged as missing historical snapshot — do NOT inflate profit with 0
          unitCost = null;
          costMissing = true;
          missingCostLines += 1;
        } else {
          costMissing = true;
          missingCostLines += 1;
        }

        const cogs = unitCost != null ? netQty * unitCost : null;
        const grossProfit = cogs != null ? netSales - cogs : null;

        const pid = it.productId || key;
        let agg = byProduct.get(pid);
        if (!agg) {
          agg = {
            productId: pid,
            productCode: it.productCode || product?.code || '',
            productName: it.productName || product?.name || pid,
            category: product?.category ?? null,
            unit: it.unit || product?.unit || 'dona',
            qty: 0,
            netSales: 0,
            cogs: 0,
            grossProfit: 0,
            missingCostQty: 0,
            lines: [],
          };
          byProduct.set(pid, agg);
        }
        agg.qty += netQty;
        agg.netSales += netSales;
        if (cogs != null && grossProfit != null) {
          agg.cogs += cogs;
          agg.grossProfit += grossProfit;
        } else {
          agg.missingCostQty += netQty;
        }
        agg.lines.push({
          orderId: order.id,
          deliveredAt: order.deliveredAt?.toISOString() ?? null,
          qty: netQty,
          netSales,
          unitCost,
          cogs,
          grossProfit,
          costMissing,
        });
      }
    }

    let rows = [...byProduct.values()].map((a) => {
      const knownSales = a.lines
        .filter((l) => !l.costMissing)
        .reduce((s, l) => s + l.netSales, 0);
      const margin =
        knownSales > 0 ? (a.grossProfit / knownSales) * 100 : a.netSales > 0 && a.missingCostQty <= 0
          ? (a.grossProfit / a.netSales) * 100
          : null;
      return {
        productId: a.productId,
        productCode: a.productCode,
        productName: a.productName,
        category: a.category,
        unit: a.unit,
        qty: a.qty,
        netSales: a.netSales,
        cogs: a.missingCostQty > 0 && a.cogs === 0 && a.lines.every((l) => l.costMissing)
          ? null
          : a.cogs,
        grossProfit: a.lines.every((l) => l.costMissing) ? null : a.grossProfit,
        marginPct: margin,
        costMissing: a.missingCostQty > 0,
        missingCostQty: a.missingCostQty,
        lines: a.lines,
      };
    });

    const sort = q.sort || 'grossProfit_desc';
    rows.sort((a, b) => {
      const av = a.grossProfit ?? -Infinity;
      const bv = b.grossProfit ?? -Infinity;
      if (sort === 'grossProfit_asc') return av - bv;
      if (sort === 'netSales_desc') return b.netSales - a.netSales;
      if (sort === 'margin_desc') return (b.marginPct ?? -Infinity) - (a.marginPct ?? -Infinity);
      if (sort === 'name') return a.productName.localeCompare(b.productName);
      return bv - av;
    });

    const totals = {
      netSales: rows.reduce((s, r) => s + r.netSales, 0),
      cogs: rows.reduce((s, r) => s + (r.cogs ?? 0), 0),
      grossProfit: rows.reduce((s, r) => s + (r.grossProfit ?? 0), 0),
      marginPct: 0 as number | null,
      totalLines,
      missingCostLines,
    };
    const knownNet = rows
      .filter((r) => r.grossProfit != null)
      .reduce((s, r) => s + r.netSales, 0);
    totals.marginPct =
      knownNet > 0 ? (totals.grossProfit / knownNet) * 100 : totals.netSales > 0 && missingCostLines === 0
        ? (totals.grossProfit / totals.netSales) * 100
        : totals.netSales === 0
          ? null
          : null;

    return { totals, rows };
  }

  /** Snapshot unit cost onto order items (called from orders flow). */
  static applyUnitCosts(items: OrderItem[], costByProductId: Map<string, number>): OrderItem[] {
    return items.map((it) => {
      if (it.unitCost != null && Number.isFinite(Number(it.unitCost))) return it;
      const cost = it.productId ? costByProductId.get(it.productId) : undefined;
      if (cost == null || !(cost > 0)) return { ...it };
      return { ...it, unitCost: cost };
    });
  }
}
