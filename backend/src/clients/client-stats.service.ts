import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Client } from './entities/client.entity';
import { Order, OrderItem } from '../orders/entities/order.entity';
import { OrderStatus } from '../common/enums';
import { ProductsService } from '../products/products.service';
import { Product } from '../products/entities/product.entity';

export type ClientStatsPeriod = 'hafta' | 'oy' | '6oy' | 'custom';

const MONTH_LABELS = ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'Iyn', 'Iyl', 'Avg', 'Sen', 'Okt', 'Noy', 'Dek'];

const CAT_META: { match: RegExp; icon: string; color: string }[] = [
  { match: /pishloq|cheese|сыр/i, icon: '🧀', color: '#f59e0b' },
  { match: /sut|dairy|молоч/i, icon: '🥛', color: '#6366f1' },
  { match: /kolbas|et|мяс|sosiska/i, icon: '🌭', color: '#ef4444' },
  { match: /muzqaymoq|ice|морож/i, icon: '🍦', color: '#06b6d4' },
  { match: /ichimlik|drink|напит|suv/i, icon: '🥤', color: '#10b981' },
  { match: /non|bread|хлеб|un|мук/i, icon: '🍞', color: '#f97316' },
];

const FALLBACK_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#8b5cf6', '#ec4899'];

@Injectable()
export class ClientStatsService {
  constructor(
    @InjectRepository(Client)
    private readonly clientRepo: Repository<Client>,
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    private readonly productsService: ProductsService,
  ) {}

  async getStats(
    clientId: string,
    period: ClientStatsPeriod = 'oy',
    fromStr?: string,
    toStr?: string,
    distributorId?: string,
  ) {
    const client = await this.clientRepo.findOne({ where: { id: clientId } });
    if (!client) throw new NotFoundException('Client not found');
    if (distributorId && client.distributorId !== distributorId) {
      throw new NotFoundException('Client not found');
    }

    const now = new Date();
    const { start, end, prevStart, prevEnd } = this.resolveRange(period, now, fromStr, toStr);

    const orders = await this.orderRepo.find({
      where: { clientId },
      order: { createdAt: 'ASC' },
    });
    const valid = orders.filter((o) => o.status !== OrderStatus.CANCELLED);
    const { byId, byCode } = await this.productsService.findActiveMaps();
    const catalog = await this.productsService.findAll();

    const currentOrders = valid.filter((o) => this.inRange(new Date(o.createdAt), start, end));
    const previousOrders = valid.filter((o) => this.inRange(new Date(o.createdAt), prevStart, prevEnd));

    const currentAgg = this.aggregateByCategory(currentOrders, byId, byCode);
    const previousAgg = this.aggregateByCategory(previousOrders, byId, byCode);

    const totalSum = [...currentAgg.values()].reduce((s, c) => s + c.sum, 0);
    const totalKg = [...currentAgg.values()].reduce((s, c) => s + c.kg, 0);

    const categories = [...currentAgg.entries()]
      .map(([name, cur], idx) => {
        const prev = previousAgg.get(name);
        const meta = this.categoryMeta(name, idx);
        const trend = this.percentChange(cur.sum, prev?.sum ?? 0);
        const products = this.buildProducts(name, cur, prev, catalog);
        return {
          id: name,
          name,
          icon: meta.icon,
          color: meta.color,
          totalSum: Math.round(cur.sum),
          totalKg: Math.round(cur.kg * 10) / 10,
          avgPrice: cur.kg > 0 ? Math.round(cur.sum / cur.kg) : 0,
          share: totalSum > 0 ? Math.round((cur.sum / totalSum) * 100) : 0,
          trend,
          weekly: this.buildWeekly(currentOrders, byId, byCode, name, end),
          products,
        };
      })
      .sort((a, b) => b.totalSum - a.totalSum);

    // Categories that only appear in catalog (zero sales) — skip for main list
    // Products with buyLevel none are inside each category that has sales

    return {
      clientId,
      period,
      from: start.toISOString().slice(0, 10),
      to: end.toISOString().slice(0, 10),
      totalSum: Math.round(totalSum),
      totalKg: Math.round(totalKg * 10) / 10,
      monthlyTrend: this.buildMonthlyTrend(valid, now),
      categories,
    };
  }

  private resolveRange(
    period: ClientStatsPeriod,
    now: Date,
    fromStr?: string,
    toStr?: string,
  ) {
    const end = new Date(now);
    let start: Date;
    let prevStart: Date;
    let prevEnd: Date;

    if (period === 'custom' && fromStr && toStr) {
      start = new Date(fromStr);
      start.setHours(0, 0, 0, 0);
      const customEnd = new Date(toStr);
      customEnd.setHours(23, 59, 59, 999);
      const duration = customEnd.getTime() - start.getTime();
      prevEnd = new Date(start);
      prevStart = new Date(start.getTime() - Math.max(duration, 86400000));
      return { start, end: customEnd, prevStart, prevEnd };
    }

    if (period === 'hafta') {
      start = new Date(now);
      start.setDate(start.getDate() - 7);
      start.setHours(0, 0, 0, 0);
      prevEnd = new Date(start);
      prevStart = new Date(start);
      prevStart.setDate(prevStart.getDate() - 7);
      return { start, end, prevStart, prevEnd };
    }

    if (period === '6oy') {
      start = new Date(now.getFullYear(), now.getMonth() - 5, 1);
      prevEnd = new Date(start);
      prevStart = new Date(now.getFullYear(), now.getMonth() - 11, 1);
      return { start, end, prevStart, prevEnd };
    }

    // oy (default): current calendar month
    start = new Date(now.getFullYear(), now.getMonth(), 1);
    prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    prevEnd = new Date(start);
    return { start, end, prevStart, prevEnd };
  }

  private inRange(d: Date, start: Date, end: Date) {
    return d >= start && d <= end;
  }

  private percentChange(current: number, previous: number): number {
    if (previous <= 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 1000) / 10;
  }

  private categoryMeta(name: string, idx: number) {
    for (const m of CAT_META) {
      if (m.match.test(name)) return { icon: m.icon, color: m.color };
    }
    return {
      icon: '📦',
      color: FALLBACK_COLORS[idx % FALLBACK_COLORS.length],
    };
  }

  private isWeightUnit(unit: string | undefined | null) {
    const u = (unit ?? '').toLowerCase().trim();
    return u === 'kg' || u === 'кг' || u === 'lt' || u === 'л' || u === 'l';
  }

  private resolveProduct(
    item: OrderItem,
    byId: Map<string, Product>,
    byCode: Map<string, Product>,
  ): Product | null {
    return byId.get(item.productId) ?? byCode.get(item.productCode) ?? null;
  }

  private itemCategory(
    item: OrderItem,
    byId: Map<string, Product>,
    byCode: Map<string, Product>,
  ) {
    const product = this.resolveProduct(item, byId, byCode);
    return product?.category?.trim() || 'Boshqa';
  }

  private aggregateByCategory(
    orders: Order[],
    byId: Map<string, Product>,
    byCode: Map<string, Product>,
  ) {
    type Agg = {
      sum: number;
      kg: number;
      products: Map<
        string,
        { name: string; unit: string; qty: number; sum: number; priceSum: number; priceCount: number }
      >;
    };
    const map = new Map<string, Agg>();

    for (const order of orders) {
      for (const item of order.items ?? []) {
        const cat = this.itemCategory(item, byId, byCode);
        const product = this.resolveProduct(item, byId, byCode);
        const key = product?.id ?? item.productCode ?? item.productName;
        const name = product?.name ?? item.productName ?? 'Mahsulot';
        const unit = product?.unit ?? item.unit ?? 'dona';
        const qty = Number(item.quantity) || 0;
        const line = qty * (Number(item.price) || 0);
        const kg = this.isWeightUnit(unit) ? qty : qty;

        let agg = map.get(cat);
        if (!agg) {
          agg = { sum: 0, kg: 0, products: new Map() };
          map.set(cat, agg);
        }
        agg.sum += line;
        agg.kg += kg;

        const p = agg.products.get(key);
        if (p) {
          p.qty += qty;
          p.sum += line;
          p.priceSum += Number(item.price) || 0;
          p.priceCount += 1;
        } else {
          agg.products.set(key, {
            name,
            unit,
            qty,
            sum: line,
            priceSum: Number(item.price) || 0,
            priceCount: 1,
          });
        }
      }
    }
    return map;
  }

  private buildProducts(
    categoryName: string,
    current: {
      products: Map<
        string,
        { name: string; unit: string; qty: number; sum: number; priceSum: number; priceCount: number }
      >;
    },
    previous:
      | {
          products: Map<
            string,
            { name: string; unit: string; qty: number; sum: number; priceSum: number; priceCount: number }
          >;
        }
      | undefined,
    catalog: Product[],
  ) {
    const bought = [...current.products.entries()].map(([id, p]) => {
      const prev = previous?.products.get(id);
      const avgPrice = p.priceCount > 0 ? p.priceSum / p.priceCount : 0;
      const maxQty = Math.max(...[...current.products.values()].map((x) => x.qty), 1);
      const buyLevel: 'top' | 'avg' | 'none' =
        p.qty <= 0 ? 'none' : p.qty >= maxQty * 0.55 ? 'top' : 'avg';
      return {
        id,
        name: p.name,
        unit: p.unit,
        qty: Math.round(p.qty * 10) / 10,
        price: Math.round(avgPrice),
        total: Math.round(p.sum),
        trend: this.percentChange(p.sum, prev?.sum ?? 0),
        buyLevel,
      };
    });

    const boughtKeys = new Set(bought.map((b) => b.id));
    const notBought = catalog
      .filter((p) => (p.category?.trim() || 'Boshqa') === categoryName)
      .filter((p) => !boughtKeys.has(p.id) && !boughtKeys.has(p.code))
      .slice(0, 40)
      .map((p) => ({
        id: p.id,
        name: p.name,
        unit: p.unit || 'dona',
        qty: 0,
        price: Math.round(Number(p.price) || 0),
        total: 0,
        trend: 0,
        buyLevel: 'none' as const,
      }));

    return [...bought.sort((a, b) => b.total - a.total), ...notBought];
  }

  private buildMonthlyTrend(orders: Order[], now: Date) {
    const buckets: { year: number; month: number; value: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      buckets.push({ year: d.getFullYear(), month: d.getMonth() + 1, value: 0 });
    }
    for (const order of orders) {
      const created = new Date(order.createdAt);
      const idx = buckets.findIndex(
        (b) => b.year === created.getFullYear() && b.month === created.getMonth() + 1,
      );
      if (idx >= 0) buckets[idx].value += Number(order.totalAmount);
    }
    return buckets.map((b) => ({
      label: MONTH_LABELS[b.month - 1],
      year: b.year,
      month: b.month,
      value: Math.round(b.value),
    }));
  }

  private buildWeekly(
    orders: Order[],
    byId: Map<string, Product>,
    byCode: Map<string, Product>,
    categoryName: string,
    end: Date,
  ) {
    const dayLabels = ['Ya', 'Du', 'Se', 'Cho', 'Pa', 'Ju', 'Sha'];
    const buckets: { label: string; value: number; date: string }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(end);
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      buckets.push({
        label: dayLabels[d.getDay()],
        value: 0,
        date: d.toISOString().slice(0, 10),
      });
    }
    for (const order of orders) {
      const created = new Date(order.createdAt);
      created.setHours(0, 0, 0, 0);
      const key = created.toISOString().slice(0, 10);
      const bucket = buckets.find((b) => b.date === key);
      if (!bucket) continue;
      for (const item of order.items ?? []) {
        if (this.itemCategory(item, byId, byCode) !== categoryName) continue;
        bucket.value += Number(item.quantity) * Number(item.price);
      }
    }
    return buckets.map((b) => ({ label: b.label, value: Math.round(b.value) }));
  }
}
