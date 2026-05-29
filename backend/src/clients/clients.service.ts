import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Client } from './entities/client.entity';

@Injectable()
export class ClientsService {
  constructor(
    @InjectRepository(Client)
    private readonly repo: Repository<Client>,
  ) {}

  findAll(companyId?: string, lineCode?: string) {
    const qb = this.repo.createQueryBuilder('c').where('c.isActive = true');
    if (companyId) qb.andWhere('c.companyId = :companyId', { companyId });
    if (lineCode) qb.andWhere('c.lineCode = :lineCode', { lineCode });
    return qb.orderBy('c.name', 'ASC').getMany();
  }

  findOne(id: string) {
    return this.repo.findOne({ where: { id } });
  }

  search(query: string) {
    return this.repo
      .createQueryBuilder('c')
      .where('c.isActive = true')
      .andWhere('(c.name ILIKE :q OR c.code ILIKE :q)', { q: `%${query}%` })
      .limit(50)
      .getMany();
  }
}
