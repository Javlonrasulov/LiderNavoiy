const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const sharp = require('sharp');
const { randomUUID } = require('crypto');

const uploadDir = path.join(__dirname, '..', 'uploads', 'products');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

async function makeImageFile(label, bg, accent) {
  const svg = `<svg width="640" height="640" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${bg}"/>
        <stop offset="100%" stop-color="${accent}"/>
      </linearGradient>
    </defs>
    <rect width="640" height="640" fill="url(#g)"/>
    <circle cx="320" cy="220" r="90" fill="rgba(255,255,255,0.18)"/>
    <rect x="80" y="360" width="480" height="160" rx="24" fill="rgba(0,0,0,0.28)"/>
    <text x="320" y="430" text-anchor="middle" font-family="Arial,sans-serif" font-size="34" font-weight="700" fill="#fff">${label}</text>
    <text x="320" y="480" text-anchor="middle" font-family="Arial,sans-serif" font-size="20" fill="rgba(255,255,255,0.85)">Lider Navoiy</text>
  </svg>`;
  const fileName = `${randomUUID()}.jpg`;
  const filePath = path.join(uploadDir, fileName);
  await sharp(Buffer.from(svg)).jpeg({ quality: 82 }).toFile(filePath);
  return `/uploads/products/${fileName}`;
}

const boran = [
  { code: 'BR-KOL-101', name: 'Doktorskaya Sherin 1.0 kg', category: 'Kolbasa', brand: 'SHERIN', price: 78000, unit: 'kg', stock: 45, label: 'Doktorskaya', bg: '#b91c1c', accent: '#7f1d1d' },
  { code: 'BR-KOL-102', name: 'Servelat Andalus 0.8 kg', category: 'Kolbasa', brand: 'ANDALUS', price: 95000, unit: 'kg', stock: 32, label: 'Servelat', bg: '#9f1239', accent: '#4c0519' },
  { code: 'BR-KOL-103', name: 'Sosiska Molochaya TIM 0.5 kg', category: 'Kolbasa', brand: 'TIM', price: 54000, unit: 'kg', stock: 80, label: 'Sosiska', bg: '#c2410c', accent: '#7c2d12' },
  { code: 'BR-KOL-104', name: 'Salami Classic Boran 1.2 kg', category: 'Kolbasa', brand: 'SHERIN', price: 112000, unit: 'kg', stock: 28, label: 'Salami', bg: '#be123c', accent: '#881337' },
  { code: 'BR-KOL-105', name: 'Lyubitelskaya TIM 1.0 kg', category: 'Kolbasa', brand: 'TIM', price: 69800, unit: 'kg', stock: 55, label: 'Lyubitelskaya', bg: '#dc2626', accent: '#991b1b' },
  { code: 'BR-KOL-106', name: 'Karbonad Sherin p/k 0.8 kg', category: 'Kolbasa', brand: 'SHERIN', price: 145000, unit: 'kg', stock: 19, label: 'Karbonad', bg: '#e11d48', accent: '#9f1239' },
  { code: 'BR-KOL-107', name: 'Rulet Iz Yazika Andalus 0.9 kg', category: 'Kolbasa', brand: 'ANDALUS', price: 144900, unit: 'kg', stock: 22, label: 'Rulet', bg: '#f43f5e', accent: '#be123c' },
  { code: 'BR-KOL-108', name: 'Krakovskaya TIM p/k 0.9 kg', category: 'Kolbasa', brand: 'TIM', price: 118500, unit: 'kg', stock: 26, label: 'Krakovskaya', bg: '#ef4444', accent: '#b91c1c' },
];

const zarafshon = [
  { code: 'ZR-SUT-201', name: 'Sut 3.2% Zarafshon 1L', category: 'Sut', brand: 'Zarafshon', price: 14000, unit: 'dona', stock: 120, label: 'Sut 1L', bg: '#0369a1', accent: '#0c4a6e' },
  { code: 'ZR-SUT-202', name: 'Qatiq Zarafshon 0.5L', category: 'Sut', brand: 'Zarafshon', price: 9500, unit: 'dona', stock: 90, label: 'Qatiq', bg: '#0284c7', accent: '#075985' },
  { code: 'ZR-SUT-203', name: 'Smetana 20% Zarafshon 400g', category: 'Sut', brand: 'Zarafshon', price: 18500, unit: 'dona', stock: 70, label: 'Smetana', bg: '#0ea5e9', accent: '#0369a1' },
  { code: 'ZR-SUT-204', name: 'Tvorog 5% Zarafshon 400g', category: 'Sut', brand: 'Zarafshon', price: 22000, unit: 'dona', stock: 55, label: 'Tvorog', bg: '#38bdf8', accent: '#0284c7' },
  { code: 'ZR-SUT-205', name: 'Maslo Slivochnoe 82.5% 200g', category: 'Sut', brand: 'PILLER', price: 28500, unit: 'dona', stock: 64, label: 'Maslo', bg: '#fbbf24', accent: '#b45309' },
  { code: 'ZR-SUT-206', name: 'Sir Rossiyskiy Zarafshon 1kg', category: 'Sut', brand: 'SIR', price: 95000, unit: 'kg', stock: 40, label: 'Sir', bg: '#f59e0b', accent: '#92400e' },
  { code: 'ZR-SUT-207', name: 'Kefir 2.5% Zarafshon 1L', category: 'Sut', brand: 'Zarafshon', price: 12500, unit: 'dona', stock: 85, label: 'Kefir', bg: '#67e8f9', accent: '#0e7490' },
  { code: 'ZR-SUT-208', name: 'Ryajenka Zarafshon 0.5L', category: 'Sut', brand: 'Zarafshon', price: 11000, unit: 'dona', stock: 60, label: 'Ryajenka', bg: '#a5f3fc', accent: '#155e75' },
];

async function upsertCategory(db, name, color, emoji) {
  const existing = await db.query(
    'SELECT id FROM product_categories WHERE LOWER(name) = LOWER($1) LIMIT 1',
    [name],
  );
  if (existing.rows.length) {
    console.log('Category exists:', name);
    return;
  }
  await db.query(
    `INSERT INTO product_categories (id, name, color, emoji, "imageUrl", "createdAt", "updatedAt")
     VALUES ($1, $2, $3, $4, NULL, NOW(), NOW())`,
    [randomUUID(), name, color, emoji],
  );
  console.log('Category created:', name);
}

async function upsertProduct(db, companyId, p) {
  const imageUrl = await makeImageFile(p.label, p.bg, p.accent);
  const found = await db.query(
    `SELECT id FROM products
     WHERE code = $1 AND ("companyId" = $2 OR ("companyId" IS NULL AND $2 IS NULL))
     LIMIT 1`,
    [p.code, companyId],
  );

  if (found.rows.length) {
    await db.query(
      `UPDATE products SET
         name = $2, category = $3, brand = $4, price = $5, unit = $6,
         "stockBalance" = $7, "imageUrl" = $8, "isActive" = true, "updatedAt" = NOW()
       WHERE id = $1`,
      [found.rows[0].id, p.name, p.category, p.brand, p.price, p.unit, p.stock, imageUrl],
    );
    console.log('UPDATED', companyId, p.code, p.name, imageUrl);
    return;
  }

  await db.query(
    `INSERT INTO products
      (id, "companyId", code, name, category, brand, price, unit, "stockBalance", "imageUrl", "isActive", "createdAt", "updatedAt")
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,true,NOW(),NOW())`,
    [randomUUID(), companyId, p.code, p.name, p.category, p.brand, p.price, p.unit, p.stock, imageUrl],
  );
  console.log('CREATED', companyId, p.code, p.name, imageUrl);
}

(async () => {
  const db = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 5432),
    user: process.env.DB_USERNAME || 'crm_user',
    password: process.env.DB_PASSWORD || 'crm_password',
    database: process.env.DB_DATABASE || 'distributor_crm',
  });
  await db.connect();

  await upsertCategory(db, 'Kolbasa', '#e11d48', '🥩');
  await upsertCategory(db, 'Sut', '#0ea5e9', '🥛');

  for (const p of boran) await upsertProduct(db, 'boran', p);
  for (const p of zarafshon) await upsertProduct(db, 'zarafshon', p);

  const summary = await db.query(
    `SELECT "companyId", category, COUNT(*)::int AS cnt,
            COUNT("imageUrl") FILTER (WHERE "imageUrl" IS NOT NULL)::int AS with_img
     FROM products
     WHERE "companyId" IN ('boran','zarafshon')
       AND (code LIKE 'BR-KOL-%' OR code LIKE 'ZR-SUT-%')
     GROUP BY "companyId", category
     ORDER BY "companyId", category`,
  );
  console.log('--- SUMMARY ---');
  for (const row of summary.rows) {
    console.log(row.companyId, row.category, 'count=' + row.cnt, 'images=' + row.with_img);
  }

  await db.end();
})().catch(async (e) => {
  console.error(e);
  process.exit(1);
});
