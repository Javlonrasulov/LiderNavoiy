import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Order } from '../orders/entities/order.entity';
import { Client } from '../clients/entities/client.entity';
import { Company } from '../companies/entities/company.entity';
import { DistributorProfile } from '../distributors/entities/distributor-profile.entity';
import { User } from '../auth/entities/user.entity';
import { OrderPayment } from '../payments/entities/order-payment.entity';
import { OrderReturn } from '../returns/entities/order-return.entity';
import { OrderAuditEvent } from '../orders/entities/order-audit-event.entity';
import { OrderStatus, OrderReturnStatus, PaymentStatus } from '../common/enums';
import {
  DEBT_OVERDUE_AFTER_DAYS,
  debtAgeDays,
  isDebtOverdue,
  orderDebtDate,
  orderRemaining,
} from '../common/time/debt-age';

export type DebtAgePreset = 'all' | 'gt10' | 'gt20' | 'gt30' | 'gt60' | 'custom';
export type DebtSort = 'oldest' | 'largest' | 'name';

export interface DebtorsQuery {
  companyIds?: string[];
  agePreset?: DebtAgePreset;
  minAgeDays?: number;
  maxAgeDays?: number;
  search?: string;
  employeeId?: string;
  companyId?: string;
  debtDateFrom?: string;
  debtDateTo?: string;
  minRemaining?: number;
  maxRemaining?: number;
  sort?: DebtSort;
  page?: number;
  pageSize?: number;
}

type OpenDebtRow = {
  orderId: string;
  clientId: string;
  companyId: string | null;
  distributorId: string;
  totalAmount: number;
  paidAmount: number;
  returnedAmount: number;
  remaining: number;
  debtAt: Date;
  ageDays: number;
  overdue: boolean;
  orderNumber: string;
  createdAt: Date;
  deliveredAt: Date | null;
  paymentStatus: string;
  items: Order['items'];
  clientName: string;
  clientFullName: string | null;
  clientPhone: string | null;
  clientAddress: string | null;
  clientContact: string | null;
  clientNotes: string | null;
  assignedDistributorId: string | null;
};

function toNum(v: unknown): number {
  return Number(v) || 0;
}

function normalizeSearch(s?: string): string {
  return (s ?? '').trim().toLowerCase();
}

@Injectable()
export class DebtsService {
  constructor(
    @InjectRepository(Order) private readonly orderRepo: Repository<Order>,
    @InjectRepository(Client) private readonly clientRepo: Repository<Client>,
    @InjectRepository(Company) private readonly companyRepo: Repository<Company>,
    @InjectRepository(DistributorProfile) private readonly profileRepo: Repository<DistributorProfile>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(OrderPayment) private readonly paymentRepo: Repository<OrderPayment>,
    @InjectRepository(OrderReturn) private readonly returnRepo: Repository<OrderReturn>,
    @InjectRepository(OrderAuditEvent) private readonly auditRepo: Repository<OrderAuditEvent>,
  ) {}

  /** Dashboard kartasi: jami ochiq qarz + 30+ kun xavf. */
  async getDebtSummary(companyIds?: string[]) {
    const rows = await this.loadOpenDebtRows(companyIds);
    const totalRemaining = rows.reduce((s, r) => s + r.remaining, 0);
    const overdueRows = rows.filter((r) => r.overdue);
    const overdueClientIds = new Set(overdueRows.map((r) => r.clientId));
    const overdueRemaining = overdueRows.reduce((s, r) => s + r.remaining, 0);

    return {
      totalRemaining,
      openDocuments: rows.length,
      overdue: {
        active: overdueClientIds.size > 0,
        afterDays: DEBT_OVERDUE_AFTER_DAYS,
        clientsCount: overdueClientIds.size,
        remaining: overdueRemaining,
        documentsCount: overdueRows.length,
      },
    };
  }

  async listDebtors(query: DebtorsQuery) {
    const page = Math.max(1, query.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, query.pageSize ?? 30));
    const rows = await this.loadOpenDebtRows(query.companyIds);
    const employeeMapAll = await this.employeeNameMap([
      ...new Set(rows.map((r) => r.distributorId)),
    ]);
    const filteredDocs = this.filterDocuments(rows, query, employeeMapAll);

    const byClient = new Map<string, OpenDebtRow[]>();
    for (const row of filteredDocs) {
      const list = byClient.get(row.clientId) ?? [];
      list.push(row);
      byClient.set(row.clientId, list);
    }

    const companyMap = await this.companyNameMap([
      ...new Set(filteredDocs.map((r) => r.companyId).filter(Boolean) as string[]),
    ]);
    const employeeMap = employeeMapAll;

    let items = [...byClient.entries()].map(([clientId, docs]) => {
      const first = docs[0]!;
      const totalRemaining = docs.reduce((s, d) => s + d.remaining, 0);
      const overdueRemaining = docs.filter((d) => d.overdue).reduce((s, d) => s + d.remaining, 0);
      const oldest = docs.reduce((a, b) => (a.ageDays >= b.ageDays ? a : b));
      const companyId = first.companyId;
      return {
        clientId,
        name: first.clientName,
        fullName: first.clientFullName,
        phone: first.clientPhone,
        address: first.clientAddress,
        companyId,
        companyName: companyId ? companyMap.get(companyId) ?? null : null,
        openDocuments: docs.length,
        totalRemaining,
        overdueRemaining,
        oldestDebtDate: oldest.debtAt.toISOString(),
        oldestAgeDays: oldest.ageDays,
        hasOverdue: overdueRemaining > 0,
        employees: [
          ...new Set(
            docs
              .map((d) => employeeMap.get(d.distributorId)?.name)
              .filter((n): n is string => !!n),
          ),
        ],
        documentNumbers: docs.map((d) => d.orderNumber),
      };
    });

    const sort = query.sort ?? 'oldest';
    items.sort((a, b) => {
      if (sort === 'largest') return b.totalRemaining - a.totalRemaining;
      if (sort === 'name') return a.name.localeCompare(b.name, 'uz');
      if (b.oldestAgeDays !== a.oldestAgeDays) return b.oldestAgeDays - a.oldestAgeDays;
      return b.totalRemaining - a.totalRemaining;
    });

    const totalClients = items.length;
    const totalDocuments = filteredDocs.length;
    const totalRemaining = filteredDocs.reduce((s, r) => s + r.remaining, 0);
    const start = (page - 1) * pageSize;
    const pageItems = items.slice(start, start + pageSize);

    return {
      summary: {
        clientsCount: totalClients,
        documentsCount: totalDocuments,
        totalRemaining,
      },
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(totalClients / pageSize)),
      items: pageItems,
    };
  }

  async getFilterOptions(companyIds?: string[]) {
    const rows = await this.loadOpenDebtRows(companyIds);
    const companyIdsPresent = [...new Set(rows.map((r) => r.companyId).filter(Boolean) as string[])];
    const employeeIds = [...new Set(rows.map((r) => r.distributorId))];
    const [companies, employees] = await Promise.all([
      this.companyNameMap(companyIdsPresent),
      this.employeeNameMap(employeeIds),
    ]);
    return {
      companies: companyIdsPresent.map((id) => ({
        id,
        name: companies.get(id) ?? id,
      })),
      employees: employeeIds
        .map((id) => {
          const e = employees.get(id);
          return e ? { id, name: e.name, position: e.position } : null;
        })
        .filter(Boolean),
    };
  }

  async getClientDebtDetail(clientId: string, companyIds?: string[], focusAgePreset?: DebtAgePreset) {
    const client = await this.clientRepo.findOne({ where: { id: clientId } });
    if (!client) throw new NotFoundException('Mijoz topilmadi');

    if (companyIds?.length) {
      const linked = [
        client.companyId,
        ...(Array.isArray(client.linkedCompanyIds) ? client.linkedCompanyIds : []),
      ].filter(Boolean) as string[];
      if (!linked.some((id) => companyIds.includes(id))) {
        throw new NotFoundException('Mijoz topilmadi');
      }
    }

    const allRows = (await this.loadOpenDebtRows(companyIds)).filter((r) => r.clientId === clientId);
    const closedHint = allRows.length === 0;

    // Barcha yetkazilgan hujjatlar (yopilganlari tarix uchun)
    let orders = await this.orderRepo.find({
      where: { clientId, status: OrderStatus.DELIVERED },
      order: { createdAt: 'DESC' },
    });
    if (companyIds?.length) {
      orders = orders.filter(
        (o) =>
          (o.companyId && companyIds.includes(o.companyId)) ||
          (client.companyId && companyIds.includes(client.companyId)) ||
          (Array.isArray(client.linkedCompanyIds) &&
            client.linkedCompanyIds.some((id) => companyIds.includes(id))),
      );
    }

    const orderIds = orders.map((o) => o.id);
    const [payments, returns, audits, companyMap] = await Promise.all([
      orderIds.length
        ? this.paymentRepo.find({ where: { orderId: In(orderIds) }, order: { createdAt: 'ASC' } })
        : Promise.resolve([] as OrderPayment[]),
      orderIds.length
        ? this.returnRepo.find({ where: { orderId: In(orderIds) }, order: { createdAt: 'ASC' } })
        : Promise.resolve([] as OrderReturn[]),
      orderIds.length
        ? this.auditRepo.find({ where: { orderId: In(orderIds) }, order: { createdAt: 'ASC' } })
        : Promise.resolve([] as OrderAuditEvent[]),
      this.companyNameMap([
        ...new Set(
          [client.companyId, ...orders.map((o) => o.companyId)].filter(Boolean) as string[],
        ),
      ]),
    ]);

    const employeeIds = [
      ...new Set(
        [
          client.distributorId,
          ...orders.map((o) => o.distributorId),
          ...payments
            .map((p) => p.collectorDistributorId)
            .filter((id): id is string => !!id),
        ].filter((id): id is string => !!id),
      ),
    ];
    const [employeeMap, assigned] = await Promise.all([
      this.employeeNameMap(employeeIds),
      client.distributorId
        ? this.employeeNameMap([client.distributorId])
        : Promise.resolve(new Map<string, { name: string; position: string | null }>()),
    ]);

    const payByOrder = new Map<string, OrderPayment[]>();
    for (const p of payments) {
      const list = payByOrder.get(p.orderId) ?? [];
      list.push(p);
      payByOrder.set(p.orderId, list);
    }
    const retByOrder = new Map<string, OrderReturn[]>();
    for (const r of returns) {
      const list = retByOrder.get(r.orderId) ?? [];
      list.push(r);
      retByOrder.set(r.orderId, list);
    }
    const auditByOrder = new Map<string, OrderAuditEvent[]>();
    for (const a of audits) {
      const list = auditByOrder.get(a.orderId) ?? [];
      list.push(a);
      auditByOrder.set(a.orderId, list);
    }

    const NA = 'Maʼlumot mavjud emas';

    const documents = orders.map((o) => {
      const remaining = orderRemaining(o.totalAmount, o.paidAmount, o.returnedAmount);
      const debtAt = orderDebtDate(o.deliveredAt, o.createdAt);
      const ageDays = debtAgeDays(debtAt);
      const overdue = isDebtOverdue(remaining, ageDays);
      const seller = employeeMap.get(o.distributorId);
      const auditSeller = (auditByOrder.get(o.id) ?? []).find((a) => a.actorName)?.actorName;
      const companyId = o.companyId ?? client.companyId;
      const orderPays = payByOrder.get(o.id) ?? [];
      const orderRets = retByOrder.get(o.id) ?? [];

      const history: Array<{
        type: 'sale' | 'payment' | 'return' | 'adjustment';
        at: string;
        amount: number;
        method?: string | null;
        documentNo?: string | null;
        actorName?: string | null;
        note?: string | null;
        status?: string | null;
      }> = [];

      history.push({
        type: 'sale',
        at: (debtAt ?? o.createdAt).toISOString(),
        amount: toNum(o.totalAmount),
        documentNo: this.shortOrderNo(o.id),
        actorName: seller?.name ?? auditSeller ?? null,
        note: null,
        status: o.status,
      });

      for (const p of orderPays) {
        const paid = toNum(p.paidAmount);
        if (paid <= 0 && p.status === PaymentStatus.PENDING) continue;
        history.push({
          type: 'payment',
          at: p.createdAt.toISOString(),
          amount: paid > 0 ? paid : toNum(p.amount),
          method: p.method,
          documentNo: p.id.slice(0, 8).toUpperCase(),
          actorName: p.collectorDistributorId
            ? employeeMap.get(p.collectorDistributorId)?.name ?? null
            : null,
          note: null,
          status: p.status,
        });
      }

      for (const r of orderRets) {
        if (r.status !== OrderReturnStatus.ACCEPTED && r.status !== OrderReturnStatus.PENDING) {
          // reject ham tarixda ko‘rinsin
        }
        history.push({
          type: 'return',
          at: r.createdAt.toISOString(),
          amount: toNum(r.totalAmount),
          documentNo: r.id.slice(0, 8).toUpperCase(),
          actorName: null,
          note: r.note,
          status: r.status,
        });
      }

      history.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());

      const dueAt = orderPays
        .map((p) => p.dueAt)
        .filter(Boolean)
        .sort((a, b) => (a!.getTime() - b!.getTime()))[0];

      return {
        orderId: o.id,
        orderNumber: this.shortOrderNo(o.id),
        open: remaining > 0,
        overdue,
        ageDays,
        debtAt: debtAt?.toISOString() ?? null,
        dueAt: dueAt?.toISOString() ?? null,
        initialAmount: toNum(o.totalAmount),
        paidAmount: toNum(o.paidAmount),
        returnedAmount: toNum(o.returnedAmount),
        remaining,
        paymentStatus: o.paymentStatus,
        companyId,
        companyName: companyId ? companyMap.get(companyId) ?? null : null,
        soldBy: {
          distributorId: o.distributorId,
          name: seller?.name ?? auditSeller ?? NA,
          position: seller?.position ?? null,
        },
        items: (o.items ?? []).map((it) => ({
          productId: it.productId,
          productCode: it.productCode,
          productName: it.productName,
          quantity: it.quantity,
          price: it.price,
          unit: it.unit,
          isFree: !!it.isFree,
          lineTotal: (Number(it.quantity) || 0) * (Number(it.price) || 0),
        })),
        history,
        matchesAgeFilter: this.docMatchesAge(
          { remaining, ageDays, overdue },
          focusAgePreset ?? 'all',
        ),
      };
    });

    const openDocs = documents.filter((d) => d.open);
    openDocs.sort((a, b) => b.ageDays - a.ageDays);
    const closedDocs = documents.filter((d) => !d.open);

    // Age-filter mos hujjatlar oldinda
    const matched = openDocs.filter((d) => d.matchesAgeFilter);
    const restOpen = openDocs.filter((d) => !d.matchesAgeFilter);

    const assignedEmp = client.distributorId ? assigned.get(client.distributorId) : null;

    return {
      client: {
        id: client.id,
        name: client.name,
        fullName: client.fullName,
        phone: client.phone,
        address: client.address,
        contactPerson: client.contactPerson,
        companyId: client.companyId,
        companyName: client.companyId ? companyMap.get(client.companyId) ?? null : null,
        notes: null,
        assignedAgent: assignedEmp
          ? { distributorId: client.distributorId, name: assignedEmp.name, position: assignedEmp.position }
          : client.distributorId
            ? { distributorId: client.distributorId, name: NA, position: null }
            : null,
      },
      summary: {
        openDocuments: openDocs.length,
        totalRemaining: openDocs.reduce((s, d) => s + d.remaining, 0),
        overdueRemaining: openDocs.filter((d) => d.overdue).reduce((s, d) => s + d.remaining, 0),
        emptyHint: closedHint,
      },
      openDocuments: [...matched, ...restOpen],
      closedDocuments: closedDocs,
    };
  }

  // ─── internals ─────────────────────────────────────────────────────────

  private shortOrderNo(id: string): string {
    return id.replace(/-/g, '').slice(0, 8).toUpperCase();
  }

  private async loadOpenDebtRows(companyIds?: string[]): Promise<OpenDebtRow[]> {
    if (Array.isArray(companyIds) && companyIds.length === 0) return [];

    const qb = this.orderRepo
      .createQueryBuilder('o')
      .innerJoin(Client, 'c', 'c.id = o.clientId')
      .select('o.id', 'orderId')
      .addSelect('o.clientId', 'clientId')
      .addSelect('o.companyId', 'companyId')
      .addSelect('o.distributorId', 'distributorId')
      .addSelect('o.totalAmount', 'totalAmount')
      .addSelect('o.paidAmount', 'paidAmount')
      .addSelect('o.returnedAmount', 'returnedAmount')
      .addSelect('o.createdAt', 'createdAt')
      .addSelect('o.deliveredAt', 'deliveredAt')
      .addSelect('o.paymentStatus', 'paymentStatus')
      .addSelect('o.items', 'items')
      .addSelect('c.name', 'clientName')
      .addSelect('c.fullName', 'clientFullName')
      .addSelect('c.phone', 'clientPhone')
      .addSelect('c.address', 'clientAddress')
      .addSelect('c.contactPerson', 'clientContact')
      .addSelect('c.distributorId', 'assignedDistributorId')
      .where('o.status = :st', { st: OrderStatus.DELIVERED })
      .andWhere(
        `GREATEST(o.totalAmount - COALESCE(o.paidAmount, 0) - COALESCE(o.returnedAmount, 0), 0) > 0`,
      );

    if (companyIds?.length) {
      qb.andWhere(
        `(o.companyId IN (:...companyIds) OR c.companyId IN (:...companyIds) OR c.linkedCompanyIds ?| ARRAY[:...companyIds]::text[])`,
        { companyIds },
      );
    }

    const raw = await qb.getRawMany<{
      orderId: string;
      clientId: string;
      companyId: string | null;
      distributorId: string;
      totalAmount: string;
      paidAmount: string;
      returnedAmount: string;
      createdAt: Date;
      deliveredAt: Date | null;
      paymentStatus: string;
      items: Order['items'];
      clientName: string;
      clientFullName: string | null;
      clientPhone: string | null;
      clientAddress: string | null;
      clientContact: string | null;
      assignedDistributorId: string | null;
    }>();

    return raw.map((r) => {
      const remaining = orderRemaining(r.totalAmount, r.paidAmount, r.returnedAmount);
      const debtAt = orderDebtDate(r.deliveredAt, r.createdAt) ?? new Date(r.createdAt);
      const ageDays = debtAgeDays(debtAt);
      return {
        orderId: r.orderId,
        clientId: r.clientId,
        companyId: r.companyId,
        distributorId: r.distributorId,
        totalAmount: toNum(r.totalAmount),
        paidAmount: toNum(r.paidAmount),
        returnedAmount: toNum(r.returnedAmount),
        remaining,
        debtAt,
        ageDays,
        overdue: isDebtOverdue(remaining, ageDays),
        orderNumber: this.shortOrderNo(r.orderId),
        createdAt: new Date(r.createdAt),
        deliveredAt: r.deliveredAt ? new Date(r.deliveredAt) : null,
        paymentStatus: r.paymentStatus,
        items: r.items ?? [],
        clientName: r.clientName,
        clientFullName: r.clientFullName,
        clientPhone: r.clientPhone,
        clientAddress: r.clientAddress,
        clientContact: r.clientContact,
        clientNotes: null,
        assignedDistributorId: r.assignedDistributorId,
      };
    });
  }

  private ageBounds(query: DebtorsQuery): { min?: number; max?: number } {
    const preset = query.agePreset ?? 'all';
    if (preset === 'gt10') return { min: 11 };
    if (preset === 'gt20') return { min: 21 };
    if (preset === 'gt30') return { min: 31 };
    if (preset === 'gt60') return { min: 61 };
    if (preset === 'custom') {
      return {
        min: query.minAgeDays != null ? Number(query.minAgeDays) : undefined,
        max: query.maxAgeDays != null ? Number(query.maxAgeDays) : undefined,
      };
    }
    return {};
  }

  private docMatchesAge(
    doc: { remaining: number; ageDays: number; overdue: boolean },
    preset: DebtAgePreset,
    minAgeDays?: number,
    maxAgeDays?: number,
  ): boolean {
    if (doc.remaining <= 0) return false;
    const bounds =
      preset === 'custom'
        ? { min: minAgeDays, max: maxAgeDays }
        : this.ageBounds({ agePreset: preset });
    if (bounds.min != null && doc.ageDays < bounds.min) return false;
    if (bounds.max != null && doc.ageDays > bounds.max) return false;
    return true;
  }

  private filterDocuments(
    rows: OpenDebtRow[],
    query: DebtorsQuery,
    employeeMap?: Map<string, { name: string; position: string | null }>,
  ): OpenDebtRow[] {
    const bounds = this.ageBounds(query);
    const search = normalizeSearch(query.search);
    const debtFrom = query.debtDateFrom ? new Date(query.debtDateFrom) : null;
    const debtTo = query.debtDateTo ? new Date(query.debtDateTo) : null;
    if (debtTo) debtTo.setHours(23, 59, 59, 999);

    return rows.filter((r) => {
      if (bounds.min != null && r.ageDays < bounds.min) return false;
      if (bounds.max != null && r.ageDays > bounds.max) return false;
      if (query.companyId && r.companyId !== query.companyId) return false;
      if (query.employeeId && r.distributorId !== query.employeeId) return false;
      if (debtFrom && r.debtAt < debtFrom) return false;
      if (debtTo && r.debtAt > debtTo) return false;
      if (query.minRemaining != null && r.remaining < Number(query.minRemaining)) return false;
      if (query.maxRemaining != null && r.remaining > Number(query.maxRemaining)) return false;
      if (search) {
        const empName = employeeMap?.get(r.distributorId)?.name ?? '';
        const hay = [
          r.clientName,
          r.clientFullName,
          r.clientPhone,
          r.orderNumber,
          r.orderId,
          empName,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!hay.includes(search)) return false;
      }
      return true;
    });
  }

  private async companyNameMap(ids: string[]): Promise<Map<string, string>> {
    const map = new Map<string, string>();
    if (!ids.length) return map;
    const rows = await this.companyRepo.find({
      where: { id: In(ids) },
      select: ['id', 'name', 'shortName'],
    });
    for (const c of rows) {
      map.set(c.id, c.shortName || c.name);
    }
    return map;
  }

  private async employeeNameMap(
    ids: string[],
  ): Promise<Map<string, { name: string; position: string | null }>> {
    const map = new Map<string, { name: string; position: string | null }>();
    if (!ids.length) return map;
    const profiles = await this.profileRepo.find({
      where: { id: In(ids) },
      select: ['id', 'userId', 'position', 'companyName'],
    });
    const userIds = profiles.map((p) => p.userId).filter(Boolean) as string[];
    const users = userIds.length
      ? await this.userRepo.find({
          where: { id: In(userIds) },
          select: ['id', 'fullName', 'username'],
        })
      : [];
    const userMap = new Map(users.map((u) => [u.id, u]));
    for (const p of profiles) {
      const u = p.userId ? userMap.get(p.userId) : undefined;
      map.set(p.id, {
        name: u?.fullName || u?.username || p.companyName || 'Xodim',
        position: p.position ?? null,
      });
    }
    return map;
  }
}
