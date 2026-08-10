import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClientCategory } from './entities/client-category.entity';
import { Client } from '../clients/entities/client.entity';
import {
  ClientCategoryItemDto,
  CreateClientCategoryDto,
  UpdateClientCategoryDto,
} from './dto/client-category.dto';

@Injectable()
export class ClientCategoriesService {
  constructor(
    @InjectRepository(ClientCategory)
    private readonly repo: Repository<ClientCategory>,
    @InjectRepository(Client)
    private readonly clientRepo: Repository<Client>,
  ) {}

  async findAll(companyId?: string | string[]): Promise<ClientCategoryItemDto[]> {
    const qb = this.repo
      .createQueryBuilder('c')
      .where('c.isActive = true')
      .orderBy('c.name', 'ASC');
    const ids = Array.isArray(companyId)
      ? companyId.map((id) => id?.trim()).filter(Boolean)
      : companyId?.trim()
        ? [companyId.trim()]
        : [];
    if (Array.isArray(companyId) && ids.length === 0) {
      qb.andWhere('1 = 0');
    } else if (ids.length === 1) {
      qb.andWhere('c.companyId = :companyId', { companyId: ids[0] });
    } else if (ids.length > 1) {
      qb.andWhere('c.companyId IN (:...companyIds)', { companyIds: ids });
    }
    const rows = await qb.getMany();
    return rows.map((row) => this.toItem(row));
  }

  async findOne(id: string): Promise<ClientCategoryItemDto> {
    const row = await this.repo.findOne({ where: { id } });
    if (!row) throw new NotFoundException('Category not found');
    return this.toItem(row);
  }

  async create(dto: CreateClientCategoryDto): Promise<ClientCategoryItemDto> {
    const name = dto.name.trim();
    if (!name) throw new BadRequestException('Category name is required');
    const companyId = dto.companyId?.trim() || null;

    const dupQb = this.repo
      .createQueryBuilder('c')
      .where('LOWER(c.name) = LOWER(:name)', { name })
      .andWhere('c.isActive = true');
    if (companyId) {
      dupQb.andWhere('c.companyId = :companyId', { companyId });
    } else {
      dupQb.andWhere('c.companyId IS NULL');
    }
    const exists = await dupQb.getOne();
    if (exists) {
      throw new BadRequestException('Bu kategoriya allaqachon mavjud');
    }

    const saved = await this.repo.save(
      this.repo.create({
        name,
        companyId,
        isActive: true,
      }),
    );
    return this.toItem(saved);
  }

  async update(
    id: string,
    dto: UpdateClientCategoryDto,
  ): Promise<ClientCategoryItemDto> {
    const row = await this.repo.findOne({ where: { id } });
    if (!row) throw new NotFoundException('Category not found');

    if (dto.name === undefined) return this.toItem(row);

    const name = dto.name.trim();
    if (!name) throw new BadRequestException('Category name is required');

    const companyId = row.companyId;
    const dupQb = this.repo
      .createQueryBuilder('c')
      .where('LOWER(c.name) = LOWER(:name)', { name })
      .andWhere('c.isActive = true')
      .andWhere('c.id <> :id', { id });
    if (companyId) {
      dupQb.andWhere('c.companyId = :companyId', { companyId });
    } else {
      dupQb.andWhere('c.companyId IS NULL');
    }
    const exists = await dupQb.getOne();
    if (exists) {
      throw new BadRequestException('Bu kategoriya allaqachon mavjud');
    }

    const oldName = row.name;
    row.name = name;
    const saved = await this.repo.save(row);

    if (oldName !== name) {
      const qb = this.clientRepo
        .createQueryBuilder()
        .update(Client)
        .set({ category: name })
        .where('category = :oldName', { oldName });
      if (companyId) {
        qb.andWhere('companyId = :companyId', { companyId });
      }
      await qb.execute();
    }

    return this.toItem(saved);
  }

  async remove(id: string) {
    const row = await this.repo.findOne({ where: { id } });
    if (!row) throw new NotFoundException('Category not found');
    row.isActive = false;
    await this.repo.save(row);
    return { ok: true };
  }

  private toItem(row: ClientCategory): ClientCategoryItemDto {
    return {
      id: row.id,
      name: row.name,
      companyId: row.companyId,
    };
  }
}
