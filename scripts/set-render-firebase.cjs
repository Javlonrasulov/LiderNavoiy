/**
 * Render da Firebase env ni o'rnatadi va deploy qiladi.
 * Usage:
 *   $env:RENDER_API_KEY="rnd_..."; node scripts/set-render-firebase.cjs
 */
const fs = require('fs');
const path = require('path');

const API = 'https://api.render.com/v1';
const SERVICE_ID = process.env.RENDER_SERVICE_ID || 'srv-d9gg6l4m0fmc73es7kjg';
const API_KEY = process.env.RENDER_API_KEY;
const JSON_PATH =
  process.env.FIREBASE_SA_JSON ||
  path.join(
    process.env.USERPROFILE || '',
    'Downloads',
    'lider-navoiy-firebase-adminsdk-fbsvc-23f1f9c1ff.json',
  );

if (!API_KEY) {
  console.error('RENDER_API_KEY yo\'q. Render → Account Settings → API Keys');
  process.exit(1);
}
if (!fs.existsSync(JSON_PATH)) {
  console.error('Service account JSON topilmadi:', JSON_PATH);
  process.exit(1);
}

const sa = JSON.parse(fs.readFileSync(JSON_PATH, 'utf8'));
const privateKeyOneLine = String(sa.private_key).replace(/\r/g, '').replace(/\n/g, '\\n');

async function api(method, urlPath, body) {
  const res = await fetch(`${API}${urlPath}`, {
    method,
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${API_KEY}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
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
    throw new Error(`${method} ${urlPath} ${res.status}: ${JSON.stringify(data)}`);
  }
  return data;
}

async function main() {
  console.log('Service:', SERVICE_ID);
  const listed = await api('GET', `/services/${SERVICE_ID}/env-vars?limit=100`);
  // Response shape: [{ envVar: { key, value }, cursor }, ...] OR [{ key, value }]
  const existing = (Array.isArray(listed) ? listed : []).map((row) => {
    const ev = row.envVar || row;
    return { key: ev.key, value: ev.value };
  });

  const byKey = new Map(existing.map((e) => [e.key, e.value]));
  byKey.set('FIREBASE_PROJECT_ID', sa.project_id);
  byKey.set('FIREBASE_CLIENT_EMAIL', sa.client_email);
  byKey.set('FIREBASE_PRIVATE_KEY', privateKeyOneLine);

  const payload = [...byKey.entries()].map(([key, value]) => ({ key, value }));
  console.log('Updating env vars, total=', payload.length);
  console.log(
    'Firebase keys set:',
    payload
      .filter((p) => p.key.startsWith('FIREBASE_'))
      .map((p) => p.key)
      .join(', '),
  );

  // PUT replaces ALL env vars — payload must be complete
  await api('PUT', `/services/${SERVICE_ID}/env-vars`, payload);
  console.log('Env updated. Triggering deploy...');
  const deploy = await api('POST', `/services/${SERVICE_ID}/deploys`, {
    clearCache: 'clear',
  });
  console.log('Deploy started:', deploy?.id || deploy?.deploy?.id || 'ok');
  console.log('Done. ~2-3 daqiqa kuting, keyin health/broadcast tekshiriladi.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
