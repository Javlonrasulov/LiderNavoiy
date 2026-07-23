/**
 * Local Postgres products -> Render API
 * Usage: node scripts/sync-products-to-render.js
 */
const { Client } = require('../backend/node_modules/pg');
const fs = require('fs');
const path = require('path');

const LOCAL = {
  host: 'localhost',
  port: 5432,
  user: 'crm_user',
  password: 'crm_password',
  database: 'distributor_crm',
};
const RENDER_API = 'https://lider-navoiy-api.onrender.com/api/v1';
const ADMIN = { username: 'admin', password: '123456' };
const UPLOADS_DIR = path.join(__dirname, '..', 'backend', 'uploads', 'products');

async function login() {
  const res = await fetch(`${RENDER_API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(ADMIN),
  });
  if (!res.ok) throw new Error(`login ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.accessToken;
}

async function api(token, method, pathName, body) {
  const res = await fetch(`${RENDER_API}${pathName}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) {
    const msg = typeof data === 'object' ? JSON.stringify(data) : String(data);
    throw new Error(`${method} ${pathName} -> ${res.status}: ${msg}`);
  }
  return data;
}

function toDataUrl(imageUrl) {
  if (!imageUrl) return null;
  if (imageUrl.startsWith('data:')) return imageUrl;
  const match = imageUrl.match(/\/uploads\/products\/([^/?#]+)/);
  if (!match) return null;
  const filePath = path.join(UPLOADS_DIR, match[1]);
  if (!fs.existsSync(filePath)) {
    console.warn(`  image missing: ${filePath}`);
    return null;
  }
  const buf = fs.readFileSync(filePath);
  const ext = path.extname(filePath).toLowerCase();
  const mime =
    ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
  return `data:${mime};base64,${buf.toString('base64')}`;
}

async function main() {
  const client = new Client(LOCAL);
  await client.connect();
  const products = (
    await client.query(`
      SELECT code, name, category, brand, price::float AS price, unit,
             "stockBalance"::float AS "stockBalance",
             "imageUrl" AS "imageUrl"
      FROM products
      WHERE "isActive" = true
      ORDER BY code
    `)
  ).rows;
  const cats = (
    await client.query(`
      SELECT name, color, emoji, "imageUrl" AS "imageUrl"
      FROM product_categories
    `)
  ).rows;
  await client.end();

  console.log(`Local active products: ${products.length}`);
  products.forEach((p) => console.log(`  - ${p.code} ${p.name}`));

  const token = await login();
  console.log('Logged into Render');

  const existing = await api(token, 'GET', '/products');
  const byCode = new Map(existing.map((p) => [p.code, p]));
  console.log(`Render existing: ${existing.length}`);

  for (const p of products) {
    let imageUrl = null;
    const dataUrl = toDataUrl(p.imageUrl);
    if (dataUrl) {
      try {
        const uploaded = await api(token, 'POST', '/products/upload-image', {
          dataUrl,
        });
        imageUrl = uploaded.url || uploaded.imageUrl || null;
        console.log(`  uploaded image for ${p.code}: ${imageUrl}`);
      } catch (e) {
        console.warn(`  image upload failed ${p.code}: ${e.message}`);
      }
    }

    const body = {
      code: p.code,
      name: p.name,
      category: p.category || undefined,
      brand: p.brand || undefined,
      price: Number(p.price) || 0,
      unit: p.unit || 'dona',
      stockBalance: Number(p.stockBalance) || 0,
      imageUrl: imageUrl || undefined,
    };

    if (byCode.has(p.code)) {
      const id = byCode.get(p.code).id;
      await api(token, 'PATCH', `/products/${id}`, body);
      console.log(`Updated ${p.code}`);
    } else {
      await api(token, 'POST', '/products', body);
      console.log(`Created ${p.code}`);
    }
  }

  let existingCats = [];
  try {
    existingCats = await api(token, 'GET', '/products/category-meta');
  } catch {
    existingCats = [];
  }
  const catByName = new Map(
    (Array.isArray(existingCats) ? existingCats : []).map((c) => [
      String(c.name).toLowerCase(),
      c,
    ]),
  );

  for (const c of cats) {
    const payload = {
      name: c.name,
      color: c.color || undefined,
      emoji: c.emoji || undefined,
      imageUrl: c.imageUrl || undefined,
    };
    const found = catByName.get(String(c.name).toLowerCase());
    if (found) {
      await api(token, 'PATCH', `/products/category-meta/${found.id}`, payload);
      console.log(`Updated category ${c.name}`);
    } else {
      await api(token, 'POST', '/products/category-meta', payload);
      console.log(`Created category ${c.name}`);
    }
  }

  const final = await api(token, 'GET', '/products');
  console.log(`Done. Render products now: ${final.length}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
