import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, In, Not, Repository } from 'typeorm';
import { AgentPlan, PlanCategoryAmount } from './entities/agent-plan.entity';
import { UpsertPlanDto } from './dto/plan.dto';
import { Order } from '../orders/entities/order.entity';
import { Product } from '../products/entities/product.entity';
import { ProductCategory } from '../products/entities/product-category.entity';
import { DistributorProfile } from '../distributors/entities/distributor-profile.entity';
import { OrderStatus } from '../common/enums';

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

function toKey(name: string): string {
  return name.trim().toUpperCase().replace(/\s+/g, '_');
}

function monthRange(year: number, month: number) {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59, 999);
  return { start, end };
}

function resolveTargetMonth(dto: UpsertPlanDto): { year: number; month: number } {
  if (dto.year && dto.month) return { year: dto.year, month: dto.month };
  const now = new Date();
  if (dto.monthType === 'next') {
    const d = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return { year: d.getFullYear(), month: d.getMonth() + 1 };
  }
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

@Injectable()
export class PlansService {
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
    return this.planRepo.save(row);
  }

  async listPlans(year?: number, month?: number, companyIds?: string[]): Promise<AgentPlanView[]> {
    const now = new Date();
    const y = year ?? now.getFullYear();
    const m = month ?? now.getMonth() + 1;

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

  async getMyPlan(userId: string, year?: number, month?: number): Promise<AgentPlanView | null> {
    const profile = await this.profileRepo.findOne({
      where: { userId },
      relations: ['user'],
    });
    if (!profile) return null;

    const now = new Date();
    const y = year ?? now.getFullYear();
    const m = month ?? now.getMonth() + 1;

    const plan = await this.planRepo.findOne({
      where: { distributorId: profile.id, year: y, month: m },
    });
    if (!plan) return null;

    const name = profile.user?.fullName ?? profile.user?.username ?? profile.companyName ?? 'Agent';
    const colorMap = await this.buildColorMap();
    return this.toView(plan, name, colorMap);
  }

  async getTeamPlans(userId: string, year?: number, month?: number): Promise<AgentPlanView[]> {
    const myProfile = await this.profileRepo.findOne({ where: { userId } });
    if (!myProfile?.companyId) {
      return this.getMyPlan(userId, year, month).then(p => (p ? [p] : []));
    }
    return this.listPlans(year, month, [myProfile.companyId]);
  }

  private async toView(
    plan: AgentPlan,
    agentName: string,
    colorMap: Map<string, string>,
  ): Promise<AgentPlanView> {
    const doneByKey = await this.computeDoneByCategory(plan.distributorId, plan.year, plan.month);
    const categories: PlanCategoryView[] = plan.categories.map((c, i) => {
      const planAmt = Number(c.amount);
      const done = doneByKey.get(c.key) ?? doneByKey.get(toKey(c.name)) ?? 0;
      return {
        key: c.key,
        name: c.name,
        color: colorMap.get(toKey(c.name)) ?? colorMap.get(c.key) ?? FALLBACK_COLORS[i % FALLBACK_COLORS.length],
        plan: planAmt,
        done,
        pct: planAmt > 0 ? Math.min(100, Math.round((done / planAmt) * 100)) : 0,
      };
    });

    const totalPlan = Number(plan.totalAmount);
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
}
