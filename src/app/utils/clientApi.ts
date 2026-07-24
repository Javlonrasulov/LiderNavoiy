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

/** Mijoz nomining faqat birinchi so'zidan login (masalan: "GO ZAL TONG" → "go") */
export function clientNameToLogin(name: string, codeFallback?: string): string {
  const firstWord = name.trim().split(/\s+/).find(Boolean) ?? '';
  let login = transliterateWord(firstWord).slice(0, 32);

  if (login.length < 3 && codeFallback) {
    login = `${login}${codeFallback.replace(/\D/g, '')}`.slice(0, 32);
  }
  if (login.length < 3) {
    // Typing paytida barqaror qolishi uchun Date.now ishlatilmaydi
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

export function apiClientToRow(c: BackendClient): ClientRow {
  const agentName = c.distributor?.user?.fullName ?? '';
  return {
    id: c.id,
    code: c.code,
    onTradeId: c.onTradeId ?? c.code,
    name: c.name,
    fullName: c.fullName ?? c.name,
    line: c.lineCode ?? '',
    priceCat: c.priceCategory ?? '',
    territory: c.territory ?? '',
    inn: c.inn ?? '',
    legalAddr: c.address ?? '',
    phone: c.phone ?? '',
    contact: c.contactPerson ?? '',
    cls: c.clientClass ?? '',
    gps: parseGps(c.latitude, c.longitude),
    agent: agentName,
    distributorId: c.distributorId ?? undefined,
    balance: Number(c.balance) || 0,
    category: c.category ?? 'Standard',
    lastVisit: c.updatedAt?.slice(0, 10) ?? '',
    rowType: 'normal',
  };
}

export function rowToUpdatePayload(data: Partial<ClientRow> & { id: string }) {
  const { lat, lng } = parseGpsString(data.gps ?? '');
  return {
    code: data.code,
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
    clientClass: data.cls,
    priceCategory: data.priceCat,
  };
}

export function formToCreatePayload(
  data: Partial<ClientRow>,
  companyId?: string,
) {
  const { lat, lng } = parseGpsString(data.gps ?? '');
  return {
    code: data.code || 'NEW',
    onTradeId: data.onTradeId,
    name: data.name || '',
    fullName: data.fullName || data.name,
    phone: data.phone,
    address: data.legalAddr,
    companyId,
    lineCode: data.line?.split(' - ')[0]?.trim() || data.line || undefined,
    latitude: lat ?? undefined,
    longitude: lng ?? undefined,
    category: data.category || 'Standard',
    distributorId: data.distributorId,
    inn: data.inn,
    contactPerson: data.contact,
    territory: data.territory,
    clientClass: data.cls,
    priceCategory: data.priceCat,
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
