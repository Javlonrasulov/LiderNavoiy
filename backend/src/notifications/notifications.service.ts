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

  async registerFcmToken(userId: string, token: string) {
    await this.userRepo.update(userId, { fcmToken: token });
    this.logger.log(`FCM token registered for user ${userId}`);
    return { registered: true, tokenPreview: token.slice(0, 12) + '...' };
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

  /** Broadcast to all distributors (or by company) */
  async broadcast(dto: BroadcastNotificationDto) {
    const qb = this.userRepo
      .createQueryBuilder('u')
      .innerJoin(DistributorProfile, 'p', 'p.userId = u.id')
      .where('u.role = :role', { role: UserRole.DISTRIBUTOR })
      .andWhere('u.fcmToken IS NOT NULL')
      .andWhere('u.isActive = true');

    if (dto.companyId) {
      qb.andWhere('p.companyId = :companyId', { companyId: dto.companyId });
    }

    const users = await qb.getMany();
    const tokens = users.map((u) => u.fcmToken!).filter(Boolean);

    if (tokens.length === 0) {
      return { sent: 0, message: 'No devices with FCM tokens' };
    }

    const type = dto.type ?? NotificationType.GENERAL;
    const data = { ...dto.data, type };

    // Save records for each user
    for (const user of users) {
      await this.saveRecord(user.id, dto.title, dto.body, type, data);
    }

    return this.deliverMulticast(tokens, dto.title, dto.body, type, data);
  }

  /** Notify all admins/managers when agent creates order */
  async notifyAdminsNewOrder(agentName: string, orderTotal: number, clientName?: string) {
    const admins = await this.userRepo.find({
      where: {
        role: In([UserRole.ADMIN, UserRole.MANAGER]),
        isActive: true,
      },
    });

    const title = 'Yangi buyurtma';
    const body = `${agentName}: ${clientName ?? 'Mijoz'} — ${orderTotal.toLocaleString()} SUM`;
    const data = { type: NotificationType.ORDER, screen: 'orders' };

    let sent = 0;
    for (const admin of admins) {
      const result = await this.sendToUser(
        admin.id,
        title,
        body,
        NotificationType.ORDER,
        data,
      );
      if (result.sent) sent++;
    }
    return { sent, total: admins.length };
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
    const payload = {
      type,
      ...data,
    };

    if (!messaging) {
      this.logger.warn(`[FCM not configured] ${title}: ${body} → ${userId}`);
      await this.notifRepo.update(recordId, { isSent: false });
      return { sent: false, error: 'FIREBASE_NOT_CONFIGURED', notificationId: recordId };
    }

    try {
      const channelId =
        type === NotificationType.MESSAGE ? 'crm_messages_channel' : 'crm_push_channel';
      const messageId = await messaging.send({
        token,
        notification: { title, body },
        data: Object.fromEntries(
          Object.entries(payload).map(([k, v]) => [k, String(v)]),
        ),
        android: {
          priority: 'high',
          notification: {
            channelId,
            priority: 'high',
            defaultSound: true,
            defaultVibrateTimings: true,
          },
        },
      });

      await this.notifRepo.update(recordId, { isSent: true, fcmMessageId: messageId });
      this.logger.log(`Push sent: ${messageId} → ${userId}`);
      return { sent: true, messageId, notificationId: recordId };
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      this.logger.error(`FCM send failed for ${userId}: ${error}`);

      // Invalid token — clear it
      if (error.includes('registration-token-not-registered')) {
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
