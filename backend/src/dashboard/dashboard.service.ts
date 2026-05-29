import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Client } from '../clients/entities/client.entity';
import { Visit } from '../visits/entities/visit.entity';
import { Order } from '../orders/entities/order.entity';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Client) private readonly clientRepo: Repository<Client>,
    @InjectRepository(Visit) private readonly visitRepo: Repository<Visit>,
    @InjectRepository(Order) private readonly orderRepo: Repository<Order>,
  ) {}

  async getAgentStats(distributorId: string) {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const totalClients = await this.clientRepo.count({ where: { isActive: true } });

    const visitsToday = await this.visitRepo.count({
      where: {
        distributorId,
        visitedAt: Between(todayStart, todayEnd),
      },
    });

    const ordersToday = await this.orderRepo.find({
      where: {
        distributorId,
        createdAt: Between(todayStart, todayEnd),
      },
    });

    const totalSales = ordersToday.reduce(
      (sum, o) => sum + Number(o.totalAmount),
      0,
    );

    const pendingClients = Math.max(totalClients - visitsToday, 0);
    const clientProgress = totalClients > 0
      ? Math.round((visitsToday / totalClients) * 1000) / 10
      : 0;

    return {
      totalClients,
      visitedClients: visitsToday,
      pendingClients,
      visitCount: visitsToday,
      completedVisits: visitsToday,
      pendingVisits: 0,
      totalSales,
      clientProgressPercent: clientProgress,
      visitProgressPercent: 0,
    };
  }
}
