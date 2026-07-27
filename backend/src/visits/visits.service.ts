import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, In } from 'typeorm';
import { Visit } from './entities/visit.entity';
import { CreateVisitDto } from './dto/visit.dto';
import { VisitStatus } from '../common/enums';
import { Client } from '../clients/entities/client.entity';
import { Order } from '../orders/entities/order.entity';

@Injectable()
export class VisitsService {
  constructor(
    @InjectRepository(Visit)
    private readonly repo: Repository<Visit>,
    @InjectRepository(Client)
    private readonly clientRepo: Repository<Client>,
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
  ) {}

  async create(distributorId: string, dto: CreateVisitDto, offline = false) {
    const visit = this.repo.create({
      distributorId,
      clientId: dto.clientId,
      visitedAt: new Date(dto.visitedAt),
      checkInLatitude: dto.checkInLatitude ?? null,
      checkInLongitude: dto.checkInLongitude ?? null,
      notes: dto.notes ?? null,
      orderTotal: dto.orderTotal ?? 0,
      status: VisitStatus.COMPLETED,
      isOfflineCreated: offline,
    });
    return this.repo.save(visit);
  }

  async syncBatch(distributorId: string, visits: CreateVisitDto[]) {
    const saved = [];
    for (const v of visits) {
      saved.push(await this.create(distributorId, v, true));
    }
    return { synced: saved.length, visits: saved };
  }

  async findByDistributor(distributorId: string, from?: Date, to?: Date) {
    const visits =
      from && to
        ? await this.repo.find({
            where: { distributorId, visitedAt: Between(from, to) },
            order: { visitedAt: 'DESC' },
          })
        : await this.repo.find({
            where: { distributorId },
            order: { visitedAt: 'DESC' },
            take: 100,
          });

    return this.withClientAndOrderInfo(visits, distributorId);
  }

  findByClient(clientId: string) {
    return this.repo.find({
      where: { clientId },
      order: { visitedAt: 'DESC' },
    });
  }

  private async withClientAndOrderInfo(visits: Visit[], distributorId: string) {
    if (visits.length === 0) return [];

    const clientIds = [...new Set(visits.map((v) => v.clientId))];
    const visitIds = visits.map((v) => v.id);
    const orderIdsFromNotes = visits
      .map((v) => {
        const m = typeof v.notes === 'string' ? /^client_order:(.+)$/.exec(v.notes) : null;
        return m?.[1] ?? null;
      })
      .filter((id): id is string => !!id);

    const [clients, ordersByVisit, ordersById, recentClientOrders] = await Promise.all([
      this.clientRepo.find({ where: { id: In(clientIds) } }),
      this.orderRepo.find({
        where: { distributorId, visitId: In(visitIds) },
      }),
      orderIdsFromNotes.length
        ? this.orderRepo.find({ where: { id: In(orderIdsFromNotes) } })
        : Promise.resolve([] as Order[]),
      this.orderRepo.find({
        where: { distributorId, clientId: In(clientIds) },
        order: { createdAt: 'DESC' },
        take: 200,
      }),
    ]);

    const clientMap = new Map(clients.map((c) => [c.id, c]));
    const orderByVisitId = new Map(
      ordersByVisit.filter((o) => o.visitId).map((o) => [o.visitId as string, o]),
    );
    const orderById = new Map(ordersById.map((o) => [o.id, o]));
    const ordersByClient = new Map<string, Order[]>();
    for (const o of recentClientOrders) {
      const list = ordersByClient.get(o.clientId) ?? [];
      list.push(o);
      ordersByClient.set(o.clientId, list);
    }

    return visits.map((visit) => {
      const client = clientMap.get(visit.clientId);
      const orderIdFromNotes =
        typeof visit.notes === 'string'
          ? /^client_order:(.+)$/.exec(visit.notes)?.[1] ?? null
          : null;

      let order =
        orderByVisitId.get(visit.id) ??
        (orderIdFromNotes ? orderById.get(orderIdFromNotes) : undefined);

      if (!order) {
        const visitDay = visit.visitedAt.toISOString().slice(0, 10);
        const candidates = ordersByClient.get(visit.clientId) ?? [];
        order = candidates.find((o) => {
          const sameDay = new Date(o.createdAt).toISOString().slice(0, 10) === visitDay;
          if (!sameDay) return false;
          if (o.visitId && o.visitId !== visit.id) return false;
          const total = Number(o.totalAmount);
          const visitTotal = Number(visit.orderTotal);
          return visitTotal <= 0 || Math.abs(total - visitTotal) < 0.01;
        });
      }

      return {
        ...visit,
        orderTotal: Number(visit.orderTotal),
        clientName: client?.name ?? 'Klient',
        clientCode: client?.code ?? '',
        clientAddress: client?.address ?? null,
        clientLatitude: client?.latitude ?? null,
        clientLongitude: client?.longitude ?? null,
        fromClientOrder:
          (typeof visit.notes === 'string' && visit.notes.startsWith('client_order:')) ||
          order?.source === 'client',
        orderId: order?.id ?? null,
        orderStatus: order?.status ?? null,
        orderSource: order?.source ?? null,
      };
    });
  }
}
