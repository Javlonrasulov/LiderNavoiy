import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, In } from 'typeorm';
import { Visit } from './entities/visit.entity';
import { CreateVisitDto } from './dto/visit.dto';
import { VisitStatus } from '../common/enums';
import { Client } from '../clients/entities/client.entity';

@Injectable()
export class VisitsService {
  constructor(
    @InjectRepository(Visit)
    private readonly repo: Repository<Visit>,
    @InjectRepository(Client)
    private readonly clientRepo: Repository<Client>,
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

    return this.withClientInfo(visits);
  }

  findByClient(clientId: string) {
    return this.repo.find({
      where: { clientId },
      order: { visitedAt: 'DESC' },
    });
  }

  private async withClientInfo(visits: Visit[]) {
    if (visits.length === 0) return [];
    const clientIds = [...new Set(visits.map((v) => v.clientId))];
    const clients = await this.clientRepo.find({ where: { id: In(clientIds) } });
    const clientMap = new Map(clients.map((c) => [c.id, c]));

    return visits.map((visit) => {
      const client = clientMap.get(visit.clientId);
      return {
        ...visit,
        orderTotal: Number(visit.orderTotal),
        clientName: client?.name ?? 'Klient',
        clientCode: client?.code ?? '',
        clientAddress: client?.address ?? null,
        fromClientOrder: typeof visit.notes === 'string' && visit.notes.startsWith('client_order:'),
      };
    });
  }
}
