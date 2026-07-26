import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';
import { UserLoginDevice } from './entities/user-login-device.entity';
import { DistributorProfile } from '../distributors/entities/distributor-profile.entity';
import { ChangePasswordDto, LoginDto, AuthResponseDto, LoginDeviceDto } from './dto/auth.dto';
import { UserRole } from '../common/enums';

export interface JwtPayload {
  sub: string;
  username: string;
  role: UserRole;
  distributorId?: string;
  clientId?: string;
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
  ) {}

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const username = dto.username.trim().toLowerCase();
    const user = await this.userRepo.findOne({
      where: { username, isActive: true },
      relations: ['distributorProfile', 'client'],
    });

    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid credentials');
    }

    user.lastLoginAt = new Date();
    this.applyDeviceInfo(user, dto.device);
    await this.userRepo.save(user);
    await this.upsertLoginDevice(user.id, dto.device);

    return this.buildAuthResponse(user);
  }

  async refresh(refreshToken: string, device?: LoginDeviceDto): Promise<AuthResponseDto> {
    try {
      const payload = this.jwtService.verify<JwtPayload>(refreshToken, {
        secret: this.config.get('JWT_REFRESH_SECRET'),
      });
      const user = await this.userRepo.findOne({
        where: { id: payload.sub, isActive: true },
        relations: ['distributorProfile', 'client'],
      });
      if (!user) throw new UnauthorizedException();
      user.lastLoginAt = new Date();
      this.applyDeviceInfo(user, device);
      await this.userRepo.save(user);
      await this.upsertLoginDevice(user.id, device);
      return this.buildAuthResponse(user);
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async validateUser(payload: JwtPayload): Promise<User | null> {
    return this.userRepo.findOne({
      where: { id: payload.sub, isActive: true },
      relations: ['distributorProfile', 'client'],
    });
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
    const brand = device.brand?.trim();
    const model = device.model?.trim();
    const os = device.os?.trim();
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
      if (device.brand?.trim()) row.brand = device.brand.trim().slice(0, 80);
      if (device.model?.trim()) row.model = device.model.trim().slice(0, 120);
      if (device.os?.trim()) row.os = device.os.trim().slice(0, 60);
    } else {
      row = this.deviceRepo.create({
        userId,
        deviceKey,
        brand: device.brand?.trim()?.slice(0, 80) || null,
        model: device.model?.trim()?.slice(0, 120) || null,
        os: device.os?.trim()?.slice(0, 60) || null,
        lastLoginAt: now,
      });
    }
    await this.deviceRepo.save(row);
  }

  private async buildAuthResponse(user: User): Promise<AuthResponseDto> {
    const profile = user.distributorProfile
      ?? await this.profileRepo.findOne({ where: { userId: user.id } });
    const payload: JwtPayload = {
      sub: user.id,
      username: user.username,
      role: user.role,
      distributorId: profile?.id,
      clientId: user.clientId ?? undefined,
    };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, {
      secret: this.config.get('JWT_REFRESH_SECRET'),
      expiresIn: this.config.get('JWT_REFRESH_EXPIRES_IN', '7d'),
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: 900,
      user: {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        role: user.role,
        position: user.position,
        permissions: user.permissions,
        distributorId: profile?.id,
        companyName: profile?.companyName ?? undefined,
        clientId: user.clientId ?? undefined,
        clientName: user.client?.name ?? undefined,
      },
    };
  }
}
