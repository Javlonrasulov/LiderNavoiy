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

  async getCredentials(clientId: string, user: User) {
    await this.resolveClient(clientId, user);
    const account = await this.userRepo.findOne({
      where: { clientId, role: UserRole.CLIENT },
    });
    if (!account) {
      return { hasCredentials: false as const };
    }
    return {
      hasCredentials: true as const,
      userId: account.id,
      username: account.username,
      clientId,
      isActive: account.isActive,
    };
  }

  nameToLogin(name: string, codeFallback?: string): string {
    const cyr: Record<string, string> = {
      а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'yo', ж: 'zh', з: 'z',
      и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r',
      с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'shch',
      ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
      ғ: 'g', қ: 'q', ҳ: 'h', ў: 'o',
    };
    let raw = name.trim().replace(/o[''`ʼ]/gi, 'o').replace(/g[''`ʼ]/gi, 'g');
    let latin = '';
    for (const ch of raw) latin += cyr[ch.toLowerCase()] ?? ch;
    let login = latin.toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 32);
    if (login.length < 3 && codeFallback) {
      login = `${login}${codeFallback.replace(/\D/g, '')}`.slice(0, 32);
    }
    if (login.length < 3) login = `mijoz${Date.now().toString(36).slice(-5)}`;
    return login;
  }

  async ensureDefaultCredentials(clientId: string, user: User) {
    const existing = await this.getCredentials(clientId, user);
    if (existing.hasCredentials) return existing;
    const client = await this.resolveClient(clientId, user);
    return this.setCredentials(
      clientId,
      {
        username: this.nameToLogin(client.name, client.code),
        password: '123456',
      },
      user,
    );
  }

  async setCredentials(clientId: string, dto: SetClientCredentialsDto, user: User) {
    const client = await this.resolveClient(clientId, user);

    const username = dto.username.trim().toLowerCase();
    const clash = await this.userRepo.findOne({ where: { username } });
    if (clash && clash.clientId !== clientId) {
      throw new ConflictException('Username already taken');
    }

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
