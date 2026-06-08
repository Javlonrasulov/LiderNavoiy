import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Order } from './entities/order.entity';
import { CreateOrderDto, UpdateOrderDto } from './dto/order.dto';
import { OrderStatus } from '../common/enums';
import { NotificationsService } from '../notifications/notifications.service';
import { DistributorProfile } from '../distributors/entities/distributor-profile.entity';
import { Client } from '../clients/entities/client.entity';
import { User } from '../auth/entities/user.entity';

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
  ) {}

  async create(distributorId: string, dto: CreateOrderDto, offline = false) {
    const totalAmount = dto.items.reduce((sum, i) => sum + i.quantity * i.price, 0);
    const order = this.repo.create({
      distributorId,
      clientId: dto.clientId,
      visitId: dto.visitId ?? null,
      items: dto.items,
      totalAmount,
      status: OrderStatus.PENDING,
      isOfflineCreated: offline,
      offlineId: dto.offlineId ?? null,
    });
    const saved = await this.repo.save(order);

    // Push notification to admins
    this.notifyAdminsAsync(distributorId, dto.clientId, totalAmount).catch(() => {});

    return saved;
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
      saved.push(await this.create(distributorId, o, true));
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

  async findForAdmin(companyId?: string, limit = 500) {
    const orders = await this.repo.find({
      order: { createdAt: 'DESC' },
      take: limit,
    });
    if (orders.length === 0) return [];

    const clientIds = [...new Set(orders.map((o) => o.clientId))];
    const distributorIds = [...new Set(orders.map((o) => o.distributorId))];

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
        return {
          id: order.id,
          clientId: order.clientId,
          distributorId: order.distributorId,
          visitId: order.visitId,
          status: order.status,
          totalAmount: Number(order.totalAmount),
          items: order.items,
          isOfflineCreated: order.isOfflineCreated,
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
          companyName: profile?.companyName ?? null,
        };
      })
      .filter((o) => !companyId || o.client?.companyId === companyId);
  }

  findOne(id: string) {
    return this.repo.findOne({ where: { id } });
  }

  async update(id: string, dto: UpdateOrderDto) {
    const order = await this.repo.findOne({ where: { id } });
    if (!order) throw new NotFoundException('Order not found');
    if (dto.status !== undefined) order.status = dto.status;
    if (dto.deliveryDistributorId !== undefined) {
      order.deliveryDistributorId = dto.deliveryDistributorId;
    }
    return this.repo.save(order);
  }
}
