import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../auth/entities/user.entity';
import { UserLoginDevice } from '../auth/entities/user-login-device.entity';
import { AuthService } from '../auth/auth.service';
import { DistributorProfile } from '../distributors/entities/distributor-profile.entity';
import { In } from 'typeorm';
import { DistributorStatus, UserRole } from '../common/enums';
import { RedisService } from '../common/redis/redis.service';
import {
  AppUserResponseDto,
  CreateAppUserDto,
  UpdateAppUserDto,
} from './dto/app-user.dto';
import {
  CreateSystemUserDto,
  SystemUserResponseDto,
  UpdateSystemUserDto,
} from './dto/system-user.dto';

const PROTECTED_USERNAMES = ['admin'];

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(DistributorProfile)
    private readonly profileRepo: Repository<DistributorProfile>,
    @InjectRepository(UserLoginDevice)
    private readonly deviceRepo: Repository<UserLoginDevice>,
    private readonly authService: AuthService,
    private readonly redis: RedisService,
  ) {}

  async create(dto: CreateAppUserDto): Promise<AppUserResponseDto> {
    const username = dto.username.trim();
    const existing = await this.userRepo.findOne({ where: { username } });
    if (existing) {
      if (!existing.isActive) {
        return this.update(existing.id, {
          username,
          password: dto.password,
          fullName: dto.fullName,
          role: dto.role,
          isActive: dto.isActive ?? true,
          companyName: dto.companyName,
          phone: dto.phone,
          position: dto.position,
        });
      }
      throw new ConflictException('Username already exists');
    }

    const user = this.userRepo.create({
      username: dto.username.trim(),
      passwordHash: await this.authService.hashPassword(dto.password),
      fullName: dto.fullName.trim(),
      role: dto.role ?? UserRole.DISTRIBUTOR,
      isActive: dto.isActive ?? true,
    });
    const saved = await this.userRepo.save(user);
    await this.upsertDistributorProfile(saved, {
      companyId: dto.companyId,
      companyName: dto.companyName,
      phone: dto.phone,
      position: dto.position,
    });

    return this.toDto(await this.findAppUserOrFail(saved.id));
  }

  async update(id: string, dto: UpdateAppUserDto): Promise<AppUserResponseDto> {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    if (dto.username && dto.username.trim() !== user.username) {
      await this.ensureUsernameAvailable(dto.username.trim(), id);
      user.username = dto.username.trim();
    }

    if (dto.fullName?.trim()) user.fullName = dto.fullName.trim();
    if (dto.role) user.role = dto.role;
    if (dto.isActive !== undefined) user.isActive = dto.isActive;
    if (dto.password?.trim()) {
      user.passwordHash = await this.authService.hashPassword(dto.password);
    }

    const saved = await this.userRepo.save(user);
    await this.upsertDistributorProfile(saved, {
      companyName: dto.companyName,
      phone: dto.phone,
      position: dto.position,
    });

    return this.toDto(await this.findAppUserOrFail(saved.id));
  }

  private async upsertDistributorProfile(
    user: User,
    data: {
      companyId?: string;
      companyName?: string;
      phone?: string;
      position?: string;
    },
  ): Promise<void> {
    if (user.role !== UserRole.DISTRIBUTOR && user.role !== UserRole.MANAGER) {
      return;
    }

    const hasProfileData =
      data.companyName !== undefined ||
      data.phone !== undefined ||
      data.position !== undefined ||
      user.role === UserRole.DISTRIBUTOR;

    if (!hasProfileData) return;

    let profile = await this.profileRepo.findOne({ where: { userId: user.id } });
    if (!profile) {
      profile = this.profileRepo.create({
        userId: user.id,
        companyId: data.companyId ?? 'boran',
        companyName: data.companyName ?? null,
        phone: data.phone?.trim() || null,
        position: data.position?.trim() || null,
        status: DistributorStatus.OFFLINE,
        isOnline: false,
      });
    } else {
      if (data.companyName !== undefined) profile.companyName = data.companyName;
      if (data.phone !== undefined) profile.phone = data.phone.trim() || null;
      if (data.position !== undefined) profile.position = data.position.trim() || null;
    }

    await this.profileRepo.save(profile);
  }

  async findAllApp(): Promise<AppUserResponseDto[]> {
    const users = await this.userRepo.find({
      where: {
        role: In([UserRole.DISTRIBUTOR, UserRole.MANAGER]),
        isActive: true,
      },
      relations: ['distributorProfile'],
      order: { createdAt: 'DESC' },
    });
    const onlineIds = await this.getOnlineDistributorIds();
    const devices = users.length
      ? await this.deviceRepo.find({
          where: { userId: In(users.map((u) => u.id)) },
          order: { lastLoginAt: 'DESC' },
        })
      : [];
    const byUser = new Map<string, UserLoginDevice[]>();
    for (const d of devices) {
      const list = byUser.get(d.userId) ?? [];
      list.push(d);
      byUser.set(d.userId, list);
    }
    return users.map((u) => this.toDto(u, onlineIds, byUser.get(u.id) ?? []));
  }

  async findByUsername(username: string): Promise<AppUserResponseDto | null> {
    const user = await this.userRepo.findOne({ where: { username: username.trim() } });
    return user ? this.toDto(user) : null;
  }

  async deactivate(id: string): Promise<void> {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    user.isActive = false;
    await this.userRepo.save(user);
  }

  /* ─── Admin panel (system) users ─── */

  async findAllSystem(): Promise<SystemUserResponseDto[]> {
    const users = await this.userRepo.find({
      where: { role: In([UserRole.ADMIN, UserRole.MANAGER]) },
      order: { createdAt: 'DESC' },
    });
    return users.map((u) => this.toSystemDto(u));
  }

  async createSystem(dto: CreateSystemUserDto): Promise<SystemUserResponseDto> {
    const username = dto.username.trim();
    const existing = await this.userRepo.findOne({ where: { username } });
    if (existing) {
      if (!existing.isActive && this.isSystemRole(existing.role)) {
        return this.updateSystem(existing.id, {
          username,
          password: dto.password,
          fullName: dto.fullName,
          position: dto.position,
          role: dto.role,
          permissions: dto.permissions,
          isActive: dto.isActive ?? true,
        });
      }
      throw new ConflictException('Username already exists');
    }

    const role = dto.role ?? UserRole.MANAGER;
    const user = this.userRepo.create({
      username,
      passwordHash: await this.authService.hashPassword(dto.password),
      fullName: dto.fullName.trim(),
      role,
      position: dto.position?.trim() || null,
      permissions: this.normalizePermissions(role, dto.permissions),
      isActive: dto.isActive ?? true,
    });
    const saved = await this.userRepo.save(user);
    return this.toSystemDto(saved);
  }

  async updateSystem(id: string, dto: UpdateSystemUserDto): Promise<SystemUserResponseDto> {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    if (!this.isSystemRole(user.role)) {
      throw new NotFoundException('User not found');
    }

    if (dto.username && dto.username.trim() !== user.username) {
      await this.ensureUsernameAvailable(dto.username.trim(), id);
      user.username = dto.username.trim();
    }
    if (dto.fullName?.trim()) user.fullName = dto.fullName.trim();
    if (dto.position !== undefined) user.position = dto.position.trim() || null;
    if (dto.role) user.role = dto.role;
    if (dto.permissions !== undefined) {
      user.permissions = this.normalizePermissions(user.role, dto.permissions);
    }
    if (dto.isActive !== undefined) user.isActive = dto.isActive;
    if (dto.password?.trim()) {
      user.passwordHash = await this.authService.hashPassword(dto.password);
    }

    const saved = await this.userRepo.save(user);
    return this.toSystemDto(saved);
  }

  async deactivateSystem(id: string): Promise<void> {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    if (this.isProtectedSystemUser(user)) {
      throw new ConflictException('Bu foydalanuvchini o\'chirib bo\'lmaydi');
    }
    user.isActive = false;
    await this.userRepo.save(user);
  }

  private isSystemRole(role: UserRole): boolean {
    return role === UserRole.ADMIN || role === UserRole.MANAGER;
  }

  private isProtectedSystemUser(user: User): boolean {
    return PROTECTED_USERNAMES.includes(user.username.toLowerCase());
  }

  private normalizePermissions(role: UserRole, permissions?: string[] | null): string[] | null {
    if (role === UserRole.ADMIN) return null;
    return permissions ?? [];
  }

  private toSystemDto(user: User): SystemUserResponseDto {
    return {
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      role: user.role,
      position: user.position,
      permissions: user.permissions ?? [],
      isActive: user.isActive,
      lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
      isProtected: this.isProtectedSystemUser(user),
    };
  }

  private async ensureUsernameAvailable(username: string, excludeId?: string) {
    const existing = await this.userRepo.findOne({ where: { username } });
    if (existing && existing.id !== excludeId) {
      throw new ConflictException('Username already exists');
    }
  }

  private async getOnlineDistributorIds(): Promise<Set<string>> {
    try {
      const keys = await this.redis.getClient().keys('online:*');
      return new Set(keys.map((k) => k.replace('online:', '')));
    } catch {
      return new Set();
    }
  }

  private async findAppUserOrFail(id: string): Promise<User> {
    const user = await this.userRepo.findOne({
      where: { id },
      relations: ['distributorProfile'],
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  private toDto(
    user: User,
    onlineIds: Set<string> = new Set(),
    devices: UserLoginDevice[] = [],
  ): AppUserResponseDto {
    const profile = user.distributorProfile;
    const distributorId = profile?.id;
    const isOnline = !!(
      (distributorId && onlineIds.has(distributorId)) ||
      (profile?.lastLocationAt &&
        Date.now() - new Date(profile.lastLocationAt).getTime() <= 90_000)
    );

    let lastActiveAt: Date | null = user.lastLoginAt ?? null;
    if (profile?.lastLocationAt) {
      if (!lastActiveAt || profile.lastLocationAt > lastActiveAt) {
        lastActiveAt = profile.lastLocationAt;
      }
    }

    let deviceRows = devices.map((d) => ({
      brand: d.brand,
      model: d.model,
      os: d.os,
      lastLoginAt: d.lastLoginAt.toISOString(),
    }));

    // Legacy single-device fields (before multi-device table)
    if (
      deviceRows.length === 0 &&
      (user.lastDeviceBrand || user.lastDeviceModel || user.lastDeviceOs)
    ) {
      deviceRows = [{
        brand: user.lastDeviceBrand,
        model: user.lastDeviceModel,
        os: user.lastDeviceOs,
        lastLoginAt: (user.lastLoginAt ?? new Date()).toISOString(),
      }];
    }

    return {
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      role: user.role,
      position: profile?.position ?? null,
      isActive: user.isActive,
      lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
      lastActiveAt: lastActiveAt?.toISOString() ?? null,
      isOnline,
      lastDeviceBrand: user.lastDeviceBrand ?? null,
      lastDeviceModel: user.lastDeviceModel ?? null,
      lastDeviceOs: user.lastDeviceOs ?? null,
      devices: deviceRows,
    };
  }
}
