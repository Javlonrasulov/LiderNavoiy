import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../auth/entities/user.entity';
import { UserRole } from '../common/enums';
import { Client } from './entities/client.entity';
import { SetClientCredentialsDto } from './dto/client-credentials.dto';
import { nameToLogin } from './client-login.util';

@Injectable()
export class ClientCredentialsService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Client)
    private readonly clientRepo: Repository<Client>,
  ) {}

  private async resolveClient(clientId: string, user: User): Promise<Client> {
    const client = await this.clientRepo.findOne({ where: { id: clientId } });
    if (!client || client.deletedAt) throw new NotFoundException('Client not found');

    if (user.role === UserRole.DISTRIBUTOR) {
      const distributorId = user.distributorProfile?.id;
      if (!distributorId || client.distributorId !== distributorId) {
        throw new ForbiddenException('Client is not assigned to you');
      }
    }
    return client;
  }

  /** Auto-suggest uchun: band bo'lsa dokon2, dokon3... */
  async resolveUniqueUsername(
    preferred: string,
    excludeClientId?: string,
  ): Promise<string> {
    const base = preferred.trim().toLowerCase().slice(0, 32);
    if (!base) throw new BadRequestException('Username required');
    for (let n = 0; n < 100; n++) {
      const candidate = n === 0 ? base : `${base}${n + 1}`.slice(0, 32);
      const clash = await this.userRepo.findOne({ where: { username: candidate } });
      if (!clash || clash.clientId === excludeClientId) return candidate;
    }
    return `${base}${Date.now().toString(36).slice(-4)}`.slice(0, 32);
  }

  /** Foydalanuvchi tanlagan login — band bo'lsa xato (auto-rename yo'q) */
  async assertUsernameAvailable(username: string, excludeClientId?: string) {
    const normalized = username.trim().toLowerCase();
    if (normalized.length < 3) {
      throw new BadRequestException('Login kamida 3 ta belgi bo‘lishi kerak');
    }
    const clash = await this.userRepo.findOne({
      where: { username: normalized },
      relations: ['client'],
    });
    if (clash && clash.clientId !== excludeClientId) {
      const otherName = clash.client?.name ?? clash.fullName ?? clash.username;
      throw new ConflictException(
        `Bu login band — «${otherName}» mijozida allaqachon bor (${clash.username})`,
      );
    }
    return { available: true as const, username: normalized };
  }

  async checkUsername(username: string, excludeClientId?: string) {
    const normalized = username.trim().toLowerCase();
    if (normalized.length < 3) {
      return { available: false as const, username: normalized, reason: 'too_short' };
    }
    const clash = await this.userRepo.findOne({
      where: { username: normalized },
      relations: ['client'],
    });
    if (clash && clash.clientId !== excludeClientId) {
      return {
        available: false as const,
        username: normalized,
        reason: 'taken' as const,
        takenBy: {
          userId: clash.id,
          clientId: clash.clientId,
          clientName: clash.client?.name ?? clash.fullName,
          clientCode: clash.client?.code ?? null,
        },
      };
    }
    return { available: true as const, username: normalized };
  }

  async getCredentials(clientId: string, user: User) {
    const client = await this.resolveClient(clientId, user);
    const account = await this.userRepo.findOne({
      where: { clientId, role: UserRole.CLIENT },
    });
    if (!account) {
      const base = nameToLogin(client.name, client.code);
      const suggestedUsername = await this.resolveUniqueUsername(base, clientId);
      return { hasCredentials: false as const, suggestedUsername };
    }
    return {
      hasCredentials: true as const,
      userId: account.id,
      username: account.username,
      clientId,
      isActive: account.isActive,
    };
  }

  async ensureDefaultCredentials(clientId: string, user: User) {
    const existing = await this.getCredentials(clientId, user);
    if (existing.hasCredentials) return existing;
    const client = await this.resolveClient(clientId, user);
    const username = await this.resolveUniqueUsername(
      nameToLogin(client.name, client.code),
      clientId,
    );
    // Login/parol yaratiladi, lekin ilovaga kirish default o'chirilgan —
    // ruxsatni admin yoki manager alohida yoqadi
    return this.setCredentials(
      clientId,
      { username, password: '123456', isActive: false },
      user,
    );
  }

  async setCredentials(clientId: string, dto: SetClientCredentialsDto, user: User) {
    const client = await this.resolveClient(clientId, user);
    const username = dto.username.trim().toLowerCase();
    if (username.length < 3) {
      throw new BadRequestException('Login kamida 3 ta belgi bo‘lishi kerak');
    }
    // Aniq tanlangan login — boshqa mijozda bo'lsa ogohlantirish
    await this.assertUsernameAvailable(username, clientId);

    let account = await this.userRepo.findOne({
      where: { clientId, role: UserRole.CLIENT },
    });
    if (!account && (!dto.password || dto.password.length < 6)) {
      throw new BadRequestException('Yangi login uchun parol kamida 6 ta belgi bo‘lishi kerak');
    }
    if (dto.password !== undefined && dto.password.length < 6) {
      throw new BadRequestException('Parol kamida 6 ta belgi bo‘lishi kerak');
    }

    // Mavjud hisobda parol berilmasa eski hash o'zgarishsiz qoladi.
    const passwordHash = dto.password
      ? await bcrypt.hash(dto.password, 12)
      : account!.passwordHash;

    // isActive berilmasa — mavjud holat saqlanadi (login/parol yangilash ban ni bekor qilmasin),
    // yangi hisob esa default o'chirilgan holda yaratiladi
    const active =
      dto.isActive !== undefined ? dto.isActive : account ? account.isActive : false;

    let created = false;
    if (account) {
      account.username = username;
      account.passwordHash = passwordHash;
      account.isActive = active;
    } else {
      account = this.userRepo.create({
        username,
        passwordHash,
        fullName: client.fullName ?? client.name,
        role: UserRole.CLIENT,
        clientId,
        isActive: active,
      });
      created = true;
    }

    try {
      const saved = await this.userRepo.save(account);
      return {
        userId: saved.id,
        username: saved.username,
        clientId,
        created,
        isActive: saved.isActive,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.toLowerCase().includes('unique') || msg.includes('duplicate')) {
        throw new ConflictException(
          `Bu login band — boshqa mijozda allaqachon bor (${username})`,
        );
      }
      throw err;
    }
  }

  /** Mijoz APK ga kirish ruxsatini yoqish / o‘chirish (login o‘chirilmaydi) */
  async setLoginActive(clientId: string, isActive: boolean, user: User) {
    await this.resolveClient(clientId, user);
    let account = await this.userRepo.findOne({
      where: { clientId, role: UserRole.CLIENT },
    });
    if (!account) {
      if (!isActive) {
        return { hasCredentials: false as const, isActive: false };
      }
      // Login yo'q edi — standart login/parol yaratiladi va darhol yoqiladi
      await this.ensureDefaultCredentials(clientId, user);
      account = await this.userRepo.findOne({
        where: { clientId, role: UserRole.CLIENT },
      });
      if (!account) {
        throw new NotFoundException('Client app login topilmadi');
      }
    }
    account.isActive = isActive;
    const saved = await this.userRepo.save(account);
    return {
      hasCredentials: true as const,
      userId: saved.id,
      username: saved.username,
      clientId,
      isActive: saved.isActive,
    };
  }
}
