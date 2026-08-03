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

    const projectId = this.config.get<string>('FIREBASE_PROJECT_ID')?.trim();
    const clientEmail = this.config.get<string>('FIREBASE_CLIENT_EMAIL')?.trim();
    let privateKey = this.config.get<string>('FIREBASE_PRIVATE_KEY');

    if (!projectId || !clientEmail || !privateKey) {
      this.logger.warn(
        `Firebase Admin SDK not configured. missing=` +
          [
            !projectId ? 'FIREBASE_PROJECT_ID' : null,
            !clientEmail ? 'FIREBASE_CLIENT_EMAIL' : null,
            !privateKey ? 'FIREBASE_PRIVATE_KEY' : null,
          ]
            .filter(Boolean)
            .join(','),
      );
      return;
    }

    // .env: qo‘shtirnoq, CRLF, literal \n ni tozalash
    privateKey = privateKey
      .trim()
      .replace(/^"|"$/g, '')
      .replace(/^'|'$/g, '')
      .replace(/\\n/g, '\n')
      .replace(/\r\n/g, '\n');

    if (!privateKey.includes('BEGIN PRIVATE KEY')) {
      this.logger.error(
        'FIREBASE_PRIVATE_KEY invalid — PEM header topilmadi (BEGIN PRIVATE KEY)',
      );
      return;
    }

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
