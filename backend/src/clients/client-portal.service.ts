import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { User } from '../auth/entities/user.entity';
import { OrderStatus, OrderSource, UserRole } from '../common/enums';
import { Company } from '../companies/entities/company.entity';
import { DistributorProfile } from '../distributors/entities/distributor-profile.entity';
import { Order, OrderItem } from '../orders/entities/order.entity';
import { CreateOrderDto } from '../orders/dto/order.dto';
import { OrdersService } from '../orders/orders.service';
import { ProductsService } from '../products/products.service';
import { Product } from '../products/entities/product.entity';
import { PromotionsService } from '../promotions/promotions.service';
import { Client } from './entities/client.entity';
import { UserClientMembership } from './entities/user-client-membership.entity';
import { GpsService } from '../gps/gps.service';

export type ClientOrgDto = {
  companyId: string;
  name: string;
  shortName: string;
  color: string | null;
  icon: string | null;
  clientId: string;
};

@Injectable()
export class ClientPortalService {
  constructor(
    @InjectRepository(Client)
    private readonly clientRepo: Repository<Client>,
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @InjectRepository(DistributorProfile)
    private readonly distributorRepo: Repository<DistributorProfile>,
    @InjectRepository(Company)
    private readonly companyRepo: Repository<Company>,
    @InjectRepository(UserClientMembership)
    private readonly membershipRepo: Repository<UserClientMembership>,
    private readonly ordersService: OrdersService,
    private readonly productsService: ProductsService,
    private readonly promotionsService: PromotionsService,
    private readonly gpsService: GpsService,
  ) {}

  private primaryClientId(user: User): string {
    if (!user.clientId) throw new BadRequestException('No client linked to user');
    return user.clientId;
  }

  /** Phone/INN bo‘yicha boshqa orgdagi klientlarni membershipga bog‘lash. */
  async ensureMemberships(user: User): Promise<UserClientMembership[]> {
    const primaryId = this.primaryClientId(user);
    const primary = await this.clientRepo.findOne({ where: { id: primaryId } });
    if (!primary) throw new NotFoundException('Client not found');

    const links: Array<{ clientId: string; companyId: string }> = [];
    if (primary.companyId) {
      links.push({ clientId: primary.id, companyId: primary.companyId });
    }

    const phone = primary.phone?.trim();
    const inn = primary.inn?.trim();
    if (phone || inn) {
      const qb = this.clientRepo
        .createQueryBuilder('c')
        .where('c.isActive = true')
        .andWhere('c.id != :id', { id: primary.id })
        .andWhere('c.companyId IS NOT NULL');
      if (phone && inn) {
        qb.andWhere('(c.phone = :phone OR c.inn = :inn)', { phone, inn });
      } else if (phone) {
        qb.andWhere('c.phone = :phone', { phone });
      } else {
        qb.andWhere('c.inn = :inn', { inn });
      }
      const peers = await qb.getMany();
      for (const peer of peers) {
        if (peer.companyId) {
          links.push({ clientId: peer.id, companyId: peer.companyId });
        }
      }
    }

    for (const link of links) {
      const existing = await this.membershipRepo.findOne({
        where: { userId: user.id, companyId: link.companyId },
      });
      if (!existing) {
        await this.membershipRepo.save(
          this.membershipRepo.create({
            userId: user.id,
            clientId: link.clientId,
            companyId: link.companyId,
          }),
        );
      } else if (existing.clientId !== link.clientId) {
        existing.clientId = link.clientId;
        await this.membershipRepo.save(existing);
      }
    }

    return this.membershipRepo.find({ where: { userId: user.id } });
  }

  async listOrganizations(user: User): Promise<ClientOrgDto[]> {
    const memberships = await this.ensureMemberships(user);
    if (memberships.length === 0) return [];
    const companyIds = memberships.map((m) => m.companyId);
    const companies = await this.companyRepo.find({
      where: { id: In(companyIds), isActive: true },
    });
    const byId = new Map(companies.map((c) => [c.id, c]));
    return memberships
      .map((m) => {
        const c = byId.get(m.companyId);
        if (!c) return null;
        return {
          companyId: c.id,
          name: c.name,
          shortName: c.shortName?.trim() || c.name,
          color: c.color,
          icon: c.icon,
          clientId: m.clientId,
        } satisfies ClientOrgDto;
      })
      .filter((x): x is ClientOrgDto => !!x);
  }

  /** Tanlangan org → shu orgdagi klient yozuvi. */
  async resolveActiveClient(user: User, companyId?: string | null): Promise<Client> {
    const orgs = await this.listOrganizations(user);
    if (orgs.length === 0) {
      const client = await this.clientRepo.findOne({
        where: { id: this.primaryClientId(user) },
        relations: ['distributor', 'distributor.user'],
      });
      if (!client) throw new NotFoundException('Client not found');
      return client;
    }
    const selected =
      (companyId && orgs.find((o) => o.companyId === companyId)) || orgs[0];
    const client = await this.clientRepo.findOne({
      where: { id: selected.clientId },
      relations: ['distributor', 'distributor.user'],
    });
    if (!client) throw new NotFoundException('Client not found');
    return client;
  }

  private async companyMap(companyIds: string[]): Promise<Map<string, Company>> {
    if (companyIds.length === 0) return new Map();
    const rows = await this.companyRepo.find({ where: { id: In(companyIds) } });
    return new Map(rows.map((c) => [c.id, c]));
  }

  private orgLabel(company: Company | undefined): { companyName: string | null; companyShortName: string | null } {
    if (!company) return { companyName: null, companyShortName: null };
    return {
      companyName: company.name,
      companyShortName: company.shortName?.trim() || company.name,
    };
  }

  private roleToPosition(role?: UserRole, customPosition?: string | null): string | null {
    if (customPosition?.trim()) return customPosition.trim();
    switch (role) {
      case UserRole.ADMIN:
        return 'Direktor';
      case UserRole.MANAGER:
        return 'Menejer';
      case UserRole.DISTRIBUTOR:
        return 'Agent';
      default:
        return null;
    }
  }

  private contactFromDistributor(
    distributor: DistributorProfile | null | undefined,
    fallbackPosition?: string | null,
  ) {
    if (!distributor) return null;
    const name = distributor.user?.fullName?.trim();
    if (!name) return null;
    return {
      userId: distributor.user?.id ?? null,
      name,
      // Delivery calls pass fallbackPosition='Dostavkachi' — prefer that over Agent role label
      position:
        fallbackPosition?.trim() ||
        distributor.position?.trim() ||
        this.roleToPosition(distributor.user?.role) ||
        null,
      phone: distributor.phone?.trim() || null,
    };
  }

  /** Sales agent emas — alohida dostavkachi profilini qidiradi. */
  private async findCompanyCourier(
    companyId: string | null | undefined,
    excludeDistributorId?: string | null,
  ): Promise<DistributorProfile | null> {
    const qb = this.distributorRepo
      .createQueryBuilder('d')
      .leftJoinAndSelect('d.user', 'u')
      .where('1=1');
    if (companyId) {
      qb.andWhere('d.companyId = :companyId', { companyId });
    }
    if (excludeDistributorId) {
      qb.andWhere('d.id != :excludeId', { excludeId: excludeDistributorId });
    }
    qb.andWhere(
      `(LOWER(COALESCE(d.position, '')) LIKE :p
        OR LOWER(COALESCE(u.position, '')) LIKE :p
        OR LOWER(COALESCE(u.username, '')) LIKE :p
        OR LOWER(COALESCE(u.fullName, '')) LIKE :p)`,
      { p: '%dostav%' },
    );
    qb.orderBy('d.updatedAt', 'DESC').take(1);
    return (await qb.getOne()) ?? null;
  }

  private async resolveDeliveryDistributor(
    order: { deliveryDistributorId: string | null },
    client: Client,
  ): Promise<DistributorProfile | null> {
    const agentId = client.distributorId ?? null;
    let deliveryId = order.deliveryDistributorId;

    // Agentni dostavkachi qilib biriktirilgan bo‘lsa — kompaniya dostavkachisini olamiz
    if (!deliveryId || (agentId && deliveryId === agentId)) {
      const courier = await this.findCompanyCourier(client.companyId, agentId);
      if (courier) deliveryId = courier.id;
    }

    if (!deliveryId) return null;

    return this.distributorRepo.findOne({
      where: { id: deliveryId },
      relations: ['user'],
    });
  }

  private async resolveClientDistributor(client: Client): Promise<DistributorProfile | null> {
    if (client.distributorId) {
      const distributor = await this.distributorRepo.findOne({
        where: { id: client.distributorId },
        relations: ['user'],
      });
      if (distributor) return distributor;
    }

    const linked = client.distributor ?? null;
    if (linked?.id) {
      const distributor = await this.distributorRepo.findOne({
        where: { id: linked.id },
        relations: ['user'],
      });
      if (distributor) return distributor;
    }

    return linked;
  }

  async getProfile(user: User, companyId?: string | null) {
    const organizations = await this.listOrganizations(user);
    const client = await this.resolveActiveClient(user, companyId);
    const membershipClientIds =
      organizations.length > 0
        ? organizations.map((o) => o.clientId)
        : [client.id];

    const orderCount = await this.orderRepo.count({
      where: { clientId: In(membershipClientIds) },
    });
    const totalPurchases = await this.orderRepo
      .createQueryBuilder('o')
      .select('COALESCE(SUM(o.totalAmount), 0)', 'total')
      .where('o.clientId IN (:...ids)', { ids: membershipClientIds })
      .andWhere('o.status != :cancelled', { cancelled: OrderStatus.CANCELLED })
      .getRawOne();

    const agent = this.contactFromDistributor(await this.resolveClientDistributor(client));

    const loadedOrder = await this.orderRepo.findOne({
      where: [
        { clientId: client.id, status: OrderStatus.ON_WAY },
        { clientId: client.id, status: OrderStatus.PACKING },
        { clientId: client.id, status: OrderStatus.CONFIRMED },
      ],
      order: { updatedAt: 'DESC' },
    });

    let deliveryPerson: {
      userId: string | null;
      name: string;
      position: string | null;
      phone: string | null;
    } | null = null;
    if (loadedOrder?.deliveryDistributorId || client.distributorId) {
      const deliveryDistributor = await this.resolveDeliveryDistributor(
        loadedOrder ?? { deliveryDistributorId: null },
        client,
      );
      deliveryPerson = this.contactFromDistributor(deliveryDistributor, 'Dostavkachi');
    }

    const activeOrg =
      organizations.find((o) => o.clientId === client.id) || organizations[0] || null;

    return {
      id: client.id,
      code: client.code,
      name: client.name,
      fullName: client.fullName,
      phone: client.phone,
      address: client.address,
      territory: client.territory,
      latitude: client.latitude,
      longitude: client.longitude,
      inn: client.inn,
      balance: Number(client.balance),
      category: client.category,
      clientClass: client.clientClass,
      priceCategory: client.priceCategory,
      companyId: client.companyId,
      agentName: agent?.name ?? null,
      agentPosition: agent?.position ?? null,
      agentPhone: agent?.phone ?? null,
      agentUserId: agent?.userId ?? null,
      hasAssignedAgent: Boolean(client.distributorId),
      deliveryPerson,
      orderCount,
      totalPurchases: Number(totalPurchases?.total ?? 0),
      bonusPoints: Math.max(0, Math.floor(Number(totalPurchases?.total ?? 0) / 1000)),
      debt: Number(client.balance) < 0 ? Math.abs(Number(client.balance)) : 0,
      organizations,
      activeOrganization: activeOrg,
    };
  }

  async getOrders(user: User, companyId?: string | null) {
    const orgs = await this.listOrganizations(user);
    let clientIds: string[];
    if (companyId) {
      const org = orgs.find((o) => o.companyId === companyId);
      clientIds = org ? [org.clientId] : [this.primaryClientId(user)];
    } else if (orgs.length > 0) {
      // Header yo‘q = barcha org (dashboard xarita / jami)
      clientIds = orgs.map((o) => o.clientId);
    } else {
      clientIds = [this.primaryClientId(user)];
    }

    const orders = await this.orderRepo.find({
      where: { clientId: In(clientIds) },
      order: { createdAt: 'DESC' },
      take: 100,
    });
    const cmap = await this.companyMap(
      [
        ...orders.map((o) => o.companyId).filter((id): id is string => !!id),
        ...orgs.map((o) => o.companyId),
      ],
    );
    const clientToOrg = new Map(orgs.map((o) => [o.clientId, o]));

    return orders.map((o) => {
      const fromOrder = o.companyId ? cmap.get(o.companyId) : undefined;
      const fromMem = clientToOrg.get(o.clientId);
      const label = this.orgLabel(fromOrder) ;
      return {
        id: o.id,
        status: o.status,
        totalAmount: Number(o.totalAmount),
        items: o.items,
        createdAt: o.createdAt,
        updatedAt: o.updatedAt,
        companyId: o.companyId || fromMem?.companyId || null,
        companyName: label.companyName || fromMem?.name || null,
        companyShortName: label.companyShortName || fromMem?.shortName || null,
      };
    });
  }

  async getOrderTracking(user: User, orderId: string) {
    const orgs = await this.listOrganizations(user);
    const clientIds =
      orgs.length > 0 ? orgs.map((o) => o.clientId) : [this.primaryClientId(user)];
    const order = await this.orderRepo.findOne({
      where: { id: orderId, clientId: In(clientIds) },
    });
    if (!order) throw new NotFoundException('Order not found');

    const client = await this.clientRepo.findOne({
      where: { id: order.clientId },
      relations: ['distributor', 'distributor.user'],
    });
    if (!client) throw new NotFoundException('Client not found');

    const companyId = order.companyId || client.companyId;
    const company = companyId
      ? await this.companyRepo.findOne({ where: { id: companyId } })
      : null;
    const orgMeta = this.orgLabel(company ?? undefined);

    const deliveryLat = client.latitude;
    const deliveryLng = client.longitude;

    let deliveryPerson:
      | {
          userId: string | null;
          distributorId: string;
          name: string;
          position: string | null;
          phone: string | null;
          isOnline: boolean;
          latitude: number | null;
          longitude: number | null;
          lastLocationAt: string | null;
        }
      | null = null;

    if (order.deliveryDistributorId || client.distributorId) {
      const deliveryDistributor = await this.resolveDeliveryDistributor(order, client);
      const contact = this.contactFromDistributor(deliveryDistributor, 'Dostavkachi');
      if (contact && deliveryDistributor) {
        let personLat: number | null = null;
        let personLng: number | null = null;
        let personLastAt: string | null = null;

        // Avval haqiqiy dostavkachi, keyin buyurtmadagi id — eng YANGI GPS ni olamiz
        // (agent id biriktirilgan bo‘lsa eski nuqta doimo «yutib» qolmasin)
        const gpsSourceIds = [
          deliveryDistributor.id,
          order.deliveryDistributorId,
        ].filter((id, i, arr): id is string => !!id && arr.indexOf(id) === i);

        type GpsCand = { lat: number; lng: number; atMs: number; atIso: string | null };
        const candidates: GpsCand[] = [];

        for (const gpsId of gpsSourceIds) {
          try {
            const live = await this.gpsService.getLastLocation(gpsId);
            if (
              this.isUsableCourierCoord(live.latitude, live.longitude, deliveryLat, deliveryLng)
            ) {
              const atIso = live.recordedAt ?? null;
              const atMs = atIso ? Date.parse(atIso) : 0;
              candidates.push({
                lat: live.latitude,
                lng: live.longitude,
                atMs: Number.isFinite(atMs) ? atMs : 0,
                atIso,
              });
            }
          } catch {
            /* try next */
          }
        }

        if (candidates.length === 0) {
          for (const gpsId of gpsSourceIds) {
            const profile =
              gpsId === deliveryDistributor.id
                ? deliveryDistributor
                : await this.distributorRepo.findOne({ where: { id: gpsId } });
            if (
              profile?.lastLatitude != null &&
              profile.lastLongitude != null &&
              this.isUsableCourierCoord(
                profile.lastLatitude,
                profile.lastLongitude,
                deliveryLat,
                deliveryLng,
              )
            ) {
              const atIso = profile.lastLocationAt?.toISOString() ?? null;
              const atMs = profile.lastLocationAt?.getTime() ?? 0;
              candidates.push({
                lat: profile.lastLatitude,
                lng: profile.lastLongitude,
                atMs,
                atIso,
              });
            }
          }
        }

        candidates.sort((a, b) => b.atMs - a.atMs);
        const best = candidates[0];
        if (best) {
          personLat = best.lat;
          personLng = best.lng;
          personLastAt = best.atIso;
        }

        deliveryPerson = {
          ...contact,
          distributorId: deliveryDistributor.id,
          isOnline: await this.gpsService.isLiveOnline(deliveryDistributor.id),
          latitude: personLat,
          longitude: personLng,
          lastLocationAt: personLastAt,
        };
      }
    }

    let distanceKm: number | null = null;
    let etaMinutes: number | null = null;

    if (
      deliveryLat != null &&
      deliveryLng != null &&
      deliveryPerson?.latitude != null &&
      deliveryPerson?.longitude != null
    ) {
      distanceKm = this.haversineKm(
        deliveryLat,
        deliveryLng,
        deliveryPerson.latitude,
        deliveryPerson.longitude,
      );
      // Emulator / noto‘g‘ri GPS bo‘lsa okean masofasini bermaslik
      if (distanceKm > this.MAX_LIVE_DISTANCE_KM) {
        distanceKm = null;
        etaMinutes = null;
        deliveryPerson = {
          ...deliveryPerson,
          latitude: null,
          longitude: null,
        };
      } else {
        etaMinutes = Math.max(5, Math.round((distanceKm / 30) * 60));
      }
    }

    return {
      orderId: order.id,
      status: order.status,
      totalAmount: Number(order.totalAmount),
      deliveryAddress: client.address,
      deliveryLatitude: deliveryLat,
      deliveryLongitude: deliveryLng,
      distanceKm,
      etaMinutes,
      deliveryPerson,
      companyId: companyId ?? null,
      companyName: orgMeta.companyName,
      companyShortName: orgMeta.companyShortName,
    };
  }

  /** Local delivery — emulator AQSh GPS (~8000 km) ni rad etamiz. */
  private readonly MAX_LIVE_DISTANCE_KM = 120;

  private isInServiceArea(lat: number, lng: number): boolean {
    // O‘zbekiston + biroz chegara
    return lat >= 37.0 && lat <= 45.8 && lng >= 55.0 && lng <= 73.5;
  }

  private isUsableCourierCoord(
    lat: number | null | undefined,
    lng: number | null | undefined,
    deliveryLat: number | null | undefined,
    deliveryLng: number | null | undefined,
  ): boolean {
    if (lat == null || lng == null) return false;
    if (lat === 0 && lng === 0) return false;
    if (!this.isInServiceArea(lat, lng)) return false;
    if (
      deliveryLat != null &&
      deliveryLng != null &&
      this.isInServiceArea(deliveryLat, deliveryLng)
    ) {
      return this.haversineKm(lat, lng, deliveryLat, deliveryLng) <= this.MAX_LIVE_DISTANCE_KM;
    }
    return true;
  }

  private haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(c * 6371 * 10) / 10;
  }

  async createOrder(user: User, dto: CreateOrderDto, companyId?: string | null) {
    const client = await this.resolveActiveClient(user, companyId);
    if (!client.distributorId) {
      throw new BadRequestException('Client has no assigned agent');
    }
    if (!dto.items?.length) {
      throw new BadRequestException('Order items are required');
    }
    return this.ordersService.create(
      client.distributorId,
      { ...dto, clientId: client.id },
      false,
      OrderSource.CLIENT,
    );
  }

  async getDashboard(user: User, companyId?: string | null) {
    const profile = await this.getProfile(user, companyId);
    const organizations = profile.organizations as ClientOrgDto[];
    const orders = await this.getOrders(user, companyId);
    const recentOrders = orders.slice(0, 5);
    const activeOrders = orders.filter(
      (o) => o.status !== OrderStatus.DELIVERED && o.status !== OrderStatus.CANCELLED,
    ).length;
    const balance = Number(profile.balance ?? 0);
    const debt = balance < 0 ? Math.abs(balance) : 0;

    // Barcha membership bo‘yicha savdo (dashboard Jami xaridlar + org split)
    const allClientIds =
      organizations.length > 0
        ? organizations.map((o) => o.clientId)
        : [profile.id];
    const allOrders = await this.orderRepo.find({
      where: { clientId: In(allClientIds) },
      order: { createdAt: 'DESC' },
      take: 500,
    });
    const validAll = allOrders.filter((o) => o.status !== OrderStatus.CANCELLED);
    const totalPurchases = validAll.reduce((s, o) => s + Number(o.totalAmount), 0);
    const bonusPoints = Math.max(0, Math.floor(totalPurchases / 1000));

    const purchasesByOrg = organizations.map((org) => {
      const sum = validAll
        .filter((o) => {
          const oid = o.companyId || org.companyId;
          return (
            o.clientId === org.clientId ||
            oid === org.companyId
          );
        })
        .reduce((s, o) => s + Number(o.totalAmount), 0);
      return {
        companyId: org.companyId,
        shortName: org.shortName,
        name: org.name,
        color: org.color,
        total: sum,
      };
    });

    // Yo‘ldagi — barcha org (xarita)
    const onWayOrders = allOrders.filter((o) => o.status === OrderStatus.ON_WAY);

    const category = (profile.category || profile.priceCategory || 'Standard').trim();
    const discountSubtitle =
      profile.clientClass?.trim() ||
      (category.toLowerCase() === 'vip'
        ? 'Gold'
        : category.toLowerCase() === 'premium'
          ? 'Silver'
          : profile.priceCategory?.trim() || '—');

    return {
      profile,
      recentOrders,
      activeOrders,
      debt,
      balance,
      bonusPoints,
      discountLevel: category,
      discountSubtitle,
      totalPurchases,
      orderCount: Number(profile.orderCount ?? allOrders.length),
      organizations,
      purchasesByOrg,
      onWayOrderIds: onWayOrders.map((o) => o.id),
    };
  }

  async listProducts(user: User, category?: string, companyId?: string | null) {
    const client = await this.resolveActiveClient(user, companyId);
    const scope = client.companyId?.trim() || companyId?.trim() || null;
    if (!scope) return [];
    return this.productsService.findInStock(category, scope);
  }

  async productCategories(user: User, companyId?: string | null) {
    const client = await this.resolveActiveClient(user, companyId);
    const scope = client.companyId?.trim() || companyId?.trim() || null;
    if (!scope) return [];
    return this.productsService.getCategories(true, scope);
  }

  listPromotions() {
    return this.promotionsService.findActiveForClient();
  }

  async getAnalytics(user: User, period: 'week' | 'month' | 'year' = 'month', companyId?: string | null) {
    const client = await this.resolveActiveClient(user, companyId);
    const clientId = client.id;
    const orders = await this.orderRepo.find({
      where: { clientId },
      order: { createdAt: 'ASC' },
    });
    const validOrders = orders.filter((o) => o.status !== OrderStatus.CANCELLED);
    const { byId: productsById, byCode: productsByCode } =
      await this.productsService.findActiveMaps(client.companyId);

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
      periodStart,
      now,
    );
    // Eng ko'p sotilgan mahsulotlar — tanlangan davr buyurtmalaridan (miqdor bo'yicha)
    const topProducts = this.buildTopProducts(
      validOrders,
      productsById,
      productsByCode,
      periodStart,
      now,
      50,
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
    const totals = new Map<
      string,
      { name: string; quantity: number; amount: number; unit: string }
    >();
    let grandQty = 0;
    for (const order of orders) {
      const created = new Date(order.createdAt);
      if (created < start || created > end) continue;
      for (const item of order.items ?? []) {
        const product = this.resolveProduct(item, productsById, productsByCode);
        const key = product?.id ?? item.productCode ?? item.productName;
        const name = product?.name ?? item.productName;
        if (!name?.trim()) continue;
        const qty = Number(item.quantity) || 0;
        if (qty <= 0) continue;
        const lineTotal = qty * Number(item.price);
        const existing = totals.get(key);
        if (existing) {
          existing.quantity += qty;
          existing.amount += lineTotal;
        } else {
          totals.set(key, {
            name,
            quantity: qty,
            amount: lineTotal,
            unit: product?.unit ?? item.unit ?? '',
          });
        }
        grandQty += qty;
      }
    }
    if (grandQty <= 0) return [];
    return [...totals.values()]
      .map((p) => ({
        name: p.name,
        quantity: Math.round(p.quantity * 1000) / 1000,
        amount: Math.round(p.amount),
        unit: p.unit,
        share: Math.round((p.quantity / grandQty) * 1000) / 10,
      }))
      .sort((a, b) => b.quantity - a.quantity || b.amount - a.amount)
      .slice(0, limit);
  }
}
