import type { BackendClient, Distributor } from '../api/client';
import type { ClientRow } from '../data/adminData';

export const DEFAULT_CLIENT_APP_PASSWORD = '123456';

const CYRILLIC_TO_LATIN: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'yo', ж: 'zh', з: 'z',
  и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r',
  с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'shch',
  ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
  ғ: 'g', қ: 'q', ҳ: 'h', ў: 'o', ӯ: 'u', Ғ: 'g', Қ: 'q', Ҳ: 'h', Ў: 'o', Ӯ: 'u',
  А: 'a', Б: 'b', В: 'v', Г: 'g', Д: 'd', Е: 'e', Ё: 'yo', Ж: 'zh', З: 'z',
  И: 'i', Й: 'y', К: 'k', Л: 'l', М: 'm', Н: 'n', О: 'o', П: 'p', Р: 'r',
  С: 's', Т: 't', У: 'u', Ф: 'f', Х: 'h', Ц: 'ts', Ч: 'ch', Ш: 'sh', Щ: 'shch',
  Ъ: '', Ы: 'y', Ь: '', Э: 'e', Ю: 'yu', Я: 'ya',
};

function transliterateWord(word: string): string {
  let raw = word
    .trim()
    .replace(/o[''`ʼ]/gi, 'o')
    .replace(/g[''`ʼ]/gi, 'g');

  let latin = '';
  for (const ch of raw) {
    latin += CYRILLIC_TO_LATIN[ch] ?? ch;
  }

  return latin
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

/**
 * Qidiruv uchun: kirill <-> lotin bir xil shaklga (masalan far).
 * Apostrof/diakritiklar ham olib tashlanadi.
 */
export function normalizeForSearch(input: string): string {
  if (!input) return '';
  let raw = String(input)
    .replace(/o[''`\u02BC\u02BB']/gi, 'o')
    .replace(/g[''`\u02BC\u02BB']/gi, 'g');

  let out = '';
  for (const ch of raw) {
    out += CYRILLIC_TO_LATIN[ch] ?? ch;
  }

  return out
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

/** Matnda qidiruv sozini (lotin yoki kirill) topish */
export function textMatchesSearch(haystack: string, needle: string): boolean {
  const q = normalizeForSearch(needle);
  if (!q) return true;
  return normalizeForSearch(haystack).includes(q);
}

/** Mijoz login: birinchi so'z + kod (takrorlanmasligi uchun) */
export function clientNameToLogin(name: string, codeFallback?: string): string {
  const firstWord = name.trim().split(/\s+/).find(Boolean) ?? '';
  let login = transliterateWord(firstWord).slice(0, 20);

  const codePart = (codeFallback || '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toLowerCase()
    .slice(-6);
  if (codePart) {
    login = `${login}${codePart}`.slice(0, 32);
  }
  if (login.length < 3) {
    login = (login + 'xxx').slice(0, 3);
  }
  return login;
}

export function clientIdHash(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function parseGps(lat: number | null, lng: number | null): string {
  if (lat != null && lng != null && !isNaN(lat) && !isNaN(lng)) {
    return `${lat.toFixed(6)},${lng.toFixed(6)}`;
  }
  return '';
}

function parseGpsString(gps: string): { lat: number | null; lng: number | null } {
  if (!gps?.includes(',')) return { lat: null, lng: null };
  const [la, ln] = gps.split(',').map(Number);
  if (isNaN(la) || isNaN(ln)) return { lat: null, lng: null };
  return { lat: la, lng: ln };
}

/** Bo'sh yoki faqat nol INN ko'rsatilmasin */
export function normalizeInnDisplay(inn?: string | null): string {
  const v = (inn || '').trim();
  if (!v || /^0+$/.test(v)) return '';
  return v;
}

/** Kontakt + manager kiritgan qo'shimcha telefonlar (jadval uchun) */
export function formatClientContact(c: {
  contactPerson?: string | null;
  contact?: string | null;
  extraPhones?: { phone: string; note?: string }[] | null;
}): string {
  const parts: string[] = [];
  const person = (c.contactPerson ?? c.contact ?? '').trim();
  if (person) parts.push(person);
  const extras = Array.isArray(c.extraPhones) ? c.extraPhones : [];
  for (const p of extras) {
    const phone = p?.phone?.trim();
    if (!phone) continue;
    const note = p.note?.trim();
    parts.push(note ? `${phone} (${note})` : phone);
  }
  return parts.join(', ');
}

/** Jadvalda Kod: mijozning haqiqiy raqamli kodi */
export function displayClientCode(c: { id: string; code?: string | null }): string {
  const code = (c.code || '').trim();
  if (/^\d+$/.test(code)) return code;
  // Eski harfli/bo‘sh kodlar — hash ko‘rsatilmaydi (uzun soxta ID chiqmasin)
  return code || '—';
}

export function formatLineDisplay(
  lineCode: string | null | undefined,
  lines: Array<{ code: string; name: string }>,
): string {
  const code = (lineCode || '').trim();
  if (!code) return '';
  const hit = lines.find((l) => l.code.trim() === code);
  if (hit?.name?.trim()) return `${hit.code} - ${hit.name.trim()}`;
  return code;
}

export function apiClientToRow(
  c: BackendClient,
  opts?: { lines?: Array<{ code: string; name: string }> },
): ClientRow {
  const agentName = c.distributor?.user?.fullName ?? '';
  return {
    id: c.id,
    code: c.code,
    onTradeId: c.onTradeId ?? c.code,
    name: c.name,
    fullName: c.fullName ?? c.name,
    line: formatLineDisplay(c.lineCode, opts?.lines ?? []),
    lineCode: c.lineCode ?? '',
    priceCat: 'Standard',
    territory: c.territory ?? '',
    inn: normalizeInnDisplay(c.inn),
    legalAddr: c.address ?? '',
    phone: c.phone ?? '',
    contact: c.contactPerson ?? '',
    cls: c.clientClass ?? '',
    gps: parseGps(c.latitude, c.longitude),
    agent: agentName,
    distributorId: c.distributorId ?? undefined,
    balance: Number(c.balance) || 0,
    ordersCount: Number(c.ordersCount) || 0,
    totalSales: Number(c.totalSales) || 0,
    lastOrderAt: c.lastOrderAt ?? null,
    goodsQty: Number(c.goodsQty) || 0,
    goodsWeight: Number(c.goodsWeight) || 0,
    category: c.category ?? 'Standard',
    lastVisit: c.updatedAt?.slice(0, 10) ?? '',
    rowType: 'normal',
    photoUrl: c.photoUrl ?? null,
    locationUpdatedAt: c.locationUpdatedAt ?? undefined,
    locationUpdatedBy: c.locationUpdatedByName?.trim() || undefined,
    canSeePromotions: !!c.canSeePromotions,
    isActive: c.isActive !== false,
    markColor: (() => {
      const m = c.markColor?.trim().toLowerCase();
      return m === 'yellow' || m === 'red' ? m : 'green';
    })(),
    companyId: c.companyId ?? undefined,
    companyIds: (() => {
      const linked = Array.isArray(c.linkedCompanyIds) ? c.linkedCompanyIds.filter(Boolean) : [];
      const primary = c.companyId?.trim();
      if (!primary && linked.length === 0) return [];
      return [...new Set([...(primary ? [primary] : []), ...linked])];
    })(),
    extraPhones: Array.isArray(c.extraPhones)
      ? c.extraPhones
          .filter((p) => p?.phone?.trim())
          .map((p) => ({ phone: p.phone.trim(), note: p.note?.trim() || undefined }))
      : [],
    createdAt: c.createdAt ?? undefined,
    createdBy: c.createdByName?.trim() || undefined,
    deletedAt: c.deletedAt ?? undefined,
    deletedBy: c.deletedByName?.trim() || undefined,
  };
}

export function rowToUpdatePayload(
  data: Partial<ClientRow> & {
    id: string;
    isActive?: boolean;
    extraPhones?: { phone: string; note?: string }[];
    companyIds?: string[];
  },
) {
  const { lat, lng } = parseGpsString(data.gps ?? '');
  const code = (data.code || '').replace(/\D/g, '') || undefined;
  return {
    code,
    onTradeId: data.onTradeId,
    name: data.name,
    fullName: data.fullName,
    phone: data.phone,
    address: data.legalAddr,
    lineCode: data.line?.split(' - ')[0]?.trim() || data.line || undefined,
    latitude: lat ?? undefined,
    longitude: lng ?? undefined,
    category: data.category,
    distributorId: data.distributorId ?? null,
    inn: data.inn,
    contactPerson: data.contact,
    territory: data.territory,
    photoUrl: data.photoUrl ?? undefined,
    clientClass: data.cls,
    priceCategory: data.priceCat,
    canSeePromotions: data.canSeePromotions === true,
    ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
    ...(data.companyIds !== undefined
      ? { companyIds: data.companyIds, companyId: data.companyIds[0] || data.companyId }
      : data.companyId !== undefined
        ? { companyId: data.companyId }
        : {}),
    ...(data.extraPhones !== undefined
      ? {
          extraPhones: data.extraPhones
            .filter((p) => p?.phone?.trim())
            .map((p) => ({ phone: p.phone.trim(), note: p.note?.trim() || undefined })),
        }
      : {}),
  };
}

export function formToCreatePayload(
  data: Partial<ClientRow> & { isActive?: boolean; extraPhones?: { phone: string; note?: string }[]; companyIds?: string[] },
  companyId?: string,
) {
  const { lat, lng } = parseGpsString(data.gps ?? '');
  const code = (data.code || '').replace(/\D/g, '') || undefined;
  const companyIds = data.companyIds?.length
    ? data.companyIds
    : data.companyId
      ? [data.companyId]
      : companyId
        ? [companyId]
        : undefined;
  return {
    ...(code ? { code } : {}),
    onTradeId: data.onTradeId,
    name: data.name || '',
    fullName: data.fullName || data.name,
    phone: data.phone,
    address: data.legalAddr,
    companyId: companyIds?.[0] || companyId,
    ...(companyIds ? { companyIds } : {}),
    lineCode: data.line?.split(' - ')[0]?.trim() || data.line || undefined,
    latitude: lat ?? undefined,
    longitude: lng ?? undefined,
    category: data.category || 'Standard',
    distributorId: data.distributorId,
    inn: data.inn,
    contactPerson: data.contact,
    territory: data.territory,
    photoUrl: data.photoUrl ?? undefined,
    clientClass: data.cls,
    priceCategory: data.priceCat,
    canSeePromotions: data.canSeePromotions === true,
    isActive: data.isActive !== false,
    ...(data.extraPhones !== undefined
      ? {
          extraPhones: data.extraPhones
            .filter((p) => p?.phone?.trim())
            .map((p) => ({ phone: p.phone.trim(), note: p.note?.trim() || undefined })),
        }
      : {}),
  };
}

export function distributorsToAgents(distributors: Distributor[]) {
  return distributors
    .filter(d => d.user?.fullName)
    .map(d => ({
      id: d.id,
      name: d.user!.fullName,
      lineCode: d.lineCode ?? '',
    }));
}

export function distributorsToLines(distributors: Distributor[]): string[] {
  const codes = new Set<string>();
  for (const d of distributors) {
    if (d.lineCode) codes.add(d.lineCode);
  }
  return [...codes].sort();
}

export function agentNameToId(name: string, agents: { id: string; name: string }[]): string | undefined {
  return agents.find(a => a.name === name)?.id;
}

export function appCredentialsPayload(
  appUsername?: string,
  appPassword?: string,
  options?: { hasExisting?: boolean; loginChanged?: boolean },
): { appUsername?: string; appPassword?: string } {
  const username = appUsername?.trim().toLowerCase();
  if (!username || username.length < 3) return {};

  if (options?.hasExisting) {
    const password = appPassword && appPassword.length >= 6 ? appPassword : '';
    if (!options.loginChanged && !password) return {};
    if (!password) return {};
    return { appUsername: username, appPassword: password };
  }

  const password =
    appPassword && appPassword.length >= 6
      ? appPassword
      : DEFAULT_CLIENT_APP_PASSWORD;
  return { appUsername: username, appPassword: password };
}
