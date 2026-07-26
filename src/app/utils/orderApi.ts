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
  isUrgent?: boolean;
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
  isUrgent?: boolean;
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
 * Holat → Sotuvlar badge:
 * - pending/confirmed/packing = Qabul qilingan (omborga kelgan / tayyorlanayotgan)
 * - on_way/delivered = Yuklangan
 * - cancelled = Bekor
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
    case 'cancelled':
      return { ui: 'cancelled', deleted: true, shipped: false, processed: false };
    case 'confirmed':
    case 'packing':
    case 'pending':
    case 'draft':
    default:
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

  // № — UUID boshidagi 8 belgi (mijoz APKdagi #24E5CFDA kabi)
  const shortId = o.id.replace(/-/g, '').slice(0, 8).toUpperCase();
  const num = parseInt(shortId.slice(0, 8), 16) % 90000 + 10000;

  return {
    id: o.id,
    orderDate,
    shipDate,
    num,
    code: o.client?.code ?? shortId,
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
    note: o.isOfflineCreated ? 'Offline' : (shortId !== o.client?.code ? `#${shortId}` : ''),
    deleted,
    shipped,
    processed,
    isUrgent: !!o.isUrgent,
    items: o.items ?? [],
  };
}

/** Backend status → Tarozi nuqta rangi */
export function backendStatusToTarozi(status: string): TaroziOrderStatus {
  switch (status) {
    case 'delivered':
    case 'on_way':
      return 'delivered';
    case 'packing':
      // Faqat tarozida «Yuborish» dan keyin — yuklashga tayyor
      return 'ready';
    case 'cancelled':
      return 'delivered'; // ko'rsatilmaydi (filterda)
    case 'confirmed':
    case 'pending':
    case 'draft':
    default:
      // confirmed = omborda, hali tarozida yig'ilmagan
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
    isUrgent: !!o.isUrgent,
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
      isUrgent: false,
    });
    // Shoshilinch buyurtmalar agent guruhida yuqorida
    out.push(...[...list].sort((a, b) => Number(!!b.isUrgent) - Number(!!a.isUrgent)));
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

/** Tovar yuklash jadvali holati */
export type OtgrUiStatus = 'process' | 'done' | 'cancelled';

export interface OtgrApiRow {
  id: string;
  date: string;
  num: number;
  transport: string;
  driver: string;
  reys: number;
  kolTT: number;
  kol3k: number;
  obrn: number;
  neobr: number;
  term: string;
  otgr: number;
  status: OtgrUiStatus;
  summa: number;
  ves: number;
  exid: string;
  direction: string;
  timeOtgr: string;
  author: string;
  backendStatus: string;
  deliveryDistributorId: string | null;
  needsDriver: boolean;
}

/**
 * packing = Tarozi «yuklashga tayyor» → Tovar yuklashda jarayonda
 * on_way  = dostavchik biriktirilgan, mashinaga yuklangan
 * delivered / cancelled — yakuniy
 */
export function backendOrderToOtgr(o: BackendOrder): OtgrApiRow | null {
  if (o.status !== 'packing' && o.status !== 'on_way' && o.status !== 'delivered' && o.status !== 'cancelled') {
    return null;
  }
  const orderDate = formatTashkentDate(o.createdAt);
  const timeOtgr = o.status === 'packing'
    ? '—'
    : new Date(o.updatedAt).toLocaleString('ru-RU', { timeZone: 'Asia/Tashkent' });
  const status: OtgrUiStatus =
    o.status === 'cancelled' ? 'cancelled'
    : o.status === 'packing' ? 'process'
    : 'done';
  const itemCount = o.items?.length ?? 0;
  return {
    id: o.id,
    date: orderDate,
    num: orderNumFromId(o.id),
    transport: o.deliveryName ? (o.companyName ?? '—') : '—',
    driver: o.deliveryName ?? '—',
    reys: 1,
    kolTT: itemCount,
    kol3k: itemCount,
    obrn: o.status === 'packing' ? 0 : itemCount,
    neobr: o.status === 'packing' ? itemCount : 0,
    term: '0/0',
    otgr: o.status === 'packing' ? 0 : 1,
    status,
    summa: Number(o.totalAmount) || 0,
    ves: 0,
    exid: o.client?.code ?? '—',
    direction: o.client?.lineCode ?? '—',
    timeOtgr,
    author: o.agentName ?? '—',
    backendStatus: o.status,
    deliveryDistributorId: o.deliveryDistributorId ?? null,
    needsDriver: o.status === 'packing' && !o.deliveryDistributorId,
  };
}
