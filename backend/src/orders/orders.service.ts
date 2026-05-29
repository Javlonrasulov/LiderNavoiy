import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from './entities/order.entity';
import { CreateOrderDto } from './dto/order.dto';
import { OrderStatus } from '../common/enums';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private readonly repo: Repository<Order>,
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
    return this.repo.save(order);
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
