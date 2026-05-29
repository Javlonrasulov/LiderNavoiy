import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Visit } from './entities/visit.entity';
import { CreateVisitDto } from './dto/visit.dto';
import { VisitStatus } from '../common/enums';

@Injectable()
export class VisitsService {
  constructor(
    @InjectRepository(Visit)
    private readonly repo: Repository<Visit>,
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

  findByDistributor(distributorId: string, from?: Date, to?: Date) {
    const where: Record<string, unknown> = { distributorId };
    if (from && to) {
      return this.repo.find({
        where: { distributorId, visitedAt: Between(from, to) },
        order: { visitedAt: 'DESC' },
      });
    }
    return this.repo.find({
      where: { distributorId },
      order: { visitedAt: 'DESC' },
      take: 100,
    });
  }

  findByClient(clientId: string) {
    return this.repo.find({
      where: { clientId },
      order: { visitedAt: 'DESC' },
    });
  }
}
