import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SalesLine } from './entities/sales-line.entity';
import { CreateLineDto, LineListItemDto, UpdateLineDto } from './dto/line.dto';
import { Client } from '../clients/entities/client.entity';

function normalizeVisitDays(days?: number[] | null): number[] | null {
  if (days == null || !Array.isArray(days) || days.length === 0) return null;
  const cleaned = [
    ...new Set(
      days
        .map((d) => Number(d))
        .filter((d) => Number.isInteger(d) && d >= 1 && d <= 7),
    ),
  ].sort((a, b) => a - b);
  return cleaned.length ? cleaned : null;
}

function asDays(primary?: number[] | null, fallback?: number[] | null): number[] {
  const a = Array.isArray(primary) ? primary : [];
  if (a.length) return a;
  return Array.isArray(fallback) ? fallback : [];
}

@Injectable()
export class LinesService {
  constructor(
    @InjectRepository(SalesLine)
    private readonly lineRepo: Repository<SalesLine>,
    @InjectRepository(Client)
    private readonly clientRepo: Repository<Client>,
  ) {}

  async findAll(companyId?: string): Promise<LineListItemDto[]> {
    const qb = this.lineRepo
      .createQueryBuilder('l')
      .where('l.isActive = true')
      .orderBy('l.code', 'ASC');
    if (companyId) {
      qb.andWhere('(l.companyId = :companyId OR l.companyId IS NULL)', {
        companyId,
      });
    }
    const lines = await qb.getMany();
    const counts = await this.clientCountsByLine(companyId);
    return lines.map((line) =>
      this.toListItem(line, counts.get(line.code) ?? 0),
    );
  }

  async findOne(id: string) {
    const line = await this.lineRepo.findOne({ where: { id } });
    if (!line) throw new NotFoundException('Line not found');
    return line;
  }

  async create(dto: CreateLineDto) {
    const code = dto.code.trim();
    const companyId = dto.companyId?.trim() || null;
    const dupQb = this.lineRepo
      .createQueryBuilder('l')
      .where('l.code = :code', { code });
    if (companyId) {
      dupQb.andWhere('l.companyId = :companyId', { companyId });
    } else {
      dupQb.andWhere('l.companyId IS NULL');
    }
    const exists = await dupQb.getOne();
    if (exists) {
      throw new BadRequestException('Bu kod bilan liniya mavjud');
    }

    const agentDays = normalizeVisitDays(
      dto.agentVisitDays ?? dto.visitDays ?? null,
    );
    const deliveryDays = normalizeVisitDays(dto.deliveryVisitDays ?? null);

    const saved = await this.lineRepo.save(
      this.lineRepo.create({
        code,
        name: dto.name.trim(),
        companyId,
        agentName: dto.agentName?.trim() || null,
        deliveryName: dto.deliveryName?.trim() || null,
        agentVisitDays: agentDays,
        deliveryVisitDays: deliveryDays,
        visitDays: agentDays,
        isActive: true,
      }),
    );
    return this.toListItem(saved, 0);
  }

  async update(id: string, dto: UpdateLineDto) {
    const line = await this.findOne(id);
    if (dto.code !== undefined) line.code = dto.code.trim();
    if (dto.name !== undefined) line.name = dto.name.trim();
    if (dto.agentName !== undefined) {
      line.agentName = dto.agentName?.trim() || null;
    }
    if (dto.deliveryName !== undefined) {
      line.deliveryName = dto.deliveryName?.trim() || null;
    }
    if (dto.agentVisitDays !== undefined || dto.visitDays !== undefined) {
      const agentDays = normalizeVisitDays(
        dto.agentVisitDays !== undefined ? dto.agentVisitDays : dto.visitDays,
      );
      line.agentVisitDays = agentDays;
      line.visitDays = agentDays;
    }
    if (dto.deliveryVisitDays !== undefined) {
      line.deliveryVisitDays = normalizeVisitDays(dto.deliveryVisitDays);
    }
    if (dto.isActive !== undefined) line.isActive = dto.isActive;
    const saved = await this.lineRepo.save(line);
    const counts = await this.clientCountsByLine(line.companyId ?? undefined);
    return this.toListItem(saved, counts.get(saved.code) ?? 0);
  }

  async remove(id: string) {
    const line = await this.findOne(id);
    line.isActive = false;
    await this.lineRepo.save(line);
    return { ok: true };
  }

  private async clientCountsByLine(companyId?: string) {
    const qb = this.clientRepo
      .createQueryBuilder('c')
      .select('c.lineCode', 'code')
      .addSelect('COUNT(*)', 'count')
      .where('c.isActive = true')
      .andWhere('c.lineCode IS NOT NULL')
      .andWhere("TRIM(c.lineCode) <> ''")
      .groupBy('c.lineCode');
    if (companyId) {
      qb.andWhere('c.companyId = :companyId', { companyId });
    }
    const rows = await qb.getRawMany<{ code: string; count: string }>();
    const map = new Map<string, number>();
    for (const row of rows) {
      const code = row.code?.trim();
      if (!code) continue;
      map.set(code, Number(row.count) || 0);
    }
    return map;
  }

  private toListItem(line: SalesLine, clientCount: number): LineListItemDto {
    const agentVisitDays = asDays(line.agentVisitDays, line.visitDays);
    const deliveryVisitDays = asDays(line.deliveryVisitDays, null);
    return {
      id: line.id,
      code: line.code,
      name: line.name,
      agentName: line.agentName,
      deliveryName: line.deliveryName,
      agentVisitDays,
      deliveryVisitDays,
      visitDays: agentVisitDays,
      clientCount,
      companyId: line.companyId,
    };
  }
}
