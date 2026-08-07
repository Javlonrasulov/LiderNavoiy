import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClientCategory } from './entities/client-category.entity';
import {
  ClientCategoryItemDto,
  CreateClientCategoryDto,
} from './dto/client-category.dto';

@Injectable()
export class ClientCategoriesService {
  constructor(
    @InjectRepository(ClientCategory)
    private readonly repo: Repository<ClientCategory>,
  ) {}

  async findAll(companyId?: string): Promise<ClientCategoryItemDto[]> {
    const qb = this.repo
      .createQueryBuilder('c')
      .where('c.isActive = true')
      .orderBy('c.name', 'ASC');
    if (companyId) {
      qb.andWhere('(c.companyId = :companyId OR c.companyId IS NULL)', {
        companyId,
      });
    }
    const rows = await qb.getMany();
    return rows.map((row) => this.toItem(row));
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
