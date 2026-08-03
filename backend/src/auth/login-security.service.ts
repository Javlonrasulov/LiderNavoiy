import {
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RedisService } from '../common/redis/redis.service';
import { LoginAttempt } from './entities/login-attempt.entity';

const MAX_FAILS = 5;
const LOCK_SECONDS = 15 * 60;

@Injectable()
export class LoginSecurityService {
  constructor(
    private readonly redis: RedisService,
    @InjectRepository(LoginAttempt)
    private readonly attemptRepo: Repository<LoginAttempt>,
  ) {}

  private failKey(ip: string, username: string) {
    return `auth:fail:${ip}:${username}`;
  }

  private lockKey(ip: string, username: string) {
    return `auth:lock:${ip}:${username}`;
  }

  async assertNotLocked(ip: string, username: string): Promise<void> {
    const ttl = await this.redis.getClient().ttl(this.lockKey(ip, username));
    if (ttl > 0) {
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: `Hisob vaqtincha bloklangan. ${Math.ceil(ttl / 60)} daqiqadan keyin urinib ko‘ring.`,
          retryAfter: ttl,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  async recordFailure(
    username: string,
    ip: string,
    userAgent: string | null,
    reason = 'invalid_credentials',
  ): Promise<void> {
    await this.attemptRepo.save(
      this.attemptRepo.create({
        username,
        ip,
        userAgent,
        success: false,
        reason,
      }),
    );

    const client = this.redis.getClient();
    const key = this.failKey(ip, username);
    const count = await client.incr(key);
    if (count === 1) await client.expire(key, LOCK_SECONDS);
    if (count >= MAX_FAILS) {
      await client.setex(this.lockKey(ip, username), LOCK_SECONDS, '1');
      await client.del(key);
    }
  }

  async recordSuccess(
    username: string,
    ip: string,
    userAgent: string | null,
  ): Promise<void> {
    await this.attemptRepo.save(
      this.attemptRepo.create({
        username,
        ip,
        userAgent,
        success: true,
        reason: null,
      }),
    );
    const client = this.redis.getClient();
    await client.del(this.failKey(ip, username));
    await client.del(this.lockKey(ip, username));
  }
}
