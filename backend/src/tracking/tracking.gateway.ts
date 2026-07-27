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
import { RedisService } from '../common/redis/redis.service';
import { LocationPointDto } from '../gps/dto/gps.dto';
import { JwtPayload } from '../auth/auth.service';
import { GpsService } from '../gps/gps.service';

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/tracking',
})
export class TrackingGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(TrackingGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly redis: RedisService,
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
        // Online faqat GPS kelganda — ulanishning o'zi yetarli emas
      }

      if (payload.role === 'admin' || payload.role === 'manager') {
        client.join('admins');
      }

      // Mijoz APK ham tracking socketga ulanishi mumkin (watch:courier)
      if (payload.role === 'client') {
        client.join(`client:${payload.sub}`);
      }

      this.logger.log(`Client connected: ${client.id} (${payload.username})`);
    } catch {
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    // Online holat faqat GPS TTL bilan belgilanadi.
    // Socket qisqa uzilsa ham agent REST orqali GPS yuboraveradi — darhol offline qilmaymiz.
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('location:update')
  async handleLocationUpdate(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: LocationPointDto,
  ) {
    const { distributorId } = client.data;
    if (!distributorId) return;

    try {
      await this.gpsService.touchLiveLocation(distributorId, data);
    } catch (e) {
      this.logger.warn(`Failed to persist live location for ${distributorId}: ${e}`);
    }

    this.broadcastLocationUpdate(distributorId, data);
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
    // Mijoz APK — Yandex Taxi uslubida jonli kuzatuv
    this.server.to(`watch:${distributorId}`).emit('courier:location', payload);
  }

  broadcastStatusUpdate(distributorId: string, status: string) {
    this.server.to('admins').emit('distributor:status', {
      distributorId,
      status,
      timestamp: new Date().toISOString(),
    });
  }
}
