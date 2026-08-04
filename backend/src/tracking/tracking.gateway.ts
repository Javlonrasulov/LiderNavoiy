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
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { LocationPointDto } from '../gps/dto/gps.dto';
import { JwtPayload } from '../auth/auth.service';
import { GpsService } from '../gps/gps.service';

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
      // Netlify preview / lokal
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

  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    @Inject(forwardRef(() => GpsService))
    private readonly gpsService: GpsService,
  ) {}

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
        // GPS kelmasa ham admin xaritada online
        const last = await this.gpsService.markPresenceOnline(payload.distributorId);
        this.server.to('admins').emit('distributor:online', {
          distributorId: payload.distributorId,
          timestamp: new Date().toISOString(),
        });
        if (last) {
          this.broadcastLocationUpdate(payload.distributorId, {
            latitude: last.latitude,
            longitude: last.longitude,
            recordedAt: last.recordedAt,
          });
        }
      }

      // Admin panel — agent GPS ni darhol olish uchun
      const isStaff =
        payload.role === 'admin' ||
        payload.role === 'manager' ||
        (!payload.distributorId && payload.role !== 'client');
      if (isStaff) {
        client.join('admins');
      }

      if (payload.role === 'client') {
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

    // Qisqa uzilishda miltillamasin — 75s kutamiz
    const prev = this.offlineTimers.get(distributorId);
    if (prev) clearTimeout(prev);
    const timer = setTimeout(() => {
      this.offlineTimers.delete(distributorId);
      if (this.presenceSockets.has(distributorId)) return;
      void this.gpsService.markOffline(distributorId).then(() => {
        this.server.to('admins').emit('distributor:offline', {
          distributorId,
          timestamp: new Date().toISOString(),
        });
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
    this.server.to('admins').emit('distributor:online', {
      distributorId,
      timestamp: new Date().toISOString(),
    });
    return { status: 'ok' };
  }

  @SubscribeMessage('location:update')
  async handleLocationUpdate(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: Record<string, unknown>,
  ) {
    const { distributorId } = client.data;
    if (!distributorId) return;

    // Global ValidationPipe class DTO ni rad etmasin — yumshoq parse
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
    this.server.to('admins').emit('location:live', payload);
    this.server.to('admins').emit('distributor:online', {
      distributorId,
      timestamp: payload.receivedAt,
    });
    // Mijoz APK — Yandex Taxi uslubida jonli kuzatuv
    this.server.to(`watch:${distributorId}`).emit('courier:location', payload);
  }

  /** Dostavkachi yo‘nalish tartibi o‘zgarganda — mijoz xaritasi darhol yangilansin. */
  broadcastRouteReorder(distributorId: string, orderIds: string[]) {
    const payload = {
      distributorId,
      orderIds,
      updatedAt: new Date().toISOString(),
    };
    this.server.to(`watch:${distributorId}`).emit('courier:route', payload);
    this.server.to('admins').emit('courier:route', payload);
  }

  broadcastStatusUpdate(distributorId: string, status: string) {
    this.server.to('admins').emit('distributor:status', {
      distributorId,
      status,
      timestamp: new Date().toISOString(),
    });
  }
}
