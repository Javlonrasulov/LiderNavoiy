import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { DistributorProfile } from './entities/distributor-profile.entity';
import { RedisService } from '../common/redis/redis.service';
import { DistributorStatus, UserRole } from '../common/enums';

/** Redis TTL va dashboard bilan bir xil — sticky DB isOnline emas */
const LOCATION_ONLINE_MAX_AGE_MS = 300_000;

@Injectable()
export class DistributorsService {
  private readonly logger = new Logger(DistributorsService.name);

  constructor(
    @InjectRepository(DistributorProfile)
    private readonly repo: Repository<DistributorProfile>,
    private readonly redis: RedisService,
  ) {}

  /**
   * Faqat agent/dostavka (distributor role).
   * companyIds berilsa — faqat shu org(lar); NULL company ko‘rinmaydi.
   */
  async findAll(
    companyId?: string | string[],
    opts?: { excludeUserId?: string },
  ) {
    const companyIds = (Array.isArray(companyId) ? companyId : companyId ? [companyId] : [])
      .map((id) => id?.trim())
      .filter((id): id is string => !!id);

    const qb = this.repo
      .createQueryBuilder('d')
      .leftJoinAndSelect('d.user', 'user')
      .where('user.role = :role', { role: UserRole.DISTRIBUTOR })
      .andWhere('user.isActive = true')
      .andWhere('user.deletedAt IS NULL');

    if (companyIds.length) {
      qb.andWhere('d.companyId IN (:...companyIds)', { companyIds });
    }

    if (opts?.excludeUserId) {
      qb.andWhere('(d.userId IS NULL OR d.userId != :excludeUserId)', {
        excludeUserId: opts.excludeUserId,
      });
    }

    const list = await qb.getMany();
    return this.applyLiveGps(list);
  }

  async findOne(id: string) {
    const distributor = await this.repo.findOne({
      where: { id },
      relations: ['user'],
    });
    if (!distributor) throw new NotFoundException('Distributor not found');
    const [fresh] = await this.applyLiveGps([distributor]);
    return fresh;
  }

  async updateStatus(id: string, status: DistributorStatus) {
    await this.repo.update(id, { status });
    return this.findOne(id);
  }

  async updateProfile(
    id: string,
    data: { phone?: string | null; position?: string | null; lineCode?: string | null },
  ) {
    const distributor = await this.findOne(id);
    if (data.phone !== undefined) distributor.phone = data.phone?.trim() || null;
    if (data.position !== undefined) distributor.position = data.position?.trim() || null;
    if (data.lineCode !== undefined) distributor.lineCode = data.lineCode?.trim() || null;
    await this.repo.save(distributor);
    return this.findOne(id);
  }

  async getOnlineDistributors() {
    try {
      const keys = await this.redis.getClient().keys('online:*');
      return keys.map((key) => key.replace('online:', ''));
    } catch {
      return [];
    }
  }

  /**
   * Redis jonli GPS + DB lastLocationAt — admin xarita darhol yangilansin.
   * Sticky DB isOnline ishlatilmaydi.
   */
  private async applyLiveGps(list: DistributorProfile[]): Promise<DistributorProfile[]> {
    const now = Date.now();
    const staleIds: string[] = [];

    let onlineIds = new Set<string>();
    try {
      onlineIds = new Set(await this.getOnlineDistributors());
    } catch {
      onlineIds = new Set();
    }

    await Promise.all(
      list.map(async (d) => {
        try {
          const live = await this.redis.getJson<{
            latitude?: number;
            longitude?: number;
            recordedAt?: string;
          }>(`location:live:${d.id}`);
          if (
            live &&
            Number.isFinite(live.latitude) &&
            Number.isFinite(live.longitude) &&
            !(Math.abs(live.latitude!) < 0.05 && Math.abs(live.longitude!) < 0.05)
          ) {
            d.lastLatitude = live.latitude!;
            d.lastLongitude = live.longitude!;
            if (live.recordedAt) {
              const at = new Date(live.recordedAt);
              if (!Number.isNaN(at.getTime())) d.lastLocationAt = at;
            }
          }
        } catch {
          /* redis yo'q */
        }

        const ageMs =
          d.lastLocationAt != null
            ? now - new Date(d.lastLocationAt).getTime()
            : Number.POSITIVE_INFINITY;
        const fresh = ageMs <= LOCATION_ONLINE_MAX_AGE_MS || onlineIds.has(d.id);
        if (d.isOnline && !fresh) staleIds.push(d.id);
        d.isOnline = fresh;
      }),
    );

    if (staleIds.length > 0) {
      void this.repo
        .update({ id: In(staleIds) }, { isOnline: false, status: DistributorStatus.OFFLINE })
        .catch(() => undefined);
    }
    return list;
  }
}
