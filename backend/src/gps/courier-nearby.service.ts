import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';
import { Order } from '../orders/entities/order.entity';
import { Client } from '../clients/entities/client.entity';
import { User } from '../auth/entities/user.entity';
import { UserClientMembership } from '../clients/entities/user-client-membership.entity';
import { OrderStatus } from '../common/enums';
import { RedisService } from '../common/redis/redis.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/notification.types';
import { PushI18n, normalizePushLang } from '../notifications/push-i18n';

const NEARBY_KM = 1.0;
const THROTTLE_TTL_SEC = 25;

@Injectable()
export class CourierNearbyService {
  private readonly logger = new Logger(CourierNearbyService.name);

  constructor(
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @InjectRepository(Client)
    private readonly clientRepo: Repository<Client>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(UserClientMembership)
    private readonly membershipRepo: Repository<UserClientMembership>,
    private readonly notifications: NotificationsService,
    private readonly redis: RedisService,
  ) {}

  /**
   * Dostavkachi GPS — magazinga ≤1 km va oldinda boshqa tochka yo‘q bo‘lsa push.
   * Throttle: har kuryer uchun ~25s.
   */
  checkFromGps(distributorId: string, lat: number, lng: number): void {
    void this.runThrottled(distributorId, lat, lng);
  }

  /** Oldingi tochka yetkazilgach — darhol qayta tekshiruv (throttle yo‘q). */
  checkAfterStopDelivered(distributorId: string, lat: number, lng: number): void {
    void this.evaluate(distributorId, lat, lng).catch((e) =>
      this.logger.warn(
        `nearby after-stop failed: ${e instanceof Error ? e.message : String(e)}`,
      ),
    );
  }

  private async runThrottled(distributorId: string, lat: number, lng: number) {
    try {
      const key = `nearby-check:${distributorId}`;
      const existing = await this.redis.get(key);
      if (existing) return;
      await this.redis.set(key, '1', THROTTLE_TTL_SEC);
    } catch {
      // Redis yo‘q — baribir tekshiramiz
    }
    await this.evaluate(distributorId, lat, lng);
  }

  private async evaluate(distributorId: string, lat: number, lng: number) {
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

    const onWay = await this.orderRepo.find({
      where: {
        deliveryDistributorId: distributorId,
        status: OrderStatus.ON_WAY,
      },
      order: { deliverySequence: 'ASC' },
    });
    if (onWay.length === 0) return;

    const pending = onWay.filter((o) => !o.courierNearbyNotifiedAt);
    if (pending.length === 0) return;

    const clientIds = [...new Set(pending.map((o) => o.clientId))];
    const clients = await this.clientRepo.find({ where: { id: In(clientIds) } });
    const clientById = new Map(clients.map((c) => [c.id, c]));

    const notifiedClients = new Set<string>();

    for (const order of pending) {
      if (notifiedClients.has(order.clientId)) continue;

      const seq = order.deliverySequence ?? Number.MAX_SAFE_INTEGER;
      const priorClientIds = new Set(
        onWay
          .filter((o) => (o.deliverySequence ?? Number.MAX_SAFE_INTEGER) < seq)
          .map((o) => o.clientId),
      );
      priorClientIds.delete(order.clientId);
      if (priorClientIds.size > 0) continue;

      const client = clientById.get(order.clientId);
      const shopLat = client?.latitude != null ? Number(client.latitude) : NaN;
      const shopLng = client?.longitude != null ? Number(client.longitude) : NaN;
      if (!Number.isFinite(shopLat) || !Number.isFinite(shopLng)) continue;

      const km = haversineKm(lat, lng, shopLat, shopLng);
      if (km > NEARBY_KM) continue;

      const marked = await this.orderRepo.update(
        {
          deliveryDistributorId: distributorId,
          clientId: order.clientId,
          status: OrderStatus.ON_WAY,
          courierNearbyNotifiedAt: IsNull(),
        },
        { courierNearbyNotifiedAt: new Date() },
      );
      if (!marked.affected) continue;

      notifiedClients.add(order.clientId);
      await this.notifyClient(order.clientId, order.id);
      this.logger.log(
        `Courier nearby push: order=${order.id} client=${order.clientId} km=${km.toFixed(2)}`,
      );
    }
  }

  private async notifyClient(clientId: string, orderId: string) {
    const byClient = await this.userRepo.find({ where: { clientId } });
    const memberships = await this.membershipRepo.find({ where: { clientId } });
    const userIds = [
      ...new Set([
        ...byClient.map((u) => u.id),
        ...memberships.map((m) => m.userId),
      ]),
    ];
    if (userIds.length === 0) return;

    const users = await this.userRepo.find({ where: { id: In(userIds) } });
    await Promise.all(
      users.map((user) => {
        const msg = PushI18n.courierApproaching(
          normalizePushLang(user.preferredLanguage),
        );
        return this.notifications.sendToUser(
          user.id,
          msg.title,
          msg.body,
          NotificationType.ORDER,
          { orderId, type: 'courier_nearby' },
        );
      }),
    );
  }
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return c * 6371;
}
