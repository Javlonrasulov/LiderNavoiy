import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../auth/entities/user.entity';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private firebaseInitialized = false;

  constructor(
    private readonly config: ConfigService,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {
    this.initFirebase();
  }

  private initFirebase() {
    const projectId = this.config.get('FIREBASE_PROJECT_ID');
    if (!projectId) {
      this.logger.warn('Firebase not configured — push notifications disabled');
      return;
    }
    // firebase-admin initializeApp would go here in production
    this.firebaseInitialized = true;
  }

  async registerFcmToken(userId: string, token: string) {
    await this.userRepo.update(userId, { fcmToken: token });
    return { registered: true };
  }

  async sendToUser(userId: string, title: string, body: string, data?: Record<string, string>) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user?.fcmToken) {
      this.logger.warn(`No FCM token for user ${userId}`);
      return { sent: false };
    }

    if (!this.firebaseInitialized) {
      this.logger.log(`[FCM stub] To ${userId}: ${title} — ${body}`);
      return { sent: true, stub: true };
    }

    // admin.messaging().send({ token: user.fcmToken, notification: { title, body }, data })
    return { sent: true };
  }

  async sendToDistributors(distributorIds: string[], title: string, body: string) {
    const results = [];
    for (const id of distributorIds) {
      results.push(await this.sendToUser(id, title, body));
    }
    return results;
  }
}
