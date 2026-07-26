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

/** Tarozi chap ro'yxat statusi */
export type TaroziOrderStatus = 'pending' | 'ready' | 'delivered';

export interface TaroziListItem {
  id: string;
  name: string;
  code: string;
  client: string;
  status: TaroziOrderStatus;
  group: boolean;
  agentName: string;
  orderNum: number;
  lineCode: string;
  items: BackendOrderItem[];
  amount: number;
  createdAt: string;
}

export interface TaroziProductRow {
  id: number;
  n: number;
  name: string;
  zakaz: number;
  cena: number;
  ves: number;
  ed: string;
  summa: number;
  qoldiq: number;
  danger: boolean;
}

function formatTashkentDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ru-RU', { timeZone: 'Asia/Tashkent' });
}

/** Buyurtma sanasi (Toshkent) — Date obyektiga */
export function orderCreatedLocalDate(iso: string): Date {
  const ymd = new Date(iso).toLocaleDateString('en-CA', { timeZone: 'Asia/Tashkent' });
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function orderNumFromId(id: string): number {
  const hex = id.replace(/-/g, '').slice(0, 8);
  return (parseInt(hex, 16) % 90000) + 10000;
}

/**
 * Agent yuborgan yangi buyurtma → Sotuvlarda «Qabul qilingan» (pri).
 * pending / draft = qabul qilingan
 */
function mapStatus(status: string): {
  ui: ZayavkaStatus;
  deleted: boolean;
  shipped: boolean;
  processed: boolean;
} {
  switch (status) {
    case 'delivered':
    case 'on_way':
      return { ui: 'otr', deleted: false, shipped: true, processed: true };
    case 'confirmed':
    case 'packing':
      return { ui: 'otr', deleted: false, shipped: false, processed: true };
    case 'cancelled':
      return { ui: 'cancelled', deleted: true, shipped: false, processed: false };
    case 'pending':
    case 'draft':
    default:
      // Agent APK buyurtmasi — doim «Qabul qilingan»
      return { ui: 'pri', deleted: false, shipped: false, processed: false };
  }
}

export function backendOrderToZayavka(o: BackendOrder): ZayavkaRow {
  const { ui, deleted, shipped, processed } = mapStatus(o.status);
  const orderDate = formatTashkentDate(o.createdAt);
  const shipDate = o.status === 'delivered' || o.status === 'on_way'
    ? formatTashkentDate(o.updatedAt)
    : '—';

  const sourceLabel =
    o.source === 'client' ? 'Klient'
    : o.source === 'agent' || !o.source ? 'APK'
    : o.source;

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
    source: sourceLabel,
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

/** Backend status → Tarozi nuqta rangi */
export function backendStatusToTarozi(status: string): TaroziOrderStatus {
  switch (status) {
    case 'delivered':
    case 'on_way':
      return 'delivered';
    case 'confirmed':
    case 'packing':
      return 'ready';
    case 'cancelled':
      return 'delivered'; // ko'rsatilmaydi (filterda)
    default:
      // pending / draft — «Qabul qilinganlar»
      return 'pending';
  }
}

export function backendOrderToTaroziItem(o: BackendOrder): TaroziListItem {
  return {
    id: o.id,
    name: '',
    code: o.client?.code ?? '—',
    client: o.client?.name ?? '—',
    status: backendStatusToTarozi(o.status),
    group: false,
    agentName: o.agentName ?? 'Agent',
    orderNum: orderNumFromId(o.id),
    lineCode: o.client?.lineCode ?? '',
    items: o.items ?? [],
    amount: Number(o.totalAmount) || 0,
    createdAt: o.createdAt,
  };
}

/** Agent bo'yicha guruhlab: [group header, ...orders] */
export function groupTaroziByAgent(items: TaroziListItem[]): TaroziListItem[] {
  const byAgent = new Map<string, TaroziListItem[]>();
  for (const it of items) {
    const key = it.agentName || 'Agent';
    if (!byAgent.has(key)) byAgent.set(key, []);
    byAgent.get(key)!.push(it);
  }
  const out: TaroziListItem[] = [];
  for (const [agent, list] of byAgent) {
    out.push({
      id: `grp:${agent}`,
      name: agent,
      code: '',
      client: `${list.length}`,
      status: 'pending',
      group: true,
      agentName: agent,
      orderNum: 0,
      lineCode: '',
      items: [],
      amount: 0,
      createdAt: '',
    });
    out.push(...list);
  }
  return out;
}

export function orderItemsToTaroziProducts(items: BackendOrderItem[]): TaroziProductRow[] {
  return items.map((item, i) => {
    const qty = Number(item.quantity) || 0;
    const price = Number(item.price) || 0;
    return {
      id: i + 1,
      n: i + 1,
      name: item.productName || item.productCode || 'Tovar',
      zakaz: qty,
      cena: price,
      ves: 0,
      ed: item.unit || 'dona',
      summa: 0,
      qoldiq: 0,
      danger: false,
    };
  });
}

export function sameCalendarDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();
}
