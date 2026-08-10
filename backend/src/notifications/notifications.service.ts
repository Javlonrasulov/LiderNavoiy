import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { User } from '../auth/entities/user.entity';
import { DistributorProfile } from '../distributors/entities/distributor-profile.entity';
import { PushNotification } from './entities/push-notification.entity';
import { FirebaseAdminService } from './firebase-admin.service';
import { NotificationType } from './notification.types';
import {
  SendNotificationDto,
  BroadcastNotificationDto,
  SendToUsersDto,
} from './dto/notification.dto';
import { UserRole } from '../common/enums';
import { allowedCompanyIds } from '../common/company-scope.util';
import { normalizePushLang, PushI18n, PushLang } from './push-i18n';

export interface SendResult {
  sent: boolean;
  messageId?: string;
  error?: string;
  notificationId?: string;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly firebase: FirebaseAdminService,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(DistributorProfile)
    private readonly profileRepo: Repository<DistributorProfile>,
    @InjectRepository(PushNotification)
    private readonly notifRepo: Repository<PushNotification>,
  ) {}

  async registerFcmToken(userId: string, token: string, language?: string) {
    const patch: Partial<User> = { fcmToken: token };
    if (language) {
      patch.preferredLanguage = normalizePushLang(language);
    }
    await this.userRepo.update(userId, patch);
    this.logger.log(
      `FCM token registered for user ${userId}` +
        (language ? ` lang=${normalizePushLang(language)}` : ''),
    );
    return { registered: true, tokenPreview: token.slice(0, 12) + '...' };
  }

  async getUserLang(userId: string): Promise<PushLang> {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      select: ['id', 'preferredLanguage'],
    });
    return normalizePushLang(user?.preferredLanguage);
  }

  async getDistributorLang(distributorId: string): Promise<PushLang> {
    const profile = await this.profileRepo.findOne({
      where: { id: distributorId },
      relations: ['user'],
    });
    return normalizePushLang(profile?.user?.preferredLanguage);
  }

  async getMyNotifications(userId: string, limit = 50) {
    return this.notifRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async markAsRead(userId: string, notificationId: string) {
    await this.notifRepo.update(
      { id: notificationId, userId },
      { isRead: true },
    );
    return { success: true };
  }

  async markAllRead(userId: string) {
    await this.notifRepo.update({ userId, isRead: false }, { isRead: true });
    return { success: true };
  }

  async getUnreadCount(userId: string) {
    const count = await this.notifRepo.count({
      where: { userId, isRead: false },
    });
    return { count };
  }

  /** Send to a single user by userId */
  async sendToUser(
    userId: string,
    title: string,
    body: string,
    type: NotificationType = NotificationType.GENERAL,
    data?: Record<string, string>,
  ): Promise<SendResult> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const record = await this.saveRecord(userId, title, body, type, data);

    if (!user.fcmToken) {
      this.logger.warn(`No FCM token for user ${userId}`);
      return { sent: false, error: 'NO_FCM_TOKEN', notificationId: record.id };
    }

    return this.deliverPush(user.fcmToken, title, body, type, data, record.id, userId);
  }

  /** Send to distributor by profile id */
  async sendToDistributor(
    distributorId: string,
    title: string,
    body: string,
    type?: NotificationType,
    data?: Record<string, string>,
  ): Promise<SendResult> {
    const profile = await this.profileRepo.findOne({
      where: { id: distributorId },
    });
    if (!profile?.userId) throw new NotFoundException('Distributor not found');
    return this.sendToUser(profile.userId, title, body, type, data);
  }

  async send(dto: SendNotificationDto): Promise<SendResult> {
    if (dto.userId) {
      return this.sendToUser(
        dto.userId,
        dto.title,
        dto.body,
        dto.type,
        dto.data,
      );
    }
    if (dto.distributorId) {
      return this.sendToDistributor(
        dto.distributorId,
        dto.title,
        dto.body,
        dto.type,
        dto.data,
      );
    }
    throw new BadRequestException('userId or distributorId required');
  }

  async sendToMany(dto: SendToUsersDto) {
    const results = [];
    for (const userId of dto.userIds) {
      results.push(
        await this.sendToUser(userId, dto.title, dto.body, dto.type, dto.data),
      );
    }
    return { results, total: results.length, sent: results.filter((r) => r.sent).length };
  }

  /** Broadcast to agents / clients / admins / all (with FCM tokens) */
  async broadcast(dto: BroadcastNotificationDto) {
    const audience = dto.audience ?? 'agents';
    let users: User[] = [];

    if (audience === 'agents') {
      const qb = this.userRepo
        .createQueryBuilder('u')
        .innerJoin(DistributorProfile, 'p', 'p.userId = u.id')
        .where('u.role = :role', { role: UserRole.DISTRIBUTOR })
        .andWhere('u.fcmToken IS NOT NULL')
        .andWhere('u.isActive = true');
      if (dto.companyId) {
        qb.andWhere('p.companyId = :companyId', { companyId: dto.companyId });
      }
      users = await qb.getMany();
    } else if (audience === 'clients') {
      users = await this.userRepo.find({
        where: { role: UserRole.CLIENT, isActive: true },
      });
      users = users.filter((u) => !!u.fcmToken);
    } else if (audience === 'admins') {
      users = await this.userRepo.find({
        where: {
          role: In([UserRole.ADMIN, UserRole.MANAGER]),
          isActive: true,
        },
      });
      users = users.filter((u) => !!u.fcmToken);
    } else {
      // all
      users = await this.userRepo.find({ where: { isActive: true } });
      users = users.filter((u) => !!u.fcmToken);
    }

    const tokens = users.map((u) => u.fcmToken!).filter(Boolean);

    if (tokens.length === 0) {
      return { sent: 0, message: 'No devices with FCM tokens' };
    }

    const type = dto.type ?? NotificationType.GENERAL;
    const data = { ...dto.data, type };

    for (const user of users) {
      await this.saveRecord(user.id, dto.title, dto.body, type, data);
    }

    return this.deliverMulticast(tokens, dto.title, dto.body, type, data);
  }

  /** Notify admins + same-org managers when agent creates order */
  async notifyAdminsNewOrder(
    agentName: string,
    orderTotal: number,
    clientName?: string,
    extras?: { territory?: string | null; orderId?: string; companyId?: string | null },
  ) {
    const admins = await this.userRepo.find({
      where: {
        role: In([UserRole.ADMIN, UserRole.MANAGER]),
        isActive: true,
      },
      relations: ['distributorProfile'],
    });
    const companyId = extras?.companyId?.trim() || null;
    const targets = admins.filter((u) => {
      if (u.role === UserRole.ADMIN) return true;
      if (!companyId) return false;
      return allowedCompanyIds(u).includes(companyId);
    });

    const agent = (agentName || 'Agent').trim() || 'Agent';
    const client = (clientName || 'Mijoz').trim() || 'Mijoz';
    const territory = extras?.territory?.trim();
    const sum = orderTotal.toLocaleString('uz-UZ');
    const place = territory ? `${client} · ${territory}` : client;
    const data: Record<string, string> = {
      type: NotificationType.ORDER,
      screen: 'orders',
      agentName: agent,
      clientName: client,
    };
    if (extras?.orderId) data.orderId = extras.orderId;
    if (territory) data.territory = territory;

    let sent = 0;
    for (const admin of targets) {
      const lang = normalizePushLang(admin.preferredLanguage);
      const title = PushI18n.adminNewOrderTitle(lang, agent);
      const body = PushI18n.adminNewOrderBody(lang, agent, place, sum);
      const result = await this.sendToUser(
        admin.id,
        title,
        body,
        NotificationType.ORDER,
        data,
      );
      if (result.sent) sent++;
    }
    return { sent, total: targets.length };
  }

  /** Mijoz agentga buyurtma yuborganida — faqat shu org managerlari + admin */
  async notifyAdminsClientOrder(
    agentName: string,
    orderTotal: number,
    clientName?: string,
    extras?: {
      orderId?: string;
      stale?: boolean;
      hoursWaiting?: number;
      companyId?: string | null;
    },
  ) {
    const admins = await this.userRepo.find({
      where: {
        role: In([UserRole.ADMIN, UserRole.MANAGER]),
        isActive: true,
      },
      relations: ['distributorProfile'],
    });
    const companyId = extras?.companyId?.trim() || null;
    const targets = admins.filter((u) => {
      if (u.role === UserRole.ADMIN) return true;
      if (!companyId) return false;
      return allowedCompanyIds(u).includes(companyId);
    });

    const agent = (agentName || 'Agent').trim() || 'Agent';
    const client = (clientName || 'Mijoz').trim() || 'Mijoz';
    const sum = Math.round(orderTotal).toLocaleString('uz-UZ');
    const hours = extras?.hoursWaiting ?? 1;
    const data: Record<string, string> = {
      type: NotificationType.ORDER,
      screen: 'client_orders',
      subtype: extras?.stale ? 'client_order_stale' : 'client_order',
      agentName: agent,
      clientName: client,
    };
    if (extras?.orderId) data.orderId = extras.orderId;

    let sent = 0;
    for (const admin of targets) {
      const lang = normalizePushLang(admin.preferredLanguage);
      const title = extras?.stale
        ? PushI18n.adminClientOrderStaleTitle(lang, agent)
        : PushI18n.adminClientOrderTitle(lang, agent);
      const body = extras?.stale
        ? PushI18n.adminClientOrderStaleBody(lang, agent, client, hours)
        : PushI18n.adminClientOrderBody(lang, agent, client, sum);
      const result = await this.sendToUser(
        admin.id,
        title,
        body,
        NotificationType.ORDER,
        data,
      );
      if (result.sent) sent++;
    }
    return { sent, total: targets.length };
  }

  /** Notify agent */
  async notifyAgent(
    userId: string,
    title: string,
    body: string,
    type: NotificationType,
    data?: Record<string, string>,
  ) {
    return this.sendToUser(userId, title, body, type, data);
  }

  /**
   * Reja tayinlanganda agentga push — majburiy urinish (retry).
   * Plan saqlangandan keyin chaqiriladi.
   */
  async notifyPlanAssigned(
    distributorId: string,
    title: string,
    body: string,
  ): Promise<SendResult> {
    const data = {
      type: NotificationType.PLAN,
      screen: 'plan',
      title,
      body,
    };

    let last: SendResult = { sent: false, error: 'UNKNOWN' };
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        last = await this.sendToDistributor(
          distributorId,
          title,
          body,
          NotificationType.PLAN,
          data,
        );
        if (last.sent) {
          this.logger.log(`Plan push OK (attempt ${attempt}) → distributor ${distributorId}`);
          return last;
        }
        this.logger.warn(
          `Plan push failed attempt ${attempt}/3 → ${distributorId}: ${last.error}`,
        );
        // Token yo'q yoki Firebase sozlanmagan — qayta urinish foydasiz
        if (last.error === 'NO_FCM_TOKEN' || last.error === 'FIREBASE_NOT_CONFIGURED') {
          break;
        }
      } catch (err) {
        last = {
          sent: false,
          error: err instanceof Error ? err.message : String(err),
        };
        this.logger.warn(
          `Plan push exception attempt ${attempt}/3 → ${distributorId}: ${last.error}`,
        );
      }
      if (attempt < 3) {
        await new Promise((r) => setTimeout(r, 400 * attempt));
      }
    }
    return last;
  }

  private channelFor(type: NotificationType): string {
    if (type === NotificationType.MESSAGE) return 'crm_chat_alert_v2';
    if (type === NotificationType.PLAN) return 'crm_plan_channel';
    return 'crm_push_channel';
  }

  private async deliverPush(
    token: string,
    title: string,
    body: string,
    type: NotificationType,
    data: Record<string, string> | undefined,
    recordId: string,
    userId: string,
  ): Promise<SendResult> {
    const messaging = this.firebase.getMessaging();
    const payload: Record<string, string> = {
      type,
      title,
      body,
      ...data,
    };

    if (!messaging) {
      this.logger.warn(`[FCM not configured] ${title}: ${body} → ${userId}`);
      await this.notifRepo.update(recordId, { isSent: false });
      return { sent: false, error: 'FIREBASE_NOT_CONFIGURED', notificationId: recordId };
    }

    try {
      const channelId = this.channelFor(type);
      const isHigh = type === NotificationType.PLAN || type === NotificationType.MESSAGE;
      const imageUrl = data?.imageUrl?.trim() || undefined;
      const messageId = await messaging.send({
        token,
        notification: {
          title,
          body,
          ...(imageUrl ? { imageUrl } : {}),
        },
        data: Object.fromEntries(
          Object.entries(payload).map(([k, v]) => [k, String(v)]),
        ),
        android: {
          priority: 'high',
          notification: {
            channelId,
            priority: isHigh ? 'max' : 'high',
            defaultSound: true,
            defaultVibrateTimings: true,
            sound: 'default',
            visibility: 'public',
            clickAction: 'OPEN_CLIENT_APP',
            ...(imageUrl ? { imageUrl } : {}),
          },
        },
        webpush: {
          notification: {
            title,
            body,
            ...(imageUrl ? { image: imageUrl } : {}),
          },
          fcmOptions: { link: '/' },
          headers: { Urgency: 'high' },
        },
      });

      await this.notifRepo.update(recordId, { isSent: true, fcmMessageId: messageId });
      this.logger.log(`Push sent: ${messageId} → ${userId}`);
      return { sent: true, messageId, notificationId: recordId };
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      this.logger.error(`FCM send failed for ${userId}: ${error}`);

      // Invalid token — clear it
      if (
        error.includes('registration-token-not-registered')
        || error.includes('invalid-registration-token')
        || error.includes('Requested entity was not found')
      ) {
        await this.userRepo.update(userId, { fcmToken: null });
      }

      await this.notifRepo.update(recordId, { isSent: false });
      return { sent: false, error, notificationId: recordId };
    }
  }

  private async deliverMulticast(
    tokens: string[],
    title: string,
    body: string,
    type: NotificationType,
    data: Record<string, string>,
  ) {
    const messaging = this.firebase.getMessaging();
    if (!messaging) {
      return { sent: 0, failed: tokens.length, error: 'FIREBASE_NOT_CONFIGURED' };
    }

    const batchSize = 500;
    let sent = 0;
    let failed = 0;

    for (let i = 0; i < tokens.length; i += batchSize) {
      const batch = tokens.slice(i, i + batchSize);
      const response = await messaging.sendEachForMulticast({
        tokens: batch,
        notification: { title, body },
        data: Object.fromEntries(
          Object.entries({ type, ...data }).map(([k, v]) => [k, String(v)]),
        ),
        android: {
          priority: 'high',
          notification: { channelId: 'crm_push_channel' },
        },
        webpush: {
          notification: { title, body },
          fcmOptions: { link: '/' },
        },
      });
      sent += response.successCount;
      failed += response.failureCount;
    }

    return { sent, failed, total: tokens.length };
  }

  private async saveRecord(
    userId: string,
    title: string,
    body: string,
    type: NotificationType,
    data?: Record<string, string>,
  ) {
    return this.notifRepo.save(
      this.notifRepo.create({
        userId,
        title,
        body,
        type,
        data: data ?? null,
        isRead: false,
        isSent: false,
      }),
    );
  }
}
