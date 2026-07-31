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

    // companies.warehouseName (sklad nomi) — seed bo'lmasa ham
    try {
      await this.dataSource.query(`
        ALTER TABLE companies
        ADD COLUMN IF NOT EXISTS "warehouseName" varchar NULL
      `);
    } catch (err) {
      this.logger.warn(`companies.warehouseName migrate: ${(err as Error).message}`);
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

    // products.imageData — Render disk ephemeral: rasm DB da
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
          "isOfflineCreated", "isUrgent", "createdAt", "updatedAt")
         VALUES (uuid_generate_v4(), $1, $2, $3, $4, $5,
                 'on_way', 'agent', $6, 0, 0, 'unpaid', $7::jsonb,
                 false, false, now(), now())`,
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
