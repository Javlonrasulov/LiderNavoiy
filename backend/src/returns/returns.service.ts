import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { OrderReturn, OrderReturnItem } from './entities/order-return.entity';
import { Order } from '../orders/entities/order.entity';
import { Product } from '../products/entities/product.entity';
import { Client } from '../clients/entities/client.entity';
import { OrderReturnStatus } from '../common/enums';
import { CreateReturnDto } from '../payments/dto/payment.dto';
import { DistributorProfile } from '../distributors/entities/distributor-profile.entity';

@Injectable()
export class ReturnsService {
  constructor(
    @InjectRepository(OrderReturn)
    private readonly repo: Repository<OrderReturn>,
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    @InjectRepository(Client)
    private readonly clientRepo: Repository<Client>,
    @InjectRepository(DistributorProfile)
    private readonly profileRepo: Repository<DistributorProfile>,
  ) {}

  async create(orderId: string, distributorId: string, dto: CreateReturnDto) {
    const order = await this.orderRepo.findOne({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');
    if (
      order.deliveryDistributorId !== distributorId &&
      order.distributorId !== distributorId
    ) {
      throw new ForbiddenException('Not your order');
    }
    if (!dto.items?.length) throw new BadRequestException('Items required');

    const items: OrderReturnItem[] = dto.items.map((i) => ({
      productId: i.productId,
      productCode: i.productCode,
      productName: i.productName,
      quantity: i.quantity,
      price: i.price,
      unit: i.unit,
    }));
    const totalAmount = items.reduce((s, i) => s + i.quantity * i.price, 0);

    const row = this.repo.create({
      orderId,
      requestedByDistributorId: distributorId,
      status: OrderReturnStatus.PENDING,
      items,
      totalAmount,
      note: dto.note ?? null,
    });
    return this.repo.save(row);
  }

  async findAll(status?: OrderReturnStatus) {
    const where = status ? { status } : {};
    const list = await this.repo.find({
      where,
      order: { createdAt: 'DESC' },
      take: 300,
    });
    return this.enrich(list);
  }

  async accept(id: string) {
    const row = await this.repo.findOne({ where: { id } });
    if (!row) throw new NotFoundException('Return not found');
    if (row.status !== OrderReturnStatus.PENDING) {
      throw new BadRequestException('Already processed');
    }

    for (const item of row.items) {
      if (!item.productId) continue;
      const product = await this.productRepo.findOne({
        where: { id: item.productId },
      });
      if (product) {
        product.stockBalance = Number(product.stockBalance) + Number(item.quantity);
        await this.productRepo.save(product);
      }
    }

    const order = await this.orderRepo.findOne({ where: { id: row.orderId } });
    if (order) {
      order.returnedAmount =
        Number(order.returnedAmount || 0) + Number(row.totalAmount);
      await this.orderRepo.save(order);
    }

    row.status = OrderReturnStatus.ACCEPTED;
    await this.repo.save(row);
    return this.enrich([row]).then((r) => r[0]);
  }

  async reject(id: string) {
    const row = await this.repo.findOne({ where: { id } });
    if (!row) throw new NotFoundException('Return not found');
    if (row.status !== OrderReturnStatus.PENDING) {
      throw new BadRequestException('Already processed');
    }
    row.status = OrderReturnStatus.REJECTED;
    return this.repo.save(row);
  }

  private async enrich(list: OrderReturn[]) {
    if (!list.length) return [];
    const orderIds = [...new Set(list.map((r) => r.orderId))];
    const orders = await this.orderRepo.find({
      where: { id: In(orderIds) },
    });
    const orderMap = new Map(orders.map((o) => [o.id, o]));
    const clientIds = [...new Set(orders.map((o) => o.clientId))];
    const clients = clientIds.length
      ? await this.clientRepo.find({ where: { id: In(clientIds) } })
      : [];
    const clientMap = new Map(clients.map((c) => [c.id, c]));

    return list.map((r) => {
      const order = orderMap.get(r.orderId);
      const client = order ? clientMap.get(order.clientId) : null;
      return {
        ...r,
        totalAmount: Number(r.totalAmount),
        clientName: client?.name ?? null,
        clientCode: client?.code ?? null,
        orderStatus: order?.status ?? null,
        orderTotal: order ? Number(order.totalAmount) : null,
      };
    });
  }
}
