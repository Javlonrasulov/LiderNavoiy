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
        await this.redis.setJson(`online:${payload.distributorId}`, {
          socketId: client.id,
          connectedAt: new Date().toISOString(),
        }, 300);
      }

      if (payload.role === 'admin' || payload.role === 'manager') {
        client.join('admins');
      }

      this.logger.log(`Client connected: ${client.id} (${payload.username})`);
      this.server.to('admins').emit('distributor:online', {
        distributorId: payload.distributorId,
        timestamp: new Date().toISOString(),
      });
    } catch {
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    const { distributorId } = client.data;
    if (distributorId) {
      await this.redis.del(`online:${distributorId}`);
      this.server.to('admins').emit('distributor:offline', {
        distributorId,
        timestamp: new Date().toISOString(),
      });
    }
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

  broadcastLocationUpdate(distributorId: string, data: LocationPointDto) {
    this.server.to('admins').emit('location:live', {
      distributorId,
      ...data,
      receivedAt: new Date().toISOString(),
    });
  }

  broadcastStatusUpdate(distributorId: string, status: string) {
    this.server.to('admins').emit('distributor:status', {
      distributorId,
      status,
      timestamp: new Date().toISOString(),
    });
  }
}
