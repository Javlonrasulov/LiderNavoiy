import type { ClientRow } from './adminData';

export type ClientRequestStatus = 'pending' | 'approved' | 'rejected';
export type ClientRequestType = 'create' | 'update';

export type ClientRequestSnapshot = {
  name?: string | null;
  fullName?: string | null;
  phone?: string | null;
  address?: string | null;
  lineCode?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  category?: string | null;
  inn?: string | null;
  contactPerson?: string | null;
  territory?: string | null;
  clientClass?: string | null;
  priceCategory?: string | null;
  photoUrl?: string | null;
  canSeePromotions?: boolean | null;
};

export interface ClientRequestItem {
  id: string;
  status: ClientRequestStatus;
  requestType?: ClientRequestType;
  targetClientId?: string | null;
  name: string;
  fullName?: string | null;
  phone?: string | null;
  address?: string | null;
  companyId?: string | null;
  lineCode?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  category?: string | null;
  inn?: string | null;
  contactPerson?: string | null;
  territory?: string | null;
  clientClass?: string | null;
  priceCategory?: string | null;
  photoUrl?: string | null;
  canSeePromotions?: boolean | null;
  agentName?: string | null;
  submitterPosition?: string | null;
  note?: string | null;
  previousSnapshot?: ClientRequestSnapshot | null;
  createdAt: string;
  distributor?: {
    id: string;
    user?: { fullName: string };
  } | null;
}

export interface InnCheckResult {
  inn: string | null;
  duplicate: boolean;
  reason?: 'client_exists' | 'request_exists';
  existingClient?: { id: string; name: string; inn: string | null } | null;
  existingRequest?: { id: string; name: string; inn: string | null } | null;
}

export type ClientFieldChange = {
  key: string;
  labelKey: string;
  from: string;
  to: string;
};

export type ClientCompareRow = {
  key: string;
  label: string;
  from: string;
  to: string;
  changed: boolean;
};

const EDIT_FIELDS: Array<{
  key: keyof ClientRequestSnapshot;
  labelKey: string;
  format?: (v: unknown) => string;
}> = [
  { key: 'name', labelKey: 'colClientName' },
  { key: 'fullName', labelKey: 'colFullName' },
  { key: 'phone', labelKey: 'colPhone' },
  { key: 'address', labelKey: 'colLegalAddr' },
  { key: 'lineCode', labelKey: 'colLine' },
  { key: 'category', labelKey: 'colCategory' },
  { key: 'inn', labelKey: 'colINN' },
  { key: 'contactPerson', labelKey: 'colContact' },
  { key: 'territory', labelKey: 'colTerritory' },
  { key: 'clientClass', labelKey: 'colClass' },
  { key: 'priceCategory', labelKey: 'colPriceCat' },
  { key: 'photoUrl', labelKey: 'colPhoto' },
  {
    key: 'canSeePromotions',
    labelKey: 'colPromotions',
    format: (v) => (v === true ? 'on' : 'off'),
  },
];

function displayValue(v: unknown, format?: (v: unknown) => string): string {
  if (format) return format(v);
  if (v == null || v === '') return '—';
  return String(v);
}

function sameCoord(a: unknown, b: unknown): boolean {
  if (a == null && b == null) return true;
  if (a == null || b == null) return false;
  return Math.abs(Number(a) - Number(b)) < 1e-6;
}

function formatGps(lat: unknown, lng: unknown): string {
  if (lat == null || lng == null) return '—';
  return `${Number(lat).toFixed(5)}, ${Number(lng).toFixed(5)}`;
}

export function snapshotFromClientRow(row: ClientRow): ClientRequestSnapshot {
  const gpsParts = (row.gps || '').split(',').map(s => s.trim());
  return {
    name: row.name,
    fullName: row.fullName,
    phone: row.phone,
    address: row.legalAddr,
    lineCode: row.line,
    latitude: gpsParts[0] ? Number(gpsParts[0]) : null,
    longitude: gpsParts[1] ? Number(gpsParts[1]) : null,
    category: row.category,
    inn: row.inn,
    contactPerson: row.contact,
    territory: row.territory,
    clientClass: row.cls,
    priceCategory: row.priceCat,
  };
}

export function snapshotFromApiClient(c: {
  name?: string | null;
  fullName?: string | null;
  phone?: string | null;
  address?: string | null;
  lineCode?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  category?: string | null;
  inn?: string | null;
  contactPerson?: string | null;
  territory?: string | null;
  clientClass?: string | null;
  priceCategory?: string | null;
  photoUrl?: string | null;
  canSeePromotions?: boolean | null;
}): ClientRequestSnapshot {
  return {
    name: c.name ?? null,
    fullName: c.fullName ?? null,
    phone: c.phone ?? null,
    address: c.address ?? null,
    lineCode: c.lineCode ?? null,
    latitude: c.latitude ?? null,
    longitude: c.longitude ?? null,
    category: c.category ?? null,
    inn: c.inn ?? null,
    contactPerson: c.contactPerson ?? null,
    territory: c.territory ?? null,
    clientClass: c.clientClass ?? null,
    priceCategory: c.priceCategory ?? null,
    photoUrl: c.photoUrl ?? null,
    canSeePromotions: c.canSeePromotions === true,
  };
}

export function resolvePreviousSnapshot(
  item: ClientRequestItem,
  existingClients: ClientRow[] = [],
  fetched?: ClientRequestSnapshot | null,
): ClientRequestSnapshot | null {
  if (item.previousSnapshot) return item.previousSnapshot;
  if (fetched) return fetched;
  if (item.targetClientId) {
    const row = existingClients.find(c => String(c.id) === String(item.targetClientId));
    if (row) return snapshotFromClientRow(row);
  }
  return null;
}

function formatFieldDisplay(
  key: keyof ClientRequestSnapshot,
  raw: unknown,
  t: Record<string, string>,
  format?: (v: unknown) => string,
): string {
  if (key === 'photoUrl') {
    return raw ? (t.notifHasPhoto ?? 'Bor') : '—';
  }
  if (key === 'canSeePromotions') {
    return raw === true ? (t.notifYes ?? 'Ha') : (t.notifNo ?? "Yo'q");
  }
  return displayValue(raw, format);
}

/** Yonma-yon solishtirish qatorlari (eski | yangi) */
export function getClientRequestCompareRows(
  item: ClientRequestItem,
  prev: ClientRequestSnapshot | null,
  t: Record<string, string> = {},
): ClientCompareRow[] {
  if (!prev) return [];

  const rows: ClientCompareRow[] = [];

  for (const field of EDIT_FIELDS) {
    const fromRaw = prev[field.key];
    const toRaw = item[field.key as keyof ClientRequestItem];
    const from = formatFieldDisplay(field.key, fromRaw, t, field.format);
    const to = formatFieldDisplay(field.key, toRaw, t, field.format);
    // Bo‘sh maydonlarni ikkala tomonda ham yashirish
    if (from === '—' && to === '—') continue;
    rows.push({
      key: field.key,
      label: t[field.labelKey] ?? field.labelKey,
      from,
      to,
      changed: from !== to,
    });
  }

  const fromGps = formatGps(prev.latitude, prev.longitude);
  const toGps = formatGps(item.latitude, item.longitude);
  if (fromGps !== '—' || toGps !== '—') {
    rows.push({
      key: 'gps',
      label: t.colGPS ?? 'GPS',
      from: fromGps,
      to: toGps,
      changed: !sameCoord(prev.latitude, item.latitude)
        || !sameCoord(prev.longitude, item.longitude),
    });
  }

  return rows;
}

/** Tahrirlash so‘rovida o‘zgargan maydonlar (eski → yangi) */
export function getClientRequestChanges(
  item: ClientRequestItem,
  t: Record<string, string> = {},
  existingClients: ClientRow[] = [],
): ClientFieldChange[] {
  if (item.requestType !== 'update') return [];
  const prev = resolvePreviousSnapshot(item, existingClients);
  if (!prev) return [];
  return getClientRequestCompareRows(item, prev, t)
    .filter(r => r.changed)
    .map(r => ({
      key: r.key,
      labelKey: r.key,
      from: r.from,
      to: r.to,
    }));
}

/** Eski demo ma'lumotlarni tozalash (bir martalik) */
const LEGACY_DEMO_KEY = 'lider_client_requests_demo';

export function clearLegacyDemoStorage() {
  try {
    localStorage.removeItem(LEGACY_DEMO_KEY);
    localStorage.removeItem('lider_demo_approved_clients');
  } catch { /* ignore */ }
}

export function normalizeInn(inn?: string | null): string | null {
  const v = inn?.trim();
  return v ? v : null;
}

export function requestToClientRow(item: ClientRequestItem, id?: string): ClientRow {
  const gps = item.latitude != null && item.longitude != null
    ? `${item.latitude},${item.longitude}`
    : '';
  return {
    id: id ?? item.id,
    code: 'NEW',
    name: item.name,
    fullName: item.fullName ?? item.name,
    line: item.lineCode ?? '',
    priceCat: item.priceCategory ?? '',
    territory: item.territory ?? '',
    inn: item.inn ?? '',
    legalAddr: item.address ?? '',
    phone: item.phone ?? '',
    contact: item.contactPerson ?? '',
    cls: item.clientClass ?? '',
    gps,
    agent: item.agentName ?? '',
    balance: 0,
    category: item.category ?? 'Standard',
    lastVisit: new Date().toISOString().slice(0, 10),
    rowType: 'normal',
  };
}
