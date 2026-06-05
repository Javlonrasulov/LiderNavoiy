import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Client } from './entities/client.entity';
import { CreateClientDto, UpdateClientDto } from './dto/client.dto';
import { LinesService } from '../lines/lines.service';

@Injectable()
export class ClientsService {
  constructor(
    @InjectRepository(Client)
    private readonly repo: Repository<Client>,
    private readonly linesService: LinesService,
  ) {}

  private baseQuery() {
    return this.repo
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.distributor', 'distributor')
      .leftJoinAndSelect('distributor.user', 'agentUser');
  }

  findAll(companyId?: string, lineCode?: string, distributorId?: string) {
    const qb = this.baseQuery().where('c.isActive = true');
    if (companyId) {
      qb.andWhere(
        '(c.companyId = :companyId OR (c.companyId IS NULL AND distributor.companyId = :companyId))',
        { companyId },
      );
    }
    if (lineCode) qb.andWhere('c.lineCode = :lineCode', { lineCode });
    if (distributorId) qb.andWhere('c.distributorId = :distributorId', { distributorId });
    return qb.orderBy('c.name', 'ASC').getMany();
  }

  async findOne(id: string, distributorId?: string) {
    const client = await this.baseQuery().where('c.id = :id', { id }).getOne();
    if (!client) throw new NotFoundException('Client not found');
    if (distributorId && client.distributorId !== distributorId) {
      throw new NotFoundException('Client not found');
    }
    return client;
  }

  findByInn(inn: string) {
    const normalized = inn.trim();
    if (!normalized) return null;
    return this.baseQuery()
      .where('c.isActive = true')
      .andWhere('c.inn = :inn', { inn: normalized })
      .getOne();
  }

  search(query: string, distributorId?: string) {
    const qb = this.baseQuery()
      .where('c.isActive = true')
      .andWhere('(c.name ILIKE :q OR c.code ILIKE :q)', { q: `%${query}%` });
    if (distributorId) qb.andWhere('c.distributorId = :distributorId', { distributorId });
    return qb.limit(50).getMany();
  }

  findLines(companyId?: string) {
    return this.linesService.findAll(companyId);
  }

  async create(dto: CreateClientDto) {
    const code =
      dto.code?.trim() ||
      `A${Date.now().toString(36).slice(-7).toUpperCase()}`;
    const client = this.repo.create({
      code,
      name: dto.name,
      fullName: dto.fullName ?? dto.name,
      phone: dto.phone ?? null,
      address: dto.address ?? null,
      companyId: dto.companyId ?? null,
      lineCode: dto.lineCode ?? null,
      latitude: dto.latitude ?? null,
      longitude: dto.longitude ?? null,
      category: dto.category ?? 'Standard',
      distributorId: dto.distributorId ?? null,
      inn: dto.inn ?? null,
      contactPerson: dto.contactPerson ?? null,
      territory: dto.territory ?? null,
      clientClass: dto.clientClass ?? null,
      priceCategory: dto.priceCategory ?? null,
      photoUrl: dto.photoUrl ?? null,
      isActive: true,
    });
    const saved = await this.repo.save(client);
    return this.findOne(saved.id);
  }

  async update(id: string, dto: UpdateClientDto) {
    const client = await this.findOne(id);
    if (dto.code !== undefined) client.code = dto.code;
    if (dto.name !== undefined) client.name = dto.name;
    if (dto.fullName !== undefined) client.fullName = dto.fullName;
    if (dto.phone !== undefined) client.phone = dto.phone;
    if (dto.address !== undefined) client.address = dto.address;
    if (dto.lineCode !== undefined) client.lineCode = dto.lineCode;
    if (dto.latitude !== undefined) client.latitude = dto.latitude;
    if (dto.longitude !== undefined) client.longitude = dto.longitude;
    if (dto.category !== undefined) client.category = dto.category;
    if (dto.distributorId !== undefined) client.distributorId = dto.distributorId;
    if (dto.inn !== undefined) client.inn = dto.inn;
    if (dto.contactPerson !== undefined) client.contactPerson = dto.contactPerson;
    if (dto.territory !== undefined) client.territory = dto.territory;
    if (dto.clientClass !== undefined) client.clientClass = dto.clientClass;
    if (dto.priceCategory !== undefined) client.priceCategory = dto.priceCategory;
    if (dto.photoUrl !== undefined) client.photoUrl = dto.photoUrl;
    if (dto.isActive !== undefined) client.isActive = dto.isActive;
    await this.repo.save(client);
    return this.findOne(id);
  }
}
