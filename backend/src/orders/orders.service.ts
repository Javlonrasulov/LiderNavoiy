import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from './entities/order.entity';
import { CreateOrderDto } from './dto/order.dto';
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

  findOne(id: string) {
    return this.repo.findOne({ where: { id } });
  }
}
