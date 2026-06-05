/**
 * Full database seed — run: npx ts-node scripts/seed.ts
 */
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../src/auth/entities/user.entity';
import { DistributorProfile } from '../src/distributors/entities/distributor-profile.entity';
import { Client } from '../src/clients/entities/client.entity';
import { Product } from '../src/products/entities/product.entity';
import { UserRole, DistributorStatus } from '../src/common/enums';

const CLIENTS = [
  { code: '29072', name: 'XOLMURODOVA SABRINA MIRO', address: 'Magistral pizza aeroportda', balance: -862.96, lat: 40.0921, lng: 65.3612 },
  { code: '29047', name: "YANGI ASR 777' OK", address: 'Magistral pizza aeroportda', balance: -343.12, lat: 40.0876, lng: 65.3745 },
  { code: '29043', name: 'AZIZOVA VAZIRA MEHRIDDINOVA', address: '01 - Toshshirob', balance: -471489.12, lat: 40.1012, lng: 65.3521 },
  { code: '29022', name: 'GO ZAL TONG NURAPSONI', address: '01 - Toshshirob', balance: 0, lat: 40.0955, lng: 65.3688 },
  { code: '29019', name: 'SHAROPOV SHAROF YATT', address: '01 - Toshshirob', balance: -720.89, lat: 40.0889, lng: 65.3412 },
  { code: '29012', name: 'Muhammadiev Norir', address: 'Mehr markazi', balance: 191748.74, lat: 40.1102, lng: 65.3555 },
  { code: '29011', name: 'QIZILTEPA ULGURJI CHAKANA', address: 'Operator markaz', balance: 0, lat: 40.0788, lng: 65.3821 },
  { code: '29008', name: 'ABUXAMIDOVA SHAXZODABONU', address: 'Elektrokimyo ugli', balance: -799997.9, lat: 40.1033, lng: 65.3299 },
];

const PRODUCTS = [
  { code: 'SHRDL0477', name: 'Delektес Govyajiy v setka v/u 1,3', category: 'SHERIN', brand: 'SHERIN', price: 139000, unit: 'kg', stock: 37.69 },
  { code: 'SHRDL0458', name: 'Rulet Iz Yazyka s kopcheniem 0,9', category: 'SHERIN', brand: 'SHERIN', price: 189900, unit: 'kg', stock: 26.39 },
  { code: 'SHRPK0443', name: 'p/k Salami setka Sherin 1,4', category: 'SHERIN', brand: 'SHERIN', price: 97400, unit: 'kg', stock: 45.16 },
  { code: 'TIMSS0201', name: 'Sosiska Molochnaya TIM 0,5', category: 'TIM', brand: 'TIM', price: 48600, unit: 'kg', stock: 74.5 },
  { code: 'TIMVK0145', name: 'Varyonaya Kolbasa TIM Lyubitel 1,0', category: 'TIM', brand: 'TIM', price: 69800, unit: 'kg', stock: 55.3 },
  { code: 'SIRT0088', name: 'Syr Tvyordyy Rossiyskiy 1 kg', category: 'SIR', brand: 'SIR', price: 95000, unit: 'kg', stock: 48.2 },
];

async function seed() {
  const ds = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 5432),
    username: process.env.DB_USERNAME || 'crm_user',
    password: process.env.DB_PASSWORD || 'crm_password',
    database: process.env.DB_DATABASE || 'distributor_crm',
    entities: [User, DistributorProfile, Client, Product],
    synchronize: true,
  });

  await ds.initialize();
  console.log('Connected to database');

  const userRepo = ds.getRepository(User);
  const profileRepo = ds.getRepository(DistributorProfile);
  const clientRepo = ds.getRepository(Client);
  const productRepo = ds.getRepository(Product);

  // Admin user
  let admin = await userRepo.findOne({ where: { username: 'admin' } });
  if (!admin) {
    admin = userRepo.create({
      username: 'admin',
      passwordHash: await bcrypt.hash('admin123', 12),
      fullName: 'Super Admin',
      role: UserRole.ADMIN,
      isActive: true,
    });
    await userRepo.save(admin);
  }

  // Agent user + profile
  let agent = await userRepo.findOne({ where: { username: 'agent001' }, relations: ['distributorProfile'] });
  if (!agent) {
    agent = userRepo.create({
      username: 'agent001',
      passwordHash: await bcrypt.hash('agent123', 12),
      fullName: 'Абдужакимов Диёрбек',
      role: UserRole.DISTRIBUTOR,
      isActive: true,
    });
    agent = await userRepo.save(agent);

    const profile = profileRepo.create({
      userId: agent.id,
      companyId: 'boran',
      companyName: 'OOO "BORAN LEADERS"',
      lineCode: '01',
      phone: '+998901234567',
      status: DistributorStatus.OFFLINE,
      isOnline: false,
    });
    await profileRepo.save(profile);
  }

  const agentProfile = await profileRepo.findOne({
    where: { userId: agent.id },
  });

  // Clients — agent001 ga biriktirilgan
  for (const c of CLIENTS) {
    const exists = await clientRepo.findOne({ where: { code: c.code } });
    if (!exists) {
      await clientRepo.save(clientRepo.create({
        code: c.code,
        name: c.name,
        address: c.address,
        balance: c.balance,
        latitude: c.lat,
        longitude: c.lng,
        companyId: 'boran',
        lineCode: '01',
        category: 'Standard',
        distributorId: agentProfile?.id ?? null,
        isActive: true,
      }));
    } else if (agentProfile?.id && !exists.distributorId) {
      exists.distributorId = agentProfile.id;
      await clientRepo.save(exists);
    }
  }

  // Products
  for (const p of PRODUCTS) {
    const exists = await productRepo.findOne({ where: { code: p.code } });
    if (!exists) {
      await productRepo.save(productRepo.create({
        code: p.code,
        name: p.name,
        category: p.category,
        brand: p.brand,
        price: p.price,
        unit: p.unit,
        stockBalance: p.stock,
        isActive: true,
      }));
    }
  }

  const clientCount = await clientRepo.count();
  const productCount = await productRepo.count();
  console.log(`Seed complete:`);
  console.log(`  admin / admin123`);
  console.log(`  agent001 / agent123`);
  console.log(`  ${clientCount} clients, ${productCount} products`);
  await ds.destroy();
}

seed().catch((e) => { console.error(e); process.exit(1); });
