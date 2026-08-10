import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Logger, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { LocationPointDto } from '../gps/dto/gps.dto';
import { JwtPayload } from '../auth/auth.service';
import { GpsService } from '../gps/gps.service';
import { DistributorProfile } from '../distributors/entities/distributor-profile.entity';
import { UserRole } from '../common/enums';

@WebSocketGateway({
  cors: {
    origin: (origin, callback) => {
      const raw = process.env.CORS_ORIGINS || 'http://localhost:5173';
      if (!origin || raw.trim() === '*') {
        callback(null, true);
        return;
      }
      const allowed = raw.split(',').map((s) => s.trim()).filter(Boolean);
      if (allowed.includes(origin)) {
        callback(null, true);
        return;
      }
      if (
        origin.includes('localhost') ||
        origin.includes('127.0.0.1') ||
        origin.endsWith('.netlify.app') ||
        origin.includes('lider-navoiy')
      ) {
        callback(null, true);
        return;
      }
      callback(null, false);
    },
    credentials: true,
  },
  namespace: '/tracking',
})
export class TrackingGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(TrackingGateway.name);
  /** distributorId → ulangan socket id lar (presence) */
  private readonly presenceSockets = new Map<string, Set<string>>();
  private readonly offlineTimers = new Map<string, NodeJS.Timeout>();
  /** distributorId → companyId cache */
  private readonly distributorCompany = new Map<string, string | null>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    @Inject(forwardRef(() => GpsService))
    private readonly gpsService: GpsService,
    @InjectRepository(DistributorProfile)
    private readonly profileRepo: Repository<DistributorProfile>,
  ) {}

  private staffRooms(companyIds: string[]): string[] {
    if (!companyIds.length) return [];
    return companyIds.map((id) => `company:${id}`);
  }

  private async resolveCompanyId(distributorId: string): Promise<string | null> {
    if (this.distributorCompany.has(distributorId)) {
      return this.distributorCompany.get(distributorId) ?? null;
    }
    const profile = await this.profileRepo.findOne({
      where: { id: distributorId },
      select: ['id', 'companyId'],
    });
    const companyId = profile?.companyId?.trim() || null;
    this.distributorCompany.set(distributorId, companyId);
    return companyId;
  }

  private async emitToStaff(
    event: string,
    payload: unknown,
    distributorId?: string,
  ) {
    this.server.to('admins').emit(event, payload);
    const companyId = distributorId
      ? await this.resolveCompanyId(distributorId)
      : null;
    if (companyId) {
      this.server.to(`company:${companyId}`).emit(event, payload);
    }
  }

  async handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify<JwtPayload>(token, {
        secret: this.config.get('JWT_SECRET'),
      });

      client.data.userId = payload.sub;
      client.data.distributorId = payload.distributorId;
      client.data.role = payload.role;

      if (payload.distributorId) {
        client.join(`distributor:${payload.distributorId}`);
        this.trackPresence(payload.distributorId, client.id);
        const last = await this.gpsService.markPresenceOnline(payload.distributorId);
        await this.emitToStaff(
          'distributor:online',
          {
            distributorId: payload.distributorId,
            timestamp: new Date().toISOString(),
          },
          payload.distributorId,
        );
        if (last) {
          this.broadcastLocationUpdate(payload.distributorId, {
            latitude: last.latitude,
            longitude: last.longitude,
            recordedAt: last.recordedAt,
          });
        }
      }

      if (payload.role === UserRole.ADMIN) {
        client.join('admins');
      } else if (payload.role === UserRole.MANAGER) {
        let profile = payload.distributorId
          ? await this.profileRepo.findOne({
              where: { id: payload.distributorId },
              select: ['id', 'companyId', 'companyIds'],
            })
          : null;
        if (!profile) {
          profile = await this.profileRepo.findOne({
            where: { userId: payload.sub },
            select: ['id', 'companyId', 'companyIds'],
          });
        }
        const ids = [
          ...new Set(
            [
              ...(Array.isArray(profile?.companyIds) ? profile.companyIds : []),
              profile?.companyId,
            ]
              .map((id) => id?.trim())
              .filter((id): id is string => !!id),
          ),
        ];
        for (const room of this.staffRooms(ids)) {
          client.join(room);
        }
      } else if (
        !payload.distributorId &&
        payload.role !== UserRole.CLIENT
      ) {
        // Legacy staff without distributor profile
        client.join('admins');
      }

      if (payload.role === UserRole.CLIENT) {
        client.join(`client:${payload.sub}`);
      }

      this.logger.log(`Client connected: ${client.id} (${payload.username}, role=${payload.role})`);
    } catch {
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    const distributorId = client.data?.distributorId as string | undefined;
    this.logger.log(`Client disconnected: ${client.id}`);
    if (!distributorId) return;

    const set = this.presenceSockets.get(distributorId);
    set?.delete(client.id);
    if (set && set.size > 0) return;
    this.presenceSockets.delete(distributorId);

    const prev = this.offlineTimers.get(distributorId);
    if (prev) clearTimeout(prev);
    const timer = setTimeout(() => {
      this.offlineTimers.delete(distributorId);
      if (this.presenceSockets.has(distributorId)) return;
      void this.gpsService.markOffline(distributorId).then(() => {
        void this.emitToStaff(
          'distributor:offline',
          {
            distributorId,
            timestamp: new Date().toISOString(),
          },
          distributorId,
        );
      });
    }, 75_000);
    this.offlineTimers.set(distributorId, timer);
  }

  private trackPresence(distributorId: string, socketId: string) {
    const pending = this.offlineTimers.get(distributorId);
    if (pending) {
      clearTimeout(pending);
      this.offlineTimers.delete(distributorId);
    }
    const set = this.presenceSockets.get(distributorId) ?? new Set<string>();
    set.add(socketId);
    this.presenceSockets.set(distributorId, set);
  }

  @SubscribeMessage('presence:ping')
  async handlePresencePing(@ConnectedSocket() client: Socket) {
    const distributorId = client.data?.distributorId as string | undefined;
    if (!distributorId) return { status: 'skip' };
    this.trackPresence(distributorId, client.id);
    await this.gpsService.refreshPresence(distributorId);
    await this.emitToStaff(
      'distributor:online',
      {
        distributorId,
        timestamp: new Date().toISOString(),
      },
      distributorId,
    );
    return { status: 'ok' };
  }

  @SubscribeMessage('location:update')
  async handleLocationUpdate(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: Record<string, unknown>,
  ) {
    const { distributorId } = client.data;
    if (!distributorId) return;

    const lat = Number(data?.latitude);
    const lng = Number(data?.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return { status: 'bad_coords' };

    const rawAt = data?.recordedAt;
    const recordedAt =
      typeof rawAt === 'string' && rawAt.trim()
        ? rawAt
        : new Date().toISOString();

    const normalized: LocationPointDto = {
      latitude: lat,
      longitude: lng,
      recordedAt,
      speed: data?.speed != null ? Number(data.speed) : undefined,
      accuracy: data?.accuracy != null ? Number(data.accuracy) : undefined,
      altitude: data?.altitude != null ? Number(data.altitude) : undefined,
      bearing: data?.bearing != null ? Number(data.bearing) : undefined,
      deviceId: typeof data?.deviceId === 'string' ? data.deviceId : undefined,
    };

    try {
      await this.gpsService.touchLiveLocation(distributorId, normalized);
    } catch (e) {
      this.logger.warn(`Failed to persist live location for ${distributorId}: ${e}`);
    }

    this.broadcastLocationUpdate(distributorId, normalized);
    return { status: 'ok' };
  }

  @SubscribeMessage('watch:courier')
  handleWatchCourier(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { distributorId?: string },
  ) {
    const id = body?.distributorId;
    if (!id) return { status: 'error' };
    client.join(`watch:${id}`);
    return { status: 'ok' };
  }

  @SubscribeMessage('unwatch:courier')
  handleUnwatchCourier(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { distributorId?: string },
  ) {
    const id = body?.distributorId;
    if (!id) return { status: 'error' };
    client.leave(`watch:${id}`);
    return { status: 'ok' };
  }

  broadcastLocationUpdate(distributorId: string, data: LocationPointDto) {
    const payload = {
      distributorId,
      ...data,
      receivedAt: new Date().toISOString(),
    };
    void this.emitToStaff('location:live', payload, distributorId);
    void this.emitToStaff(
      'distributor:online',
      {
        distributorId,
        timestamp: payload.receivedAt,
      },
      distributorId,
    );
    this.server.to(`watch:${distributorId}`).emit('courier:location', payload);
  }

  broadcastRouteReorder(distributorId: string, orderIds: string[]) {
    const payload = {
      distributorId,
      orderIds,
      updatedAt: new Date().toISOString(),
    };
    this.server.to(`watch:${distributorId}`).emit('courier:route', payload);
    void this.emitToStaff('courier:route', payload, distributorId);
  }

  broadcastStatusUpdate(distributorId: string, status: string) {
    void this.emitToStaff(
      'distributor:status',
      {
        distributorId,
        status,
        timestamp: new Date().toISOString(),
      },
      distributorId,
    );
  }
}
