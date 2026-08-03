/**
 * Fix duplicate client APK logins — rename to name+code unique form.
 * Usage: node scripts/fix-duplicate-client-logins.cjs
 */
const API_BASE = process.env.API_BASE || 'http://89.39.95.41/api/v1';
const ADMIN = { username: 'admin', password: '123456' };

async function login() {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(ADMIN),
  });
  if (!res.ok) throw new Error(`login ${res.status}`);
  return res.json();
}

async function api(token, method, path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
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
  if (!res.ok) throw new Error(`${method} ${path} ${res.status}: ${JSON.stringify(data)}`);
  return data;
}

function toLogin(name, code) {
  const first = (name || 'mijoz').trim().split(/\s+/).find(Boolean) || 'mijoz';
  let base = first
    .toLowerCase()
    .replace(/o[''`]/g, 'o')
    .replace(/[^a-z0-9]+/g, '')
    .slice(0, 16);
  const codePart = String(code || '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toLowerCase()
    .slice(-6);
  let login = `${base}${codePart}`.slice(0, 32);
  if (login.length < 3) login = `mijoz${codePart || Date.now().toString(36).slice(-4)}`;
  return login;
}

async function main() {
  for (let i = 0; i < 6; i++) {
    try {
      if ((await fetch(`${API_BASE}/health`)).ok) break;
    } catch {
      /* wake */
    }
    await new Promise((r) => setTimeout(r, 8000));
  }

  const { accessToken: token } = await login();
  const users = await api(token, 'GET', '/users/app');
  const clients = await api(token, 'GET', '/clients');
  const clientById = new Map(clients.map((c) => [c.id, c]));

  const clientUsers = users.filter((u) => u.role === 'client' || u.clientId);
  console.log(`Client app users: ${clientUsers.length}`);

  const byUsername = new Map();
  for (const u of clientUsers) {
    const key = String(u.username || '').toLowerCase();
    if (!byUsername.has(key)) byUsername.set(key, []);
    byUsername.get(key).push(u);
  }

  const dupes = [...byUsername.entries()].filter(([, list]) => list.length > 1);
  console.log(`Duplicate login groups: ${dupes.length}`);

  // Also fix short generic logins like "dokon" even if only one — make unique with code
  let fixed = 0;
  for (const u of clientUsers) {
    const client = u.clientId ? clientById.get(u.clientId) : null;
    if (!client) continue;
    const desired = toLogin(client.name, client.code);
    const current = String(u.username || '').toLowerCase();
    const isDupe = (byUsername.get(current) || []).length > 1;
    const isGeneric = !/[0-9]/.test(current) && current.length <= 8;
    if (!isDupe && !isGeneric && current !== 'dokon' && current !== 'market') continue;
    if (current === desired) continue;

    let candidate = desired;
    let n = 1;
    while (
      clientUsers.some(
        (o) => o.id !== u.id && String(o.username).toLowerCase() === candidate,
      )
    ) {
      n += 1;
      candidate = `${desired}${n}`.slice(0, 32);
    }

    try {
      await api(token, 'PATCH', `/clients/${client.id}`, {
        appUsername: candidate,
        appPassword: '123456',
      });
      u.username = candidate;
      fixed += 1;
      console.log(`Fixed ${client.code}: ${current} → ${candidate}`);
    } catch (e) {
      console.error(`FAIL ${client.code}: ${e.message}`);
    }
  }

  console.log(`Done. Fixed=${fixed}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
