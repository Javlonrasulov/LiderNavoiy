import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { PaymentTerminal } from './entities/payment-terminal.entity';
import { CreateTerminalDto, UpdateTerminalDto } from './dto/terminal.dto';
import { DistributorProfile } from '../distributors/entities/distributor-profile.entity';

@Injectable()
export class TerminalsService {
  constructor(
    @InjectRepository(PaymentTerminal)
    private readonly repo: Repository<PaymentTerminal>,
    @InjectRepository(DistributorProfile)
    private readonly profileRepo: Repository<DistributorProfile>,
  ) {}

  async findAll(companyId?: string) {
    const where = companyId ? { companyId } : {};
    const list = await this.repo.find({
      where,
      order: { createdAt: 'DESC' },
    });
    return this.enrich(list);
  }

  async findMy(distributorId: string) {
    const list = await this.repo.find({
      where: {
        assignedDistributorId: distributorId,
        isActive: true,
      },
      order: { name: 'ASC' },
    });
    return this.enrich(list);
  }

  async findOne(id: string) {
    const row = await this.repo.findOne({ where: { id } });
    if (!row) throw new NotFoundException('Terminal not found');
    const [enriched] = await this.enrich([row]);
    return enriched;
  }

  create(dto: CreateTerminalDto) {
    const row = this.repo.create({
      name: dto.name.trim(),
      code: dto.code?.trim() || null,
      companyId: dto.companyId ?? null,
      assignedDistributorId: dto.assignedDistributorId ?? null,
      isActive: dto.isActive ?? true,
    });
    return this.repo.save(row);
  }

  async update(id: string, dto: UpdateTerminalDto) {
    const row = await this.repo.findOne({ where: { id } });
    if (!row) throw new NotFoundException('Terminal not found');
    if (dto.name !== undefined) row.name = dto.name.trim();
    if (dto.code !== undefined) row.code = dto.code?.trim() || null;
    if (dto.companyId !== undefined) row.companyId = dto.companyId;
    if (dto.assignedDistributorId !== undefined) {
      row.assignedDistributorId = dto.assignedDistributorId;
    }
    if (dto.isActive !== undefined) row.isActive = dto.isActive;
    return this.repo.save(row);
  }

  async remove(id: string) {
    const row = await this.repo.findOne({ where: { id } });
    if (!row) throw new NotFoundException('Terminal not found');
    row.isActive = false;
    return this.repo.save(row);
  }

  private async enrich(list: PaymentTerminal[]) {
    if (list.length === 0) return [];
    const ids = [
      ...new Set(
        list
          .map((t) => t.assignedDistributorId)
          .filter((id): id is string => !!id),
      ),
    ];
    const profiles =
      ids.length > 0
        ? await this.profileRepo.find({
            where: { id: In(ids) },
            relations: ['user'],
          })
        : [];
    const map = new Map(profiles.map((p) => [p.id, p]));
    return list.map((t) => {
      const p = t.assignedDistributorId
        ? map.get(t.assignedDistributorId)
        : null;
      return {
        ...t,
        assignedName:
          p?.user?.fullName ?? p?.user?.username ?? p?.companyName ?? null,
      };
    });
  }
}
