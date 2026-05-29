import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';

@Injectable()
export class FirebaseAdminService implements OnModuleInit {
  private readonly logger = new Logger(FirebaseAdminService.name);
  private app: admin.app.App | null = null;

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    this.initialize();
  }

  private initialize() {
    if (admin.apps.length > 0) {
      this.app = admin.app();
      return;
    }

    const projectId = this.config.get<string>('FIREBASE_PROJECT_ID');
    const clientEmail = this.config.get<string>('FIREBASE_CLIENT_EMAIL');
    let privateKey = this.config.get<string>('FIREBASE_PRIVATE_KEY');

    if (!projectId || !clientEmail || !privateKey) {
      this.logger.warn(
        'Firebase Admin SDK not configured. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY in .env',
      );
      return;
    }

    privateKey = privateKey.replace(/\\n/g, '\n');

    try {
      this.app = admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
      this.logger.log(`Firebase Admin initialized for project: ${projectId}`);
    } catch (err) {
      this.logger.error('Firebase Admin init failed', err);
    }
  }

  isReady(): boolean {
    return this.app !== null;
  }

  getMessaging(): admin.messaging.Messaging | null {
    if (!this.app) return null;
    return admin.messaging(this.app);
  }
}
