import {
  BadRequestException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  PositionAppAccess,
  StaffPosition,
} from './entities/staff-position.entity';
import {
  CreatePositionDto,
  PositionDto,
  UpdatePositionDto,
} from './dto/position.dto';

const DEFAULTS: Array<{ code: number; name: string; appAccess: PositionAppAccess }> = [
  { code: 1, name: 'Direktor', appAccess: 'manager' },
  { code: 2, name: 'Savdo agenti', appAccess: 'agent' },
  { code: 3, name: 'Yetkazib beruvchi', appAccess: 'delivery' },
  { code: 4, name: "Bo'lim boshlig'i", appAccess: 'manager' },
  { code: 5, name: 'Menejer', appAccess: 'manager' },
  { code: 6, name: 'Kassir', appAccess: 'manager' },
  { code: 7, name: 'Omborchi', appAccess: 'manager' },
  { code: 8, name: 'Buxgalter', appAccess: 'manager' },
];

@Injectable()
export class PositionsService implements OnModuleInit {
  constructor(
    @InjectRepository(StaffPosition)
    private readonly repo: Repository<StaffPosition>,
  ) {}

  async onModuleInit() {
    const count = await this.repo.count();
    if (count > 0) return;
    await this.repo.save(
      DEFAULTS.map((d) =>
        this.repo.create({
          code: d.code,
          name: d.name,
          appAccess: d.appAccess,
          isActive: true,
        }),
      ),
    );
  }

  async findAll(): Promise<PositionDto[]> {
    const rows = await this.repo.find({
      where: { isActive: true },
      order: { code: 'ASC' },
    });
    return rows.map((r) => this.toDto(r));
  }

  async findOne(id: string) {
    const row = await this.repo.findOne({ where: { id } });
    if (!row) throw new NotFoundException('Position not found');
    return row;
  }

  async create(dto: CreatePositionDto): Promise<PositionDto> {
    const name = dto.name.trim();
    if (!name) throw new BadRequestException('Name required');

    let code = dto.code;
    if (!code) {
      const max = await this.repo
        .createQueryBuilder('p')
        .select('MAX(p.code)', 'max')
        .getRawOne<{ max: string | null }>();
      code = (Number(max?.max) || 0) + 1;
    }

    const dup = await this.repo.findOne({ where: { code } });
    if (dup) throw new BadRequestException('Bu kod bilan lavozim mavjud');

    const saved = await this.repo.save(
      this.repo.create({
        code,
        name,
        appAccess: dto.appAccess,
        isActive: true,
      }),
    );
    return this.toDto(saved);
  }

  async update(id: string, dto: UpdatePositionDto): Promise<PositionDto> {
    const row = await this.findOne(id);
    if (dto.code !== undefined) {
      const dup = await this.repo.findOne({ where: { code: dto.code } });
      if (dup && dup.id !== id) {
        throw new BadRequestException('Bu kod bilan lavozim mavjud');
      }
      row.code = dto.code;
    }
    if (dto.name !== undefined) row.name = dto.name.trim();
    if (dto.appAccess !== undefined) row.appAccess = dto.appAccess;
    if (dto.isActive !== undefined) row.isActive = dto.isActive;
    return this.toDto(await this.repo.save(row));
  }

  async remove(id: string) {
    const row = await this.findOne(id);
    row.isActive = false;
    await this.repo.save(row);
    return { ok: true };
  }

  private toDto(row: StaffPosition): PositionDto {
    return {
      id: row.id,
      code: row.code,
      name: row.name,
      appAccess: row.appAccess,
      isActive: row.isActive,
    };
  }
}
