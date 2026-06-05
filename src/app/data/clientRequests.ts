import type { ClientRow } from './adminData';

export type ClientRequestStatus = 'pending' | 'approved' | 'rejected';

export interface ClientRequestItem {
  id: string;
  status: ClientRequestStatus;
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
  agentName?: string | null;
  note?: string | null;
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
