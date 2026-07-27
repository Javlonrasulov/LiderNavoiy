import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Client } from '../clients/entities/client.entity';
import { Visit } from '../visits/entities/visit.entity';
import { Order } from '../orders/entities/order.entity';
import { DistributorProfile } from '../distributors/entities/distributor-profile.entity';
import { User } from '../auth/entities/user.entity';
import { OrderStatus, OrderSource, UserRole } from '../common/enums';
import { RedisService } from '../common/redis/redis.service';

const DEFAULT_AGENT_MONTHLY_PLAN = 15_000_000;
const CATEGORY_COLORS: Record<string, string> = {
  standard: '#6366f1',
  vip: '#8b5cf6',
  premium: '#a78bfa',
};
const CATEGORY_FALLBACK_COLORS = ['#6366f1', '#8b5cf6', '#a78bfa', '#10b981', '#f59e0b'];

const EXCLUDED_ORDER_STATUSES = [OrderStatus.CANCELLED, OrderStatus.DRAFT];
const PAID_ORDER_STATUSES = [OrderStatus.DELIVERED, OrderStatus.CONFIRMED];

function monthRange(offset = 0) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const end = new Date(now.getFullYear(), now.getMonth() + offset + 1, 0, 23, 59, 59, 999);
  return { start, end };
}

function pctChange(current: number, previous: number): number {
  if (previous <= 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() ?? '')
    .join('');
}

function categoryColor(name: string, index: number): string {
  const key = name.trim().toLowerCase();
  return CATEGORY_COLORS[key] ?? CATEGORY_FALLBACK_COLORS[index % CATEGORY_FALLBACK_COLORS.length];
}

function detectRole(position: string | null | undefined): 'agent' | 'delivery' {
  const p = (position ?? '').toLowerCase();
  if (
    p.includes('delivery') ||
    p.includes('yetkaz') ||
    p.includes('kuryer') ||
    p.includes('dostav') ||
    p.includes('haydov')
  ) {
    return 'delivery';
  }
  return 'agent';
}

/** Oxirgi GPS 90 soniyadan yangi bo'lsa — haqiqiy online */
const LOCATION_ONLINE_MAX_AGE_MS = 180_000;

function formatLastSeen(date: Date | null | undefined): string {
  if (!date) return '—';
  const diffMs = Date.now() - date.getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return 'hozir';
  if (mins < 60) return `${mins} daqiqa oldin`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} soat oldin`;
  return date.toLocaleString('uz-UZ', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

const WEEKDAY_LABELS = ['Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh', 'Ya'];
const MONTH_LABELS = ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'Iyn', 'Iyl', 'Avg', 'Sen', 'Okt', 'Noy', 'Dek'];

function getCurrentWeekDays(): { start: Date; end: Date; label: string }[] {
  const now = new Date();
  const dow = now.getDay();
  const mondayOffset = dow === 0 ? -6 : 1 - dow;
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + mondayOffset);
  monday.setHours(0, 0, 0, 0);

  return WEEKDAY_LABELS.map((label, i) => {
    const start = new Date(monday);
    start.setDate(monday.getDate() + i);
    const end = new Date(start);
    end.setHours(23, 59, 59, 999);
    return { start, end, label };
  });
}

function getCurrentMonthWeeks(): { start: Date; end: Date; label: string }[] {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const lastDay = new Date(year, month + 1, 0).getDate();
  const ranges: [number, number][] = [[1, 7], [8, 14], [15, 21], [22, lastDay]];

  return ranges.map(([from, to], i) => ({
    start: new Date(year, month, from, 0, 0, 0, 0),
    end: new Date(year, month, to, 23, 59, 59, 999),
    label: `${i + 1}-hafta`,
  }));
}

function getLast6Months(): { start: Date; end: Date; label: string }[] {
  const now = new Date();
  const buckets: { start: Date; end: Date; label: string }[] = [];

  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    buckets.push({
      start: new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0),
      end: new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999),
      label: MONTH_LABELS[d.getMonth()],
    });
  }

  return buckets;
}

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Client) private readonly clientRepo: Repository<Client>,
    @InjectRepository(Visit) private readonly visitRepo: Repository<Visit>,
    @InjectRepository(Order) private readonly orderRepo: Repository<Order>,
    @InjectRepository(DistributorProfile) private readonly profileRepo: Repository<DistributorProfile>,
    private readonly redis: RedisService,
  ) {}

  async getAgentStats(distributorId: string) {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const totalClients = await this.clientRepo.count({
      where: { isActive: true, distributorId },
    });

    const visitsToday = await this.visitRepo.count({
      where: {
        distributorId,
        visitedAt: Between(todayStart, todayEnd),
      },
    });

    const ordersToday = await this.orderRepo.find({
      where: {
        distributorId,
        createdAt: Between(todayStart, todayEnd),
      },
    });

    const totalSales = ordersToday.reduce(
      (sum, o) => sum + Number(o.totalAmount),
      0,
    );

    const pendingClients = Math.max(totalClients - visitsToday, 0);
    const clientProgress = totalClients > 0
      ? Math.round((visitsToday / totalClients) * 1000) / 10
      : 0;

    const pendingClientOrders = await this.orderRepo.count({
      where: {
        distributorId,
        source: OrderSource.CLIENT,
        status: OrderStatus.PENDING,
      },
    });

    return {
      totalClients,
      visitedClients: visitsToday,
      pendingClients,
      visitCount: visitsToday,
      completedVisits: visitsToday,
      pendingVisits: 0,
      totalSales,
      pendingClientOrders,
      clientProgressPercent: clientProgress,
      visitProgressPercent: 0,
    };
  }

  private applyClientCompanyFilter(
    qb: ReturnType<Repository<Order>['createQueryBuilder']>,
    companyIds: string[] | undefined,
    clientAlias = 'c',
  ) {
    if (companyIds?.length) {
      qb.andWhere(`${clientAlias}.companyId IN (:...companyIds)`, { companyIds });
    }
    return qb;
  }

  private async sumOrders(
    range: { start: Date; end: Date },
    companyIds: string[] | undefined,
    statuses?: OrderStatus[],
  ): Promise<number> {
    const qb = this.orderRepo
      .createQueryBuilder('o')
      .innerJoin(Client, 'c', 'c.id = o.clientId')
      .select('COALESCE(SUM(o.totalAmount), 0)', 'total')
      .where('o.createdAt BETWEEN :start AND :end', range)
      .andWhere('o.status NOT IN (:...excluded)', { excluded: EXCLUDED_ORDER_STATUSES });

    if (statuses?.length) {
      qb.andWhere('o.status IN (:...statuses)', { statuses });
    }

    this.applyClientCompanyFilter(qb, companyIds);
    const row = await qb.getRawOne<{ total: string }>();
    return Number(row?.total ?? 0);
  }

  private async sumDebt(companyIds: string[] | undefined): Promise<number> {
    const qb = this.clientRepo
      .createQueryBuilder('c')
      .select('COALESCE(SUM(CASE WHEN c.balance > 0 THEN c.balance ELSE 0 END), 0)', 'total')
      .where('c.isActive = true');

    if (companyIds?.length) {
      qb.andWhere('c.companyId IN (:...companyIds)', { companyIds });
    }

    const row = await qb.getRawOne<{ total: string }>();
    return Number(row?.total ?? 0);
  }

  private async countAgents(companyIds: string[] | undefined): Promise<number> {
    const qb = this.profileRepo.createQueryBuilder('d');
    if (companyIds?.length) {
      qb.where('d.companyId IN (:...companyIds)', { companyIds });
    }
    return qb.getCount();
  }

  private async getOnlineIds(): Promise<Set<string>> {
    try {
      const keys = await this.redis.getClient().keys('online:*');
      return new Set(keys.map(k => k.replace('online:', '')));
    } catch {
      return new Set();
    }
  }

  private async getLiveLocationMap(): Promise<Map<string, { latitude: number; longitude: number; recordedAt?: string }>> {
    const map = new Map<string, { latitude: number; longitude: number; recordedAt?: string }>();
    try {
      const keys = await this.redis.getClient().keys('location:live:*');
      await Promise.all(
        keys.map(async key => {
          const id = key.replace('location:live:', '');
          const cached = await this.redis.getJson<{ latitude: number; longitude: number; recordedAt?: string }>(key);
          if (cached?.latitude != null && cached?.longitude != null) {
            map.set(id, cached);
          }
        }),
      );
    } catch {
      /* ignore */
    }
    return map;
  }

  private async aggregateChartBuckets(
    buckets: { start: Date; end: Date; label: string }[],
    companyIds: string[] | undefined,
  ) {
    return Promise.all(
      buckets.map(async b => ({
        month: b.label,
        sales: await this.sumOrders({ start: b.start, end: b.end }, companyIds),
        payments: await this.sumOrders(
          { start: b.start, end: b.end },
          companyIds,
          PAID_ORDER_STATUSES,
        ),
      })),
    );
  }

  private async getSalesChart(companyIds?: string[]) {
    const [day, week, month] = await Promise.all([
      this.aggregateChartBuckets(getCurrentWeekDays(), companyIds),
      this.aggregateChartBuckets(getCurrentMonthWeeks(), companyIds),
      this.aggregateChartBuckets(getLast6Months(), companyIds),
    ]);
    return { day, week, month };
  }

  async getAdminDashboard(companyIds?: string[]) {
    const currentMonth = monthRange(0);
    const previousMonth = monthRange(-1);

    const [
      sales,
      prevSales,
      payments,
      prevPayments,
      debt,
      prevDebt,
      agentCount,
      salesChart,
    ] = await Promise.all([
      this.sumOrders(currentMonth, companyIds),
      this.sumOrders(previousMonth, companyIds),
      this.sumOrders(currentMonth, companyIds, PAID_ORDER_STATUSES),
      this.sumOrders(previousMonth, companyIds, PAID_ORDER_STATUSES),
      this.sumDebt(companyIds),
      this.sumDebt(companyIds),
      this.countAgents(companyIds),
      this.getSalesChart(companyIds),
    ]);

    const plan = Math.max(agentCount, 1) * DEFAULT_AGENT_MONTHLY_PLAN;
    const planPct = plan > 0 ? Math.round((sales / plan) * 100) : 0;
    const prevPlanPct = plan > 0 ? Math.round((prevSales / plan) * 100) : 0;

    const catQb = this.clientRepo
      .createQueryBuilder('c')
      .select("COALESCE(NULLIF(TRIM(c.category), ''), 'Standard')", 'category')
      .addSelect('COUNT(*)', 'cnt')
      .where('c.isActive = true');

    if (companyIds?.length) {
      catQb.andWhere('c.companyId IN (:...companyIds)', { companyIds });
    }

    const catRows = await catQb.groupBy("COALESCE(NULLIF(TRIM(c.category), ''), 'Standard')").getRawMany<{ category: string; cnt: string }>();
    const totalClients = catRows.reduce((s, r) => s + Number(r.cnt), 0);
    const clientCategories = catRows
      .map((r, i) => ({
        name: r.category,
        value: totalClients > 0 ? Math.round((Number(r.cnt) / totalClients) * 100) : 0,
        color: categoryColor(r.category, i),
      }))
      .sort((a, b) => b.value - a.value);

    const agentsQb = this.orderRepo
      .createQueryBuilder('o')
      .innerJoin(Client, 'c', 'c.id = o.clientId')
      .innerJoin(DistributorProfile, 'd', 'd.id = o.distributorId')
      .leftJoin(User, 'u', 'u.id = d.userId')
      .select('d.id', 'distributorId')
      .addSelect('d.companyId', 'companyId')
      .addSelect('d.status', 'status')
      .addSelect('COALESCE(u.fullName, u.username, d.companyName, \'Agent\')', 'fullName')
      .addSelect('COALESCE(SUM(o.totalAmount), 0)', 'sales')
      .where('o.createdAt BETWEEN :start AND :end', currentMonth)
      .andWhere('o.status NOT IN (:...excluded)', { excluded: EXCLUDED_ORDER_STATUSES });

    this.applyClientCompanyFilter(agentsQb, companyIds);
    const agentRows = await agentsQb
      .groupBy('d.id')
      .addGroupBy('d.companyId')
      .addGroupBy('d.status')
      .addGroupBy('u.fullName')
      .addGroupBy('u.username')
      .addGroupBy('d.companyName')
      .orderBy('sales', 'DESC')
      .limit(5)
      .getRawMany<{ distributorId: string; companyId: string | null; status: string; fullName: string; sales: string }>();

    const topAgents = agentRows.map(row => {
      const agentSales = Number(row.sales);
      const agentPlan = DEFAULT_AGENT_MONTHLY_PLAN;
      return {
        distributorId: row.distributorId,
        name: row.fullName,
        avatar: initials(row.fullName),
        sales: agentSales,
        plan: agentPlan,
        planPct: agentPlan > 0 ? Math.round((agentSales / agentPlan) * 100) : 0,
        orgId: row.companyId ?? '',
        status: row.status ?? 'offline',
      };
    });

    // Barcha faol agent/dostavchilar — GPS bo'lsa xaritada (online + offline)
    const locQb = this.profileRepo
      .createQueryBuilder('d')
      .innerJoinAndSelect('d.user', 'u')
      .where('u.role = :role', { role: UserRole.DISTRIBUTOR })
      .andWhere('u.isActive = true');

    if (companyIds?.length) {
      locQb.andWhere('(d.companyId IN (:...companyIds) OR d.companyId IS NULL)', { companyIds });
    }

    let profiles: DistributorProfile[] = [];
    let onlineIds = new Set<string>();
    let liveMap = new Map<string, { latitude: number; longitude: number; recordedAt?: string }>();

    try {
      profiles = await locQb.getMany();
    } catch {
      profiles = [];
    }

    try {
      onlineIds = await this.getOnlineIds();
    } catch {
      onlineIds = new Set();
    }

    try {
      liveMap = await this.getLiveLocationMap();
    } catch {
      liveMap = new Map();
    }

    const profileById = new Map(profiles.map(p => [p.id, p]));
    for (const [id, live] of liveMap) {
      if (profileById.has(id)) continue;
      try {
        const missing = await this.profileRepo.findOne({
          where: { id },
          relations: ['user'],
        });
        if (!missing?.user) continue;
        if (missing.user.role !== UserRole.DISTRIBUTOR || !missing.user.isActive) continue;
        if (
          companyIds?.length
          && missing.companyId
          && !companyIds.includes(missing.companyId)
        ) {
          continue;
        }
        missing.lastLatitude = live.latitude;
        missing.lastLongitude = live.longitude;
        if (live.recordedAt) missing.lastLocationAt = new Date(live.recordedAt);
        profiles.push(missing);
        profileById.set(id, missing);
      } catch {
        /* ignore */
      }
    }

    const now = Date.now();
    const employeeLocations = profiles.map(d => {
      const live = liveMap.get(d.id);
      const lat = live?.latitude ?? (d.lastLatitude != null ? Number(d.lastLatitude) : NaN);
      const lng = live?.longitude ?? (d.lastLongitude != null ? Number(d.lastLongitude) : NaN);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
      if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
      if (lat === 0 && lng === 0) return null;
      // Okean / Null Island / emulator — xaritaga chiqarmaslik
      if (lat < 37.0 || lat > 45.8 || lng < 55.0 || lng > 73.5) return null;

      const lastAt = live?.recordedAt
        ? new Date(live.recordedAt)
        : d.lastLocationAt;
      const ageMs = lastAt != null ? now - lastAt.getTime() : Number.POSITIVE_INFINITY;
      // Sticky DB isOnline ISHLATILMAYDI — faqat yangi GPS (90s)
      const online = ageMs <= LOCATION_ONLINE_MAX_AGE_MS;

      const name = d.user?.fullName ?? d.user?.username ?? d.companyName ?? 'Agent';
      return {
        distributorId: d.id,
        name,
        avatar: initials(name),
        role: detectRole(d.position ?? d.user?.position),
        online,
        lastSeen: formatLastSeen(lastAt),
        lat,
        lng,
        orgId: d.companyId ?? '',
      };
    }).filter((e): e is NonNullable<typeof e> => e != null);

    return {
      kpi: {
        sales,
        payments,
        debt,
        plan,
        planPct,
        salesTrend: pctChange(sales, prevSales),
        paymentsTrend: pctChange(payments, prevPayments),
        debtTrend: pctChange(debt, prevDebt),
        planTrend: pctChange(planPct, prevPlanPct),
      },
      clientCategories,
      topAgents,
      employeeLocations,
      salesChart,
    };
  }
}
