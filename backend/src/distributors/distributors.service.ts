import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DistributorProfile } from './entities/distributor-profile.entity';
import { RedisService } from '../common/redis/redis.service';
import { DistributorStatus } from '../common/enums';

@Injectable()
export class DistributorsService {
  constructor(
    @InjectRepository(DistributorProfile)
    private readonly repo: Repository<DistributorProfile>,
    private readonly redis: RedisService,
  ) {}

  async findAll(companyId?: string) {
    const qb = this.repo.createQueryBuilder('d').leftJoinAndSelect('d.user', 'user');
    if (companyId) qb.where('d.companyId = :companyId', { companyId });
    return qb.getMany();
  }

  async findOne(id: string) {
    const distributor = await this.repo.findOne({
      where: { id },
      relations: ['user'],
    });
    if (!distributor) throw new NotFoundException('Distributor not found');
    return distributor;
  }

  async updateStatus(id: string, status: DistributorStatus) {
    await this.repo.update(id, { status });
    return this.findOne(id);
  }

  async getOnlineDistributors() {
    const keys = await this.redis.getClient().keys('online:*');
    const online: string[] = [];
    for (const key of keys) {
      online.push(key.replace('online:', ''));
    }
    return online;
  }
}
