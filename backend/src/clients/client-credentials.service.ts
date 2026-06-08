import {
  BadRequestException,
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
    if (!client) throw new NotFoundException('Client not found');

    if (user.role === UserRole.DISTRIBUTOR) {
      const distributorId = user.distributorProfile?.id;
      if (!distributorId || client.distributorId !== distributorId) {
        throw new ForbiddenException('Client is not assigned to you');
      }
    }
    return client;
  }

  private async resolveUniqueUsername(
    preferred: string,
    excludeClientId?: string,
  ): Promise<string> {
    const base = preferred.trim().toLowerCase().slice(0, 32);
    for (let n = 0; n < 100; n++) {
      const candidate = n === 0 ? base : `${base}${n + 1}`.slice(0, 32);
      const clash = await this.userRepo.findOne({ where: { username: candidate } });
      if (!clash || clash.clientId === excludeClientId) return candidate;
    }
    return `${base}${Date.now().toString(36).slice(-4)}`.slice(0, 32);
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
    return this.setCredentials(
      clientId,
      { username, password: '123456' },
      user,
    );
  }

  async setCredentials(clientId: string, dto: SetClientCredentialsDto, user: User) {
    const client = await this.resolveClient(clientId, user);

    const username = await this.resolveUniqueUsername(
      dto.username.trim().toLowerCase(),
      clientId,
    );

    const passwordHash = await bcrypt.hash(dto.password, 12);

    let account = await this.userRepo.findOne({
      where: { clientId, role: UserRole.CLIENT },
    });

    let created = false;
    if (account) {
      account.username = username;
      account.passwordHash = passwordHash;
      account.isActive = true;
    } else {
      if (!username) throw new BadRequestException('Username required');
      account = this.userRepo.create({
        username,
        passwordHash,
        fullName: client.fullName ?? client.name,
        role: UserRole.CLIENT,
        clientId,
        isActive: true,
      });
      created = true;
    }

    const saved = await this.userRepo.save(account);
    return {
      userId: saved.id,
      username: saved.username,
      clientId,
      created,
    };
  }
}
