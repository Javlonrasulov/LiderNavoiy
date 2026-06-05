import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../auth/entities/user.entity';
import { AuthService } from '../auth/auth.service';
import { DistributorProfile } from '../distributors/entities/distributor-profile.entity';
import { In } from 'typeorm';
import { DistributorStatus, UserRole } from '../common/enums';
import {
  AppUserResponseDto,
  CreateAppUserDto,
  UpdateAppUserDto,
} from './dto/app-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(DistributorProfile)
    private readonly profileRepo: Repository<DistributorProfile>,
    private readonly authService: AuthService,
  ) {}

  async create(dto: CreateAppUserDto): Promise<AppUserResponseDto> {
    await this.ensureUsernameAvailable(dto.username);

    const user = this.userRepo.create({
      username: dto.username.trim(),
      passwordHash: await this.authService.hashPassword(dto.password),
      fullName: dto.fullName.trim(),
      role: dto.role ?? UserRole.DISTRIBUTOR,
      isActive: dto.isActive ?? true,
    });
    const saved = await this.userRepo.save(user);

    if (saved.role === UserRole.DISTRIBUTOR) {
      const existingProfile = await this.profileRepo.findOne({ where: { userId: saved.id } });
      if (!existingProfile) {
        await this.profileRepo.save(
          this.profileRepo.create({
            userId: saved.id,
            companyId: dto.companyId ?? 'boran',
            companyName: dto.companyName ?? null,
            status: DistributorStatus.OFFLINE,
            isOnline: false,
          }),
        );
      }
    }

    return this.toDto(saved);
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

    if (dto.companyName) {
      const profile = await this.profileRepo.findOne({ where: { userId: saved.id } });
      if (profile) {
        profile.companyName = dto.companyName;
        await this.profileRepo.save(profile);
      }
    }

    return this.toDto(saved);
  }

  async findAllApp(): Promise<AppUserResponseDto[]> {
    const users = await this.userRepo.find({
      where: { role: In([UserRole.DISTRIBUTOR, UserRole.MANAGER]) },
      order: { createdAt: 'DESC' },
    });
    return users.map((u) => this.toDto(u));
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

  private async ensureUsernameAvailable(username: string, excludeId?: string) {
    const existing = await this.userRepo.findOne({ where: { username } });
    if (existing && existing.id !== excludeId) {
      throw new ConflictException('Username already exists');
    }
  }

  private toDto(user: User): AppUserResponseDto {
    return {
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      role: user.role,
      isActive: user.isActive,
    };
  }
}
