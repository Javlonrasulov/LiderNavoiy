import { Injectable, Logger, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { LocationPoint } from './entities/location-point.entity';
import { DistributorProfile } from '../distributors/entities/distributor-profile.entity';
import { RedisService } from '../common/redis/redis.service';
import { LocationPointDto, BatchLocationDto, RouteHistoryQueryDto } from './dto/gps.dto';
import { DistributorStatus } from '../common/enums';
import { TrackingGateway } from '../tracking/tracking.gateway';

const LIVE_LOCATION_TTL = 180; // 3 daqiqa — qisqa uzilishlarda offline bo'lib qolmasin

@Injectable()
export class GpsService {
  private readonly logger = new Logger(GpsService.name);

  constructor(
    @InjectRepository(LocationPoint)
    private readonly locationRepo: Repository<LocationPoint>,
    @InjectRepository(DistributorProfile)
    private readonly distributorRepo: Repository<DistributorProfile>,
    private readonly redis: RedisService,
    @Inject(forwardRef(() => TrackingGateway))
    private readonly trackingGateway: TrackingGateway,
  ) {}

  async ingestSingle(distributorId: string, dto: LocationPointDto): Promise<LocationPoint> {
    const point = await this.savePoint(distributorId, dto);
    await this.updateLiveLocation(distributorId, dto);
    this.trackingGateway.broadcastLocationUpdate(distributorId, dto);
    return point;
  }

  async ingestBatch(distributorId: string, dto: BatchLocationDto): Promise<{ saved: number }> {
    const entities = dto.points.map((p: LocationPointDto) =>
      this.locationRepo.create({
        distributorId,
        latitude: p.latitude,
        longitude: p.longitude,
        speed: p.speed ?? null,
        accuracy: p.accuracy ?? null,
        altitude: p.altitude ?? null,
        bearing: p.bearing ?? null,
        recordedAt: new Date(p.recordedAt),
        deviceId: p.deviceId ?? null,
        isSynced: true,
        syncedAt: new Date(),
      }),
    );

    await this.locationRepo.save(entities);

    const latest = dto.points[dto.points.length - 1];
    if (latest) {
      await this.updateLiveLocation(distributorId, latest);
      this.trackingGateway.broadcastLocationUpdate(distributorId, latest);
    }

    this.logger.log(`Batch ingested ${entities.length} points for distributor ${distributorId}`);
    return { saved: entities.length };
  }

  async getLastLocation(distributorId: string) {
    const cached = await this.redis.getJson<LocationPointDto>(
      `location:live:${distributorId}`,
    );
    if (cached) return cached;

    const profile = await this.distributorRepo.findOne({ where: { id: distributorId } });
    if (!profile?.lastLatitude || !profile?.lastLongitude) {
      throw new NotFoundException('No location data found');
    }

    return {
      latitude: profile.lastLatitude,
      longitude: profile.lastLongitude,
      recordedAt: profile.lastLocationAt?.toISOString(),
    };
  }

  async getRouteHistory(distributorId: string, query: RouteHistoryQueryDto) {
    let from: Date;
    let to: Date;

    if (query.date) {
      from = new Date(`${query.date}T00:00:00.000Z`);
      to = new Date(`${query.date}T23:59:59.999Z`);
    } else {
      from = query.from ? new Date(query.from) : new Date(Date.now() - 86400000);
      to = query.to ? new Date(query.to) : new Date();
    }

    const points = await this.locationRepo.find({
      where: {
        distributorId,
        recordedAt: Between(from, to),
      },
      order: { recordedAt: 'ASC' },
      select: ['latitude', 'longitude', 'speed', 'accuracy', 'recordedAt'],
    });

    return {
      distributorId,
      from: from.toISOString(),
      to: to.toISOString(),
      pointCount: points.length,
      points,
    };
  }

  async findNearbyClients(
    latitude: number,
    longitude: number,
    radiusMeters = 500,
    distributorId?: string,
  ) {
    const params: Array<number | string> = [longitude, latitude, radiusMeters];
    let distributorFilter = '';
    if (distributorId) {
      params.push(distributorId);
      distributorFilter = `AND c.distributor_id = $${params.length}`;
    }

    const result = await this.locationRepo.query(
      `
      SELECT c.id, c.code, c.name, c.address, c.balance,
             ST_Distance(
               ST_SetSRID(ST_MakePoint(c.longitude, c.latitude), 4326)::geography,
               ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
             ) AS distance_meters
      FROM clients c
      WHERE c.latitude IS NOT NULL
        AND c.longitude IS NOT NULL
        AND c.is_active = true
        ${distributorFilter}
        AND ST_DWithin(
          ST_SetSRID(ST_MakePoint(c.longitude, c.latitude), 4326)::geography,
          ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
          $3
        )
      ORDER BY distance_meters ASC
      LIMIT 50
      `,
      params,
    );

    return result;
  }

  private async savePoint(distributorId: string, dto: LocationPointDto): Promise<LocationPoint> {
    const entity = this.locationRepo.create({
      distributorId,
      latitude: dto.latitude,
      longitude: dto.longitude,
      speed: dto.speed ?? null,
      accuracy: dto.accuracy ?? null,
      altitude: dto.altitude ?? null,
      bearing: dto.bearing ?? null,
      recordedAt: new Date(dto.recordedAt),
      deviceId: dto.deviceId ?? null,
      isSynced: true,
      syncedAt: new Date(),
    });
    return this.locationRepo.save(entity);
  }

  /** WebSocket orqali kelgan joylashuv — DB + Redis yangilanadi, nuqta saqlanmaydi */
  async touchLiveLocation(distributorId: string, dto: LocationPointDto) {
    await this.updateLiveLocation(distributorId, dto);
  }

  /** Socket uzilganda — online holatni tozalash (oxirgi nuqta saqlanadi) */
  async markOffline(distributorId: string) {
    try {
      await this.distributorRepo.update(distributorId, {
        isOnline: false,
        status: DistributorStatus.OFFLINE,
      });
    } catch {
      /* ignore */
    }
    try {
      await this.redis.del(`online:${distributorId}`);
      // location:live ni o'chirmaymiz — oxirgi joy xaritada qoladi
    } catch {
      /* ignore */
    }
  }

  /** Redis online yoki oxirgi GPS yangimi */
  async isLiveOnline(distributorId: string, maxAgeMs = 180_000): Promise<boolean> {
    try {
      const online = await this.redis.getJson(`online:${distributorId}`);
      if (online) return true;
      const live = await this.redis.getJson<{ recordedAt?: string }>(`location:live:${distributorId}`);
      if (live?.recordedAt) {
        const age = Date.now() - new Date(live.recordedAt).getTime();
        if (age <= maxAgeMs) return true;
      }
    } catch {
      /* fall through to DB */
    }
    const profile = await this.distributorRepo.findOne({ where: { id: distributorId } });
    if (!profile?.lastLocationAt) return false;
    return Date.now() - profile.lastLocationAt.getTime() <= maxAgeMs;
  }

  private async updateLiveLocation(distributorId: string, dto: LocationPointDto) {
    const recordedAt = dto.recordedAt ? new Date(dto.recordedAt) : new Date();
    await this.distributorRepo.update(distributorId, {
      lastLatitude: dto.latitude,
      lastLongitude: dto.longitude,
      lastLocationAt: Number.isNaN(recordedAt.getTime()) ? new Date() : recordedAt,
      status: DistributorStatus.ON_ROUTE,
      isOnline: true,
    });

    const ttl = LIVE_LOCATION_TTL;
    try {
      await this.redis.setJson(`location:live:${distributorId}`, {
        ...dto,
        recordedAt: Number.isNaN(recordedAt.getTime())
          ? new Date().toISOString()
          : recordedAt.toISOString(),
      }, ttl);
      await this.redis.setJson(`online:${distributorId}`, {
        updatedAt: new Date().toISOString(),
        source: 'gps',
      }, ttl);
    } catch {
      // Redis ishlamasa ham DB yangilangan
    }
  }
}
