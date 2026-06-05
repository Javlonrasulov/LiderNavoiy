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

const STORAGE_KEY = 'lider_client_requests_demo';

export function loadDemoRequests(): ClientRequestItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as ClientRequestItem[];
  } catch { /* ignore */ }
  const seed: ClientRequestItem[] = [
    {
      id: 'req-demo-1',
      status: 'pending',
      name: 'Navoiy Fresh Market',
      fullName: 'Navoiy Fresh Market MCHJ',
      phone: '+99890 111 22 33',
      address: 'Navoiy, Karmana ko\'chasi 12',
      companyId: 'boran',
      lineCode: '01',
      category: 'Standard',
      inn: '309998877',
      contactPerson: 'Karimov Sardor',
      territory: 'Karmana',
      clientClass: 'SM - Supermarket',
      priceCategory: 'Standart',
      agentName: 'Alisher Karimov',
      note: 'Yangi ochilgan do\'kon',
      createdAt: new Date(Date.now() - 3600_000).toISOString(),
    },
    {
      id: 'req-demo-2',
      status: 'pending',
      name: 'Issiqlik elekter stansiyasi (nusxa)',
      fullName: 'Issiqlik elekter stansiyasi',
      phone: '+99897 556 85 70',
      address: 'Xazora Katex',
      companyId: 'boran',
      lineCode: '01',
      category: 'Standard',
      inn: '306712636',
      contactPerson: '',
      territory: '',
      clientClass: 'ZAB.',
      priceCategory: 'Standart',
      agentName: 'Bobur Toshmatov',
      note: 'Agent qo\'shdi',
      createdAt: new Date(Date.now() - 7200_000).toISOString(),
    },
  ];
  saveDemoRequests(seed);
  return seed;
}

export function saveDemoRequests(items: ClientRequestItem[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function normalizeInn(inn?: string | null): string | null {
  const v = inn?.trim();
  return v ? v : null;
}

const APPROVED_KEY = 'lider_demo_approved_clients';

import type { ClientRow } from './adminData';

export function loadApprovedDemoClients(): ClientRow[] {
  try {
    const raw = localStorage.getItem(APPROVED_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveApprovedDemoClients(rows: ClientRow[]) {
  localStorage.setItem(APPROVED_KEY, JSON.stringify(rows));
}

export function requestToClientRow(
  item: ClientRequestItem,
  id?: string,
): ClientRow {
  const gps = item.latitude != null && item.longitude != null
    ? `${item.latitude},${item.longitude}`
    : '';
  return {
    id: id ?? `apr-${item.id}`,
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
