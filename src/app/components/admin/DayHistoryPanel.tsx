import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  CalendarDays, ChevronDown, ChevronUp, ChevronLeft, ChevronRight,
  ShoppingCart, Check, Clock, MapPin, TrendingUp, X,
} from 'lucide-react';
import { api, type BackendOrder } from '../../api/client';

interface Props {
  /** @deprecated numeric seed — use distributorId */
  empId?: number;
  empName?: string;
  distributorId?: string;
  mode: 'delivery' | 'agent';
  D: boolean;
  t: Record<string, string>;
}

function tr(t: Record<string, string>, key: string, fallback: string): string {
  return t[key] || fallback;
}

function splitTrList(t: Record<string, string>, key: string, fallback: string): string[] {
  return (t[key] || fallback).split(',').map(s => s.trim());
}

type OrderStatus = 'done' | 'pending';

interface ProductLine { no: number; kod: string; nomi: string; miqdor: number; narx: number; summa: number; }
interface ClientRecord {
  uid: string;
  id: number;
  dateStr: string;
  name: string;
  district: string;
  time: string | null;
  status: OrderStatus;
  products: ProductLine[];
  totalSum: number;
}

function formatNum(n: number) { return n.toLocaleString('ru-RU'); }

function localIso(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function isoFromDate(d: Date) {
  return localIso(d);
}

function hasApiToken(): boolean {
  return typeof localStorage !== 'undefined' && !!localStorage.getItem('api_access_token');
}

function fmtClock(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function dateStrFromIso(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return localIso();
  return isoFromDate(d);
}

function agentOrderDone(status: string): boolean {
  return status !== 'cancelled' && status !== 'draft';
}

function deliveryOrderDone(status: string): boolean {
  return status === 'delivered';
}

function deliveryOrderRelevant(status: string): boolean {
  return status === 'delivered' || status === 'on_way' || status === 'packing' || status === 'confirmed';
}

function orderProducts(order: BackendOrder): ProductLine[] {
  return (order.items || []).map((it, i) => ({
    no: i + 1,
    kod: it.productCode || '—',
    nomi: it.productName || 'Mahsulot',
    miqdor: Number(it.quantity) || 0,
    narx: Number(it.price) || 0,
    summa: (Number(it.quantity) || 0) * (Number(it.price) || 0),
  }));
}

function orderToRecord(
  order: BackendOrder,
  mode: 'delivery' | 'agent',
  lo?: string,
  hi?: string,
): ClientRecord | null {
  if (mode === 'delivery' && !deliveryOrderRelevant(order.status)) return null;
  if (mode === 'agent' && order.status === 'cancelled') return null;

  const done = mode === 'delivery'
    ? deliveryOrderDone(order.status)
    : agentOrderDone(order.status);

  const created = dateStrFromIso(order.createdAt);
  const updated = dateStrFromIso(order.updatedAt || order.createdAt);
  let dateStr = mode === 'delivery' && done ? updated : created;
  if (lo && hi) {
    if (mode === 'delivery' && done && inDateWindow(updated, lo, hi)) dateStr = updated;
    else if (inDateWindow(created, lo, hi)) dateStr = created;
    else if (inDateWindow(updated, lo, hi)) dateStr = updated;
  }

  const stamp = dateStr === updated
    ? (order.updatedAt || order.createdAt)
    : (order.createdAt || order.updatedAt);

  const products = orderProducts(order);
  const totalSum = products.length > 0
    ? products.reduce((s, p) => s + p.summa, 0)
    : (Number(order.totalAmount) || 0);

  return {
    uid: order.id,
    id: 0,
    dateStr,
    name: order.client?.name || order.deliveryName || 'Klient',
    district: order.client?.address || order.client?.lineCode || '—',
    time: done ? fmtClock(stamp) : null,
    status: done ? 'done' : 'pending',
    products,
    totalSum,
  };
}

function inDateWindow(dateStr: string, lo: string, hi: string): boolean {
  return dateStr >= lo && dateStr <= hi;
}

// ── Calendar helpers ──────────────────────────────────────────────────────────
function getDaysInMonth(year: number, month: number) { return new Date(year, month + 1, 0).getDate(); }
function getFirstWeekday(year: number, month: number) {
  const d = new Date(year, month, 1).getDay();
  return d === 0 ? 6 : d - 1;
}
function isoFromYMD(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}
function fmtDateLabel(iso: string) {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('uz-Latn', { day: '2-digit', month: 'short' });
}

// ── Component ─────────────────────────────────────────────────────────────────
export function DayHistoryPanel({ distributorId, mode, D, t }: Props) {
  const MONTH_NAMES = splitTrList(t, 'histMonths', 'Yanvar,Fevral,Mart,Aprel,May,Iyun,Iyul,Avgust,Sentabr,Oktabr,Noyabr,Dekabr');
  const WD_LABELS = splitTrList(t, 'histWeekdays', 'Du,Se,Ch,Pa,Ju,Sh,Ya');
  const currency = tr(t, 'histCurrency', "so'm");
  const doneLabel = mode === 'delivery' ? tr(t, 'histDelivered', 'Yetkazildi') : tr(t, 'histOrdered', 'Zakaz berildi');
  const doneFilterLabel = mode === 'delivery' ? tr(t, 'histDelivered', 'Yetkazildi') : tr(t, 'histDone', 'Bajarildi');
  const sumLabel = mode === 'delivery' ? tr(t, 'histTotalSum', 'Jami summa') : tr(t, 'histOrderSum', 'Zakaz summasi');
  const statusDone = mode === 'delivery' ? tr(t, 'histStatusDelivered', '✓ Yetkazildi') : tr(t, 'histStatusOrdered', '✓ Zakaz berildi');
  const statusPending = tr(t, 'histStatusPending', '⏳ Kutilmoqda');
  const pendingLabel = tr(t, 'histPending', 'Kutilmoqda');
  const todayIso = localIso();
  const now = new Date();

  const yesterday = (() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return localIso(d);
  })();

  const [rangeStart, setRangeStart] = useState<string>(yesterday);
  const [rangeEnd, setRangeEnd]     = useState<string | null>(null);
  const [pickStep, setPickStep]     = useState<'start' | 'end'>('start');
  const [hoverDate, setHoverDate]   = useState<string | null>(null);

  const [isMobile, setIsMobile] = useState(false);
  const [isSmall, setIsSmall]   = useState(false);
  useEffect(() => {
    const check = () => {
      setIsMobile(window.innerWidth < 768);
      setIsSmall(window.innerWidth < 450);
    };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const [calYear, setCalYear]   = useState(now.getFullYear());
  const [calMonth, setCalMonth] = useState(now.getMonth());

  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [filter, setFilter]           = useState<'all' | 'done' | 'pending'>('all');
  const [calOpen, setCalOpen]         = useState(false);

  const [records, setRecords] = useState<ClientRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasDataCache, setHasDataCache] = useState<Record<string, boolean>>({});

  const lo = rangeEnd ? (rangeStart < rangeEnd ? rangeStart : rangeEnd) : rangeStart;
  const hi = rangeEnd ? (rangeStart < rangeEnd ? rangeEnd : rangeStart) : rangeStart;

  const loadRange = useCallback(async (from: string, to: string) => {
    if (!distributorId || !hasApiToken()) {
      setRecords([]);
      return;
    }
    setLoading(true);
    try {
      const orders = await api.getOrdersHistory({
        ...(mode === 'delivery'
          ? { deliveryDistributorId: distributorId }
          : { distributorId }),
        from,
        to,
        limit: 1000,
      });

      let list: ClientRecord[] = orders
        .map(o => orderToRecord(o, mode, from, to))
        .filter((r): r is ClientRecord => !!r)
        .filter(r => inDateWindow(r.dateStr, from, to));

      // Agent: tashriflar (zakazsiz) ham ko‘rinsin
      if (mode === 'agent') {
        const visits = await api.getVisitsForDistributorRange(distributorId, from, to);
        const orderVisitIds = new Set(
          orders.map(o => o.visitId).filter((id): id is string => !!id),
        );
        const orderClientDays = new Set(
          list.map(r => `${r.name}|${r.dateStr}`),
        );
        const visitRecords: ClientRecord[] = visits
          .filter(v => !orderVisitIds.has(v.id))
          .map(v => {
            const dateStr = dateStrFromIso(v.visitedAt);
            const name = v.clientName || 'Klient';
            if (orderClientDays.has(`${name}|${dateStr}`)) return null;
            const hasOrder = (Number(v.orderTotal) || 0) > 0;
            return {
              uid: `visit-${v.id}`,
              id: 0,
              dateStr,
              name,
              district: v.clientAddress || '—',
              time: fmtClock(v.visitedAt),
              status: hasOrder ? 'done' as const : 'pending' as const,
              products: [],
              totalSum: Number(v.orderTotal) || 0,
            };
          })
          .filter((r): r is ClientRecord => !!r && inDateWindow(r.dateStr, from, to));
        list = [...list, ...visitRecords];
      }

      list.sort((a, b) => {
        if (a.dateStr !== b.dateStr) return b.dateStr.localeCompare(a.dateStr);
        return (b.time || '').localeCompare(a.time || '');
      });
      setRecords(list);
    } catch {
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, [distributorId, mode]);

  useEffect(() => {
    loadRange(lo, hi);
  }, [lo, hi, loadRange]);

  // Calendar dots for visible month
  useEffect(() => {
    if (!distributorId || !hasApiToken()) {
      setHasDataCache({});
      return;
    }
    let cancelled = false;
    const from = isoFromYMD(calYear, calMonth, 1);
    const to = isoFromYMD(calYear, calMonth, getDaysInMonth(calYear, calMonth));
    (async () => {
      try {
        const orders = await api.getOrdersHistory({
          ...(mode === 'delivery'
            ? { deliveryDistributorId: distributorId }
            : { distributorId }),
          from,
          to,
          limit: 1000,
        });
        const cache: Record<string, boolean> = {};
        for (const o of orders) {
          const rec = orderToRecord(o, mode, from, to);
          if (rec && rec.status === 'done') cache[rec.dateStr] = true;
        }
        if (mode === 'agent') {
          const visits = await api.getVisitsForDistributorRange(distributorId, from, to);
          for (const v of visits) {
            if ((Number(v.orderTotal) || 0) > 0) {
              cache[dateStrFromIso(v.visitedAt)] = true;
            }
          }
        }
        if (!cancelled) setHasDataCache(cache);
      } catch {
        if (!cancelled) setHasDataCache({});
      }
    })();
    return () => { cancelled = true; };
  }, [distributorId, mode, calYear, calMonth]);

  const filtered     = records.filter(r => filter === 'all' ? true : r.status === filter);
  const totalDone    = records.filter(r => r.status === 'done').length;
  const totalPending = records.filter(r => r.status === 'pending').length;
  const totalSum     = records.filter(r => r.status === 'done').reduce((s, r) => s + r.totalSum, 0);

  const txt    = D ? '#f9fafb' : '#111827';
  const muted  = D ? '#6b7280' : '#9ca3af';
  const border = D ? 'rgba(255,255,255,0.07)' : '#e5e7eb';
  const cardBg = D ? '#161616' : '#ffffff';
  const indigo = '#6366f1';
  const green  = '#10b981';
  const amber  = '#f59e0b';

  const prevMonth = () => { if (calMonth === 0) { setCalYear(y => y - 1); setCalMonth(11); } else setCalMonth(m => m - 1); };
  const nextMonth = () => { if (calMonth === 11) { setCalYear(y => y + 1); setCalMonth(0); } else setCalMonth(m => m + 1); };
  const canGoNext = calYear < now.getFullYear() || (calYear === now.getFullYear() && calMonth < now.getMonth());

  const handleCalClick = (iso: string) => {
    if (iso > todayIso) return;
    if (pickStep === 'start') {
      setRangeStart(iso);
      setRangeEnd(null);
      setPickStep('end');
      setExpandedKey(null);
      setFilter('all');
    } else {
      if (iso === rangeStart) {
        setRangeEnd(null);
      } else {
        setRangeEnd(iso);
      }
      setPickStep('start');
      setExpandedKey(null);
      setCalOpen(false);
    }
  };

  const calCells = useMemo(() => {
    const firstWD = getFirstWeekday(calYear, calMonth);
    const daysInMonth = getDaysInMonth(calYear, calMonth);
    const cells: (string | null)[] = Array(firstWD).fill(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(isoFromYMD(calYear, calMonth, d));
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [calYear, calMonth]);

  const getHoverLo = (hover: string) => (rangeStart < hover ? rangeStart : hover);
  const getHoverHi = (hover: string) => (rangeStart < hover ? hover : rangeStart);

  const isEdge = (iso: string) => {
    if (iso === rangeStart) return true;
    if (rangeEnd && iso === rangeEnd) return true;
    if (pickStep === 'end' && hoverDate && iso === hoverDate) return true;
    return false;
  };
  const isInRange = (iso: string) => {
    if (pickStep === 'end' && hoverDate && hoverDate !== rangeStart) {
      const hl = getHoverLo(hoverDate); const hh = getHoverHi(hoverDate);
      return iso > hl && iso < hh;
    }
    if (rangeEnd && rangeEnd !== rangeStart) return iso > lo && iso < hi;
    return false;
  };

  const dateLabel = () => {
    if (!rangeEnd || rangeEnd === rangeStart) return fmtDateLabel(rangeStart);
    return `${fmtDateLabel(lo)} → ${fmtDateLabel(hi)}`;
  };

  const isRange = !!(rangeEnd && rangeEnd !== rangeStart);

  if (!distributorId) {
    return (
      <div style={{ marginTop: 24, padding: 24, textAlign: 'center', color: muted, fontSize: 13, background: cardBg, border: `1px solid ${border}`, borderRadius: 12 }}>
        {tr(t, 'histNoDistributor', "Tarix uchun distributor ID topilmadi")}
      </div>
    );
  }

  return (
    <div style={{ marginTop: 24 }}>

      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
        <button
          onClick={() => setCalOpen(o => !o)}
          style={{
            display: 'flex', alignItems: 'center', gap: isSmall ? 5 : 8,
            padding: isSmall ? '7px 12px' : '8px 16px', borderRadius: 10, cursor: 'pointer',
            border: `1.5px solid ${calOpen ? indigo : border}`,
            background: calOpen ? `${indigo}12` : (D ? 'rgba(255,255,255,0.05)' : '#f3f4f6'),
            color: calOpen ? indigo : txt, transition: 'all .15s',
            maxWidth: '100%', overflow: 'hidden',
          }}
        >
          <CalendarDays size={isSmall ? 12 : 14} color={indigo} style={{ flexShrink: 0 }} />
          <span style={{ fontSize: isSmall ? 11.5 : 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{dateLabel()}</span>
          {isRange && (
            <span
              onClick={e => {
                e.stopPropagation();
                setRangeEnd(null);
                setPickStep('start');
                setExpandedKey(null);
                setFilter('all');
              }}
              style={{ display: 'flex', alignItems: 'center', color: muted, cursor: 'pointer', marginLeft: 2 }}
            >
              <X size={12} />
            </span>
          )}
          <ChevronDown size={13} color={calOpen ? indigo : muted}
            style={{ transform: calOpen ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} />
        </button>
        {loading && (
          <span style={{ marginLeft: 10, fontSize: 11, color: muted }}>{tr(t, 'loading', 'Yuklanmoqda...')}</span>
        )}
      </div>

      {calOpen && (
        <div
          onClick={() => { setCalOpen(false); if (pickStep === 'end') { setPickStep('start'); } }}
          style={{
            position: 'fixed', inset: 0, zIndex: 999,
            background: 'rgba(0,0,0,0.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: cardBg,
              border: `1px solid ${border}`,
              borderRadius: 18,
              padding: isSmall ? '14px 14px 12px' : '18px 20px 16px',
              width: isSmall ? 'calc(100vw - 32px)' : 300,
              maxWidth: 320,
              boxShadow: '0 24px 64px rgba(0,0,0,0.4)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <button onClick={prevMonth} style={{ width: 28, height: 28, borderRadius: 8, border: `1px solid ${border}`, background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ChevronLeft size={13} color={txt} />
              </button>
              <span style={{ fontSize: 13, fontWeight: 700, color: txt }}>{MONTH_NAMES[calMonth]} {calYear}</span>
              <button onClick={nextMonth} disabled={!canGoNext}
                style={{ width: 28, height: 28, borderRadius: 8, border: `1px solid ${border}`, background: 'transparent', cursor: canGoNext ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: canGoNext ? 1 : 0.3 }}>
                <ChevronRight size={13} color={txt} />
              </button>
            </div>

            <div style={{ fontSize: 11, color: indigo, textAlign: 'center', marginBottom: 10, fontWeight: 600, background: `${indigo}12`, borderRadius: 8, padding: '5px 0' }}>
              {pickStep === 'start'
                ? `📅 ${tr(t, 'calStartDate', "Boshlang'ich sanani tanlang")}`
                : `📅 ${fmtDateLabel(rangeStart)} ${tr(t, 'histCalEndHint', "→ tugash sanasini tanlang")}`}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', marginBottom: 4 }}>
              {WD_LABELS.map(w => (
                <div key={w} style={{ textAlign: 'center', fontSize: 10, color: muted, fontWeight: 700, padding: '2px 0' }}>{w}</div>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2 }}>
              {calCells.map((iso, i) => {
                if (!iso) return <div key={`e-${i}`} />;
                const isFuture = iso > todayIso;
                const isToday = iso === todayIso;
                const edge = isEdge(iso);
                const inRng = isInRange(iso);
                const hasData = hasDataCache[iso] ?? false;
                const bg = edge ? indigo : inRng ? (D ? 'rgba(99,102,241,0.18)' : 'rgba(99,102,241,0.12)') : isToday ? (D ? 'rgba(255,255,255,0.06)' : '#f3f4f6') : 'transparent';
                const clr = edge ? '#fff' : isFuture ? (D ? '#2a2a2a' : '#d1d5db') : txt;
                const brd = edge ? indigo : inRng ? (D ? 'rgba(99,102,241,0.3)' : 'rgba(99,102,241,0.2)') : 'transparent';
                return (
                  <button key={iso} disabled={isFuture}
                    onClick={() => handleCalClick(iso)}
                    onMouseEnter={() => pickStep === 'end' && !isFuture && setHoverDate(iso)}
                    onMouseLeave={() => setHoverDate(null)}
                    style={{
                      display: 'flex', flexDirection: 'column',
                      alignItems: 'center', justifyContent: 'center',
                      width: '100%', height: 34, borderRadius: 7,
                      border: `1.5px solid ${brd}`, background: bg, color: clr,
                      cursor: isFuture ? 'default' : 'pointer',
                      fontSize: 11, fontWeight: (edge || isToday) ? 700 : 400,
                      transition: 'all .1s', gap: 1, padding: 0,
                    }}
                  >
                    <span>{new Date(iso + 'T00:00:00').getDate()}</span>
                    {hasData && !isFuture && (
                      <div style={{ width: 3, height: 3, borderRadius: '50%', background: edge ? '#fff' : green }} />
                    )}
                  </button>
                );
              })}
            </div>

            <div style={{ display: 'flex', gap: 16, marginTop: 12, paddingTop: 10, borderTop: `1px solid ${border}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: indigo }} />
                <span style={{ fontSize: 10, color: muted }}>{tr(t, 'calSelected', 'Tanlangan')}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: green }} />
                <span style={{ fontSize: 10, color: muted }}>{tr(t, 'calHasData', "Ma'lumot bor")}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <>
        <div style={{ display: 'grid', gridTemplateColumns: isSmall ? 'repeat(2,1fr)' : 'repeat(3,1fr)', gap: isMobile ? 8 : 10, marginBottom: 14 }}>
          {[
            { label: doneLabel, value: String(totalDone), color: green, icon: Check },
            { label: pendingLabel, value: String(totalPending), color: amber, icon: Clock },
            { label: sumLabel, value: `${formatNum(totalSum)} ${currency}`, color: indigo, icon: TrendingUp },
          ].map((s, idx) => (
            <div key={s.label} style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: 10, padding: isMobile ? '8px 10px' : '10px 14px', display: 'flex', alignItems: 'center', gap: isMobile ? 6 : 10, gridColumn: isSmall && idx === 2 ? 'span 2' : undefined }}>
              <div style={{ width: isMobile ? 26 : 30, height: isMobile ? 26 : 30, borderRadius: 8, background: `${s.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <s.icon size={isMobile ? 11 : 13} color={s.color} />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: isMobile ? 13 : 14, fontWeight: 700, color: txt, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.value}</div>
                <div style={{ fontSize: isMobile ? 9 : 10, color: muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
          {([
            { id: 'all',     label: tr(t, 'histAll', 'Barchasi'), count: records.length },
            { id: 'done',    label: doneFilterLabel, count: totalDone },
            { id: 'pending', label: pendingLabel, count: totalPending },
          ] as const).map(f => (
            <button key={f.id} onClick={() => setFilter(f.id)} style={{
              padding: '4px 10px', borderRadius: 8, cursor: 'pointer',
              border: `1px solid ${filter === f.id ? indigo : border}`,
              background: filter === f.id ? `${indigo}15` : 'transparent',
              color: filter === f.id ? indigo : muted,
              fontSize: 11, fontWeight: filter === f.id ? 700 : 400,
              display: 'flex', alignItems: 'center', gap: 5,
            }}>
              {f.label}
              <span style={{ fontSize: 10, background: filter === f.id ? `${indigo}20` : D ? 'rgba(255,255,255,0.07)' : '#f3f4f6', borderRadius: 5, padding: '1px 5px' }}>{f.count}</span>
            </button>
          ))}
        </div>

        {isMobile ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filtered.length === 0 ? (
              <div style={{ padding: 32, textAlign: 'center', color: muted, fontSize: 13 }}>
                {loading ? tr(t, 'loading', 'Yuklanmoqda...') : tr(t, 'histNoData', "Ma'lumot yo'q")}
              </div>
            ) : filtered.map((rec, ri) => {
              const isOpen = expandedKey === rec.uid;
              return (
                <div key={rec.uid} style={{
                  background: cardBg, border: `1px solid ${isOpen ? indigo + '55' : border}`,
                  borderRadius: 12, overflow: 'hidden',
                  transition: 'border-color .15s',
                }}>
                  <div
                    onClick={() => setExpandedKey(isOpen ? null : rec.uid)}
                    style={{ padding: '10px 12px', cursor: 'pointer' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 10, color: muted, width: 18, flexShrink: 0, textAlign: 'center' }}>{ri + 1}</span>
                      <div style={{
                        width: 26, height: 26, borderRadius: 7, flexShrink: 0,
                        background: rec.status === 'done' ? `${green}18` : `${amber}18`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {rec.status === 'done'
                          ? (mode === 'delivery' ? <Check size={11} color={green} /> : <ShoppingCart size={11} color={green} />)
                          : <Clock size={11} color={amber} />}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: txt, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {rec.name}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                          {isRange && (
                            <span style={{ fontSize: 10, color: indigo, fontWeight: 600 }}>{fmtDateLabel(rec.dateStr)}</span>
                          )}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                            <MapPin size={9} color={muted} />
                            <span style={{ fontSize: 10, color: muted }}>{rec.district}</span>
                          </div>
                          {rec.time && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                              <Clock size={9} color={muted} />
                              <span style={{ fontSize: 10, color: muted }}>{rec.time}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2, flexShrink: 0 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: rec.status === 'done' ? green : muted }}>
                          {rec.status === 'done' ? `${formatNum(rec.totalSum)}` : '—'}
                        </span>
                        <span style={{ fontSize: 9, color: muted }}>{currency}</span>
                      </div>
                      <div style={{ marginLeft: 4 }}>
                        {isOpen ? <ChevronUp size={13} color={indigo} /> : <ChevronDown size={13} color={muted} />}
                      </div>
                    </div>
                    <div style={{ marginTop: 6, marginLeft: 26 }}>
                      <span style={{
                        fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 6,
                        background: rec.status === 'done' ? `${green}15` : `${amber}15`,
                        color: rec.status === 'done' ? green : amber,
                      }}>
                        {rec.status === 'done' ? statusDone : statusPending}
                      </span>
                    </div>
                  </div>

                  {isOpen && (
                    <div style={{ borderTop: `1px solid ${D ? 'rgba(99,102,241,0.2)' : 'rgba(99,102,241,0.12)'}`, background: D ? 'rgba(99,102,241,0.06)' : 'rgba(99,102,241,0.025)', padding: '10px 12px' }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: indigo, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                        {tr(t, 'histProducts', 'Mahsulotlar')} ({rec.products.length} {tr(t, 'histCountUnit', 'ta')})
                      </div>
                      {rec.products.length === 0 ? (
                        <div style={{ fontSize: 12, color: muted, padding: '8px 0' }}>{tr(t, 'histNoProducts', 'Mahsulot yo‘q')}</div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {rec.products.map((p, pi) => (
                            <div key={pi} style={{
                              background: D ? 'rgba(255,255,255,0.03)' : '#ffffff',
                              border: `1px solid ${D ? 'rgba(255,255,255,0.06)' : '#f0f0f0'}`,
                              borderRadius: 8, padding: '8px 10px',
                            }}>
                              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontSize: 11, fontWeight: 600, color: txt, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.nomi}</div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3 }}>
                                    <span style={{ fontSize: 10, color: indigo, fontFamily: 'monospace', fontWeight: 600 }}>{p.kod}</span>
                                    <span style={{ fontSize: 10, color: muted }}>{p.miqdor} {tr(t, 'histCountUnit', 'ta')} × {formatNum(p.narx)}</span>
                                  </div>
                                </div>
                                <div style={{ fontSize: 12, fontWeight: 700, color: green, whiteSpace: 'nowrap', flexShrink: 0 }}>
                                  {formatNum(p.summa)}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      <div style={{ marginTop: 8, padding: '8px 10px', background: D ? 'rgba(16,185,129,0.10)' : 'rgba(16,185,129,0.07)', borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: txt }}>{tr(t, 'histTotal', 'JAMI')}</span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: green }}>{formatNum(rec.totalSum)} {currency}</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: 12, overflow: 'hidden' }}>

            <div style={{
              display: 'grid',
              gridTemplateColumns: isRange ? '28px 80px 1fr 80px 80px 100px 22px' : '28px 1fr 80px 80px 100px 22px',
              gap: 8, padding: '8px 14px',
              background: D ? 'rgba(255,255,255,0.04)' : '#f3f4f6',
            }}>
              {['#', ...(isRange ? [tr(t, 'histColDate', 'Sana')] : []), tr(t, 'histColClient', 'Mijoz'), tr(t, 'histColDistrict', 'Tuman'), tr(t, 'histColTime', 'Vaqt'), tr(t, 'histColSum', 'Summa'), ''].map((h, i) => (
                <span key={i} style={{ fontSize: 10, fontWeight: 600, color: muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</span>
              ))}
            </div>

            {filtered.length === 0 ? (
              <div style={{ padding: 32, textAlign: 'center', color: muted, fontSize: 13 }}>
                {loading ? tr(t, 'loading', 'Yuklanmoqda...') : tr(t, 'histNoData', "Ma'lumot yo'q")}
              </div>
            ) : filtered.map((rec, ri) => {
              const isOpen = expandedKey === rec.uid;
              return (
                <div key={rec.uid} style={{ borderBottom: ri < filtered.length - 1 ? `1px solid ${D ? 'rgba(255,255,255,0.04)' : '#f5f5f5'}` : 'none' }}>

                  <div
                    onClick={() => setExpandedKey(isOpen ? null : rec.uid)}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: isRange ? '28px 80px 1fr 80px 80px 100px 22px' : '28px 1fr 80px 80px 100px 22px',
                      gap: 8, padding: '10px 14px', alignItems: 'center',
                      cursor: 'pointer',
                      background: isOpen ? (D ? 'rgba(99,102,241,0.08)' : 'rgba(99,102,241,0.04)') : 'transparent',
                      transition: 'background .12s',
                    }}
                    onMouseEnter={e => { if (!isOpen) (e.currentTarget as HTMLElement).style.background = D ? 'rgba(255,255,255,0.03)' : '#fafafa'; }}
                    onMouseLeave={e => { if (!isOpen) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                  >
                    <div style={{ fontSize: 11, color: muted, textAlign: 'center' }}>{ri + 1}</div>

                    {isRange && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <CalendarDays size={10} color={indigo} />
                        <span style={{ fontSize: 11, fontWeight: 600, color: indigo, whiteSpace: 'nowrap' }}>
                          {fmtDateLabel(rec.dateStr)}
                        </span>
                      </div>
                    )}

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                        background: rec.status === 'done' ? `${green}18` : `${amber}18`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {rec.status === 'done'
                          ? (mode === 'delivery' ? <Check size={12} color={green} /> : <ShoppingCart size={12} color={green} />)
                          : <Clock size={12} color={amber} />}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: txt, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {rec.name}
                        </div>
                        <div style={{ fontSize: 10, color: rec.status === 'done' ? green : amber, fontWeight: 600 }}>
                          {rec.status === 'done' ? statusDone : statusPending}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <MapPin size={10} color={muted} />
                      <span style={{ fontSize: 11, color: muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{rec.district}</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Clock size={10} color={muted} />
                      <span style={{ fontSize: 11, color: rec.time ? txt : muted, fontWeight: rec.time ? 600 : 400 }}>
                        {rec.time ?? '—'}
                      </span>
                    </div>

                    <div style={{ fontSize: 11, fontWeight: 600, color: rec.status === 'done' ? txt : muted }}>
                      {rec.status === 'done' ? `${formatNum(rec.totalSum)} ${currency}` : '—'}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {isOpen ? <ChevronUp size={13} color={indigo} /> : <ChevronDown size={13} color={muted} />}
                    </div>
                  </div>

                  {isOpen && (
                    <div style={{ padding: '0 14px 14px', background: D ? 'rgba(99,102,241,0.05)' : 'rgba(99,102,241,0.025)' }}>
                      <div style={{ border: `1px solid ${D ? 'rgba(99,102,241,0.25)' : 'rgba(99,102,241,0.2)'}`, borderRadius: 10, overflow: 'hidden' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '32px 70px 1fr 60px 90px 100px', background: D ? 'rgba(99,102,241,0.18)' : 'rgba(99,102,241,0.1)', borderBottom: `1px solid ${D ? 'rgba(99,102,241,0.2)' : 'rgba(99,102,241,0.15)'}` }}>
                          {['№', tr(t, 'histColCode', 'Kod'), tr(t, 'histColProduct', 'Mahsulot nomi'), tr(t, 'histColQty', 'Miqdor'), tr(t, 'histColPrice', 'Narx'), tr(t, 'histColSum', 'Summa')].map((col, ci) => (
                            <div key={ci} style={{ padding: '7px 10px', fontSize: 10, fontWeight: 700, color: D ? '#a5b4fc' : '#4f46e5', textTransform: 'uppercase', letterSpacing: '0.04em', borderRight: ci < 5 ? `1px solid ${D ? 'rgba(99,102,241,0.15)' : 'rgba(99,102,241,0.1)'}` : 'none' }}>
                              {col}
                            </div>
                          ))}
                        </div>
                        {rec.products.length === 0 ? (
                          <div style={{ padding: 16, textAlign: 'center', fontSize: 12, color: muted }}>{tr(t, 'histNoProducts', 'Mahsulot yo‘q')}</div>
                        ) : rec.products.map((p, pi) => (
                          <div key={pi} style={{ display: 'grid', gridTemplateColumns: '32px 70px 1fr 60px 90px 100px', background: pi % 2 === 0 ? (D ? 'rgba(255,255,255,0.01)' : '#ffffff') : (D ? 'rgba(255,255,255,0.025)' : '#f9fafb'), borderBottom: pi < rec.products.length - 1 ? `1px solid ${D ? 'rgba(255,255,255,0.04)' : '#f0f0f0'}` : 'none' }}>
                            <div style={{ padding: '7px 10px', fontSize: 11, color: muted, textAlign: 'center', borderRight: `1px solid ${D ? 'rgba(255,255,255,0.04)' : '#f0f0f0'}` }}>{p.no}</div>
                            <div style={{ padding: '7px 10px', fontSize: 11, fontWeight: 600, color: indigo, borderRight: `1px solid ${D ? 'rgba(255,255,255,0.04)' : '#f0f0f0'}`, fontFamily: 'monospace' }}>{p.kod}</div>
                            <div style={{ padding: '7px 10px', fontSize: 11, color: txt, borderRight: `1px solid ${D ? 'rgba(255,255,255,0.04)' : '#f0f0f0'}`, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.nomi}</div>
                            <div style={{ padding: '7px 10px', fontSize: 11, fontWeight: 700, color: txt, textAlign: 'center', borderRight: `1px solid ${D ? 'rgba(255,255,255,0.04)' : '#f0f0f0'}` }}>{p.miqdor} <span style={{ fontSize: 9, color: muted, fontWeight: 400 }}>{tr(t, 'histCountUnit', 'ta')}</span></div>
                            <div style={{ padding: '7px 10px', fontSize: 11, color: muted, textAlign: 'right', borderRight: `1px solid ${D ? 'rgba(255,255,255,0.04)' : '#f0f0f0'}` }}>{formatNum(p.narx)}</div>
                            <div style={{ padding: '7px 10px', fontSize: 11, fontWeight: 700, color: green, textAlign: 'right' }}>{formatNum(p.summa)}</div>
                          </div>
                        ))}
                        <div style={{ display: 'grid', gridTemplateColumns: '32px 70px 1fr 60px 90px 100px', background: D ? 'rgba(16,185,129,0.08)' : 'rgba(16,185,129,0.06)', borderTop: `2px solid ${D ? 'rgba(16,185,129,0.3)' : 'rgba(16,185,129,0.2)'}` }}>
                          <div style={{ padding: '7px 10px', gridColumn: '1/5', fontSize: 11, fontWeight: 700, color: txt, borderRight: `1px solid ${D ? 'rgba(255,255,255,0.04)' : '#f0f0f0'}` }}>{tr(t, 'histTotal', 'JAMI')}</div>
                          <div style={{ padding: '7px 10px', fontSize: 11, fontWeight: 700, color: txt, textAlign: 'right', borderRight: `1px solid ${D ? 'rgba(255,255,255,0.04)' : '#f0f0f0'}` }}>{formatNum(rec.products.reduce((s, p) => s + p.miqdor, 0))}</div>
                          <div style={{ padding: '7px 10px', fontSize: 12, fontWeight: 700, color: green, textAlign: 'right' }}>{formatNum(rec.totalSum)} {currency}</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </>
    </div>
  );
}
