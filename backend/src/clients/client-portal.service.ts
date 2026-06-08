import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../auth/entities/user.entity';
import { OrderStatus } from '../common/enums';
import { Order, OrderItem } from '../orders/entities/order.entity';
import { CreateOrderDto } from '../orders/dto/order.dto';
import { OrdersService } from '../orders/orders.service';
import { ProductsService } from '../products/products.service';
import { Product } from '../products/entities/product.entity';
import { Client } from './entities/client.entity';

@Injectable()
export class ClientPortalService {
  constructor(
    @InjectRepository(Client)
    private readonly clientRepo: Repository<Client>,
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    private readonly ordersService: OrdersService,
    private readonly productsService: ProductsService,
  ) {}

  private clientId(user: User): string {
    if (!user.clientId) throw new BadRequestException('No client linked to user');
    return user.clientId;
  }

  async getProfile(user: User) {
    const client = await this.clientRepo.findOne({
      where: { id: this.clientId(user) },
      relations: ['distributor', 'distributor.user'],
    });
    if (!client) throw new NotFoundException('Client not found');

    const orderCount = await this.orderRepo.count({ where: { clientId: client.id } });
    const totalPurchases = await this.orderRepo
      .createQueryBuilder('o')
      .select('COALESCE(SUM(o.totalAmount), 0)', 'total')
      .where('o.clientId = :clientId', { clientId: client.id })
      .andWhere('o.status != :cancelled', { cancelled: OrderStatus.CANCELLED })
      .getRawOne();

    return {
      id: client.id,
      code: client.code,
      name: client.name,
      fullName: client.fullName,
      phone: client.phone,
      address: client.address,
      inn: client.inn,
      balance: Number(client.balance),
      category: client.category,
      clientClass: client.clientClass,
      priceCategory: client.priceCategory,
      agentName: client.distributor?.user?.fullName ?? null,
      orderCount,
      totalPurchases: Number(totalPurchases?.total ?? 0),
    };
  }

  async getOrders(user: User) {
    const orders = await this.orderRepo.find({
      where: { clientId: this.clientId(user) },
      order: { createdAt: 'DESC' },
      take: 100,
    });
    return orders.map((o) => ({
      id: o.id,
      status: o.status,
      totalAmount: Number(o.totalAmount),
      items: o.items,
      createdAt: o.createdAt,
      updatedAt: o.updatedAt,
    }));
  }

  async createOrder(user: User, dto: CreateOrderDto) {
    const clientId = this.clientId(user);
    if (dto.clientId !== clientId) {
      throw new BadRequestException('Invalid client');
    }
    const client = await this.clientRepo.findOne({ where: { id: clientId } });
    if (!client?.distributorId) {
      throw new BadRequestException('Client has no assigned agent');
    }
    return this.ordersService.create(client.distributorId, dto);
  }

  async getDashboard(user: User) {
    const profile = await this.getProfile(user);
    const recentOrders = (await this.getOrders(user)).slice(0, 5);
    return {
      profile,
      recentOrders,
      activeOrders: recentOrders.filter(
        (o) => o.status !== OrderStatus.DELIVERED && o.status !== OrderStatus.CANCELLED,
      ).length,
    };
  }

  listProducts(category?: string) {
    return this.productsService.findInStock(category);
  }

  productCategories() {
    return this.productsService.getCategories();
  }

  async getAnalytics(user: User, period: 'week' | 'month' | 'year' = 'month') {
    const clientId = this.clientId(user);
    const orders = await this.orderRepo.find({
      where: { clientId },
      order: { createdAt: 'ASC' },
    });
    const validOrders = orders.filter((o) => o.status !== OrderStatus.CANCELLED);
    const { byId: productsById, byCode: productsByCode } =
      await this.productsService.findActiveMaps();

    const now = new Date();
    const periodStart = this.periodStart(now, period);
    const prevStart = this.previousPeriodStart(periodStart, period);
    const chartStart = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    const inPeriod = (d: Date, start: Date, end: Date) => d >= start && d < end;

    const currentOrders = validOrders.filter((o) =>
      inPeriod(new Date(o.createdAt), periodStart, now),
    );
    const previousOrders = validOrders.filter((o) =>
      inPeriod(new Date(o.createdAt), prevStart, periodStart),
    );

    const currentTotal = currentOrders.reduce((s, o) => s + Number(o.totalAmount), 0);
    const previousTotal = previousOrders.reduce((s, o) => s + Number(o.totalAmount), 0);
    const currentCount = currentOrders.length;
    const previousCount = previousOrders.length;
    const currentQty = this.totalQuantity(currentOrders);
    const previousQty = this.totalQuantity(previousOrders);
    const avgCheck = currentCount > 0 ? currentTotal / currentCount : 0;
    const prevAvgCheck = previousCount > 0 ? previousTotal / previousCount : 0;

    const monthlyPurchases = this.buildMonthlyPurchases(validOrders, now, 6);
    const weeklyDynamics = this.buildWeeklyDynamics(validOrders, now);

    const categoryBreakdown = this.buildCategoryBreakdown(
      validOrders,
      productsById,
      productsByCode,
      chartStart,
      now,
    );
    const topProducts = this.buildTopProducts(
      validOrders,
      productsById,
      productsByCode,
      chartStart,
      now,
      5,
    );

    return {
      period,
      totalPurchases: currentTotal,
      totalPurchasesTrend: this.percentChange(currentTotal, previousTotal),
      orderCount: currentCount,
      orderCountTrend: this.percentChange(currentCount, previousCount),
      avgCheck,
      avgCheckTrend: this.percentChange(avgCheck, prevAvgCheck),
      totalQuantity: currentQty,
      totalQuantityTrend: this.percentChange(currentQty, previousQty),
      monthlyPurchases,
      weeklyDynamics,
      categories: categoryBreakdown,
      topProducts,
    };
  }

  private periodStart(now: Date, period: 'week' | 'month' | 'year'): Date {
    const d = new Date(now);
    if (period === 'week') {
      d.setDate(d.getDate() - 7);
      d.setHours(0, 0, 0, 0);
      return d;
    }
    if (period === 'year') {
      d.setFullYear(d.getFullYear() - 1);
      d.setHours(0, 0, 0, 0);
      return d;
    }
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  private previousPeriodStart(currentStart: Date, period: 'week' | 'month' | 'year'): Date {
    const d = new Date(currentStart);
    if (period === 'week') {
      d.setDate(d.getDate() - 7);
      return d;
    }
    if (period === 'year') {
      d.setFullYear(d.getFullYear() - 1);
      return d;
    }
    d.setMonth(d.getMonth() - 1);
    return d;
  }

  private percentChange(current: number, previous: number): number {
    if (previous <= 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 1000) / 10;
  }

  private totalQuantity(orders: Order[]): number {
    let qty = 0;
    for (const order of orders) {
      for (const item of order.items ?? []) {
        qty += Number(item.quantity);
      }
    }
    return Math.round(qty);
  }

  private resolveProduct(
    item: OrderItem,
    productsById: Map<string, Product>,
    productsByCode: Map<string, Product>,
  ): Product | null {
    return productsById.get(item.productId) ?? productsByCode.get(item.productCode) ?? null;
  }

  private buildMonthlyPurchases(orders: Order[], now: Date, months: number) {
    const buckets: { year: number; month: number; amount: number }[] = [];
    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      buckets.push({ year: d.getFullYear(), month: d.getMonth() + 1, amount: 0 });
    }
    for (const order of orders) {
      const created = new Date(order.createdAt);
      const idx = buckets.findIndex(
        (b) => b.year === created.getFullYear() && b.month === created.getMonth() + 1,
      );
      if (idx >= 0) {
        buckets[idx].amount += Number(order.totalAmount);
      }
    }
    return buckets.map((b) => ({
      year: b.year,
      month: b.month,
      amount: Math.round(b.amount),
    }));
  }

  private buildWeeklyDynamics(orders: Order[], now: Date) {
    const buckets: { date: string; amount: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      buckets.push({
        date: d.toISOString().slice(0, 10),
        amount: 0,
      });
    }
    for (const order of orders) {
      const created = new Date(order.createdAt);
      created.setHours(0, 0, 0, 0);
      const key = created.toISOString().slice(0, 10);
      const bucket = buckets.find((b) => b.date === key);
      if (bucket) {
        bucket.amount += Number(order.totalAmount);
      }
    }
    return buckets.map((b) => ({
      date: b.date,
      amount: Math.round(b.amount),
    }));
  }

  private buildCategoryBreakdown(
    orders: Order[],
    productsById: Map<string, Product>,
    productsByCode: Map<string, Product>,
    start: Date,
    end: Date,
  ) {
    const totals = new Map<string, number>();
    let grandTotal = 0;
    for (const order of orders) {
      const created = new Date(order.createdAt);
      if (created < start || created >= end) continue;
      for (const item of order.items ?? []) {
        const product = this.resolveProduct(item, productsById, productsByCode);
        const category = product?.category?.trim() || 'Boshqa';
        const lineTotal = Number(item.quantity) * Number(item.price);
        totals.set(category, (totals.get(category) ?? 0) + lineTotal);
        grandTotal += lineTotal;
      }
    }
    if (grandTotal <= 0) return [];
    return [...totals.entries()]
      .map(([name, amount]) => ({
        name,
        share: Math.round((amount / grandTotal) * 1000) / 10,
      }))
      .sort((a, b) => b.share - a.share)
      .slice(0, 6);
  }

  private buildTopProducts(
    orders: Order[],
    productsById: Map<string, Product>,
    productsByCode: Map<string, Product>,
    start: Date,
    end: Date,
    limit: number,
  ) {
    const totals = new Map<string, { name: string; amount: number }>();
    let grandTotal = 0;
    for (const order of orders) {
      const created = new Date(order.createdAt);
      if (created < start || created >= end) continue;
      for (const item of order.items ?? []) {
        const product = this.resolveProduct(item, productsById, productsByCode);
        const key = product?.id ?? item.productCode;
        const name = product?.name ?? item.productName;
        if (!name?.trim()) continue;
        const lineTotal = Number(item.quantity) * Number(item.price);
        const existing = totals.get(key);
        if (existing) {
          existing.amount += lineTotal;
        } else {
          totals.set(key, { name, amount: lineTotal });
        }
        grandTotal += lineTotal;
      }
    }
    if (grandTotal <= 0) return [];
    return [...totals.values()]
      .map((p) => ({
        name: p.name,
        share: Math.round((p.amount / grandTotal) * 1000) / 10,
      }))
      .sort((a, b) => b.share - a.share)
      .slice(0, limit);
  }
}
