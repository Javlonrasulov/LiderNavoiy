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

    // Eski postgres enum -> varchar (on_way / packing uchun)
    try {
      await this.dataSource.query(`
        DO $$ BEGIN
          IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'orders' AND column_name = 'status'
              AND udt_name LIKE '%enum%'
          ) THEN
            ALTER TABLE orders ALTER COLUMN status TYPE varchar USING status::text;
          END IF;
        END $$;
      `);
    } catch (err) {
      this.logger.warn(`orders.status migrate: ${(err as Error).message}`);
    }

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
          position: 'Agent',
          status: DistributorStatus.OFFLINE,
          isOnline: false,
        }),
      );
      this.logger.log('Boot seed: agent profil yaratildi');
    }

    const courierUser = await this.ensureUser({
      username: 'dostavkachi',
      passwordHash,
      fullName: 'Irgashev Azizxon Ilxomovich',
      role: UserRole.DISTRIBUTOR,
      position: 'Dostavkachi',
      permissions: null,
    });

    let courierProfile = await this.profiles.findOne({ where: { userId: courierUser.id } });
    if (!courierProfile) {
      courierProfile = await this.profiles.save(
        this.profiles.create({
          userId: courierUser.id,
          companyId: 'boran',
          companyName: 'Boran Leaders+',
          lineCode: 'D-01',
          phone: '+998907654321',
          position: 'Dostavkachi',
          status: DistributorStatus.ON_ROUTE,
          isOnline: true,
          lastLatitude: 40.1035,
          lastLongitude: 65.3792,
          lastLocationAt: new Date(),
        }),
      );
      this.logger.log('Boot seed: dostavkachi #1 yaratildi');
    } else {
      courierProfile.position = 'Dostavkachi';
      courierProfile.phone = courierProfile.phone || '+998907654321';
      courierProfile.lineCode = courierProfile.lineCode || 'D-01';
      // Emulator (AQSh) GPS saqlanib qolgan bo‘lsa — Navoiyga qaytaramiz
      if (
        courierProfile.lastLatitude == null ||
        courierProfile.lastLongitude == null ||
        !this.isUzCoord(courierProfile.lastLatitude, courierProfile.lastLongitude)
      ) {
        courierProfile.lastLatitude = 40.1035;
        courierProfile.lastLongitude = 65.3792;
        courierProfile.lastLocationAt = new Date();
      }
      await this.profiles.save(courierProfile);
      courierUser.fullName = 'Irgashev Azizxon Ilxomovich';
      courierUser.position = 'Dostavkachi';
      await this.users.save(courierUser);
    }

    const courierUser2 = await this.ensureUser({
      username: 'dostavkachi2',
      passwordHash,
      fullName: 'Buronov Feruz Baxromovich',
      role: UserRole.DISTRIBUTOR,
      position: 'Dostavkachi',
      permissions: null,
    });

    let courierProfile2 = await this.profiles.findOne({ where: { userId: courierUser2.id } });
    if (!courierProfile2) {
      courierProfile2 = await this.profiles.save(
        this.profiles.create({
          userId: courierUser2.id,
          companyId: 'boran',
          companyName: 'Boran Leaders+',
          lineCode: 'D-02',
          phone: '+998901112233',
          position: 'Dostavkachi',
          status: DistributorStatus.OFFLINE,
          isOnline: false,
          lastLatitude: 40.1150,
          lastLongitude: 65.3700,
          lastLocationAt: new Date(),
        }),
      );
      this.logger.log('Boot seed: dostavkachi #2 yaratildi');
    } else {
      courierProfile2.position = 'Dostavkachi';
      courierProfile2.phone = courierProfile2.phone || '+998901112233';
      courierProfile2.lineCode = courierProfile2.lineCode || 'D-02';
      if (
        courierProfile2.lastLatitude == null ||
        courierProfile2.lastLongitude == null ||
        !this.isUzCoord(courierProfile2.lastLatitude, courierProfile2.lastLongitude)
      ) {
        courierProfile2.lastLatitude = 40.1150;
        courierProfile2.lastLongitude = 65.3700;
        courierProfile2.lastLocationAt = new Date();
      }
      await this.profiles.save(courierProfile2);
      courierUser2.fullName = 'Buronov Feruz Baxromovich';
      courierUser2.position = 'Dostavkachi';
      await this.users.save(courierUser2);
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
    } else {
      let dirty = false;
      if (!demoClient.distributorId) {
        demoClient.distributorId = profile.id;
        dirty = true;
      }
      if (
        demoClient.latitude == null ||
        demoClient.longitude == null ||
        !this.isUzCoord(demoClient.latitude, demoClient.longitude)
      ) {
        demoClient.latitude = 40.0921;
        demoClient.longitude = 65.3612;
        dirty = true;
      }
      if (dirty) await this.clients.save(demoClient);
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

    this.logger.log('Boot seed: admin/agent/dostavkachi/dostavkachi2/mijoz — parol 123456');
  }

  private isUzCoord(lat: number, lng: number): boolean {
    return lat >= 37.0 && lat <= 45.8 && lng >= 55.0 && lng <= 73.5;
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
