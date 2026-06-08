import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
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

  async setCredentials(clientId: string, dto: SetClientCredentialsDto, user: User) {
    const client = await this.resolveClient(clientId, user);

    const username = dto.username.trim();
    const clash = await this.userRepo.findOne({
      where: { username, clientId: Not(clientId) },
    });
    if (clash) {
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
