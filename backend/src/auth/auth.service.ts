import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';
import { DistributorProfile } from '../distributors/entities/distributor-profile.entity';
import { ChangePasswordDto, LoginDto, AuthResponseDto } from './dto/auth.dto';
import { UserRole } from '../common/enums';

export interface JwtPayload {
  sub: string;
  username: string;
  role: UserRole;
  distributorId?: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(DistributorProfile)
    private readonly profileRepo: Repository<DistributorProfile>,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.userRepo.findOne({
      where: { username: dto.username, isActive: true },
      relations: ['distributorProfile'],
    });

    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid credentials');
    }

    user.lastLoginAt = new Date();
    await this.userRepo.save(user);

    return this.buildAuthResponse(user);
  }

  async refresh(refreshToken: string): Promise<AuthResponseDto> {
    try {
      const payload = this.jwtService.verify<JwtPayload>(refreshToken, {
        secret: this.config.get('JWT_REFRESH_SECRET'),
      });
      const user = await this.userRepo.findOne({
        where: { id: payload.sub, isActive: true },
        relations: ['distributorProfile'],
      });
      if (!user) throw new UnauthorizedException();
      user.lastLoginAt = new Date();
      await this.userRepo.save(user);
      return this.buildAuthResponse(user);
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async validateUser(payload: JwtPayload): Promise<User | null> {
    return this.userRepo.findOne({
      where: { id: payload.sub, isActive: true },
      relations: ['distributorProfile'],
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

  private async buildAuthResponse(user: User): Promise<AuthResponseDto> {
    const profile = user.distributorProfile
      ?? await this.profileRepo.findOne({ where: { userId: user.id } });
    const payload: JwtPayload = {
      sub: user.id,
      username: user.username,
      role: user.role,
      distributorId: profile?.id,
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
        distributorId: profile?.id,
        companyName: profile?.companyName ?? undefined,
      },
    };
  }
}
