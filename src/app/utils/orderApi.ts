import type { BackendOrder, BackendOrderItem } from '../api/client';

export type ZayavkaStatus = 'pri' | 'otr' | 'cancelled';

export interface ZayavkaRow {
  id: string;
  orderDate: string;
  shipDate: string;
  num: number;
  code: string;
  client: string;
  org: string;
  agent: string;
  liniya: string;
  direction: string;
  fort: string;
  vs: string;
  source: string;
  amount: number;
  klass: string;
  otgr: string;
  status: ZayavkaStatus;
  konsDate: string;
  note: string;
  deleted: boolean;
  shipped: boolean;
  processed: boolean;
  items?: BackendOrderItem[];
}

function formatTashkentDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ru-RU', { timeZone: 'Asia/Tashkent' });
}

function orderNumFromId(id: string): number {
  const hex = id.replace(/-/g, '').slice(0, 8);
  return (parseInt(hex, 16) % 90000) + 10000;
}

function mapStatus(status: string): {
  ui: ZayavkaStatus;
  deleted: boolean;
  shipped: boolean;
  processed: boolean;
} {
  switch (status) {
    case 'delivered':
      return { ui: 'otr', deleted: false, shipped: true, processed: true };
    case 'confirmed':
      return { ui: 'otr', deleted: false, shipped: false, processed: true };
    case 'cancelled':
      return { ui: 'cancelled', deleted: true, shipped: false, processed: false };
    default:
      return { ui: 'pri', deleted: false, shipped: false, processed: false };
  }
}

export function backendOrderToZayavka(o: BackendOrder): ZayavkaRow {
  const { ui, deleted, shipped, processed } = mapStatus(o.status);
  const orderDate = formatTashkentDate(o.createdAt);
  const shipDate = o.status === 'delivered'
    ? formatTashkentDate(o.updatedAt)
    : '—';

  return {
    id: o.id,
    orderDate,
    shipDate,
    num: orderNumFromId(o.id),
    code: o.client?.code ?? '—',
    client: o.client?.name ?? '—',
    org: o.companyName ?? '—',
    agent: o.agentName ?? '—',
    liniya: o.client?.lineCode ?? '—',
    direction: '—',
    fort: '—',
    vs: '—',
    source: 'APK',
    amount: Number(o.totalAmount) || 0,
    klass: o.client?.clientClass ?? o.client?.category ?? '—',
    otgr: '—',
    status: ui,
    konsDate: '—',
    note: o.isOfflineCreated ? 'Offline' : '',
    deleted,
    shipped,
    processed,
    items: o.items ?? [],
  };
}
