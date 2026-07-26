/**
 * Create 2 clients per weekday for every agent, Navoiy map coords.
 * Usage: node scripts/seed-navoiy-clients.cjs
 */
const RENDER_API = 'https://lider-navoiy-api.onrender.com/api/v1';
const ADMIN = { username: 'admin', password: '123456' };

// Navoiy city center-ish
const NAVOIY = { lat: 40.1035, lng: 65.3732 };

const DAYS = [
  { key: 'monday', uz: 'Dushanba', cal: 1 },
  { key: 'tuesday', uz: 'Seshanba', cal: 2 },
  { key: 'wednesday', uz: 'Chorshanba', cal: 3 },
  { key: 'thursday', uz: 'Payshanba', cal: 4 },
  { key: 'friday', uz: 'Juma', cal: 5 },
  { key: 'saturday', uz: 'Shanba', cal: 6 },
  { key: 'sunday', uz: 'Yakshanba', cal: 0 },
];

const SHOPS = [
  'Market',
  'Do\'kon',
  'Minimarket',
  'Savdo nuqtasi',
  'Oziq-ovqat',
  'Super Market',
];

async function api(token, method, path, body) {
  const res = await fetch(`${RENDER_API}${path}`, {
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
    throw new Error(`${method} ${path} ${res.status}: ${typeof data === 'object' ? JSON.stringify(data) : data}`);
  }
  return data;
}

function offset(seed) {
  // ~0.5–3 km spread around Navoiy
  const a = Math.sin(seed * 12.9898) * 43758.5453;
  const b = Math.sin(seed * 78.233) * 43758.5453;
  const r1 = a - Math.floor(a);
  const r2 = b - Math.floor(b);
  return {
    lat: NAVOIY.lat + (r1 - 0.5) * 0.045,
    lng: NAVOIY.lng + (r2 - 0.5) * 0.055,
  };
}

async function login() {
  const res = await fetch(`${RENDER_API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(ADMIN),
  });
  if (!res.ok) throw new Error(`login ${res.status}: ${await res.text()}`);
  return res.json();
}

async function main() {
  for (let i = 0; i < 5; i++) {
    try {
      const h = await fetch(`${RENDER_API}/health`);
      if (h.ok) break;
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 8000));
  }

  const { accessToken: token } = await login();
  console.log('Logged in as admin');

  const distributors = await api(token, 'GET', '/distributors');
  const agents = distributors.filter((d) => d.user?.role === 'distributor' || d.userId);
  console.log(`Agents: ${agents.length}`);

  const existing = await api(token, 'GET', '/clients');
  const existingCodes = new Set((existing || []).map((c) => c.code));
  console.log(`Existing clients: ${(existing || []).length}`);

  let created = 0;
  let skipped = 0;

  for (let ai = 0; ai < agents.length; ai++) {
    const agent = agents[ai];
    const username = agent.user?.username || `agent${ai}`;
    console.log(`\n→ ${username} (${agent.id})`);

    for (const day of DAYS) {
      for (let n = 1; n <= 2; n++) {
        const code = `NV${ai}${day.cal}${n}${String(username).slice(-2).toUpperCase()}`.slice(0, 16);
        if (existingCodes.has(code)) {
          skipped++;
          continue;
        }
        const seed = ai * 100 + day.cal * 10 + n;
        const pos = offset(seed);
        const shop = SHOPS[(ai + day.cal + n) % SHOPS.length];
        const name = `${shop} ${day.uz} #${n} (${username})`;
        const body = {
          code,
          name,
          fullName: name,
          phone: `+99890${String(1000000 + ai * 10000 + day.cal * 100 + n).slice(-7)}`,
          address: `Navoiy shahar, ${day.uz} marshruti, nuqta ${n}`,
          companyId: agent.companyId || 'boran',
          lineCode: agent.lineCode || '01',
          latitude: Number(pos.lat.toFixed(6)),
          longitude: Number(pos.lng.toFixed(6)),
          category: 'Standard',
          distributorId: agent.id,
          territory: day.key,
          contactPerson: `Mijoz ${day.uz}`,
          clientClass: day.key,
        };
        try {
          await api(token, 'POST', '/clients', body);
          created++;
          process.stdout.write('.');
        } catch (e) {
          console.error(`\nFAIL ${code}: ${e.message}`);
        }
      }
    }
  }

  const final = await api(token, 'GET', '/clients');
  console.log(`\n\nDone. Created=${created}, skipped=${skipped}, total clients=${final.length}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
