import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Order } from './entities/order.entity';
import { CreateOrderDto, UpdateOrderDto } from './dto/order.dto';
import { OrderStatus, OrderSource } from '../common/enums';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/notification.types';
import { DistributorProfile } from '../distributors/entities/distributor-profile.entity';
import { Client } from '../clients/entities/client.entity';
import { User } from '../auth/entities/user.entity';
import { VisitsService } from '../visits/visits.service';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private readonly repo: Repository<Order>,
    @InjectRepository(DistributorProfile)
    private readonly profileRepo: Repository<DistributorProfile>,
    @InjectRepository(Client)
    private readonly clientRepo: Repository<Client>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly notifications: NotificationsService,
    private readonly visitsService: VisitsService,
  ) {}

  async create(
    distributorId: string,
    dto: CreateOrderDto,
    offline = false,
    source: OrderSource = OrderSource.AGENT,
  ) {
    const totalAmount = dto.items.reduce((sum, i) => sum + i.quantity * i.price, 0);
    const order = this.repo.create({
      distributorId,
      clientId: dto.clientId,
      visitId: dto.visitId ?? null,
      items: dto.items,
      totalAmount,
      status: OrderStatus.PENDING,
      source,
      isOfflineCreated: offline,
      offlineId: dto.offlineId ?? null,
    });
    const saved = await this.repo.save(order);

    if (source === OrderSource.CLIENT) {
      this.notifyAgentClientOrder(distributorId, dto.clientId, totalAmount, saved.id).catch(() => {});
    } else {
      this.notifyAdminsAsync(distributorId, dto.clientId, totalAmount).catch(() => {});
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
    await this.notifications.sendToDistributor(
      distributorId,
      'Yangi klient buyurtmasi',
      `${name}: ${amount} so'm`,
      NotificationType.ORDER,
      { orderId, type: 'client_order' },
    );
  }

  private async notifyAdminsAsync(
    distributorId: string,
    clientId: string,
    totalAmount: number,
  ) {
    const profile = await this.profileRepo.findOne({ where: { id: distributorId } });
    let agentName = 'Agent';
    if (profile?.userId) {
      const user = await this.userRepo.findOne({ where: { id: profile.userId } });
      agentName = user?.fullName ?? agentName;
    }
    const client = await this.clientRepo.findOne({ where: { id: clientId } });
    await this.notifications.notifyAdminsNewOrder(
      agentName,
      totalAmount,
      client?.name,
    );
  }

  async syncBatch(distributorId: string, orders: CreateOrderDto[]) {
    const saved = [];
    for (const o of orders) {
      saved.push(await this.create(distributorId, o, true, OrderSource.AGENT));
    }
    return { synced: saved.length, orders: saved };
  }

  findByDistributor(distributorId: string) {
    return this.repo.find({
      where: { distributorId },
      order: { createdAt: 'DESC' },
      take: 100,
    });
  }

  /** Dostavkachi: admin Tovar yuklash orqali biriktirilgan (on_way) buyurtmalar */
  async findForDelivery(deliveryDistributorId: string) {
    const orders = await this.repo.find({
      where: {
        deliveryDistributorId,
        status: OrderStatus.ON_WAY,
      },
      order: { updatedAt: 'DESC' },
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
        deliveryDistributorId: order.deliveryDistributorId,
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
        clientPhone: client?.phone ?? null,
      };
    });
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

  /** Agent: klient buyurtmasini omborga (confirmed) yuboradi — tashrif sifatida ham qayd etiladi */
  async sendToWarehouse(orderId: string, distributorId: string, isUrgent = false) {
    const order = await this.repo.findOne({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');
    if (order.distributorId !== distributorId) {
      throw new ForbiddenException('Not your order');
    }
    if (order.source !== OrderSource.CLIENT) {
      throw new BadRequestException('Only client orders can be sent to warehouse this way');
    }
    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException('Order is not pending');
    }

    const visit = await this.visitsService.create(distributorId, {
      clientId: order.clientId,
      visitedAt: new Date().toISOString(),
      orderTotal: Number(order.totalAmount),
      notes: `client_order:${order.id}`,
    });

    order.status = OrderStatus.CONFIRMED;
    order.visitId = visit.id;
    order.isUrgent = isUrgent;
    const saved = await this.repo.save(order);
    this.notifyClientOrderStatus(
      order.clientId,
      'Buyurtma qabul qilindi',
      'Agent buyurtmangizni qabul qildi',
      order.id,
    ).catch(() => {});
    return saved;
  }

  /** Agent: klient buyurtmasini rad etadi (cancelled) */
  async rejectClientOrder(orderId: string, distributorId: string) {
    const order = await this.repo.findOne({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');
    if (order.distributorId !== distributorId) {
      throw new ForbiddenException('Not your order');
    }
    if (order.source !== OrderSource.CLIENT) {
      throw new BadRequestException('Only client orders can be rejected this way');
    }
    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException('Order is not pending');
    }
    order.status = OrderStatus.CANCELLED;
    const saved = await this.repo.save(order);
    this.notifyClientOrderStatus(
      order.clientId,
      'Buyurtma qaytarildi',
      'Agent buyurtmangizni rad etdi',
      order.id,
    ).catch(() => {});
    return saved;
  }

  private async notifyClientOrderStatus(
    clientId: string,
    title: string,
    body: string,
    orderId: string,
  ) {
    const user = await this.userRepo.findOne({ where: { clientId } });
    if (!user) return;
    await this.notifications.sendToUser(
      user.id,
      title,
      body,
      NotificationType.ORDER,
      { orderId, type: 'order_status' },
    );
  }

  async findForAdmin(companyId?: string, limit = 500) {
    const orders = await this.repo.find({
      order: { createdAt: 'DESC' },
      take: limit,
    });
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
              }
            : null,
          agentName: profile?.user?.fullName ?? null,
          deliveryName: deliveryProfile?.user?.fullName ?? null,
          companyName: profile?.companyName ?? null,
          agentCompanyId,
        };
      })
      .filter((o) => {
        if (!companyId) return true;
        const clientCo = o.client?.companyId ?? null;
        const agentCo = o.agentCompanyId ?? null;
        // Mijoz yoki agent kompaniyasi mos kelsa — ko'rsat
        if (clientCo === companyId || agentCo === companyId) return true;
        // Kompaniya belgilanmagan buyurtmalar ham yo'qolmasin
        if (!clientCo && !agentCo) return true;
        return false;
      });
  }

  findOne(id: string) {
    return this.repo.findOne({ where: { id } });
  }

  async update(id: string, dto: UpdateOrderDto) {
    const order = await this.repo.findOne({ where: { id } });
    if (!order) throw new NotFoundException('Order not found');
    const prevStatus = order.status;
    if (dto.status !== undefined) order.status = dto.status;
    if (dto.deliveryDistributorId !== undefined) {
      order.deliveryDistributorId = dto.deliveryDistributorId;
    }
    const saved = await this.repo.save(order);

    if (dto.status !== undefined && dto.status !== prevStatus) {
      const notify = this.clientNotifyForStatus(dto.status);
      if (notify) {
        this.notifyClientOrderStatus(
          order.clientId,
          notify.title,
          notify.body,
          order.id,
        ).catch(() => {});
      }
    }
    return saved;
  }

  private clientNotifyForStatus(
    status: OrderStatus,
  ): { title: string; body: string } | null {
    switch (status) {
      case OrderStatus.PACKING:
        return {
          title: "Buyurtma yig'ildi",
          body: "Ombor buyurtmangizni yig'ib bo'ldi",
        };
      case OrderStatus.ON_WAY:
        return {
          title: "Buyurtma yo'lda",
          body: 'Dostavkachi buyurtmani yetkazmoqda',
        };
      case OrderStatus.DELIVERED:
        return {
          title: 'Buyurtma yetkazildi',
          body: 'Buyurtmangiz muvaffaqiyatli yetkazildi',
        };
      case OrderStatus.CANCELLED:
        return {
          title: 'Buyurtma bekor qilindi',
          body: 'Buyurtmangiz bekor qilindi',
        };
      default:
        return null;
    }
  }
}
