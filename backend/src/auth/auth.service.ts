import {
  Injectable,
  UnauthorizedException,
  Logger,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { User } from './entities/user.entity';
import { UserLoginDevice } from './entities/user-login-device.entity';
import { DistributorProfile } from '../distributors/entities/distributor-profile.entity';
import { ChangePasswordDto, LoginDto, AuthResponseDto, LoginDeviceDto } from './dto/auth.dto';
import { UserRole } from '../common/enums';
import { isDeliveryPosition } from '../common/staff-role.util';
import { SessionStoreService } from './session-store.service';
import { LoginSecurityService } from './login-security.service';

export interface JwtPayload {
  sub: string;
  username: string;
  role: UserRole;
  distributorId?: string;
  clientId?: string;
  /** Session id — access + refresh */
  sid: string;
  /** Refresh token id (refresh tokens only) */
  jti?: string;
  typ?: 'access' | 'refresh';
}

export interface AuthRequestMeta {
  ip: string;
  userAgent: string | null;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(UserLoginDevice)
    private readonly deviceRepo: Repository<UserLoginDevice>,
    @InjectRepository(DistributorProfile)
    private readonly profileRepo: Repository<DistributorProfile>,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly sessions: SessionStoreService,
    private readonly loginSecurity: LoginSecurityService,
  ) {}

  accessExpiresInSeconds(): number {
    const raw = this.config.get<string>('JWT_EXPIRES_IN', '4h');
    const m = /^(\d+)([smhd])$/i.exec(raw.trim());
    if (!m) return 900;
    const n = Number(m[1]);
    const u = m[2].toLowerCase();
    if (u === 's') return n;
    if (u === 'm') return n * 60;
    if (u === 'h') return n * 3600;
    return n * 24 * 3600;
  }

  refreshMaxAgeMs(): number {
    const raw = this.config.get<string>('JWT_REFRESH_EXPIRES_IN', '7d');
    const m = /^(\d+)([smhd])$/i.exec(raw.trim());
    if (!m) return 7 * 24 * 3600 * 1000;
    const n = Number(m[1]);
    const u = m[2].toLowerCase();
    let sec = n * 24 * 3600;
    if (u === 's') sec = n;
    else if (u === 'm') sec = n * 60;
    else if (u === 'h') sec = n * 3600;
    return sec * 1000;
  }

  async login(
    dto: LoginDto,
    meta: AuthRequestMeta,
  ): Promise<AuthResponseDto> {
    const username = dto.username.trim().toLowerCase();
    await this.loginSecurity.assertNotLocked(meta.ip, username);

    const user = await this.userRepo.findOne({
      where: { username, isActive: true },
      relations: ['distributorProfile', 'client'],
    });

    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      await this.loginSecurity.recordFailure(username, meta.ip, meta.userAgent);
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.client?.deletedAt) {
      await this.loginSecurity.recordFailure(username, meta.ip, meta.userAgent);
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.loginSecurity.recordSuccess(username, meta.ip, meta.userAgent);

    // Agent / Manager: bir nechta qurilmadan kirish mumkin.
    // Faqat shu qurilmadagi eski sessiyani yangilab yopamiz.
    if (user.role === UserRole.DISTRIBUTOR || user.role === UserRole.MANAGER) {
      const deviceKey = this.deviceKeyOf(dto.device);
      if (deviceKey) {
        const sessions = await this.sessions.listUserSessions(user.id);
        for (const s of sessions) {
          if (s.deviceKey === deviceKey) {
            await this.sessions.revokeSession(user.id, s.sessionId);
          }
        }
      }
    }

    user.lastLoginAt = new Date();
    this.applyDeviceInfo(user, dto.device);
    await this.userRepo.save(user);
    await this.upsertLoginDevice(user.id, dto.device);

    return this.issueTokens(user, dto.device, meta);
  }

  async refresh(
    refreshToken: string | undefined,
    device: LoginDeviceDto | undefined,
    meta: AuthRequestMeta,
  ): Promise<AuthResponseDto> {
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token required');
    }

    let payload: JwtPayload;
    try {
      payload = this.jwtService.verify<JwtPayload>(refreshToken, {
        secret: this.config.get('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (payload.typ && payload.typ !== 'refresh') {
      throw new UnauthorizedException('Invalid refresh token');
    }
    if (!payload.sid || !payload.jti) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const session = await this.sessions.getSession(payload.sid);
    if (!session || session.userId !== payload.sub || session.refreshJti !== payload.jti) {
      throw new UnauthorizedException('Session revoked or refresh reused');
    }

    const user = await this.userRepo.findOne({
      where: { id: payload.sub, isActive: true },
      relations: ['distributorProfile', 'client'],
    });
    if (!user) throw new UnauthorizedException();

    const newJti = uuidv4();
    const rotated = await this.sessions.rotateRefreshJti(payload.sid, payload.jti, newJti);
    if (!rotated) {
      throw new UnauthorizedException('Session revoked or refresh reused');
    }

    user.lastLoginAt = new Date();
    this.applyDeviceInfo(user, device);
    await this.userRepo.save(user);
    await this.upsertLoginDevice(user.id, device);

    return this.buildAuthResponse(user, payload.sid, newJti);
  }

  async logout(
    userId: string | undefined,
    sessionId: string | undefined,
    all = false,
  ): Promise<void> {
    if (!userId) return;
    if (all) {
      await this.sessions.revokeAllSessions(userId);
      return;
    }
    if (sessionId) {
      await this.sessions.revokeSession(userId, sessionId);
    }
  }

  async listSessions(userId: string, currentSid?: string) {
    const sessions = await this.sessions.listUserSessions(userId);
    return sessions.map((s) => ({
      id: s.sessionId,
      name: s.deviceName ?? null,
      brand: s.brand,
      model: s.model,
      os: s.os,
      ip: s.ip,
      userAgent: s.userAgent,
      createdAt: s.createdAt,
      lastSeenAt: s.lastSeenAt,
      current: currentSid ? s.sessionId === currentSid : false,
    }));
  }

  async revokeSession(userId: string, sessionId: string): Promise<void> {
    const ok = await this.sessions.revokeSession(userId, sessionId);
    if (!ok) throw new ForbiddenException('Session not found');
  }

  async validateUser(payload: JwtPayload): Promise<User | null> {
    if (!payload.sid) return null;
    const session = await this.sessions.getSession(payload.sid);
    if (!session || session.userId !== payload.sub) return null;
    await this.sessions.touchSession(payload.sid);
    return this.userRepo.findOne({
      where: { id: payload.sub, isActive: true },
      relations: ['distributorProfile', 'client'],
    });
  }

  decodeToken(token: string): { sub?: string; sid?: string } | null {
    try {
      return this.jwtService.decode(token) as { sub?: string; sid?: string } | null;
    } catch {
      return null;
    }
  }

  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12);
  }

  async changePassword(userId: string, dto: ChangePasswordDto): Promise<void> {
    const user = await this.userRepo.findOne({ where: { id: userId, isActive: true } });
    if (!user || !(await bcrypt.compare(dto.currentPassword, user.passwordHash))) {
      throw new UnauthorizedException('Invalid current password');
    }
    user.passwordHash = await this.hashPassword(dto.newPassword);
    await this.userRepo.save(user);
    await this.sessions.revokeAllSessions(userId);
  }

  private deviceKeyOf(device?: LoginDeviceDto): string | null {
    if (!device) return null;
    const id = device.id?.trim();
    if (id) return id.slice(0, 160);
    const brand = (device.brand || '').trim().toLowerCase();
    const model = (device.model || '').trim().toLowerCase();
    const os = (device.os || '').trim().toLowerCase();
    const key = [brand, model, os].filter(Boolean).join('|');
    return key ? key.slice(0, 160) : null;
  }

  private applyDeviceInfo(user: User, device?: LoginDeviceDto) {
    if (!device) return;
    const name = device.name?.trim();
    const brand = device.brand?.trim();
    const model = device.model?.trim();
    const os = device.os?.trim();
    if (name) user.lastDeviceName = name.slice(0, 120);
    if (brand) user.lastDeviceBrand = brand.slice(0, 80);
    if (model) user.lastDeviceModel = model.slice(0, 120);
    if (os) user.lastDeviceOs = os.slice(0, 60);
  }

  private async upsertLoginDevice(userId: string, device?: LoginDeviceDto) {
    const deviceKey = this.deviceKeyOf(device);
    if (!deviceKey || !device) return;

    const now = new Date();
    let row = await this.deviceRepo.findOne({ where: { userId, deviceKey } });
    if (row) {
      row.lastLoginAt = now;
      // Eski ilova versiyalari soxta "Lider Manager" yorlig'ini yuborgan —
      // yangi login kelganda qurilma ma'lumotini to'liq almashtiramiz.
      row.name = device.name?.trim()?.slice(0, 120) || null;
      if (device.brand?.trim()) row.brand = device.brand.trim().slice(0, 80);
      if (device.model?.trim()) row.model = device.model.trim().slice(0, 120);
      if (device.os?.trim()) row.os = device.os.trim().slice(0, 60);
    } else {
      row = this.deviceRepo.create({
        userId,
        deviceKey,
        name: device.name?.trim()?.slice(0, 120) || null,
        brand: device.brand?.trim()?.slice(0, 80) || null,
        model: device.model?.trim()?.slice(0, 120) || null,
        os: device.os?.trim()?.slice(0, 60) || null,
        lastLoginAt: now,
      });
    }
    await this.deviceRepo.save(row);
  }

  private async issueTokens(
    user: User,
    device: LoginDeviceDto | undefined,
    meta: AuthRequestMeta,
  ): Promise<AuthResponseDto> {
    const refreshJti = uuidv4();
    const session = await this.sessions.createSession({
      userId: user.id,
      refreshJti,
      deviceKey: this.deviceKeyOf(device),
      deviceName: device?.name?.trim()?.slice(0, 120) || null,
      brand: device?.brand?.trim()?.slice(0, 80) || null,
      model: device?.model?.trim()?.slice(0, 120) || null,
      os: device?.os?.trim()?.slice(0, 60) || null,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });
    return this.buildAuthResponse(user, session.sessionId, refreshJti);
  }

  private async buildAuthResponse(
    user: User,
    sessionId: string,
    refreshJti: string,
  ): Promise<AuthResponseDto> {
    const profile = user.distributorProfile
      ?? await this.profileRepo.findOne({ where: { userId: user.id } });
    const base: Omit<JwtPayload, 'jti' | 'typ'> = {
      sub: user.id,
      username: user.username,
      role: user.role,
      distributorId: profile?.id,
      clientId: user.clientId ?? undefined,
      sid: sessionId,
    };

    const accessToken = this.jwtService.sign(
      { ...base, typ: 'access' as const },
      { expiresIn: this.config.get('JWT_EXPIRES_IN', '4h') },
    );
    const refreshToken = this.jwtService.sign(
      { ...base, jti: refreshJti, typ: 'refresh' as const },
      {
        secret: this.config.get('JWT_REFRESH_SECRET'),
        expiresIn: this.config.get('JWT_REFRESH_EXPIRES_IN', '7d'),
      },
    );

    const effectivePosition =
      profile?.position?.trim() || user.position?.trim() || null;

    const companyIds = [
      ...new Set(
        [
          ...(Array.isArray(profile?.companyIds) ? profile.companyIds : []),
          profile?.companyId,
        ]
          .map((id) => id?.trim())
          .filter((id): id is string => !!id),
      ),
    ];
    const primaryCompanyId = companyIds[0] ?? profile?.companyId ?? undefined;
    // Per-user Ilova toggle (default false). Company-level flag is separate admin setting.
    const agentsCanAddClients = !!profile?.canAddClients;

    return {
      accessToken,
      refreshToken,
      expiresIn: this.accessExpiresInSeconds(),
      user: {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        role: user.role,
        position: effectivePosition,
        isDelivery:
          user.role === UserRole.DISTRIBUTOR
            ? isDeliveryPosition(effectivePosition)
            : false,
        permissions: user.permissions,
        distributorId: profile?.id,
        companyId: primaryCompanyId,
        companyIds: companyIds.length ? companyIds : undefined,
        companyName: profile?.companyName ?? undefined,
        agentsCanAddClients,
        clientId: user.clientId ?? undefined,
        clientName: user.client?.name ?? undefined,
      },
    };
  }
}
