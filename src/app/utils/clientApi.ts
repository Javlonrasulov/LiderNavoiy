import type { BackendClient, Distributor } from '../api/client';
import type { ClientRow } from '../data/adminData';

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
