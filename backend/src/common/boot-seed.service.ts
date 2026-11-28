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
 * Production: SEED_ON_BOOT=true bo'lsa admin, agent, mijoz va demo klient yaratadi.
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

    // companies.warehouseName (sklad nomi) — seed bo'lmasa ham
    try {
      await this.dataSource.query(`
        ALTER TABLE companies
        ADD COLUMN IF NOT EXISTS "warehouseName" varchar NULL
      `);
    } catch (err) {
      this.logger.warn(`companies.warehouseName migrate: ${(err as Error).message}`);
    }

    // Tashkilot rekvizitlari maydonlari
    try {
      await this.dataSource.query(`
        ALTER TABLE companies
          ADD COLUMN IF NOT EXISTS "orgCode" varchar(32) NULL,
          ADD COLUMN IF NOT EXISTS "fullLegalName" varchar(500) NULL,
          ADD COLUMN IF NOT EXISTS "legalAddress" varchar(500) NULL,
          ADD COLUMN IF NOT EXISTS "phone" varchar(64) NULL,
          ADD COLUMN IF NOT EXISTS "callCenterPhone" varchar(64) NULL,
          ADD COLUMN IF NOT EXISTS "inn" varchar(32) NULL,
          ADD COLUMN IF NOT EXISTS "vatCode" varchar(64) NULL,
          ADD COLUMN IF NOT EXISTS "rekvizitNote" text NULL,
          ADD COLUMN IF NOT EXISTS "cashCashboxName" varchar(200) NULL,
          ADD COLUMN IF NOT EXISTS "clickCashboxName" varchar(200) NULL,
          ADD COLUMN IF NOT EXISTS "primaryBankAccountId" uuid NULL
      `);
    } catch (err) {
      this.logger.warn(`companies.rekvizit migrate: ${(err as Error).message}`);
    }

    try {
      await this.dataSource.query(`
        CREATE TABLE IF NOT EXISTS company_bank_accounts (
          id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
          "companyId" varchar(64) NOT NULL,
          code varchar(32) NULL,
          name varchar(200) NOT NULL,
          "accountNumber" varchar(32) NOT NULL,
          "bankName" varchar(200) NULL,
          mfo varchar(16) NULL,
          "isPrimary" boolean NOT NULL DEFAULT false,
          "isActive" boolean NOT NULL DEFAULT true,
          "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
          "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
        );
        CREATE INDEX IF NOT EXISTS idx_company_bank_accounts_company
          ON company_bank_accounts ("companyId");
      `);
    } catch (err) {
      this.logger.warn(`company_bank_accounts migrate: ${(err as Error).message}`);
    }

    try {
      await this.dataSource.query(`
        CREATE TABLE IF NOT EXISTS company_social_links (
          id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
          "companyId" varchar(64) NOT NULL,
          name varchar(120) NOT NULL,
          url varchar(500) NOT NULL,
          "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
          "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
        );
        CREATE INDEX IF NOT EXISTS idx_company_social_links_company
          ON company_social_links ("companyId");
      `);
    } catch (err) {
      this.logger.warn(`company_social_links migrate: ${(err as Error).message}`);
    }

    try {
      await this.dataSource.query(`
        ALTER TABLE payment_terminals
          ADD COLUMN IF NOT EXISTS "externalId" varchar(64) NULL,
          ADD COLUMN IF NOT EXISTS "account23510" varchar(32) NULL,
          ADD COLUMN IF NOT EXISTS "bankAccountId" uuid NULL
      `);
    } catch (err) {
      this.logger.warn(`payment_terminals.rekvizit migrate: ${(err as Error).message}`);
    }

    try {
      await this.dataSource.query(`
        CREATE TABLE IF NOT EXISTS login_attempts (
          id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
          username varchar(120) NOT NULL,
          ip varchar(64) NULL,
          "userAgent" varchar(512) NULL,
          success boolean NOT NULL DEFAULT false,
          reason varchar(80) NULL,
          "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
        );
        CREATE INDEX IF NOT EXISTS idx_login_attempts_username ON login_attempts (username);
        CREATE INDEX IF NOT EXISTS idx_login_attempts_ip ON login_attempts (ip);
      `);
    } catch (err) {
      this.logger.warn(`login_attempts migrate: ${(err as Error).message}`);
    }

    // products.companyId — katalog tashkilot bo‘yicha; eski qatorlar → boran
    try {
      await this.dataSource.query(`
        ALTER TABLE products
        ADD COLUMN IF NOT EXISTS "companyId" varchar NULL
      `);
      await this.dataSource.query(`
        UPDATE products SET "companyId" = 'boran' WHERE "companyId" IS NULL
      `);
    } catch (err) {
      this.logger.warn(`products.companyId migrate: ${(err as Error).message}`);
    }

    // products.imageData — rasm backup DB da
    try {
      await this.dataSource.query(`
        ALTER TABLE products
        ADD COLUMN IF NOT EXISTS "imageData" text NULL
      `);
    } catch (err) {
      this.logger.warn(`products.imageData migrate: ${(err as Error).message}`);
    }

    try {
      await this.dataSource.query(`
        ALTER TABLE orders
        ADD COLUMN IF NOT EXISTS "companyId" varchar(64) NULL
      `);
    } catch (err) {
      this.logger.warn(`orders.companyId migrate: ${(err as Error).message}`);
    }

    // distributor_profiles.companyIds — multi-org agent (simple-json: ["boran"])
    try {
      await this.dataSource.query(`
        ALTER TABLE distributor_profiles
        ADD COLUMN IF NOT EXISTS "companyIds" text NULL
      `);
      await this.dataSource.query(`
        UPDATE distributor_profiles
        SET "companyIds" = '["' || replace("companyId", '"', '') || '"]'
        WHERE "companyId" IS NOT NULL
          AND "companyId" <> ''
          AND ("companyIds" IS NULL OR "companyIds" = '' OR "companyIds" = 'null')
      `);
    } catch (err) {
      this.logger.warn(`distributor_profiles.companyIds migrate: ${(err as Error).message}`);
    }

    // department / positionId on distributor_profiles
    try {
      await this.dataSource.query(`
        ALTER TABLE distributor_profiles
        ADD COLUMN IF NOT EXISTS department varchar NULL
      `);
      await this.dataSource.query(`
        ALTER TABLE distributor_profiles
        ADD COLUMN IF NOT EXISTS "departmentId" uuid NULL
      `);
      await this.dataSource.query(`
        ALTER TABLE distributor_profiles
        ADD COLUMN IF NOT EXISTS "positionId" uuid NULL
      `);
      await this.dataSource.query(`
        ALTER TABLE distributor_profiles
        ADD COLUMN IF NOT EXISTS "canAddClients" boolean NOT NULL DEFAULT false
      `);
    } catch (err) {
      this.logger.warn(`distributor_profiles department migrate: ${(err as Error).message}`);
    }

    try {
      await this.dataSource.query(`
        ALTER TABLE users
        ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMPTZ NULL
      `);
    } catch (err) {
      this.logger.warn(`users.deletedAt migrate: ${(err as Error).message}`);
    }

    try {
      await this.dataSource.query(`
        ALTER TABLE users
        ADD COLUMN IF NOT EXISTS "companyIds" jsonb NULL,
        ADD COLUMN IF NOT EXISTS "allCompanies" boolean NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS "appAccess" boolean NOT NULL DEFAULT true
      `);
    } catch (err) {
      this.logger.warn(`users company access migrate: ${(err as Error).message}`);
    }

    try {
      await this.dataSource.query(`
        CREATE TABLE IF NOT EXISTS product_brands (
          id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
          name varchar NOT NULL UNIQUE,
          color varchar NOT NULL DEFAULT '#6366f1',
          "imageUrl" text NULL,
          "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
          "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
        )
      `);
    } catch (err) {
      this.logger.warn(`product_brands migrate: ${(err as Error).message}`);
    }

    try {
      await this.dataSource.query(`
        CREATE TABLE IF NOT EXISTS product_audit_events (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          "productId" uuid NOT NULL,
          "actorUserId" uuid NULL,
          "actorName" varchar(160) NOT NULL,
          "actorRole" varchar(32) NOT NULL,
          action varchar(32) NOT NULL,
          summary text NULL,
          changes jsonb NOT NULL DEFAULT '[]'::jsonb,
          meta jsonb NULL,
          "createdAt" timestamptz NOT NULL DEFAULT now()
        )
      `);
      await this.dataSource.query(`
        CREATE INDEX IF NOT EXISTS idx_product_audit_product_created
          ON product_audit_events ("productId", "createdAt" DESC)
      `);
    } catch (err) {
      this.logger.warn(`product_audit_events migrate: ${(err as Error).message}`);
    }

    try {
      await this.dataSource.query(`
        ALTER TABLE distributor_profiles
        ADD COLUMN IF NOT EXISTS "recordVisitAudio" boolean NOT NULL DEFAULT false
      `);
      await this.dataSource.query(`
        CREATE TABLE IF NOT EXISTS visit_recordings (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          "visitId" uuid NOT NULL,
          "distributorId" uuid NOT NULL,
          "companyId" varchar(64) NULL,
          "clientId" uuid NOT NULL,
          "orderId" uuid NULL,
          "startedAt" timestamptz NOT NULL,
          "endedAt" timestamptz NULL,
          "durationSeconds" int NULL,
          status varchar(32) NOT NULL DEFAULT 'recording',
          "uploadStatus" varchar(32) NOT NULL DEFAULT 'none',
          "visitOutcome" varchar(32) NOT NULL DEFAULT 'unknown',
          "clientConsent" boolean NOT NULL DEFAULT false,
          "recordingEnabledAtStart" boolean NOT NULL DEFAULT true,
          "storageKey" varchar(512) NULL,
          "fileSizeBytes" bigint NULL,
          "mimeType" varchar(64) NULL,
          "expiresAt" timestamptz NOT NULL,
          "failureReason" text NULL,
          "createdAt" timestamptz NOT NULL DEFAULT now(),
          "updatedAt" timestamptz NOT NULL DEFAULT now()
        )
      `);
      await this.dataSource.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS idx_visit_recordings_visit
          ON visit_recordings ("visitId")
      `);
      await this.dataSource.query(`
        CREATE INDEX IF NOT EXISTS idx_visit_recordings_distributor_started
          ON visit_recordings ("distributorId", "startedAt" DESC)
      `);
      await this.dataSource.query(`
        CREATE INDEX IF NOT EXISTS idx_visit_recordings_company_started
          ON visit_recordings ("companyId", "startedAt" DESC)
      `);
      await this.dataSource.query(`
        CREATE INDEX IF NOT EXISTS idx_visit_recordings_expires
          ON visit_recordings ("expiresAt")
      `);
      await this.dataSource.query(`
        CREATE INDEX IF NOT EXISTS idx_visit_recordings_client
          ON visit_recordings ("clientId")
      `);
    } catch (err) {
      this.logger.warn(`visit_recordings migrate: ${(err as Error).message}`);
    }

    try {
      await this.dataSource.query(`
        ALTER TABLE orders
          ADD COLUMN IF NOT EXISTS "packageCounts" jsonb NULL,
          ADD COLUMN IF NOT EXISTS "createdByUserId" uuid NULL,
          ADD COLUMN IF NOT EXISTS "createdByName" varchar(160) NULL
      `);
    } catch (err) {
      this.logger.warn(`orders packageCounts migrate: ${(err as Error).message}`);
    }

    try {
      await this.dataSource.query(`
        CREATE TABLE IF NOT EXISTS cash_categories (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          "companyId" varchar(64) NULL,
          "parentId" uuid NULL,
          name varchar(255) NOT NULL,
          kind varchar(16) NOT NULL DEFAULT 'expense',
          "sortOrder" int NOT NULL DEFAULT 0,
          "isActive" boolean NOT NULL DEFAULT true,
          "createdAt" timestamptz NOT NULL DEFAULT now(),
          "updatedAt" timestamptz NOT NULL DEFAULT now()
        )
      `);
      await this.dataSource.query(`
        CREATE INDEX IF NOT EXISTS idx_cash_categories_company ON cash_categories ("companyId")
      `);
      await this.dataSource.query(`
        CREATE INDEX IF NOT EXISTS idx_cash_categories_parent ON cash_categories ("parentId")
      `);
      await this.dataSource.query(`
        CREATE TABLE IF NOT EXISTS cash_movements (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          "companyId" varchar(64) NOT NULL,
          type varchar(16) NOT NULL,
          "categoryId" uuid NULL,
          "categoryPath" varchar(512) NULL,
          amount numeric(18,2) NOT NULL DEFAULT 0,
          method varchar(16) NOT NULL DEFAULT 'cash',
          cashbox varchar(128) NULL,
          counterparty varchar(255) NULL,
          note text NULL,
          "occurredAt" timestamptz NOT NULL,
          "sourceType" varchar(32) NOT NULL DEFAULT 'manual',
          "sourceId" uuid NULL,
          "orderId" uuid NULL,
          "createdByUserId" uuid NULL,
          "createdByName" varchar(160) NULL,
          "isDeleted" boolean NOT NULL DEFAULT false,
          "createdAt" timestamptz NOT NULL DEFAULT now(),
          "updatedAt" timestamptz NOT NULL DEFAULT now()
        )
      `);
      await this.dataSource.query(`
        CREATE INDEX IF NOT EXISTS idx_cash_movements_company_date ON cash_movements ("companyId", "occurredAt")
      `);
      await this.dataSource.query(`
        CREATE INDEX IF NOT EXISTS idx_cash_movements_type ON cash_movements (type)
      `);
      await this.dataSource.query(`
        CREATE INDEX IF NOT EXISTS idx_cash_movements_category ON cash_movements ("categoryId")
      `);
      await this.dataSource.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS idx_cash_movements_source_unique
          ON cash_movements ("sourceType", "sourceId")
          WHERE "sourceId" IS NOT NULL
      `);
      await this.dataSource.query(`
        ALTER TABLE products
        ADD COLUMN IF NOT EXISTS "costPrice" numeric(15,2) NOT NULL DEFAULT 0
      `);
      await this.dataSource.query(`
        ALTER TABLE order_payments
        ADD COLUMN IF NOT EXISTS "paidAt" timestamptz NULL
      `);
    } catch (err) {
      this.logger.warn(`cash_flow migrate: ${(err as Error).message}`);
    }

    // clients.orderRadiusMeters: standart 100 → 50.
    // Eski 100 lar faqat BIR MARTA 50 ga o‘tkaziladi (marker jadvali orqali),
    // keyin ataylab 100 tanlangan radiuslar qayta o‘zgartirilmaydi.
    try {
      await this.dataSource.query(`
        ALTER TABLE clients
        ALTER COLUMN "orderRadiusMeters" SET DEFAULT 50
      `);
      await this.dataSource.query(`
        CREATE TABLE IF NOT EXISTS app_data_migrations (
          key varchar(120) PRIMARY KEY,
          "appliedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `);
      const result: unknown = await this.dataSource.query(`
        WITH marker AS (
          INSERT INTO app_data_migrations (key)
          VALUES ('clients_order_radius_default_50')
          ON CONFLICT (key) DO NOTHING
          RETURNING key
        )
        UPDATE clients
        SET "orderRadiusMeters" = 50
        WHERE "orderRadiusMeters" = 100
          AND EXISTS (SELECT 1 FROM marker)
      `);
      const affected = Array.isArray(result) ? Number(result[1] ?? 0) : 0;
      if (affected > 0) {
        this.logger.log(`clients.orderRadiusMeters: ${affected} ta mijoz 100 → 50 m`);
      }
    } catch (err) {
      this.logger.warn(`clients.orderRadiusMeters default 50 migrate: ${(err as Error).message}`);
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

    // Demo menejer (ilova login) — har restart da parol 123456
    await this.ensureUser({
      username: 'manager',
      passwordHash,
      fullName: 'Demo Manager',
      role: UserRole.MANAGER,
      position: 'Menejer',
      permissions: null,
      resetPassword: true,
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
          status: DistributorStatus.OFFLINE,
          isOnline: false,
          lastLatitude: 40.1035,
          lastLongitude: 65.3792,
          lastLocationAt: null,
        }),
      );
      this.logger.log('Boot seed: dostavkachi #1 yaratildi');
    } else {
      courierProfile.position = 'Dostavkachi';
      courierProfile.phone = courierProfile.phone || '+998907654321';
      courierProfile.lineCode = courierProfile.lineCode || 'D-01';
      // Sticky online: GPS 90s dan eski bo‘lsa tozalaymiz (haqiqiy jonli courier ni buzmaymiz)
      const locAt = courierProfile.lastLocationAt
        ? new Date(courierProfile.lastLocationAt).getTime()
        : 0;
      if (!locAt || Date.now() - locAt > 180_000) {
        courierProfile.isOnline = false;
        if (courierProfile.status === DistributorStatus.ON_ROUTE) {
          courierProfile.status = DistributorStatus.OFFLINE;
        }
      }
      // Emulator (AQSh) GPS saqlanib qolgan bo‘lsa — Navoiyga qaytaramiz
      if (
        courierProfile.lastLatitude == null ||
        courierProfile.lastLongitude == null ||
        !this.isUzCoord(courierProfile.lastLatitude, courierProfile.lastLongitude)
      ) {
        courierProfile.lastLatitude = 40.1035;
        courierProfile.lastLongitude = 65.3792;
        // lastLocationAt yangilanmaydi — aks holda har restart da "online" ko‘rinadi
        if (!courierProfile.lastLocationAt) {
          courierProfile.lastLocationAt = null;
        }
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
          companyId: 'zarafshon',
          companyName: 'Зарафшон Шерин',
          lineCode: 'D-02',
          phone: '+998901112233',
          position: 'Dostavkachi',
          status: DistributorStatus.OFFLINE,
          isOnline: false,
          lastLatitude: 40.1150,
          lastLongitude: 65.3700,
          lastLocationAt: null,
        }),
      );
      this.logger.log('Boot seed: dostavkachi #2 (zarafshon) yaratildi');
    } else {
      courierProfile2.position = 'Dostavkachi';
      courierProfile2.phone = courierProfile2.phone || '+998901112233';
      courierProfile2.lineCode = courierProfile2.lineCode || 'D-02';
      courierProfile2.companyId = 'zarafshon';
      courierProfile2.companyName = courierProfile2.companyName || 'Зарафшон Шерин';
      const locAt2 = courierProfile2.lastLocationAt
        ? new Date(courierProfile2.lastLocationAt).getTime()
        : 0;
      if (!locAt2 || Date.now() - locAt2 > 180_000) {
        courierProfile2.isOnline = false;
      }
      if (
        courierProfile2.lastLatitude == null ||
        courierProfile2.lastLongitude == null ||
        !this.isUzCoord(courierProfile2.lastLatitude, courierProfile2.lastLongitude)
      ) {
        courierProfile2.lastLatitude = 40.1150;
        courierProfile2.lastLongitude = 65.3700;
        if (!courierProfile2.lastLocationAt) {
          courierProfile2.lastLocationAt = null;
        }
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
          phone: '+998901112233',
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
      if (!demoClient.phone) {
        demoClient.phone = '+998901112233';
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

    // Zarafshon dagi bog‘langan klient (bir xil telefon — multi-org)
    // Manzil = bir xil magazin → boran bilan bir xil GPS
    let demoClientZar = await this.clients.findOne({
      where: { code: '29072-Z', companyId: 'zarafshon' },
    });
    const shopLat = demoClient.latitude ?? 40.0921;
    const shopLng = demoClient.longitude ?? 65.3612;
    if (!demoClientZar) {
      demoClientZar = await this.clients.save(
        this.clients.create({
          code: '29072-Z',
          name: 'Demo Mijoz',
          fullName: 'Demo Mijoz',
          phone: demoClient.phone || '+998901112233',
          address: 'Navoiy',
          balance: 0,
          latitude: shopLat,
          longitude: shopLng,
          companyId: 'zarafshon',
          lineCode: '01',
          category: 'Standard',
          distributorId: profile.id,
          isActive: true,
        }),
      );
      this.logger.log('Boot seed: demo klient (zarafshon) yaratildi');
    } else {
      let dirtyZar = false;
      if (!demoClientZar.phone) {
        demoClientZar.phone = demoClient.phone || '+998901112233';
        dirtyZar = true;
      }
      // Har doim bir xil magazin manzili (ikkita org — bitta joy)
      const zarLat = Number(demoClientZar.latitude);
      const zarLng = Number(demoClientZar.longitude);
      if (
        !Number.isFinite(zarLat) ||
        !Number.isFinite(zarLng) ||
        Math.abs(zarLat - Number(shopLat)) > 1e-6 ||
        Math.abs(zarLng - Number(shopLng)) > 1e-6
      ) {
        demoClientZar.latitude = shopLat;
        demoClientZar.longitude = shopLng;
        dirtyZar = true;
      }
      if (dirtyZar) await this.clients.save(demoClientZar);
    }

    const mijozUser = await this.ensureUser({
      username: 'mijoz',
      passwordHash,
      fullName: demoClient.fullName ?? demoClient.name,
      role: UserRole.CLIENT,
      position: null,
      permissions: null,
      clientId: demoClient.id,
    });

    // Membership: boran + zarafshon
    await this.dataSource.query(`
      CREATE TABLE IF NOT EXISTS user_client_memberships (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "clientId" uuid NOT NULL,
        "companyId" varchar(64) NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        UNIQUE ("userId", "companyId")
      )
    `).catch((err: Error) => {
      this.logger.warn(`user_client_memberships create: ${err.message}`);
    });

    for (const link of [
      { clientId: demoClient.id, companyId: 'boran' },
      { clientId: demoClientZar.id, companyId: 'zarafshon' },
    ]) {
      try {
        await this.dataSource.query(
          `
          INSERT INTO user_client_memberships (id, "userId", "clientId", "companyId", "createdAt")
          VALUES (uuid_generate_v4(), $1, $2, $3, now())
          ON CONFLICT ("userId", "companyId")
          DO UPDATE SET "clientId" = EXCLUDED."clientId"
          `,
          [mijozUser.id, link.clientId, link.companyId],
        );
      } catch (err) {
        this.logger.warn(`membership seed: ${(err as Error).message}`);
      }
    }

    // Eski buyurtmalarga companyId backfill
    try {
      await this.dataSource.query(`
        UPDATE orders o
        SET "companyId" = c."companyId"
        FROM clients c
        WHERE o."clientId" = c.id
          AND (o."companyId" IS NULL OR o."companyId" = '')
          AND c."companyId" IS NOT NULL
      `);
    } catch (err) {
      this.logger.warn(`orders companyId backfill: ${(err as Error).message}`);
    }

    // Multi-org xarita testi: Boran + Zarafshon ON_WAY (idempotent)
    await this.ensureDemoOnWayOrder({
      clientId: demoClient.id,
      companyId: 'boran',
      distributorId: profile.id,
      deliveryDistributorId: courierProfile.id,
      deliverySequence: 12,
      totalAmount: 450000,
      productName: 'Demo Boran yetkazish',
    });
    await this.ensureDemoOnWayOrder({
      clientId: demoClientZar.id,
      companyId: 'zarafshon',
      distributorId: profile.id,
      deliveryDistributorId: courierProfile2.id,
      deliverySequence: 5,
      totalAmount: 320000,
      productName: 'Demo Zarafshon yetkazish',
    });

    await this.patchNullOrderItemProductIds();

    // Demo xarita: kuryer GPS yaqinda bo‘lsin (mijoz live fleet)
    for (const [prof, lat, lng] of [
      [courierProfile, 40.1035, 65.3792],
      [courierProfile2, 40.115, 65.37],
    ] as const) {
      try {
        prof.isOnline = true;
        prof.status = DistributorStatus.ON_ROUTE;
        prof.lastLatitude = lat;
        prof.lastLongitude = lng;
        prof.lastLocationAt = new Date();
        await this.profiles.save(prof);
      } catch (err) {
        this.logger.warn(`demo courier GPS: ${(err as Error).message}`);
      }
    }

    this.logger.log('Boot seed: admin/agent/dostavkachi/dostavkachi2/mijoz — parol 123456');
  }

  private async ensureDemoOnWayOrder(opts: {
    clientId: string;
    companyId: string;
    distributorId: string;
    deliveryDistributorId: string;
    deliverySequence: number;
    totalAmount: number;
    productName: string;
  }) {
    const items = JSON.stringify([
      {
        productId: 'demo-seed',
        productCode: 'DEMO',
        productName: opts.productName,
        quantity: 1,
        price: opts.totalAmount,
        unit: 'dona',
      },
    ]);
    try {
      const existing = await this.dataSource.query(
        `SELECT id FROM orders
         WHERE "clientId" = $1 AND "companyId" = $2 AND status = 'on_way'
         LIMIT 1`,
        [opts.clientId, opts.companyId],
      );
      if (existing?.[0]?.id) {
        await this.dataSource.query(
          `UPDATE orders SET
             "deliveryDistributorId" = $2,
             "deliverySequence" = $3,
             "totalAmount" = $4,
             items = $5::jsonb,
             "updatedAt" = now()
           WHERE id = $1`,
          [
            existing[0].id,
            opts.deliveryDistributorId,
            opts.deliverySequence,
            opts.totalAmount,
            items,
          ],
        );
        return;
      }
      await this.dataSource.query(
        `INSERT INTO orders
         (id, "distributorId", "clientId", "companyId", "deliveryDistributorId", "deliverySequence",
          status, source, "totalAmount", "paidAmount", "returnedAmount", "paymentStatus", items,
          "isOfflineCreated", "isUrgent", "loadedAt", "createdAt", "updatedAt")
         VALUES (uuid_generate_v4(), $1, $2, $3, $4, $5,
                 'on_way', 'agent', $6, 0, 0, 'unpaid', $7::jsonb,
                 false, false, now(), now(), now())`,
        [
          opts.distributorId,
          opts.clientId,
          opts.companyId,
          opts.deliveryDistributorId,
          opts.deliverySequence,
          opts.totalAmount,
          items,
        ],
      );
      this.logger.log(`Boot seed: ON_WAY (${opts.companyId}) yaratildi`);
    } catch (err) {
      this.logger.warn(`demo ON_WAY ${opts.companyId}: ${(err as Error).message}`);
    }
  }

  /** Android Gson: items[].productId = null butun buyurtmalar ro‘yxatini yutadi. */
  private async patchNullOrderItemProductIds() {
    try {
      await this.dataSource.query(`
        UPDATE orders
        SET items = (
          SELECT COALESCE(jsonb_agg(
            CASE
              WHEN elem ? 'productId' AND (elem->'productId') = 'null'::jsonb
                THEN jsonb_set(elem, '{productId}', '"demo-seed"'::jsonb)
              WHEN NOT (elem ? 'productId')
                THEN elem || '{"productId":"demo-seed"}'::jsonb
              ELSE elem
            END
          ), '[]'::jsonb)
          FROM jsonb_array_elements(COALESCE(items, '[]'::jsonb)) AS elem
        ),
        "updatedAt" = now()
        WHERE items IS NOT NULL
          AND items::text LIKE '%"productId": null%'
      `);
    } catch (err) {
      this.logger.warn(`patch null productId: ${(err as Error).message}`);
    }
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
    /** Demo hisoblar uchun — parolni qayta yozadi */
    resetPassword?: boolean;
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

    // Mavjud user parolini qayta yozmaslik (xavfsizlik), demo hisoblar bundan mustasno
    user.isActive = true;
    user.role = data.role;
    user.fullName = data.fullName;
    if (data.resetPassword) {
      user.passwordHash = data.passwordHash;
    }
    if (data.clientId) user.clientId = data.clientId;
    if (data.position !== undefined) user.position = data.position;
    await this.users.save(user);
    if (data.resetPassword) {
      this.logger.log(`Boot seed: ${data.username} paroli yangilandi`);
    }
    return user;
  }
}
