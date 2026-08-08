import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository, SelectQueryBuilder } from 'typeorm';
import { Order } from './entities/order.entity';
import {
  OrderAuditEvent,
  OrderAuditAction,
  OrderItemChange,
} from './entities/order-audit-event.entity';
import { CreateOrderDto, UpdateOrderDto, OrderItemDto } from './dto/order.dto';
import { OrderStatus, OrderSource, VisitStatus, OrderPaymentStatus, PaymentStatus, UserRole } from '../common/enums';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/notification.types';
import { PushI18n, normalizePushLang, PushLang } from '../notifications/push-i18n';
import { DistributorProfile } from '../distributors/entities/distributor-profile.entity';
import { Client } from '../clients/entities/client.entity';
import { User } from '../auth/entities/user.entity';
import { VisitsService } from '../visits/visits.service';
import { OrderItem } from './entities/order.entity';
import { PromotionsService } from '../promotions/promotions.service';
import { Product } from '../products/entities/product.entity';
import { Visit } from '../visits/entities/visit.entity';
import { TrackingGateway } from '../tracking/tracking.gateway';
import { OrderPayment } from '../payments/entities/order-payment.entity';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private readonly repo: Repository<Order>,
    @InjectRepository(OrderAuditEvent)
    private readonly auditRepo: Repository<OrderAuditEvent>,
    @InjectRepository(DistributorProfile)
    private readonly profileRepo: Repository<DistributorProfile>,
    @InjectRepository(Client)
    private readonly clientRepo: Repository<Client>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(OrderPayment)
    private readonly paymentRepo: Repository<OrderPayment>,
    private readonly notifications: NotificationsService,
    private readonly visitsService: VisitsService,
    private readonly promotionsService: PromotionsService,
    private readonly trackingGateway: TrackingGateway,
  ) {}

  /**
   * Order itemlarni normalizatsiya + promo qatorlarini soft validatsiya.
   * Promo line: promotionId + reward product/qty/price; shartlar >= bo‘lishi kerak.
   */
  private async normalizeAndValidatePromoItems(items: OrderItemDto[]): Promise<OrderItem[]> {
    if (!items?.length) {
      throw new BadRequestException('Order must have at least one item');
    }

    const normalized: OrderItem[] = items.map((it) => {
      const price = Number(it.price);
      const promotionId = it.promotionId || undefined;
      const isFree =
        it.isFree === true || (promotionId != null && price === 0);
      return {
        productId: it.productId,
        productCode: it.productCode,
        productName: it.productName,
        quantity: Number(it.quantity),
        price,
        unit: it.unit,
        isFree: isFree || undefined,
        promotionId,
        actualQuantity:
          it.actualQuantity != null ? Number(it.actualQuantity) : null,
      };
    });

    for (const it of normalized) {
      if (!it.productId || !(it.quantity > 0)) {
        throw new BadRequestException('Invalid order item');
      }
    }

    const promoLines = normalized.filter((it) => it.promotionId);
    if (promoLines.length === 0) return normalized;

    const paidQty = new Map<string, number>();
    for (const it of normalized) {
      if (it.promotionId) continue;
      paidQty.set(it.productId, (paidQty.get(it.productId) ?? 0) + Number(it.quantity));
    }

    for (const line of promoLines) {
      let promo;
      try {
        promo = await this.promotionsService.findOne(line.promotionId!);
      } catch {
        throw new BadRequestException(`Promotion not found: ${line.promotionId}`);
      }

      const conditions =
        Array.isArray(promo.conditions) && promo.conditions.length > 0
          ? promo.conditions
          : promo.productId && Number(promo.buyQuantity) > 0
            ? [
                {
                  productId: promo.productId,
                  productName: promo.productName ?? '',
                  buyQuantity: Number(promo.buyQuantity),
                },
              ]
            : [];

      for (const c of conditions) {
        const have = paidQty.get(c.productId) ?? 0;
        if (have < Number(c.buyQuantity)) {
          throw new BadRequestException(
            `Aksiya sharti bajarilmagan: ${c.productName || c.productId} kamida ${c.buyQuantity} ta`,
          );
        }
      }

      const rewards =
        Array.isArray(promo.rewards) && promo.rewards.length > 0
          ? promo.rewards
          : promo.rewardProductId && Number(promo.rewardQuantity ?? promo.freeQuantity) > 0
            ? [
                {
                  productId: promo.rewardProductId,
                  productName: promo.rewardProductName ?? '',
                  quantity: Number(promo.rewardQuantity ?? promo.freeQuantity),
                  price: Number(promo.rewardPrice ?? 0),
                },
              ]
            : [];

      const match = rewards.find((r) => r.productId === line.productId);
      if (!match) {
        throw new BadRequestException('Promo line product must match a reward product');
      }
      if (Math.abs(Number(line.quantity) - Number(match.quantity)) > 0.001) {
        throw new BadRequestException(
          `Promo quantity must be ${match.quantity} (admin belgilagan)`,
        );
      }
      if (Math.abs(Number(line.price) - Number(match.price)) > 0.01) {
        throw new BadRequestException(
          `Promo price must be ${match.price} (admin belgilagan)`,
        );
      }
    }

    return normalized;
  }

  async create(
    distributorId: string,
    dto: CreateOrderDto,
    offline = false,
    source: OrderSource = OrderSource.AGENT,
  ) {
    const items = await this.normalizeAndValidatePromoItems(dto.items);
    const totalAmount = items.reduce((sum, i) => sum + Number(i.quantity) * Number(i.price), 0);
    const client = await this.clientRepo.findOne({ where: { id: dto.clientId } });
    const order = this.repo.create({
      distributorId,
      clientId: dto.clientId,
      companyId: client?.companyId ?? null,
      visitId: dto.visitId ?? null,
      items,
      totalAmount,
      status: OrderStatus.PENDING,
      source,
      isOfflineCreated: offline,
      offlineId: dto.offlineId ?? null,
    });
    const saved = await this.repo.save(order);

    if (source === OrderSource.CLIENT) {
      this.notifyAgentClientOrder(distributorId, dto.clientId, totalAmount, saved.id).catch(() => {});
      this.notifyManagersClientOrder(distributorId, dto.clientId, totalAmount, saved.id).catch(() => {});
      this.recordAudit({
        orderId: saved.id,
        actorUserId: null,
        actorName: client?.name?.trim() || client?.fullName?.trim() || 'Mijoz',
        actorRole: UserRole.CLIENT,
        action: 'client_submitted',
        afterItems: items,
        itemChanges: [],
        summary: `Mijoz ${(client?.name ?? client?.fullName ?? '').trim() || '—'} tomonidan buyurtma yuborildi`,
      }).catch(() => {});
    } else {
      this.notifyAdminsAsync(distributorId, dto.clientId, totalAmount, saved.id).catch(() => {});
    }

    return saved;
  }

  private async notifyAgentClientOrder(
    distributorId: string,
    clientId: string,
    totalAmount: number,
    orderId: string,
  ) {
    const client = await this.clientRepo.findOne({ where: { id: clientId } });
    const name = client?.name ?? 'Klient';
    const amount = Math.round(totalAmount).toLocaleString('uz-UZ');
    const lang = await this.notifications.getDistributorLang(distributorId);
    await this.notifications.sendToDistributor(
      distributorId,
      PushI18n.clientOrderTitle(lang),
      PushI18n.clientOrderBody(lang, name, amount),
      NotificationType.ORDER,
      { orderId, type: 'client_order' },
    );
  }

  private async notifyManagersClientOrder(
    distributorId: string,
    clientId: string,
    totalAmount: number,
    orderId: string,
    opts?: { stale?: boolean; hoursWaiting?: number },
  ) {
    const profile = await this.profileRepo.findOne({
      where: { id: distributorId },
      relations: ['user'],
    });
    const agentName =
      profile?.user?.fullName?.trim() ||
      profile?.user?.username?.trim() ||
      profile?.companyName?.trim() ||
      'Agent';
    const client = await this.clientRepo.findOne({ where: { id: clientId } });
    await this.notifications.notifyAdminsClientOrder(
      agentName,
      totalAmount,
      client?.name ?? client?.fullName ?? undefined,
      {
        orderId,
        stale: opts?.stale,
        hoursWaiting: opts?.hoursWaiting,
      },
    );
  }

  private async notifyAdminsAsync(
    distributorId: string,
    clientId: string,
    totalAmount: number,
    orderId?: string,
  ) {
    const profile = await this.profileRepo.findOne({
      where: { id: distributorId },
      relations: ['user'],
    });
    const agentName =
      profile?.user?.fullName?.trim() ||
      profile?.user?.username?.trim() ||
      profile?.companyName?.trim() ||
      'Agent';
    const client = await this.clientRepo.findOne({ where: { id: clientId } });
    await this.notifications.notifyAdminsNewOrder(
      agentName,
      totalAmount,
      client?.name ?? client?.fullName ?? undefined,
      {
        territory: client?.territory ?? null,
        orderId,
      },
    );
  }

  async syncBatch(distributorId: string, orders: CreateOrderDto[]) {
    const saved = [];
    for (const o of orders) {
      saved.push(await this.create(distributorId, o, true, OrderSource.AGENT));
    }
    return { synced: saved.length, orders: saved };
  }

  async findByDistributor(distributorId: string, from?: Date, to?: Date) {
    const qb = this.repo
      .createQueryBuilder('o')
      .where('o.distributorId = :distributorId', { distributorId })
      .orderBy('o.createdAt', 'DESC')
      .take(from && to ? 500 : 100);

    if (from && to) {
      qb.andWhere('o.createdAt BETWEEN :from AND :to', { from, to });
    }

    const orders = await qb.getMany();
    if (orders.length === 0) return [];

    const clientIds = [...new Set(orders.map((o) => o.clientId))];
    const clients = await this.clientRepo.find({ where: { id: In(clientIds) } });
    const clientMap = new Map(clients.map((c) => [c.id, c]));

    return orders.map((order) => {
      const client = clientMap.get(order.clientId);
      return {
        id: order.id,
        clientId: order.clientId,
        distributorId: order.distributorId,
        visitId: order.visitId,
        status: order.status,
        source: order.source,
        totalAmount: Number(order.totalAmount),
        items: order.items,
        isUrgent: !!order.isUrgent,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        clientName: client?.name ?? 'Klient',
        clientCode: client?.code ?? '',
        clientAddress: client?.address ?? null,
      };
    });
  }

  /** Dostavkachi: on_way + yetkazilgan lekin to‘lanmagan (qisman/qarz) buyurtmalar.
   *  Klient tracking bilan bir xil qoida + bir xil klientning barcha on_way
   *  buyurtmalari (bitta biriktirilgan bo‘lsa ham qolganlari ko‘rinsin). */
  async findForDelivery(deliveryDistributorId: string) {
    const me = await this.profileRepo.findOne({
      where: { id: deliveryDistributorId },
      relations: ['user'],
    });
    if (!me) return [];

    const onWay = await this.repo.find({
      where: { status: OrderStatus.ON_WAY },
      order: { updatedAt: 'DESC' },
      take: 300,
    });

    const unpaidDelivered = await this.repo.find({
      where: {
        status: OrderStatus.DELIVERED,
        deliveryDistributorId,
        paymentStatus: In([
          OrderPaymentStatus.UNPAID,
          OrderPaymentStatus.PARTIAL,
        ]),
      },
      order: { updatedAt: 'DESC' },
      take: 200,
    });

    if (onWay.length === 0 && unpaidDelivered.length === 0) return [];

    const unpaidIds = unpaidDelivered.map((o) => o.id);
    const openPayments = unpaidIds.length
      ? await this.paymentRepo.find({
          where: {
            orderId: In(unpaidIds),
            status: In([PaymentStatus.PENDING, PaymentStatus.PARTIAL]),
          },
          order: { updatedAt: 'DESC', createdAt: 'DESC' },
        })
      : [];
    const dueAtByOrder = new Map<string, Date>();
    for (const p of openPayments) {
      if (!p.dueAt) continue;
      if (!dueAtByOrder.has(p.orderId)) dueAtByOrder.set(p.orderId, p.dueAt);
    }

    const clientIds = [
      ...new Set([...onWay, ...unpaidDelivered].map((o) => o.clientId)),
    ];
    const clients = await this.clientRepo.find({ where: { id: In(clientIds) } });
    const clientMap = new Map(clients.map((c) => [c.id, c]));

    const courierCache = new Map<string, string | null>();
    const myClientIds = new Set<string>();

    for (const order of onWay) {
      const client = clientMap.get(order.clientId);
      if (!client) continue;

      // To‘g‘ridan-to‘g‘ri biriktirilgan
      if (order.deliveryDistributorId === deliveryDistributorId) {
        myClientIds.add(order.clientId);
        continue;
      }

      // Klient portalidagi fallback (bo‘sh / agentga biriktirilgan)
      const resolvedId = await this.resolveDeliveryDistributorId(
        order.deliveryDistributorId,
        client,
        courierCache,
      );
      if (resolvedId === deliveryDistributorId) {
        myClientIds.add(order.clientId);
      }
    }

    const onWayOrders = onWay.filter((order) => myClientIds.has(order.clientId));
    const unpaidOrders = unpaidDelivered.filter((o) => clientMap.has(o.clientId));
    const deliveryOrderIds = [
      ...new Set([...onWayOrders, ...unpaidOrders].map((o) => o.id)),
    ];

    // Reorder updatedAt ni yangilaydi — loadedAt bo‘sh bo‘lsa bir marta to‘ldiramiz
    for (const order of onWayOrders) {
      if (!order.loadedAt) {
        order.loadedAt = order.createdAt ? new Date(order.createdAt) : new Date();
        await this.repo.save(order);
      }
    }

    const paymentRows = deliveryOrderIds.length
      ? await this.paymentRepo.find({
          where: { orderId: In(deliveryOrderIds) },
          order: { createdAt: 'ASC' },
        })
      : [];
    const collectedRows = paymentRows.filter((p) => Number(p.paidAmount) > 0.01);
    const collectorIds = [
      ...new Set(
        collectedRows
          .map((p) => p.collectorDistributorId)
          .filter((id): id is string => !!id),
      ),
    ];
    const collectorProfiles = collectorIds.length
      ? await this.profileRepo.find({
          where: { id: In(collectorIds) },
          relations: ['user'],
        })
      : [];
    const collectorNameById = new Map(
      collectorProfiles.map((p) => [
        p.id,
        p.user?.fullName?.trim() || p.user?.username || p.phone || 'Dostavkachi',
      ]),
    );
    const paymentsByOrder = new Map<
      string,
      Array<{
        id: string;
        amount: number;
        method: string;
        collectorName: string | null;
        collectedAt: string;
        photoUrl: string | null;
        clientPhotoUrl: string | null;
      }>
    >();
    for (const p of collectedRows) {
      const list = paymentsByOrder.get(p.orderId) ?? [];
      list.push({
        id: p.id,
        amount: Number(p.paidAmount),
        method: p.method,
        collectorName: p.collectorDistributorId
          ? collectorNameById.get(p.collectorDistributorId) ?? null
          : null,
        collectedAt: p.createdAt.toISOString(),
        photoUrl: p.photoUrl ?? null,
        // Mijoz xavfsizlik rasmi yetkazib beruvchiga ko‘rsatilmaydi
        clientPhotoUrl: null,
      });
      paymentsByOrder.set(p.orderId, list);
    }

    const mapOrder = (order: Order) => {
      const client = clientMap.get(order.clientId)!;
      const due = dueAtByOrder.get(order.id);
      let payments = paymentsByOrder.get(order.id) ?? [];
      return {
        id: order.id,
        clientId: order.clientId,
        distributorId: order.distributorId,
        deliveryDistributorId: order.deliveryDistributorId ?? deliveryDistributorId,
        deliverySequence: order.deliverySequence ?? null,
        visitId: order.visitId,
        status: order.status,
        source: order.source,
        totalAmount: Number(order.totalAmount),
        paidAmount: Number(order.paidAmount || 0),
        returnedAmount: Number(order.returnedAmount || 0),
        paymentStatus: order.paymentStatus ?? OrderPaymentStatus.UNPAID,
        dueAt: due ? due.toISOString() : null,
        items: order.items,
        isUrgent: !!order.isUrgent,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        loadedAt: order.loadedAt
          ? order.loadedAt.toISOString()
          : order.status === OrderStatus.ON_WAY && order.createdAt
            ? new Date(order.createdAt).toISOString()
            : null,
        deliveredAt: order.deliveredAt
          ? order.deliveredAt.toISOString()
          : order.status === OrderStatus.DELIVERED
            ? new Date(order.updatedAt).toISOString()
            : null,
        lastPaymentPhotoUrl: order.lastPaymentPhotoUrl ?? null,
        lastClientPaymentPhotoUrl: null,
        clientName: client.name ?? 'Klient',
        clientCode: client.code ?? '',
        clientAddress: client.address ?? null,
        clientPhone: client.phone ?? null,
        clientLatitude: client.latitude ?? null,
        clientLongitude: client.longitude ?? null,
        payments,
      };
    };

    const onWayMine = onWayOrders
      .map(mapOrder)
      .sort((a, b) => {
        const sa = a.deliverySequence ?? Number.MAX_SAFE_INTEGER;
        const sb = b.deliverySequence ?? Number.MAX_SAFE_INTEGER;
        if (sa !== sb) return sa - sb;
        const ta = new Date(a.updatedAt).getTime();
        const tb = new Date(b.updatedAt).getTime();
        return tb - ta;
      });

    const unpaidMine = unpaidOrders.map(mapOrder);

    const seen = new Set<string>();
    const merged: ReturnType<typeof mapOrder>[] = [];
    for (const o of [...onWayMine, ...unpaidMine]) {
      if (seen.has(o.id)) continue;
      seen.add(o.id);
      merged.push(o);
    }
    return merged;
  }

  /** Dostavkachi: on_way buyurtmalar tartibini yangilash (1…N). */
  async reorderDelivery(deliveryDistributorId: string, orderIds: string[]) {
    if (!orderIds?.length) {
      throw new BadRequestException('orderIds required');
    }
    const unique = [...new Set(orderIds)];
    if (unique.length !== orderIds.length) {
      throw new BadRequestException('Duplicate orderIds');
    }

    const orders = await this.repo.find({
      where: { id: In(unique), status: OrderStatus.ON_WAY },
    });
    if (orders.length !== unique.length) {
      throw new BadRequestException('Some orders not found or not on_way');
    }

    const courierCache = new Map<string, string | null>();
    const clientIds = [...new Set(orders.map((o) => o.clientId))];
    const clients = await this.clientRepo.find({ where: { id: In(clientIds) } });
    const clientMap = new Map(clients.map((c) => [c.id, c]));

    for (const order of orders) {
      const client = clientMap.get(order.clientId);
      if (!client) throw new ForbiddenException('Client missing');
      let ok = order.deliveryDistributorId === deliveryDistributorId;
      if (!ok) {
        const resolved = await this.resolveDeliveryDistributorId(
          order.deliveryDistributorId,
          client,
          courierCache,
        );
        ok = resolved === deliveryDistributorId;
      }
      if (!ok) throw new ForbiddenException('Not your delivery order');
      // Biriktirishni mustahkamlash
      if (order.deliveryDistributorId !== deliveryDistributorId) {
        order.deliveryDistributorId = deliveryDistributorId;
      }
    }

    const byId = new Map(orders.map((o) => [o.id, o]));
    for (let i = 0; i < unique.length; i++) {
      const order = byId.get(unique[i])!;
      order.deliverySequence = i + 1;
      await this.repo.save(order);
    }

    try {
      this.trackingGateway.broadcastRouteReorder(deliveryDistributorId, unique);
    } catch {
      // WS xatosi reorder natijasini buzmasin
    }

    return this.findForDelivery(deliveryDistributorId);
  }

  private async nextDeliverySequence(deliveryDistributorId: string): Promise<number> {
    const row = await this.repo
      .createQueryBuilder('o')
      .select('MAX(o.deliverySequence)', 'max')
      .where('o.deliveryDistributorId = :id', { id: deliveryDistributorId })
      .andWhere('o.status = :st', { st: OrderStatus.ON_WAY })
      .getRawOne<{ max: string | null }>();
    const max = row?.max != null ? Number(row.max) : 0;
    return (Number.isFinite(max) ? max : 0) + 1;
  }

  /** Klient portalidagi resolveDeliveryDistributor bilan bir xil qoida */
  private async resolveDeliveryDistributorId(
    deliveryDistributorId: string | null,
    client: Client,
    cache: Map<string, string | null>,
  ): Promise<string | null> {
    const agentId = client.distributorId ?? null;
    let deliveryId = deliveryDistributorId;

    if (!deliveryId || (agentId && deliveryId === agentId)) {
      const cacheKey = `${client.companyId ?? '__none__'}|${agentId ?? ''}`;
      if (!cache.has(cacheKey)) {
        cache.set(cacheKey, await this.findCompanyCourierId(client.companyId, agentId));
      }
      deliveryId = cache.get(cacheKey) ?? null;
    }

    return deliveryId;
  }

  private async findCompanyCourierId(
    companyId: string | null | undefined,
    excludeDistributorId?: string | null,
  ): Promise<string | null> {
    const qb = this.profileRepo
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
    const row = await qb.getOne();
    return row?.id ?? null;
  }

  async findClientOrdersForAgent(distributorId: string, status?: OrderStatus) {
    const where: { distributorId: string; source: OrderSource; status?: OrderStatus } = {
      distributorId,
      source: OrderSource.CLIENT,
    };
    if (status) where.status = status;

    const orders = await this.repo.find({
      where,
      order: { createdAt: 'DESC' },
      take: 100,
    });
    if (orders.length === 0) return [];

    const clientIds = [...new Set(orders.map((o) => o.clientId))];
    const clients = await this.clientRepo.find({ where: { id: In(clientIds) } });
    const clientMap = new Map(clients.map((c) => [c.id, c]));

    return orders.map((order) => {
      const client = clientMap.get(order.clientId);
      return {
        id: order.id,
        clientId: order.clientId,
        distributorId: order.distributorId,
        visitId: order.visitId,
        status: order.status,
        source: order.source,
        totalAmount: Number(order.totalAmount),
        items: order.items,
        isUrgent: !!order.isUrgent,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        clientName: client?.name ?? 'Klient',
        clientCode: client?.code ?? '',
        clientAddress: client?.address ?? null,
      };
    });
  }

  async countPendingClientOrders(distributorId: string) {
    return this.repo.count({
      where: {
        distributorId,
        source: OrderSource.CLIENT,
        status: OrderStatus.PENDING,
      },
    });
  }

  /** Manager/admin: barcha agentlarga kelgan klient buyurtmalari */
  async findClientOrdersForAdmin(opts?: {
    companyId?: string;
    status?: OrderStatus;
    limit?: number;
  }) {
    const take = Math.min(Math.max(opts?.limit ?? 200, 1), 500);
    const qb = this.repo
      .createQueryBuilder('o')
      .where('o.source = :source', { source: OrderSource.CLIENT })
      .orderBy('o.createdAt', 'DESC')
      .take(take);

    if (opts?.status) {
      qb.andWhere('o.status = :status', { status: opts.status });
    }

    const orders = await qb.getMany();
    if (orders.length === 0) return [];

    const clientIds = [...new Set(orders.map(o => o.clientId))];
    const distributorIds = [...new Set(orders.map(o => o.distributorId))];
    const [clients, profiles] = await Promise.all([
      this.clientRepo.find({ where: { id: In(clientIds) } }),
      this.profileRepo.find({
        where: { id: In(distributorIds) },
        relations: ['user'],
      }),
    ]);
    const clientMap = new Map(clients.map(c => [c.id, c]));
    const profileMap = new Map(profiles.map(p => [p.id, p]));
    const now = Date.now();

    return orders
      .map(order => {
        const client = clientMap.get(order.clientId);
        const profile = profileMap.get(order.distributorId);
        const agentCompanyId = profile?.companyId ?? client?.companyId ?? null;
        const waitingMs = now - new Date(order.createdAt).getTime();
        return {
          id: order.id,
          clientId: order.clientId,
          distributorId: order.distributorId,
          status: order.status,
          source: order.source,
          totalAmount: Number(order.totalAmount),
          items: order.items,
          isUrgent: !!order.isUrgent,
          createdAt: order.createdAt,
          updatedAt: order.updatedAt,
          waitingMinutes: Math.max(0, Math.floor(waitingMs / 60_000)),
          stale: order.status === OrderStatus.PENDING && waitingMs >= 60 * 60 * 1000,
          clientName: client?.name ?? 'Klient',
          clientCode: client?.code ?? '',
          clientAddress: client?.address ?? null,
          clientPhone: client?.phone ?? null,
          agentName:
            profile?.user?.fullName?.trim() ||
            profile?.user?.username?.trim() ||
            profile?.companyName?.trim() ||
            'Agent',
          agentCompanyId,
        };
      })
      .filter(o => {
        if (!opts?.companyId) return true;
        return o.agentCompanyId === opts.companyId;
      });
  }

  /** 1 soatdan ortiq PENDING klient buyurtmalari — managerga push */
  async processStaleClientOrderAlerts() {
    const cutoff = new Date(Date.now() - 60 * 60 * 1000);
    const stale = await this.repo.find({
      where: {
        source: OrderSource.CLIENT,
        status: OrderStatus.PENDING,
        clientOrderStaleNotifiedAt: IsNull(),
      },
      order: { createdAt: 'ASC' },
      take: 50,
    });

    const due = stale.filter(o => new Date(o.createdAt).getTime() <= cutoff.getTime());
    let notified = 0;
    for (const order of due) {
      const hours = Math.max(
        1,
        Math.floor((Date.now() - new Date(order.createdAt).getTime()) / 3_600_000),
      );
      try {
        await this.notifyManagersClientOrder(
          order.distributorId,
          order.clientId,
          Number(order.totalAmount),
          order.id,
          { stale: true, hoursWaiting: hours },
        );
        order.clientOrderStaleNotifiedAt = new Date();
        await this.repo.save(order);
        notified++;
      } catch {
        /* next */
      }
    }
    return { checked: due.length, notified };
  }

  /** Agent / manager: pending klient buyurtmasi mahsulotlarini o'zgartirish */
  async updateClientOrderItems(
    orderId: string,
    distributorId: string | null,
    items: OrderItemDto[],
    asAdmin = false,
    actor?: User | null,
  ) {
    const order = await this.repo.findOne({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');
    if (!asAdmin && order.distributorId !== distributorId) {
      throw new ForbiddenException('Not your order');
    }
    if (order.source !== OrderSource.CLIENT) {
      throw new BadRequestException('Only client orders can be edited this way');
    }
    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException('Order is not pending');
    }
    if (!items?.length) {
      throw new BadRequestException('Order must have at least one item');
    }

    const beforeItems: OrderItem[] = Array.isArray(order.items)
      ? order.items.map((it) => ({ ...it }))
      : [];

    const normalized = await this.normalizeAndValidatePromoItems(items);

    for (const it of normalized) {
      if (!it.productId || !(it.quantity > 0)) {
        throw new BadRequestException('Invalid order item');
      }
    }

    const itemChanges = this.diffOrderItems(beforeItems, normalized);
    order.items = normalized;
    order.totalAmount = normalized.reduce(
      (sum, it) => sum + Number(it.price) * Number(it.quantity),
      0,
    );
    const saved = await this.repo.save(order);

    const agentName = await this.resolveAgentName(order.distributorId);
    const actorName = this.actorDisplayName(actor);
    const actorRole = actor?.role ?? (asAdmin ? UserRole.MANAGER : UserRole.DISTRIBUTOR);
    const agentSilent =
      (actorRole === UserRole.MANAGER || actorRole === UserRole.ADMIN) &&
      !(await this.agentActedOnOrder(orderId));
    const roleLabel = this.roleLabel(actorRole);
    const summary = agentSilent
      ? `Agent ${agentName} tomonidan ko‘rib chiqilmagan. ${roleLabel} ${actorName} buyurtmani o‘zgartirdi`
      : `${roleLabel} ${actorName} buyurtmani o‘zgartirdi`;

    await this.recordAudit({
      orderId: order.id,
      actorUserId: actor?.id ?? null,
      actorName,
      actorRole,
      action: 'items_updated',
      beforeItems,
      afterItems: normalized,
      itemChanges,
      summary,
      meta: {
        agentDidNotRespond: agentSilent,
        agentName,
      },
    });

    return saved;
  }

  /** Agent / manager: klient buyurtmasini omborga (confirmed) yuboradi */
  async sendToWarehouse(
    orderId: string,
    distributorId: string | null,
    isUrgent = false,
    asAdmin = false,
    actor?: User | null,
  ) {
    const order = await this.repo.findOne({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');
    if (!asAdmin && order.distributorId !== distributorId) {
      throw new ForbiddenException('Not your order');
    }
    if (order.source !== OrderSource.CLIENT) {
      throw new BadRequestException('Only client orders can be sent to warehouse this way');
    }
    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException('Order is not pending');
    }

    const beforeItems: OrderItem[] = Array.isArray(order.items)
      ? order.items.map((it) => ({ ...it }))
      : [];

    // Sovg‘a/aksiya avtomatik qo‘shilmaydi — agent/admin buyurtmada belgilagan itemlar saqlanadi
    const expandedItems: OrderItem[] = (Array.isArray(order.items) ? order.items : []).map(
      (it) => ({
        ...it,
        isFree: it.isFree === true,
        promotionId: it.promotionId,
        actualQuantity: it.actualQuantity ?? null,
      }),
    );

    order.items = expandedItems;
    order.totalAmount = expandedItems.reduce(
      (sum, it) => sum + Number(it.price) * Number(it.quantity),
      0,
    );

    // Use the order's agent for visit/stock — manager ham shu agent nomidan yuboradi
    const actingDistributorId = order.distributorId;

    // Ombor(stock)ni kamaytiramiz + visit/order’ni saqlaymiz
    const queryRunner = this.repo.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    let saved: Order;
    try {
      // stock decrement: product stockBalance -= sum(quantity)
      const qtyByProductId = new Map<string, number>();
      for (const it of expandedItems) {
        if (!it.productId) continue;
        qtyByProductId.set(
          it.productId,
          (qtyByProductId.get(it.productId) ?? 0) + Number(it.quantity),
        );
      }

      for (const [productId, qty] of qtyByProductId.entries()) {
        if (!(qty > 0)) continue;
        const result = await queryRunner.manager
          .createQueryBuilder()
          .update(Product)
          .set({ stockBalance: () => '"stockBalance" - :qty' })
          .where('id = :id', { id: productId })
          .andWhere('"stockBalance" >= :qty', { qty })
          .execute();

        if (!result.affected || result.affected === 0) {
          throw new BadRequestException(`Not enough stock for product ${productId}`);
        }
      }

      const visitRepo = queryRunner.manager.getRepository(Visit);
      const visit = visitRepo.create({
        distributorId: actingDistributorId,
        clientId: order.clientId,
        visitedAt: new Date(),
        status: VisitStatus.COMPLETED,
        orderTotal: Number(order.totalAmount),
        notes: `client_order:${order.id}`,
        isOfflineCreated: false,
      });
      await queryRunner.manager.save(visit);

      order.status = OrderStatus.CONFIRMED;
      order.visitId = visit.id;
      order.isUrgent = isUrgent;
      saved = await queryRunner.manager.save(order);

      await queryRunner.commitTransaction();
    } catch (e) {
      await queryRunner.rollbackTransaction();
      throw e;
    } finally {
      await queryRunner.release();
    }

    const agentName = await this.resolveAgentName(order.distributorId);
    const actorName = this.actorDisplayName(actor);
    const actorRole = actor?.role ?? (asAdmin ? UserRole.MANAGER : UserRole.DISTRIBUTOR);
    const agentSilent =
      (actorRole === UserRole.MANAGER || actorRole === UserRole.ADMIN) &&
      !(await this.agentActedOnOrder(orderId));
    const roleLabel = this.roleLabel(actorRole);
    const hadEditByActor = actor?.id
      ? (await this.auditRepo.count({
          where: { orderId, action: 'items_updated', actorUserId: actor.id },
        })) > 0
      : false;
    let summary: string;
    if (agentSilent) {
      summary = hadEditByActor
        ? `Agent ${agentName} tomonidan ko‘rib chiqilmagan. ${roleLabel} ${actorName} o‘zgartirib omborga yubordi`
        : `Agent ${agentName} tomonidan ko‘rib chiqilmagan. ${roleLabel} ${actorName} buyurtmani omborga yubordi`;
    } else if (hadEditByActor) {
      summary = `${roleLabel} ${actorName} o‘zgartirib omborga yubordi`;
    } else {
      summary = `${roleLabel} ${actorName} buyurtmani omborga yubordi`;
    }

    await this.recordAudit({
      orderId: order.id,
      actorUserId: actor?.id ?? null,
      actorName,
      actorRole,
      action: 'sent_to_warehouse',
      beforeItems,
      afterItems: expandedItems,
      itemChanges: this.diffOrderItems(beforeItems, expandedItems),
      summary,
      meta: {
        agentDidNotRespond: agentSilent,
        agentName,
        isUrgent,
        hadEditByActor,
      },
    });

    this.notifyClientOrderStatus(
      order.clientId,
      (lang) => PushI18n.orderAccepted(lang),
      order.id,
    ).catch(() => {});

    return saved;
  }

  /** Agent / manager: klient buyurtmasini rad etadi (cancelled) */
  async rejectClientOrder(
    orderId: string,
    distributorId: string | null,
    asAdmin = false,
    actor?: User | null,
  ) {
    const order = await this.repo.findOne({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');
    if (!asAdmin && order.distributorId !== distributorId) {
      throw new ForbiddenException('Not your order');
    }
    if (order.source !== OrderSource.CLIENT) {
      throw new BadRequestException('Only client orders can be rejected this way');
    }
    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException('Order is not pending');
    }
    const beforeItems: OrderItem[] = Array.isArray(order.items)
      ? order.items.map((it) => ({ ...it }))
      : [];
    order.status = OrderStatus.CANCELLED;
    const saved = await this.repo.save(order);

    const agentName = await this.resolveAgentName(order.distributorId);
    const actorName = this.actorDisplayName(actor);
    const actorRole = actor?.role ?? (asAdmin ? UserRole.MANAGER : UserRole.DISTRIBUTOR);
    const agentSilent =
      (actorRole === UserRole.MANAGER || actorRole === UserRole.ADMIN) &&
      !(await this.agentActedOnOrder(orderId));
    const roleLabel = this.roleLabel(actorRole);
    const summary = agentSilent
      ? `Agent ${agentName} tomonidan ko‘rib chiqilmagan. ${roleLabel} ${actorName} buyurtmani bekor qildi`
      : `${roleLabel} ${actorName} buyurtmani bekor qildi`;

    await this.recordAudit({
      orderId: order.id,
      actorUserId: actor?.id ?? null,
      actorName,
      actorRole,
      action: 'rejected',
      beforeItems,
      afterItems: beforeItems,
      itemChanges: [],
      summary,
      meta: { agentDidNotRespond: agentSilent, agentName },
    });

    this.notifyClientOrderStatus(
      order.clientId,
      (lang) => PushI18n.orderRejected(lang),
      order.id,
    ).catch(() => {});
    return saved;
  }

  private actorDisplayName(actor?: User | null): string {
    if (!actor) return '—';
    return actor.fullName?.trim() || actor.username?.trim() || '—';
  }

  private roleLabel(role: string): string {
    switch (role) {
      case UserRole.ADMIN:
        return 'Admin';
      case UserRole.MANAGER:
        return 'Manager';
      case UserRole.DISTRIBUTOR:
        return 'Agent';
      case UserRole.CLIENT:
        return 'Mijoz';
      default:
        return role;
    }
  }

  private async resolveAgentName(distributorId: string): Promise<string> {
    const profile = await this.profileRepo.findOne({
      where: { id: distributorId },
      relations: ['user'],
    });
    return (
      profile?.user?.fullName?.trim() ||
      profile?.user?.username?.trim() ||
      profile?.companyName?.trim() ||
      'Agent'
    );
  }

  private async agentActedOnOrder(orderId: string): Promise<boolean> {
    const count = await this.auditRepo.count({
      where: {
        orderId,
        actorRole: UserRole.DISTRIBUTOR,
        action: In(['items_updated', 'sent_to_warehouse', 'rejected']),
      },
    });
    return count > 0;
  }

  private diffOrderItems(before: OrderItem[], after: OrderItem[]): OrderItemChange[] {
    const beforeMap = new Map<string, { qty: number; price: number; name: string; code: string }>();
    for (const it of before) {
      if (!it.productId || it.isFree === true) continue;
      const prev = beforeMap.get(it.productId);
      if (prev) {
        prev.qty += Number(it.quantity) || 0;
      } else {
        beforeMap.set(it.productId, {
          qty: Number(it.quantity) || 0,
          price: Number(it.price) || 0,
          name: it.productName,
          code: it.productCode,
        });
      }
    }
    const afterMap = new Map<string, { qty: number; price: number; name: string; code: string }>();
    for (const it of after) {
      if (!it.productId || it.isFree === true) continue;
      const prev = afterMap.get(it.productId);
      if (prev) {
        prev.qty += Number(it.quantity) || 0;
      } else {
        afterMap.set(it.productId, {
          qty: Number(it.quantity) || 0,
          price: Number(it.price) || 0,
          name: it.productName,
          code: it.productCode,
        });
      }
    }

    const changes: OrderItemChange[] = [];
    for (const [productId, b] of beforeMap) {
      const a = afterMap.get(productId);
      if (!a) {
        changes.push({
          productId,
          productCode: b.code,
          productName: b.name,
          change: 'removed',
          beforeQty: b.qty,
          beforePrice: b.price,
        });
      } else if (a.qty !== b.qty) {
        changes.push({
          productId,
          productCode: a.code || b.code,
          productName: a.name || b.name,
          change: 'qty_changed',
          beforeQty: b.qty,
          afterQty: a.qty,
          beforePrice: b.price,
          afterPrice: a.price,
        });
      }
    }
    for (const [productId, a] of afterMap) {
      if (!beforeMap.has(productId)) {
        changes.push({
          productId,
          productCode: a.code,
          productName: a.name,
          change: 'added',
          afterQty: a.qty,
          afterPrice: a.price,
        });
      }
    }
    return changes;
  }

  private async recordAudit(input: {
    orderId: string;
    actorUserId: string | null;
    actorName: string;
    actorRole: string;
    action: OrderAuditAction;
    beforeItems?: OrderItem[] | null;
    afterItems?: OrderItem[] | null;
    itemChanges?: OrderItemChange[];
    summary?: string | null;
    meta?: Record<string, unknown> | null;
  }) {
    const row = this.auditRepo.create({
      orderId: input.orderId,
      actorUserId: input.actorUserId,
      actorName: input.actorName,
      actorRole: input.actorRole,
      action: input.action,
      beforeItems: input.beforeItems ?? null,
      afterItems: input.afterItems ?? null,
      itemChanges: input.itemChanges ?? [],
      summary: input.summary ?? null,
      meta: input.meta ?? null,
    });
    return this.auditRepo.save(row);
  }

  private mapAudit(ev: OrderAuditEvent) {
    return {
      id: ev.id,
      action: ev.action,
      actorName: ev.actorName,
      actorRole: ev.actorRole,
      summary: ev.summary,
      itemChanges: ev.itemChanges ?? [],
      meta: ev.meta ?? null,
      createdAt: ev.createdAt,
    };
  }

  private async loadAuditsByOrderIds(orderIds: string[]) {
    if (!orderIds.length) {
      return new Map<string, Array<ReturnType<OrdersService['mapAudit']>>>();
    }
    const rows = await this.auditRepo.find({
      where: { orderId: In(orderIds) },
      order: { createdAt: 'ASC' },
    });
    const map = new Map<string, Array<ReturnType<OrdersService['mapAudit']>>>();
    for (const row of rows) {
      const list = map.get(row.orderId) ?? [];
      list.push(this.mapAudit(row));
      map.set(row.orderId, list);
    }
    return map;
  }

  private async notifyClientOrderStatus(
    clientId: string,
    build: (lang: PushLang) => { title: string; body: string },
    orderId: string,
  ) {
    const users = await this.userRepo.find({ where: { clientId } });
    if (users.length === 0) return;
    await Promise.all(
      users.map((user) => {
        const msg = build(normalizePushLang(user.preferredLanguage));
        return this.notifications.sendToUser(
          user.id,
          msg.title,
          msg.body,
          NotificationType.ORDER,
          { orderId, type: 'order_status' },
        );
      }),
    );
  }

  async findForAdmin(
    companyId?: string,
    limit = 500,
    opts?: {
      distributorId?: string;
      deliveryDistributorId?: string;
      from?: Date;
      to?: Date;
    },
  ) {
    const qb: SelectQueryBuilder<Order> = this.repo
      .createQueryBuilder('o')
      .orderBy('o.createdAt', 'DESC')
      .take(Math.min(Math.max(limit, 1), 2000));

    if (opts?.distributorId) {
      qb.andWhere('o.distributorId = :distributorId', {
        distributorId: opts.distributorId,
      });
    }
    if (opts?.deliveryDistributorId) {
      qb.andWhere('o.deliveryDistributorId = :deliveryDistributorId', {
        deliveryDistributorId: opts.deliveryDistributorId,
      });
    }
    if (opts?.from && opts?.to) {
      qb.andWhere(
        '(o.createdAt BETWEEN :from AND :to OR o.updatedAt BETWEEN :from AND :to)',
        { from: opts.from, to: opts.to },
      );
    }

    const orders = await qb.getMany();
    if (orders.length === 0) return [];

    const clientIds = [...new Set(orders.map((o) => o.clientId))];
    const distributorIds = [
      ...new Set([
        ...orders.map((o) => o.distributorId),
        ...orders.map((o) => o.deliveryDistributorId).filter((id): id is string => !!id),
      ]),
    ];

    const [clients, profiles] = await Promise.all([
      this.clientRepo.find({ where: { id: In(clientIds) } }),
      this.profileRepo.find({
        where: { id: In(distributorIds) },
        relations: ['user'],
      }),
    ]);

    const clientMap = new Map(clients.map((c) => [c.id, c]));
    const profileMap = new Map(profiles.map((p) => [p.id, p]));
    const auditMap = await this.loadAuditsByOrderIds(orders.map((o) => o.id));

    return orders
      .map((order) => {
        const client = clientMap.get(order.clientId);
        const profile = profileMap.get(order.distributorId);
        const deliveryProfile = order.deliveryDistributorId
          ? profileMap.get(order.deliveryDistributorId)
          : null;
        const agentCompanyId = profile?.companyId ?? null;
        return {
          id: order.id,
          clientId: order.clientId,
          distributorId: order.distributorId,
          deliveryDistributorId: order.deliveryDistributorId,
          visitId: order.visitId,
          status: order.status,
          source: order.source,
          totalAmount: Number(order.totalAmount),
          items: order.items,
          isOfflineCreated: order.isOfflineCreated,
          isUrgent: !!order.isUrgent,
          offlineId: order.offlineId,
          createdAt: order.createdAt,
          updatedAt: order.updatedAt,
          client: client
            ? {
                code: client.code,
                name: client.name,
                companyId: client.companyId,
                lineCode: client.lineCode,
                clientClass: client.clientClass,
                category: client.category,
                address: client.address,
                phone: client.phone,
                latitude: client.latitude,
                longitude: client.longitude,
              }
            : null,
          agentName: profile?.user?.fullName ?? null,
          deliveryName: deliveryProfile?.user?.fullName ?? null,
          companyName: profile?.companyName ?? null,
          agentCompanyId,
          audit: auditMap.get(order.id) ?? [],
        };
      })
      .filter((o) => {
        if (!companyId) return true;
        const clientCo = o.client?.companyId ?? null;
        const agentCo = o.agentCompanyId ?? null;
        if (clientCo === companyId || agentCo === companyId) return true;
        if (!clientCo && !agentCo) return true;
        return false;
      });
  }

  async findOne(id: string) {
    const order = await this.repo.findOne({ where: { id } });
    if (!order) return null;
    const auditMap = await this.loadAuditsByOrderIds([id]);
    return {
      ...order,
      audit: auditMap.get(id) ?? [],
    };
  }

  async update(id: string, dto: UpdateOrderDto) {
    const order = await this.repo.findOne({ where: { id } });
    if (!order) throw new NotFoundException('Order not found');
    const prevStatus = order.status;
    const prevDriver = order.deliveryDistributorId;

    if (dto.status !== undefined) order.status = dto.status;
    if (dto.deliveryDistributorId !== undefined) {
      order.deliveryDistributorId = dto.deliveryDistributorId;
    }

    // Tarozi: haqiqiy miqdor (ves) ni actualQuantity sifatida saqlash
    if (dto.items !== undefined && Array.isArray(dto.items)) {
      const byKey = new Map<string, OrderItemDto>();
      for (const it of dto.items) {
        const key = `${it.productId}|${it.promotionId ?? ''}|${it.isFree === true ? '1' : '0'}`;
        byKey.set(key, it);
      }
      const merged: OrderItem[] = (Array.isArray(order.items) ? order.items : []).map((existing) => {
        const key = `${existing.productId}|${existing.promotionId ?? ''}|${existing.isFree === true ? '1' : '0'}`;
        const incoming = byKey.get(key);
        if (!incoming) {
          // productId bo‘yicha fallback (eski klientlar)
          const byProduct = dto.items!.find((x) => x.productId === existing.productId);
          if (byProduct && byProduct.actualQuantity != null) {
            return { ...existing, actualQuantity: Number(byProduct.actualQuantity) };
          }
          return existing;
        }
        const actual =
          incoming.actualQuantity != null
            ? Number(incoming.actualQuantity)
            : Number(incoming.quantity);
        return {
          ...existing,
          actualQuantity: Number.isFinite(actual) ? actual : existing.actualQuantity ?? null,
          // Tarozi narxni o‘zgartirmaydi — aksiya narxi saqlanadi
          isFree: existing.isFree === true,
          promotionId: existing.promotionId,
        };
      });
      order.items = merged;
      // Jami: haqiqiy miqdor bo‘lsa u bilan, aks holda da’vo miqdori
      order.totalAmount = merged.reduce((sum, it) => {
        const qty =
          it.actualQuantity != null && Number(it.actualQuantity) > 0
            ? Number(it.actualQuantity)
            : Number(it.quantity);
        return sum + qty * Number(it.price);
      }, 0);
    }

    const becomingOnWay =
      order.status === OrderStatus.ON_WAY &&
      (dto.status === OrderStatus.ON_WAY ||
        prevStatus === OrderStatus.ON_WAY ||
        dto.deliveryDistributorId !== undefined);
    const leavingOnWay =
      dto.status !== undefined &&
      dto.status !== OrderStatus.ON_WAY &&
      prevStatus === OrderStatus.ON_WAY;

    if (leavingOnWay) {
      order.deliverySequence = null;
    }

    // Birinchi marta on_way ga o‘tganda yuklash vaqtini belgilash
    if (
      order.status === OrderStatus.ON_WAY &&
      prevStatus !== OrderStatus.ON_WAY &&
      !order.loadedAt
    ) {
      order.loadedAt = new Date();
    }

    const assignedDriverPreview = order.deliveryDistributorId;
    const driverChanged =
      dto.deliveryDistributorId !== undefined &&
      dto.deliveryDistributorId !== prevDriver;

    if (
      order.status === OrderStatus.ON_WAY &&
      assignedDriverPreview &&
      !leavingOnWay &&
      (order.deliverySequence == null || driverChanged || dto.status === OrderStatus.ON_WAY)
    ) {
      if (order.deliverySequence == null || driverChanged) {
        order.deliverySequence = await this.nextDeliverySequence(assignedDriverPreview);
      }
    }

    const saved = await this.repo.save(order);

    // Tovar yuklash: shu klientning boshqa on_way buyurtmalariga ham shu haydovchini biriktir
    const assignedDriver =
      dto.deliveryDistributorId !== undefined
        ? dto.deliveryDistributorId
        : saved.deliveryDistributorId;
    if (assignedDriver && saved.status === OrderStatus.ON_WAY) {
      const siblings = await this.repo.find({
        where: {
          clientId: saved.clientId,
          status: OrderStatus.ON_WAY,
        },
      });
      for (const sib of siblings) {
        if (sib.id === saved.id) continue;
        const orphan =
          !sib.deliveryDistributorId ||
          sib.deliveryDistributorId === saved.distributorId;
        if (!orphan && sib.deliveryDistributorId !== assignedDriver) continue;
        let changed = false;
        if (sib.deliveryDistributorId !== assignedDriver) {
          sib.deliveryDistributorId = assignedDriver;
          changed = true;
        }
        if (sib.deliverySequence == null) {
          sib.deliverySequence = await this.nextDeliverySequence(assignedDriver);
          changed = true;
        }
        if (changed) await this.repo.save(sib);
      }
    }

    if (dto.status !== undefined && dto.status !== prevStatus) {
      const statusKey = this.clientStatusKey(dto.status);
      if (statusKey) {
        this.notifyClientOrderStatus(
          order.clientId,
          (lang) => PushI18n.orderStatus(lang, statusKey)!,
          order.id,
        ).catch(() => {});
      }
    }
    return saved;
  }

  private clientStatusKey(
    status: OrderStatus,
  ): 'packing' | 'on_way' | 'delivered' | 'cancelled' | null {
    switch (status) {
      case OrderStatus.PACKING:
        return 'packing';
      case OrderStatus.ON_WAY:
        return 'on_way';
      case OrderStatus.DELIVERED:
        return 'delivered';
      case OrderStatus.CANCELLED:
        return 'cancelled';
      default:
        return null;
    }
  }
}
