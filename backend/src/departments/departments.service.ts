import {
  BadRequestException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Department } from './entities/department.entity';
import {
  CreateDepartmentDto,
  DepartmentDto,
  UpdateDepartmentDto,
} from './dto/department.dto';

const DEFAULTS: Array<{ code: number; name: string }> = [
  { code: 1, name: 'АУП' },
  { code: 2, name: 'Бухгалтерия' },
  { code: 3, name: 'Финанс отдел' },
  { code: 4, name: 'Отдел продаж' },
  { code: 5, name: 'Склад' },
  { code: 6, name: 'Автогараж' },
  { code: 7, name: 'Касса' },
  { code: 8, name: 'Доставка' },
  { code: 9, name: 'Продавцы' },
];

@Injectable()
export class DepartmentsService implements OnModuleInit {
  constructor(
    @InjectRepository(Department)
    private readonly repo: Repository<Department>,
  ) {}

  async onModuleInit() {
    const count = await this.repo.count();
    if (count > 0) return;
    await this.repo.save(
      DEFAULTS.map((d) =>
        this.repo.create({ code: d.code, name: d.name, isActive: true }),
      ),
    );
  }

  async findAll(): Promise<DepartmentDto[]> {
    const rows = await this.repo.find({
      where: { isActive: true },
      order: { code: 'ASC' },
    });
    return rows.map((r) => this.toDto(r));
  }

  async findOne(id: string) {
    const row = await this.repo.findOne({ where: { id } });
    if (!row) throw new NotFoundException('Department not found');
    return row;
  }

  async create(dto: CreateDepartmentDto): Promise<DepartmentDto> {
    const name = dto.name.trim();
    if (!name) throw new BadRequestException('Name required');

    let code = dto.code;
    if (!code) {
      const max = await this.repo
        .createQueryBuilder('d')
        .select('MAX(d.code)', 'max')
        .getRawOne<{ max: string | null }>();
      code = (Number(max?.max) || 0) + 1;
    }

    const dup = await this.repo.findOne({ where: { code } });
    if (dup) throw new BadRequestException('Bu kod bilan bo\'linma mavjud');

    const saved = await this.repo.save(
      this.repo.create({ code, name, isActive: true }),
    );
    return this.toDto(saved);
  }

  async update(id: string, dto: UpdateDepartmentDto): Promise<DepartmentDto> {
    const row = await this.findOne(id);
    if (dto.code !== undefined) {
      const dup = await this.repo.findOne({ where: { code: dto.code } });
      if (dup && dup.id !== id) {
        throw new BadRequestException('Bu kod bilan bo\'linma mavjud');
      }
      row.code = dto.code;
    }
    if (dto.name !== undefined) row.name = dto.name.trim();
    if (dto.isActive !== undefined) row.isActive = dto.isActive;
    return this.toDto(await this.repo.save(row));
  }

  async remove(id: string) {
    const row = await this.findOne(id);
    row.isActive = false;
    await this.repo.save(row);
    return { ok: true };
  }

  private toDto(row: Department): DepartmentDto {
    return {
      id: row.id,
      code: row.code,
      name: row.name,
      isActive: row.isActive,
    };
  }
}
