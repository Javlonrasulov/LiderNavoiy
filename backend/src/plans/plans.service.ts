import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, In, Not, Repository } from 'typeorm';
import { AgentPlan, PlanCategoryAmount } from './entities/agent-plan.entity';
import { UpsertPlanDto } from './dto/plan.dto';
import { Order } from '../orders/entities/order.entity';
import { Product } from '../products/entities/product.entity';
import { ProductCategory } from '../products/entities/product-category.entity';
import { DistributorProfile } from '../distributors/entities/distributor-profile.entity';
import { User } from '../auth/entities/user.entity';
import { OrderStatus } from '../common/enums';
import { NotificationsService } from '../notifications/notifications.service';
import { PushI18n } from '../notifications/push-i18n';
import {
  addCalendarMonth,
  getTashkentDateParts,
  getTashkentYearMonth,
  makeTashkentDate,
} from '../common/time/tashkent-time';

const EXCLUDED_ORDER_STATUSES = [OrderStatus.CANCELLED, OrderStatus.DRAFT];

const FALLBACK_COLORS = ['#10b981', '#f59e0b', '#3b82f6', '#6366f1', '#ef4444', '#8b5cf6'];

export interface PlanCategoryView {
  key: string;
  name: string;
  color: string;
  plan: number;
  done: number;
  pct: number;
}

export interface AgentPlanView {
  distributorId: string;
  agentName: string;
  year: number;
  month: number;
  totalPlan: number;
  totalDone: number;
  donePct: number;
  categories: PlanCategoryView[];
}

export interface SalesChartPoint {
  label: string;
  sales: number;
}

export interface SalesPeriodStats {
  points: SalesChartPoint[];
  total: number;
}

export interface AgentSalesStatsView {
  day: SalesPeriodStats;
  week: SalesPeriodStats;
  month: SalesPeriodStats;
  custom?: SalesPeriodStats;
}

const WEEKDAY_LABELS = ['Dush', 'Sesh', 'Chor', 'Pay', 'Jum', 'Shan', 'Yak'];
const MONTH_LABELS = ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'Iyun', 'Iyul', 'Avg', 'Sen', 'Okt', 'Noy', 'Dek'];
const DAY_HOUR_SLOTS = [8, 10, 12, 14, 16, 18, 20];

function toKey(name: string): string {
  return name.trim().toUpperCase().replace(/\s+/g, '_');
}

function monthRange(year: number, month: number) {
  const lastDay = new Date(year, month, 0).getDate();
  const start = makeTashkentDate(year, month, 1, 0, 0, 0);
  const end = makeTashkentDate(year, month, lastDay, 23, 59, 59);
  return { start, end };
}

function resolveTargetMonth(dto: UpsertPlanDto): { year: number; month: number } {
  if (dto.year && dto.month) return { year: dto.year, month: dto.month };
  const { year, month } = getTashkentYearMonth();
  if (dto.monthType === 'next') {
    return addCalendarMonth(year, month, 1);
  }
  return { year, month };
}

@Injectable()
export class PlansService {
  private readonly logger = new Logger(PlansService.name);

  constructor(
    @InjectRepository(AgentPlan)
    private readonly planRepo: Repository<AgentPlan>,
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    @InjectRepository(ProductCategory)
    private readonly categoryMetaRepo: Repository<ProductCategory>,
    @InjectRepository(DistributorProfile)
    private readonly profileRepo: Repository<DistributorProfile>,
    private readonly notifications: NotificationsService,
  ) {}

  async upsert(dto: UpsertPlanDto, createdBy?: string): Promise<AgentPlan> {
    const { year, month } = resolveTargetMonth(dto);
    const categories: PlanCategoryAmount[] = Object.entries(dto.categories)
      .filter(([, amount]) => Number(amount) > 0)
      .map(([key, amount]) => ({
        key,
        name: dto.categoryNames?.[key] ?? key,
        amount: Number(amount),
      }));

    let row = await this.planRepo.findOne({ where: { distributorId: dto.distributorId, year, month } });
    const isNew = !row;
    if (row) {
      row.totalAmount = dto.total;
      row.categories = categories;
      row.createdBy = createdBy ?? row.createdBy;
    } else {
      row = this.planRepo.create({
        distributorId: dto.distributorId,
        year,
        month,
        totalAmount: dto.total,
        categories,
        createdBy: createdBy ?? null,
      });
    }
    const saved = await this.planRepo.save(row);
    await this.notifyAgentPlanAssigned(saved, isNew);
    return saved;
  }

  private async notifyAgentPlanAssigned(plan: AgentPlan, isNew: boolean) {
    const total = Number(plan.totalAmount).toLocaleString('uz-UZ');
    const lang = await this.notifications.getDistributorLang(plan.distributorId);
    const title = PushI18n.planAssignedTitle(lang, isNew);
    const body = PushI18n.planAssignedBody(lang, plan.year, plan.month, total);

    try {
      const result = await this.notifications.notifyPlanAssigned(
        plan.distributorId,
        title,
        body,
      );
      if (!result.sent) {
        this.logger.error(
          `Plan push NOT delivered to ${plan.distributorId}: ${result.error}`,
        );
      }
    } catch (err) {
      this.logger.error(
        `Plan notification failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  async listPlans(year?: number, month?: number, companyIds?: string[]): Promise<AgentPlanView[]> {
    const fallback = getTashkentYearMonth();
    const y = year ?? fallback.year;
    const m = month ?? fallback.month;

    const qb = this.profileRepo
      .createQueryBuilder('d')
      .leftJoinAndSelect('d.user', 'u')
      .where('d.userId IS NOT NULL');

    if (companyIds?.length) {
      qb.andWhere('d.companyId IN (:...companyIds)', { companyIds });
    }

    const profiles = await qb.getMany();
    const distributorIds = profiles.map(p => p.id);
    if (distributorIds.length === 0) return [];

    const plans = await this.planRepo.find({
      where: { year: y, month: m, distributorId: In(distributorIds) },
    });
    const planMap = new Map(plans.map(p => [p.distributorId, p]));

    const colorMap = await this.buildColorMap();
    const results: AgentPlanView[] = [];

    for (const profile of profiles) {
      const plan = planMap.get(profile.id);
      if (!plan) continue;
      const name = profile.user?.fullName ?? profile.user?.username ?? profile.companyName ?? 'Agent';
      results.push(await this.toView(plan, name, colorMap));
    }

    return results.sort((a, b) => b.donePct - a.donePct);
  }

  async getMyPlan(user: User, year?: number, month?: number): Promise<AgentPlanView | null> {
    const profile = await this.resolveProfile(user);
    if (!profile) return null;

    const plan = year && month
      ? await this.findPlan(profile.id, year, month)
      : await this.findActivePlan(profile.id);

    if (!plan) return null;

    const name = profile.user?.fullName ?? profile.user?.username ?? profile.companyName ?? 'Agent';
    const colorMap = await this.buildColorMap();
    return this.toView(plan, name, colorMap);
  }

  async getTeamPlans(user: User, year?: number, month?: number): Promise<AgentPlanView[]> {
    const myProfile = await this.resolveProfile(user);
    if (!myProfile?.companyId) {
      const mine = await this.getMyPlan(user, year, month);
      return mine ? [mine] : [];
    }

    if (year && month) {
      return this.listPlans(year, month, [myProfile.companyId]);
    }

    const { year: y, month: m } = getTashkentYearMonth();
    const next = addCalendarMonth(y, m, 1);
    const [current, nextMonth] = await Promise.all([
      this.listPlans(y, m, [myProfile.companyId]),
      this.listPlans(next.year, next.month, [myProfile.companyId]),
    ]);

    const map = new Map<string, AgentPlanView>();
    for (const p of nextMonth) map.set(p.distributorId, p);
    for (const p of current) map.set(p.distributorId, p);
    return [...map.values()].sort((a, b) => b.donePct - a.donePct);
  }

  private async resolveProfile(user: User): Promise<DistributorProfile | null> {
    if (user.distributorProfile) return user.distributorProfile;
    return this.profileRepo.findOne({
      where: { userId: user.id },
      relations: ['user'],
    });
  }

  private async findPlan(
    distributorId: string,
    year: number,
    month: number,
  ): Promise<AgentPlan | null> {
    return this.planRepo.findOne({
      where: { distributorId, year, month },
    });
  }

  /** Joriy oy rejasi; yo'q bo'lsa keyingi oy (admin panel bilan bir xil). */
  private async findActivePlan(distributorId: string): Promise<AgentPlan | null> {
    const { year, month } = getTashkentYearMonth();
    const current = await this.findPlan(distributorId, year, month);
    if (current) return current;
    const next = addCalendarMonth(year, month, 1);
    return this.findPlan(distributorId, next.year, next.month);
  }

  private async toView(
    plan: AgentPlan,
    agentName: string,
    colorMap: Map<string, string>,
  ): Promise<AgentPlanView> {
    const doneByKey = await this.computeDoneByCategory(plan.distributorId, plan.year, plan.month);
    const categories: PlanCategoryView[] = plan.categories.map((c, i) => {
      const planAmt = parseFloat(String(c.amount)) || 0;
      const done = doneByKey.get(c.key)
        ?? doneByKey.get(toKey(c.name))
        ?? doneByKey.get(toKey(c.key))
        ?? 0;
      return {
        key: c.key,
        name: c.name,
        color: colorMap.get(toKey(c.name)) ?? colorMap.get(c.key) ?? FALLBACK_COLORS[i % FALLBACK_COLORS.length],
        plan: planAmt,
        done,
        pct: planAmt > 0 ? Math.min(100, Math.round((done / planAmt) * 100)) : 0,
      };
    });

    const totalPlan = parseFloat(String(plan.totalAmount)) || 0;
    const totalDone = categories.reduce((s, c) => s + c.done, 0);

    return {
      distributorId: plan.distributorId,
      agentName,
      year: plan.year,
      month: plan.month,
      totalPlan,
      totalDone,
      donePct: totalPlan > 0 ? Math.min(100, Math.round((totalDone / totalPlan) * 100)) : 0,
      categories,
    };
  }

  private async computeDoneByCategory(
    distributorId: string,
    year: number,
    month: number,
  ): Promise<Map<string, number>> {
    const { start, end } = monthRange(year, month);
    const orders = await this.orderRepo.find({
      where: {
        distributorId,
        createdAt: Between(start, end),
        status: Not(In(EXCLUDED_ORDER_STATUSES)),
      },
    });

    if (orders.length === 0) return new Map();

    const productIds = new Set<string>();
    for (const o of orders) {
      for (const item of o.items ?? []) {
        if (item.productId) productIds.add(item.productId);
      }
    }

    const products = productIds.size
      ? await this.productRepo.find({ where: { id: In([...productIds]) } })
      : [];
    const productCategory = new Map(products.map(p => [p.id, p.category ?? '']));

    const done = new Map<string, number>();
    for (const order of orders) {
      for (const item of order.items ?? []) {
        const catName = productCategory.get(item.productId) ?? '';
        const key = toKey(catName || 'OTHER');
        const amount = Number(item.price) * Number(item.quantity);
        done.set(key, (done.get(key) ?? 0) + amount);
      }
    }
    return done;
  }

  private async buildColorMap(): Promise<Map<string, string>> {
    const rows = await this.categoryMetaRepo.find();
    const map = new Map<string, string>();
    for (const r of rows) {
      map.set(toKey(r.name), r.color);
    }
    return map;
  }

  async getSalesStats(
    user: User,
    from?: string,
    to?: string,
  ): Promise<AgentSalesStatsView | null> {
    const profile = await this.resolveProfile(user);
    if (!profile) return null;

    if (from && to) {
      const custom = await this.aggregateSalesBuckets(
        profile.id,
        this.buildCustomRangeBuckets(from, to),
      );
      const empty = { points: [], total: 0 };
      return { day: empty, week: empty, month: empty, custom };
    }

    const [day, week, month] = await Promise.all([
      this.aggregateSalesBuckets(profile.id, this.getTodayHourBuckets()),
      this.aggregateSalesBuckets(profile.id, this.getCurrentWeekDays()),
      this.aggregateSalesBuckets(profile.id, this.getYearToDateMonths()),
    ]);

    return { day, week, month };
  }

  private parseDateYmd(value: string): { year: number; month: number; day: number } {
    const [year, month, day] = value.split('-').map(Number);
    return { year, month, day };
  }

  private buildCustomRangeBuckets(
    from: string,
    to: string,
  ): { start: Date; end: Date; label: string }[] {
    const s = this.parseDateYmd(from);
    const e = this.parseDateYmd(to);
    const startMs = makeTashkentDate(s.year, s.month, s.day, 0, 0, 0).getTime();
    const endMs = makeTashkentDate(e.year, e.month, e.day, 0, 0, 0).getTime();
    const totalDays = Math.floor((endMs - startMs) / 86_400_000) + 1;

    if (totalDays <= 1) {
      return this.getTodayHourBucketsForDate(s.year, s.month, s.day);
    }

    const buckets: { start: Date; end: Date; label: string }[] = [];
    for (let i = 0; i < totalDays; i++) {
      const parts = getTashkentDateParts(new Date(startMs + i * 86_400_000));
      buckets.push({
        start: makeTashkentDate(parts.year, parts.month, parts.day, 0, 0, 0),
        end: makeTashkentDate(parts.year, parts.month, parts.day, 23, 59, 59),
        label:
          totalDays <= 7
            ? WEEKDAY_LABELS[i % 7]
            : `${String(parts.day).padStart(2, '0')}.${String(parts.month).padStart(2, '0')}`,
      });
    }

    if (buckets.length <= 12) return buckets;

    const grouped: { start: Date; end: Date; label: string }[] = [];
    const chunkSize = Math.ceil(buckets.length / 12);
    for (let i = 0; i < buckets.length; i += chunkSize) {
      const chunk = buckets.slice(i, i + chunkSize);
      grouped.push({
        start: chunk[0].start,
        end: chunk[chunk.length - 1].end,
        label: chunk[0].label,
      });
    }
    return grouped;
  }

  private getTodayHourBucketsForDate(
    year: number,
    month: number,
    day: number,
  ): { start: Date; end: Date; label: string }[] {
    return DAY_HOUR_SLOTS.map((h, i) => {
      const nextH = i < DAY_HOUR_SLOTS.length - 1 ? DAY_HOUR_SLOTS[i + 1] : 24;
      return {
        start: makeTashkentDate(year, month, day, h, 0, 0),
        end:
          nextH === 24
            ? makeTashkentDate(year, month, day, 23, 59, 59)
            : makeTashkentDate(year, month, day, nextH, 0, 0),
        label: `${String(h).padStart(2, '0')}:00`,
      };
    });
  }

  private getTodayHourBuckets(): { start: Date; end: Date; label: string }[] {
    const { year, month, day } = getTashkentDateParts();
    return DAY_HOUR_SLOTS.map((h, i) => {
      const nextH = i < DAY_HOUR_SLOTS.length - 1 ? DAY_HOUR_SLOTS[i + 1] : 24;
      return {
        start: makeTashkentDate(year, month, day, h, 0, 0),
        end:
          nextH === 24
            ? makeTashkentDate(year, month, day, 23, 59, 59)
            : makeTashkentDate(year, month, day, nextH, 0, 0),
        label: `${String(h).padStart(2, '0')}:00`,
      };
    });
  }

  private getCurrentWeekDays(): { start: Date; end: Date; label: string }[] {
    const { year, month, day } = getTashkentDateParts();
    const todayNoon = makeTashkentDate(year, month, day, 12, 0, 0);
    const weekdayStr = todayNoon.toLocaleDateString('en-US', {
      timeZone: 'Asia/Tashkent',
      weekday: 'short',
    });
    const weekdayMap: Record<string, number> = {
      Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
    };
    const dow = weekdayMap[weekdayStr] ?? 1;
    const mondayOffset = dow === 0 ? -6 : 1 - dow;
    const mondayMs = todayNoon.getTime() + mondayOffset * 86_400_000;

    return WEEKDAY_LABELS.map((label, i) => {
      const parts = getTashkentDateParts(new Date(mondayMs + i * 86_400_000));
      return {
        start: makeTashkentDate(parts.year, parts.month, parts.day, 0, 0, 0),
        end: makeTashkentDate(parts.year, parts.month, parts.day, 23, 59, 59),
        label,
      };
    });
  }

  private getYearToDateMonths(): { start: Date; end: Date; label: string }[] {
    const { year, month } = getTashkentYearMonth();
    const buckets: { start: Date; end: Date; label: string }[] = [];
    for (let m = 1; m <= month; m++) {
      const lastDay = new Date(year, m, 0).getDate();
      buckets.push({
        start: makeTashkentDate(year, m, 1, 0, 0, 0),
        end: makeTashkentDate(year, m, lastDay, 23, 59, 59),
        label: MONTH_LABELS[m - 1],
      });
    }
    return buckets;
  }

  private async aggregateSalesBuckets(
    distributorId: string,
    buckets: { start: Date; end: Date; label: string }[],
  ): Promise<SalesPeriodStats> {
    const points = await Promise.all(
      buckets.map(async b => ({
        label: b.label,
        sales: await this.sumSalesForRange(distributorId, b.start, b.end),
      })),
    );
    const total = points.reduce((s, p) => s + p.sales, 0);
    return { points, total };
  }

  private async sumSalesForRange(
    distributorId: string,
    start: Date,
    end: Date,
  ): Promise<number> {
    const orders = await this.orderRepo.find({
      where: {
        distributorId,
        createdAt: Between(start, end),
        status: Not(In(EXCLUDED_ORDER_STATUSES)),
      },
    });
    return orders.reduce((sum, o) => sum + Number(o.totalAmount), 0);
  }
}
