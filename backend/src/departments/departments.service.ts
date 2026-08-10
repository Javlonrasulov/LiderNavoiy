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
    // Eski soft-delete qatorlar kodni band qilib turardi
    await this.repo.delete({ isActive: false });

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

    // Kod har doim avtomatik — dublikat xatolik bo‘lmasin
    const code = await this.nextAvailableCode();

    const saved = await this.repo.save(
      this.repo.create({ code, name, isActive: true }),
    );
    return this.toDto(saved);
  }

  async update(id: string, dto: UpdateDepartmentDto): Promise<DepartmentDto> {
    const row = await this.findOne(id);
    // Kod o‘zgartirilmaydi — faqat nom / holat
    if (dto.name !== undefined) row.name = dto.name.trim();
    if (dto.isActive !== undefined) row.isActive = dto.isActive;
    return this.toDto(await this.repo.save(row));
  }

  async remove(id: string) {
    const row = await this.findOne(id);
    await this.repo.remove(row);
    return { ok: true };
  }

  /** Eng kichik bo‘sh kod (o‘chirilganlar ham hisobga olinadi) */
  private async nextAvailableCode(): Promise<number> {
    const rows = await this.repo.find({ select: ['code'] });
    const used = new Set(rows.map((r) => r.code));
    let code = 1;
    while (used.has(code)) code += 1;
    return code;
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
