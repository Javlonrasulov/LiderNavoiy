/**
 * Full database seed — run: npx ts-node scripts/seed.ts
 */
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../src/auth/entities/user.entity';
import { DistributorProfile } from '../src/distributors/entities/distributor-profile.entity';
import { Client } from '../src/clients/entities/client.entity';
import { Product } from '../src/products/entities/product.entity';
import { SalesLine } from '../src/lines/entities/sales-line.entity';
import { Company } from '../src/companies/entities/company.entity';
import { UserRole, DistributorStatus } from '../src/common/enums';

const COMPANIES = [
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

const LINES = [
  { code: '01', name: 'Toshrabot - Xazora - Air', agentName: 'Alisher Karimov', companyId: 'boran' },
  { code: '02', name: 'Navoiy Shimol', agentName: 'Bobur Toshmatov', companyId: 'boran' },
];

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
  { code: '10645', name: 'Масло Сливочное "PILLER" 82.5% 500 гр', category: 'PILLER', brand: 'PILLER', price: 28500, unit: 'dona', stock: 45 },
  { code: '10646', name: 'Масло Сливочное растительное "PILLER" 82.5%', category: 'PILLER', brand: 'PILLER', price: 26900, unit: 'dona', stock: 32 },
];

// Eski demo mahsulotlar — admin orqali boshqariladi, seed qayta yoqmasin
const DEPRECATED_PRODUCT_CODES = [
  'SHRDL0477',
  'SHRPK0443',
  'SHRDL0458',
  'TIMSS0201',
  'TIMVK0145',
  'SIRT0088',
];

async function seed() {
  const ds = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 5432),
    username: process.env.DB_USERNAME || 'crm_user',
    password: process.env.DB_PASSWORD || 'crm_password',
    database: process.env.DB_DATABASE || 'distributor_crm',
    entities: [User, DistributorProfile, Client, Product, SalesLine, Company],
    synchronize: true,
  });

  await ds.initialize();
  console.log('Connected to database');

  const userRepo = ds.getRepository(User);
  const profileRepo = ds.getRepository(DistributorProfile);
  const clientRepo = ds.getRepository(Client);
  const productRepo = ds.getRepository(Product);
  const lineRepo = ds.getRepository(SalesLine);

  const lineRepo = ds.getRepository(SalesLine);
  const companyRepo = ds.getRepository(Company);

  for (const c of COMPANIES) {
    const exists = await companyRepo.findOne({ where: { id: c.id } });
    if (!exists) {
      await companyRepo.save(companyRepo.create({ ...c, isActive: true }));
    } else {
      exists.name = c.name;
      exists.shortName = c.shortName;
      exists.icon = c.icon;
      exists.color = c.color;
      exists.description = c.description;
      exists.isActive = true;
      await companyRepo.save(exists);
    }
  }

  // Admin user
  let admin = await userRepo.findOne({ where: { username: 'admin' } });
  if (!admin) {
    admin = userRepo.create({
      username: 'admin',
      passwordHash: await bcrypt.hash('admin123', 12),
      fullName: 'Super Admin',
      role: UserRole.ADMIN,
      position: 'Admin',
      permissions: null,
      isActive: true,
    });
    await userRepo.save(admin);
  } else if (!admin.position) {
    admin.position = 'Admin';
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

  for (const line of LINES) {
    const exists = await lineRepo.findOne({
      where: { code: line.code, companyId: line.companyId },
    });
    if (!exists) {
      await lineRepo.save(lineRepo.create({
        code: line.code,
        name: line.name,
        agentName: line.agentName,
        companyId: line.companyId,
        isActive: true,
      }));
    }
  }

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

  // Products — faqat yangi mahsulotlarni yaratadi; admin o'chirganini qayta yoqmaydi
  for (const p of PRODUCTS) {
    const existing = await productRepo.findOne({ where: { code: p.code } });
    if (existing) {
      existing.name = p.name;
      existing.category = p.category;
      existing.brand = p.brand;
      existing.price = p.price;
      existing.unit = p.unit;
      existing.stockBalance = p.stock;
      await productRepo.save(existing);
    } else {
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

  for (const code of DEPRECATED_PRODUCT_CODES) {
    const deprecated = await productRepo.findOne({ where: { code } });
    if (deprecated?.isActive) {
      deprecated.isActive = false;
      await productRepo.save(deprecated);
    }
  }

  const clientCount = await clientRepo.count();
  const productCount = await productRepo.count();
  const lineCount = await lineRepo.count();

  // Demo client app login (first client)
  const demoClient = await clientRepo.findOne({ where: { code: '29072' } });
  if (demoClient) {
    let clientUser = await userRepo.findOne({ where: { username: 'client29072' } });
    if (!clientUser) {
      clientUser = userRepo.create({
        username: 'client29072',
        passwordHash: await bcrypt.hash('client123456', 12),
        fullName: demoClient.fullName ?? demoClient.name,
        role: UserRole.CLIENT,
        clientId: demoClient.id,
        isActive: true,
      });
      await userRepo.save(clientUser);
    }
  }

  console.log(`Seed complete:`);
  console.log(`  admin / admin123`);
  console.log(`  agent001 / agent123`);
  console.log(`  client29072 / client123456  (client app demo)`);
  console.log(`  ${lineCount} lines, ${clientCount} clients, ${productCount} products, ${COMPANIES.length} companies`);
  await ds.destroy();
}

seed().catch((e) => { console.error(e); process.exit(1); });
