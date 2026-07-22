import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../auth/entities/user.entity';
import { Company } from '../companies/entities/company.entity';
import { Client } from '../clients/entities/client.entity';
import { DistributorProfile } from '../distributors/entities/distributor-profile.entity';
import { UserRole, DistributorStatus } from './enums';

const DEMO_PASSWORD = '123456';

/**
 * Render / production: SEED_ON_BOOT=true bo'lsa admin, agent, mijoz va demo klient yaratadi.
 */
@Injectable()
export class BootSeedService implements OnModuleInit {
  private readonly logger = new Logger(BootSeedService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly dataSource: DataSource,
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Company) private readonly companies: Repository<Company>,
    @InjectRepository(Client) private readonly clients: Repository<Client>,
    @InjectRepository(DistributorProfile)
    private readonly profiles: Repository<DistributorProfile>,
  ) {}

  async onModuleInit() {
    for (const ext of ['"uuid-ossp"', 'postgis']) {
      try {
        await this.dataSource.query(`CREATE EXTENSION IF NOT EXISTS ${ext}`);
      } catch (err) {
        this.logger.warn(`Extension ${ext} skipped: ${(err as Error).message}`);
      }
    }

    if (this.config.get('SEED_ON_BOOT') !== 'true') return;

    const companies = [
      {
        id: 'boran',
        name: 'Boran Leaders+ Darveshi Navoiy',
        shortName: 'Boran Leaders+',
        icon: '🏢',
        color: 'from-red-600 to-rose-700',
        description: 'Savdo va distribyutsiya',
      },
      {
        id: 'zarafshon',
        name: 'Зарафшон Шерин',
        shortName: 'Зарафшон',
        icon: '🌿',
        color: 'from-blue-500 to-cyan-600',
        description: 'Oziq-ovqat mahsulotlari',
      },
    ];

    for (const c of companies) {
      const exists = await this.companies.findOne({ where: { id: c.id } });
      if (!exists) {
        await this.companies.save(this.companies.create({ ...c, isActive: true }));
      }
    }

    const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);

    await this.ensureUser({
      username: 'admin',
      passwordHash,
      fullName: 'Super Admin',
      role: UserRole.ADMIN,
      position: 'Admin',
      permissions: null,
    });

    const agent = await this.ensureUser({
      username: 'agent',
      passwordHash,
      fullName: 'Demo Agent',
      role: UserRole.DISTRIBUTOR,
      position: 'Agent',
      permissions: null,
    });

    let profile = await this.profiles.findOne({ where: { userId: agent.id } });
    if (!profile) {
      profile = await this.profiles.save(
        this.profiles.create({
          userId: agent.id,
          companyId: 'boran',
          companyName: 'Boran Leaders+',
          lineCode: '01',
          phone: '+998901234567',
          status: DistributorStatus.OFFLINE,
          isOnline: false,
        }),
      );
      this.logger.log('Boot seed: agent profil yaratildi');
    }

    let demoClient = await this.clients.findOne({ where: { code: '29072' } });
    if (!demoClient) {
      demoClient = await this.clients.save(
        this.clients.create({
          code: '29072',
          name: 'Demo Mijoz',
          fullName: 'Demo Mijoz',
          address: 'Navoiy',
          balance: 0,
          latitude: 40.0921,
          longitude: 65.3612,
          companyId: 'boran',
          lineCode: '01',
          category: 'Standard',
          distributorId: profile.id,
          isActive: true,
        }),
      );
      this.logger.log('Boot seed: demo klient yaratildi');
    } else if (!demoClient.distributorId) {
      demoClient.distributorId = profile.id;
      await this.clients.save(demoClient);
    }

    await this.ensureUser({
      username: 'mijoz',
      passwordHash,
      fullName: demoClient.fullName ?? demoClient.name,
      role: UserRole.CLIENT,
      position: null,
      permissions: null,
      clientId: demoClient.id,
    });

    this.logger.log('Boot seed: admin/agent/mijoz — parol 123456');
  }

  private async ensureUser(data: {
    username: string;
    passwordHash: string;
    fullName: string;
    role: UserRole;
    position: string | null;
    permissions: string[] | null;
    clientId?: string;
  }): Promise<User> {
    let user = await this.users.findOne({ where: { username: data.username } });
    if (!user) {
      user = this.users.create({
        username: data.username,
        passwordHash: data.passwordHash,
        fullName: data.fullName,
        role: data.role,
        position: data.position,
        permissions: data.permissions,
        clientId: data.clientId ?? null,
        isActive: true,
      });
      await this.users.save(user);
      this.logger.log(`Boot seed: ${data.username} yaratildi`);
      return user;
    }

    user.passwordHash = data.passwordHash;
    user.isActive = true;
    user.role = data.role;
    if (data.clientId) user.clientId = data.clientId;
    if (data.position !== undefined) user.position = data.position;
    await this.users.save(user);
    return user;
  }
}
