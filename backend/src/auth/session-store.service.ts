import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../common/redis/redis.service';
import { v4 as uuidv4 } from 'uuid';

export interface AuthSessionRecord {
  sessionId: string;
  userId: string;
  refreshJti: string;
  deviceKey: string | null;
  brand: string | null;
  model: string | null;
  os: string | null;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
  lastSeenAt: string;
}

@Injectable()
export class SessionStoreService {
  constructor(
    private readonly redis: RedisService,
    private readonly config: ConfigService,
  ) {}

  private refreshTtlSeconds(): number {
    const raw = this.config.get<string>('JWT_REFRESH_EXPIRES_IN', '7d');
    const m = /^(\d+)([smhd])$/i.exec(raw.trim());
    if (!m) return 7 * 24 * 3600;
    const n = Number(m[1]);
    const u = m[2].toLowerCase();
    if (u === 's') return n;
    if (u === 'm') return n * 60;
    if (u === 'h') return n * 3600;
    return n * 24 * 3600;
  }

  private sessionKey(sessionId: string) {
    return `auth:session:${sessionId}`;
  }

  private userSessionsKey(userId: string) {
    return `auth:user_sessions:${userId}`;
  }

  async createSession(input: {
    userId: string;
    refreshJti: string;
    deviceKey?: string | null;
    brand?: string | null;
    model?: string | null;
    os?: string | null;
    ip?: string | null;
    userAgent?: string | null;
  }): Promise<AuthSessionRecord> {
    const sessionId = uuidv4();
    const now = new Date().toISOString();
    const record: AuthSessionRecord = {
      sessionId,
      userId: input.userId,
      refreshJti: input.refreshJti,
      deviceKey: input.deviceKey ?? null,
      brand: input.brand ?? null,
      model: input.model ?? null,
      os: input.os ?? null,
      ip: input.ip ?? null,
      userAgent: input.userAgent ?? null,
      createdAt: now,
      lastSeenAt: now,
    };
    const ttl = this.refreshTtlSeconds();
    const client = this.redis.getClient();
    await this.redis.setJson(this.sessionKey(sessionId), record, ttl);
    await client.sadd(this.userSessionsKey(input.userId), sessionId);
    await client.expire(this.userSessionsKey(input.userId), ttl);
    return record;
  }

  async getSession(sessionId: string): Promise<AuthSessionRecord | null> {
    return this.redis.getJson<AuthSessionRecord>(this.sessionKey(sessionId));
  }

  async touchSession(sessionId: string): Promise<void> {
    const session = await this.getSession(sessionId);
    if (!session) return;
    session.lastSeenAt = new Date().toISOString();
    await this.redis.setJson(
      this.sessionKey(sessionId),
      session,
      this.refreshTtlSeconds(),
    );
  }

  async rotateRefreshJti(
    sessionId: string,
    oldJti: string,
    newJti: string,
  ): Promise<AuthSessionRecord | null> {
    const session = await this.getSession(sessionId);
    if (!session || session.refreshJti !== oldJti) return null;
    session.refreshJti = newJti;
    session.lastSeenAt = new Date().toISOString();
    const ttl = this.refreshTtlSeconds();
    await this.redis.setJson(this.sessionKey(sessionId), session, ttl);
    return session;
  }

  async listUserSessions(userId: string): Promise<AuthSessionRecord[]> {
    const client = this.redis.getClient();
    const ids = await client.smembers(this.userSessionsKey(userId));
    const out: AuthSessionRecord[] = [];
    for (const id of ids) {
      const s = await this.getSession(id);
      if (s) out.push(s);
      else await client.srem(this.userSessionsKey(userId), id);
    }
    return out.sort((a, b) => b.lastSeenAt.localeCompare(a.lastSeenAt));
  }

  async revokeSession(userId: string, sessionId: string): Promise<boolean> {
    const session = await this.getSession(sessionId);
    if (!session || session.userId !== userId) return false;
    await this.redis.del(this.sessionKey(sessionId));
    await this.redis.getClient().srem(this.userSessionsKey(userId), sessionId);
    return true;
  }

  async revokeAllSessions(userId: string, exceptSessionId?: string): Promise<number> {
    const sessions = await this.listUserSessions(userId);
    let n = 0;
    for (const s of sessions) {
      if (exceptSessionId && s.sessionId === exceptSessionId) continue;
      await this.revokeSession(userId, s.sessionId);
      n += 1;
    }
    return n;
  }
}
