import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
  Plus, Search, ChevronDown, ChevronUp,
  ChevronLeft, ChevronRight, Maximize2, Minimize2, X, CalendarDays,
} from 'lucide-react';
import type { ConfirmedOrder } from './TovarYuklashCreateModal';
import { ZayavkaDetailModal } from './ZayavkaDetailModal';
import type { ZayavkaInfo } from './ZayavkaDetailModal';
import { demo } from '../../../../data/demoLimit';
import { api } from '../../../../api/client';
import { backendOrderToZayavka, type ZayavkaRow } from '../../../../utils/orderApi';
import { UrgentDangerIcon } from '../../UrgentDangerIcon';
import { formatDisplayDate, formatDisplayDateTime } from '../../../../utils/dateFormat';

function hasApiToken(): boolean {
  return !!localStorage.getItem('api_access_token');
}

/* ─── Types ────────────────────────────────────────────────── */
type Status    = 'pri' | 'otr' | 'cancelled';
type FilterTab = 'all' | 'notShipped' | 'notProcessed' | 'deleted' | 'vozvrat';

export type Zayavka = ZayavkaRow & { id: string | number };

/* ─── Module-level pure helpers (no state) ──────────────────── */
function parseDateStr(s: string): Date | null {
  const p = s.split(/[.\-/]/);
  if (p.length !== 3) return null;
  return new Date(+p[2], +p[1] - 1, +p[0]);
}
function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() &&
         a.getMonth()    === b.getMonth()    &&
         a.getDate()     === b.getDate();
}
/** Bugungi sana (Toshkent) — soat/daqqa hisobsiz */
function tashkentToday(): Date {
  const ymd = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Tashkent' });
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(y, m - 1, d);
}
function isAfterToday(d: Date, today = tashkentToday()) {
  return d.getFullYear() > today.getFullYear()
    || (d.getFullYear() === today.getFullYear() && d.getMonth() > today.getMonth())
    || (d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth() && d.getDate() > today.getDate());
}
function fmtShort(d: Date) {
  return `${String(d.getDate()).padStart(2,'0')}-${String(d.getMonth()+1).padStart(2,'0')}-${d.getFullYear()}`;
}
function buildGrid(month: Date): (Date | null)[] {
  const y = month.getFullYear(), mo = month.getMonth();
  const offset = (new Date(y, mo, 1).getDay() + 6) % 7;
  const days   = new Date(y, mo + 1, 0).getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < offset; i++) cells.push(null);
  for (let i = 1; i <= days; i++) cells.push(new Date(y, mo, i));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}
/* month/day names are resolved from translation at render time via t.zatCalMonths / t.zatCalDays */

function fmtSum(n: number) {
  if (!n) return '—';
  return n.toLocaleString('ru-RU') + ' сум';
}

/* ─── Demo fallback (backend yo'q bo'lsa) ───────────────────── */
const DEMO_DATA: Zayavka[] = demo([
  { id:1,  orderDate:'11.03.2026', shipDate:'11.03.2026', num:18580, code:'28720', client:'GAYBIYEV MUXRIDDIN',          org:'OOO "BOLG\'ORI"', agent:'Эргашева Д.',  liniya:'13 - Эскиюрт', direction:'SHERIN', fort:'D2', vs:'OnTra', source:'', amount:600508,  klass:'MM-1', otgr:'',      status:'pri', konsDate:'', note:'',          deleted:false, shipped:true,  processed:true, isUrgent:true  },
  { id:2,  orderDate:'11.03.2026', shipDate:'11.03.2026', num:18581, code:'28050', client:'XUMO GULI MCHJ',              org:'OOO "BOLG\'ORI"', agent:'Норова Н.',    liniya:'14 - Янгийўл', direction:'SHERIN', fort:'D2', vs:'OnTra', source:'', amount:0,       klass:'SM-',  otgr:'1 040', status:'otr', konsDate:'', note:'',          deleted:false, shipped:false, processed:true  },
  { id:3,  orderDate:'11.03.2026', shipDate:'11.03.2026', num:18584, code:'28742', client:'7-OSHXONA',                   org:'OOO "BOLG\'ORI"', agent:'Назаров Ш.',   liniya:'27 - Хасан',   direction:'SHERIN', fort:'D2', vs:'OnTra', source:'', amount:0,       klass:'OST',  otgr:'1 039', status:'otr', konsDate:'', note:'',          deleted:false, shipped:false, processed:true  },
  { id:4,  orderDate:'11.03.2026', shipDate:'11.03.2026', num:18585, code:'28014', client:'FARZONA SAVDO BARAKA 2019 OK',org:'OOO "BOLG\'ORI"', agent:'Назаров Ш.',   liniya:'14 - Янгийўл', direction:'SHERIN', fort:'D2', vs:'OnTra', source:'', amount:0,       klass:'OST',  otgr:'',      status:'otr', konsDate:'', note:'',          deleted:false, shipped:false, processed:false },
  { id:5,  orderDate:'11.03.2026', shipDate:'11.03.2026', num:18586, code:'08023', client:'ZARIFJON KELAJAK POYDEVORI XK',org:'OOO "BOLG\'ORI"',agent:'Олимов О.',    liniya:'08 - Бешар.',  direction:'SHERIN', fort:'D2', vs:'OnTra', source:'', amount:836157,  klass:'',     otgr:'1 033', status:'otr', konsDate:'', note:'',          deleted:false, shipped:false, processed:true  },
  { id:6,  orderDate:'11.03.2026', shipDate:'11.03.2026', num:18588, code:'37026', client:'XAYDAROV NAIM YATT',          org:'OOO "BOLG\'ORI"', agent:'Эргашева Д.',  liniya:'13 - Эскиюрт', direction:'SHERIN', fort:'D2', vs:'OnTra', source:'', amount:517960,  klass:'',     otgr:'',      status:'pri', konsDate:'', note:'',          deleted:false, shipped:true,  processed:true  },
  { id:7,  orderDate:'11.03.2026', shipDate:'11.03.2026', num:18589, code:'03090', client:'SARDOR SHOXIJAXON',            org:'OOO "BOLG\'ORI"', agent:'Тухтамиш.',    liniya:'03 - Хатир.',  direction:'SHERIN', fort:'D2', vs:'OnTra', source:'', amount:548708,  klass:'',     otgr:'',      status:'pri', konsDate:'', note:'',          deleted:false, shipped:true,  processed:true  },
  { id:8,  orderDate:'11.03.2026', shipDate:'11.03.2026', num:18590, code:'03089', client:'НОДИРБЕК САМИРБЕК 2020 О.К',  org:'OOO "BOLG\'ORI"', agent:'Тухтамиш.',    liniya:'03 - Хатир.',  direction:'SHERIN', fort:'D2', vs:'OnTra', source:'', amount:1090058, klass:'SM-',  otgr:'',      status:'pri', konsDate:'', note:'',          deleted:false, shipped:true,  processed:true  },
  { id:9,  orderDate:'11.03.2026', shipDate:'11.03.2026', num:18591, code:'03031', client:'ПМУМИНОВА МАВЖУДА',         org:'OOO "BOLG\'ORI"', agent:'Тухтамиш.',    liniya:'03 - Хатир.',  direction:'SHERIN', fort:'D2', vs:'OnTra', source:'', amount:615715,  klass:'',     otgr:'',      status:'pri', konsDate:'', note:'',          deleted:false, shipped:true,  processed:true  },
  { id:10, orderDate:'11.03.2026', shipDate:'11.03.2026', num:18592, code:'03040', client:'ШОХРУХОН ИСТИКБОЛИ ОЛПАБИ',   org:'OOO "BOLG\'ORI"', agent:'Тухтамиш.',    liniya:'03 - Хатир.',  direction:'SHERIN', fort:'D2', vs:'OnTra', source:'', amount:485094,  klass:'',     otgr:'',      status:'pri', konsDate:'', note:'',          deleted:false, shipped:true,  processed:true  },
  { id:11, orderDate:'11.03.2026', shipDate:'11.03.2026', num:18593, code:'15018', client:'ASLAN NAVOIY TONGI',           org:'OOO "BOLG\'ORI"', agent:'Норова Н.',    liniya:'15 - 17-18',   direction:'SHERIN', fort:'D2', vs:'OnTra', source:'', amount:2835223, klass:'',     otgr:'1 040', status:'otr', konsDate:'', note:'bugunga',   deleted:false, shipped:false, processed:true  },
  { id:12, orderDate:'11.03.2026', shipDate:'11.03.2026', num:18595, code:'14030', client:'"NAVOIY RISING" MCHJ',         org:'OOO "BOLG\'ORI"', agent:'Норова Н.',    liniya:'14 - Янгийўл', direction:'SHERIN', fort:'D2', vs:'OnTra', source:'', amount:0,       klass:'OST',  otgr:'1 040', status:'otr', konsDate:'', note:'Бугунга',   deleted:false, shipped:false, processed:true  },
  { id:13, orderDate:'11.03.2026', shipDate:'11.03.2026', num:18598, code:'16011', client:'МУРОДОВА НАБРУЗА',             org:'OOO "BOLG\'ORI"', agent:'Норова Н.',    liniya:'16 - 10-ни.',  direction:'SHERIN', fort:'D2', vs:'OnTra', source:'', amount:651465,  klass:'',     otgr:'1 040', status:'otr', konsDate:'', note:'бугунга',   deleted:false, shipped:false, processed:true  },
  { id:14, orderDate:'11.03.2026', shipDate:'11.03.2026', num:18600, code:'27037', client:'Оилавий Маскан-2 (саклар)',    org:'OOO "BOLG\'ORI"', agent:'Назаров Ш.',   liniya:'27 - Хасан',   direction:'SHERIN', fort:'D2', vs:'OnTra', source:'', amount:302088,  klass:'',     otgr:'1 035', status:'otr', konsDate:'', note:'',          deleted:false, shipped:false, processed:true  },
  { id:15, orderDate:'11.03.2026', shipDate:'11.03.2026', num:18601, code:'23036', client:'ABDUHAMID ASILA ORZUSI',       org:'OOO "TOSHNI."',   agent:'Тошниёз.',     liniya:'23 - Энер.',   direction:'SHERIN', fort:'D2', vs:'OnTra', source:'', amount:947431,  klass:'HRC-', otgr:'1 041', status:'otr', konsDate:'', note:'',          deleted:false, shipped:false, processed:true  },
  { id:16, orderDate:'11.03.2026', shipDate:'11.03.2026', num:18602, code:'27036', client:'KOTTA BOLLAR BURGER',          org:'OOO "BOLG\'ORI"', agent:'Назаров Ш.',   liniya:'27 - Хасан',   direction:'SHERIN', fort:'D2', vs:'OnTra', source:'', amount:0,       klass:'',     otgr:'',      status:'otr', konsDate:'', note:'',          deleted:false, shipped:false, processed:false },
  { id:17, orderDate:'11.03.2026', shipDate:'11.03.2026', num:18603, code:'26006', client:'"XONDAMIR MUHAMMAD"XK',        org:'OOO "BOLG\'ORI"', agent:'Назаров Ш.',   liniya:'27 - Хасан',   direction:'SHERIN', fort:'D2', vs:'OnTra', source:'', amount:3947680, klass:'',     otgr:'1 035', status:'otr', konsDate:'', note:'',          deleted:false, shipped:false, processed:true  },
  { id:18, orderDate:'11.03.2026', shipDate:'11.03.2026', num:18604, code:'03042', client:'DURDONA 2019 O.K',             org:'OOO "BOLG\'ORI"', agent:'Тухтамиш.',    liniya:'03 - Хатир.',  direction:'SHERIN', fort:'D2', vs:'OnTra', source:'', amount:451688,  klass:'',     otgr:'',      status:'pri', konsDate:'', note:'',          deleted:false, shipped:true,  processed:true  },
  { id:19, orderDate:'11.03.2026', shipDate:'11.03.2026', num:18605, code:'03042', client:'АБДУРАХМОНОВ РУСТАМ',          org:'OOO "BOLG\'ORI"', agent:'Тухтамиш.',    liniya:'03 - Хатир.',  direction:'SHERIN', fort:'D2', vs:'OnTra', source:'', amount:2221848, klass:'SM-',  otgr:'',      status:'pri', konsDate:'', note:'Салиги Ан.', deleted:false, shipped:true,  processed:true  },
  { id:20, orderDate:'11.03.2026', shipDate:'11.03.2026', num:18607, code:'03042', client:'"GULCHEXRA AYA ZARINA"XK',     org:'OOO "BOLG\'ORI"', agent:'Тухтамиш.',    liniya:'03 - Хатир.',  direction:'SHERIN', fort:'D2', vs:'OnTra', source:'', amount:2900510, klass:'SM-',  otgr:'',      status:'pri', konsDate:'', note:'',          deleted:false, shipped:true,  processed:true  },
  { id:21, orderDate:'11.03.2026', shipDate:'11.03.2026', num:18608, code:'20036', client:'RAXMATOVA OZODA',              org:'OOO "TOSHNI."',   agent:'Тошниёз.',     liniya:'26 - Спут.',   direction:'SHERIN', fort:'D2', vs:'OnTra', source:'', amount:513337,  klass:'HRC-', otgr:'1 034', status:'otr', konsDate:'', note:'',          deleted:false, shipped:false, processed:true  },
  { id:22, orderDate:'11.03.2026', shipDate:'11.03.2026', num:18609, code:'28934', client:'ASLBEK 2019 OK',               org:'OOO "BOLG\'ORI"', agent:'Норова Н.',    liniya:'14 - Янгийўл', direction:'SHERIN', fort:'D2', vs:'OnTra', source:'', amount:436963,  klass:'MM-',  otgr:'',      status:'pri', konsDate:'', note:'',          deleted:false, shipped:true,  processed:true  },
]);

/* ─── Props ─────────────────────────────────────────────────── */
interface Props {
  D: boolean;
  t: Record<string, string>;
  pendingOrders?: ConfirmedOrder[];
  selectedCompanyIds?: Set<string>;
}

/* ═══════════════════════════════════════════════════════════════
   COMPONENT
════════════════════════════════════════════════════════════════ */
export function ZayavkiPage({ D, t, pendingOrders = [], selectedCompanyIds }: Props) {

  /* ── UI state ── */
  const [tab,          setTab]          = useState<FilterTab>('all');
  const [search,       setSearch]       = useState('');
  const [expanded,     setExpanded]     = useState<string | number | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [detailZayavka, setDetailZayavka] = useState<ZayavkaInfo | null>(null);
  const [apiOrders,    setApiOrders]    = useState<Zayavka[]>([]);
  const [loading,      setLoading]      = useState(false);
  const [loadError,    setLoadError]    = useState<string | null>(null);
  const [backendReady, setBackendReady] = useState(hasApiToken());
  const [returns, setReturns] = useState<Array<{
    id: string;
    orderId: string;
    status: string;
    items: Array<{ productName: string; quantity: number; price: number; isFree?: boolean; promotionId?: string }>;
    totalAmount: number;
    clientName?: string | null;
    clientCode?: string | null;
    note?: string | null;
    createdAt: string;
  }>>([]);
  const [returnsLoading, setReturnsLoading] = useState(false);

  const companyId = selectedCompanyIds?.size === 1
    ? [...selectedCompanyIds][0]
    : undefined;

  const refreshOrders = useCallback(async () => {
    if (!hasApiToken()) {
      setApiOrders([]);
      setBackendReady(false);
      setLoadError(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(null);
    try {
      const raw = await api.getOrders(companyId);
      setApiOrders(raw.filter(o => o.source !== 'van').map(backendOrderToZayavka));
      setBackendReady(true);
    } catch (e) {
      setApiOrders([]);
      setBackendReady(false);
      const msg = e instanceof Error ? e.message : String(e);
      setLoadError(msg);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => { refreshOrders(); }, [refreshOrders]);

  useEffect(() => {
    if (tab !== 'vozvrat' || !hasApiToken()) {
      setReturns([]);
      return;
    }
    let cancelled = false;
    setReturnsLoading(true);
    api.getReturns('pending')
      .then((list) => {
        if (!cancelled) setReturns(list);
      })
      .catch(() => {
        if (!cancelled) setReturns([]);
      })
      .finally(() => {
        if (!cancelled) setReturnsLoading(false);
      });
    return () => { cancelled = true; };
  }, [tab]);

  useEffect(() => {
    const handler = () => { refreshOrders(); };
    window.addEventListener('lider:order-created', handler);
    return () => window.removeEventListener('lider:order-created', handler);
  }, [refreshOrders]);

  /* ── Tooltip state ── */
  const [tooltip, setTooltip] = useState<{ text: string; x: number; y: number } | null>(null);

  /* ── Calendar state ── */
  const [calOpen,   setCalOpen]   = useState(false);
  const [calMonth,  setCalMonth]  = useState(() => tashkentToday());
  const [dateStart, setDateStart] = useState<Date | null>(null);
  const [dateEnd,   setDateEnd]   = useState<Date | null>(null);
  const [hovDate,   setHovDate]   = useState<Date | null>(null);

  /* ── Refs ─ */
  const tableRef   = useRef<HTMLDivElement>(null);
  const fsTableRef = useRef<HTMLDivElement>(null);
  const calWrapRef = useRef<HTMLDivElement>(null);

  /* close calendar on outside click */
  useEffect(() => {
    if (!calOpen) return;
    const handle = (e: MouseEvent) => {
      if (calWrapRef.current && !calWrapRef.current.contains(e.target as Node)) {
        setCalOpen(false);
      }
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [calOpen]);

  /* ── toInfo converter ── */
  const toInfo = (row: Zayavka): ZayavkaInfo => ({
    id: row.id, num: row.num,
    orderDate: row.orderDate, shipDate: row.shipDate,
    client: row.client, org: row.org, agent: row.agent,
    liniya: row.liniya, direction: row.direction,
    fort: row.fort, vs: row.vs, source: row.source,
    amount: row.amount, klass: row.klass, otgr: row.otgr,
    status: row.status, note: row.note, code: row.code, konsDate: row.konsDate,
    items: row.items,
    audit: row.audit,
  });

  /* ── Theme colours ── */
  const bg    = D ? '#0d0d0d' : '#ffffff';
  const card  = D ? '#1c1c1e' : '#ffffff';
  const brd   = D ? '#2a2a2e' : '#e5e7eb';
  const txt   = D ? '#f2f2f7' : '#111827';
  const muted = D ? '#6b7280' : '#9ca3af';
  const hdr   = D ? '#111113' : '#f9fafb';
  const rowH  = D ? '#222226' : '#f5f5f7';

  /* ── Scroll handler ── */
  const scrollTable = (direction: 'left' | 'right') => {
    const ref = isFullscreen ? fsTableRef : tableRef;
    if (ref.current) {
      ref.current.scrollBy({ left: direction === 'right' ? 300 : -300, behavior: 'smooth' });
    }
  };

  /* ── Calendar helpers (inside component to access state) ── */
  const clearDates = () => { setDateStart(null); setDateEnd(null); setCalOpen(false); };

  const handleDayClick = (d: Date) => {
    if (isAfterToday(d)) return;
    if (!dateStart || (dateStart && dateEnd)) {
      setDateStart(d); setDateEnd(null);
    } else {
      if (sameDay(d, dateStart))   { setDateStart(null); }
      else if (d < dateStart)      { setDateEnd(dateStart); setDateStart(d); }
      else                         { setDateEnd(d); }
    }
  };

  const dateLabel = dateStart
    ? dateEnd
      ? `${fmtShort(dateStart)} — ${fmtShort(dateEnd)}`
      : fmtShort(dateStart)
    : (t.zDate ?? 'Sana');

  /* ── Localised calendar labels (from translation system) ── */
  const MONTH_NAMES: string[] = (
    t.zatCalMonths ?? 'Январь,Февраль,Март,Апрель,Май,Июнь,Июль,Август,Сентябрь,Октябрь,Ноябрь,Декабрь'
  ).split(',');
  const DAY_NAMES: string[] = (
    t.zatCalDays ?? 'Пн,Вт,Ср,Чт,Пт,Сб,Вс'
  ).split(',');
  const calTodayLabel = t.zCalToday ?? 'Bugun';
  const calClearLabel = t.zCalClear ?? 'Tozalash';

  /* ── Filter tabs definition ── */
  const TABS: { id: FilterTab; label: string }[] = [
    { id: 'all',          label: t.zAll          ?? 'Все'            },
    { id: 'notShipped',   label: t.zNotShipped   ?? 'Не отгруженные' },
    { id: 'notProcessed', label: t.zNotProcessed ?? 'Не проведенные' },
    { id: 'deleted',      label: t.zDeleted      ?? 'Удалённые'      },
    { id: 'vozvrat',      label: t.zVozvrat      ?? 'Vozvrat'        },
  ];

  /* ── Convert pendingOrders → Zayavka rows ── */
  const pendingRows = useMemo<Zayavka[]>(() =>
    pendingOrders.map((o, i) => ({
      id:        -(i + 1),
      orderDate: o.date,
      shipDate:  o.date,
      num:       99000 + i + 1,
      code:      '—',
      client:    o.agent || '—',
      org:       o.tashkilot,
      agent:     o.agent,
      liniya:    '—',
      direction: o.sklad,
      fort:      '—',
      vs:        '—',
      source:    '—',
      amount:    o.summa,
      klass:     '—',
      otgr:      o.transport,
      status:    'cancelled' as Status,
      konsDate:  '—',
      note:      `${o.rowCount} ta buyurtma · ${o.ves} kg`,
      deleted:   false,
      shipped:   false,
      processed: false,
      items:     [],
    }))
  , [pendingOrders]);

  /* ── Filtered rows ── */
  const rows = useMemo(() => {
    const base = backendReady ? apiOrders : DEMO_DATA;
    let d = base;
    if (tab === 'notShipped')   d = d.filter(r => !r.shipped);
    if (tab === 'notProcessed') d = d.filter(r => !r.processed);
    if (tab === 'deleted')      d = d.filter(r => r.deleted);
    /* date filter */
    if (dateStart) {
      d = d.filter(r => {
        const rd = parseDateStr(r.orderDate);
        if (!rd) return false;
        if (dateEnd) return rd >= dateStart && rd <= dateEnd;
        return sameDay(rd, dateStart);
      });
    }
    /* text search */
    if (search.trim()) {
      const q = search.toLowerCase();
      d = d.filter(r =>
        r.client.toLowerCase().includes(q) ||
        r.agent.toLowerCase().includes(q)  ||
        String(r.num).includes(q)          ||
        String(r.code).toLowerCase().includes(q) ||
        String(r.note).toLowerCase().includes(q) ||
        String(r.source).toLowerCase().includes(q) ||
        String(r.id).toLowerCase().includes(q) ||
        String(r.amount).includes(q)
      );
    }
    return [...pendingRows, ...d].sort((a, b) => Number(!!b.isUrgent) - Number(!!a.isUrgent));
  }, [tab, search, dateStart, dateEnd, pendingRows, apiOrders, backendReady]);

  /* ── Desktop columns ── */
  const COLS = [
    { key: 'orderDate', label: t.zOrderDate ?? 'Дата заказа',  w: 100 },
    { key: 'shipDate',  label: t.zShipDate  ?? 'Дата отгр.',   w: 90  },
    { key: 'num',       label: t.zNum       ?? '№',            w: 88  },
    { key: 'code',      label: t.zCode      ?? 'Код',          w: 60  },
    { key: 'client',    label: t.zClient    ?? 'Контрагент',   w: 200 },
    { key: 'org',       label: t.zOrg       ?? 'Организация',  w: 100 },
    { key: 'agent',     label: t.zAgent     ?? 'Торговый',     w: 110 },
    { key: 'liniya',    label: t.zLine      ?? 'Линия',        w: 120 },
    { key: 'direction', label: t.zDirection ?? 'Направление',  w: 90  },
    { key: 'fort',      label: t.zFort      ?? 'Форт.',        w: 52  },
    { key: 'vs',        label: t.zVS        ?? 'VS',           w: 60  },
    { key: 'source',    label: t.zSource    ?? 'Источ.',       w: 60  },
    { key: 'amount',    label: t.zAmount    ?? 'Сумма',        w: 120, right: true },
    { key: 'klass',     label: t.zClass     ?? 'Класс',        w: 60  },
    { key: 'otgr',      label: t.zShipCol   ?? 'Отгр.',        w: 55  },
    { key: 'status',    label: t.zStatus    ?? 'Стат.',        w: 130 },
    { key: 'konsDate',  label: t.zConsDate  ?? 'Конс.дата',    w: 90  },
    { key: 'note',      label: t.zNote      ?? 'Примеч.',      w: 100 },
  ];

  /* ── Status badge ── */
  const statusBadge = (s: Status) => {
    const bg    = s === 'pri' ? '#3b82f6' : s === 'cancelled' ? '#ef4444' : '#f97316';
    const label = s === 'pri'
      ? (t.zPri ?? 'Qabul qilingan')
      : s === 'cancelled'
        ? (t.zBekor ?? 'Bekor')
        : (t.zOtr ?? 'Yuklangan');
    return (
      <span style={{
        display: 'inline-block', padding: '2px 8px', borderRadius: 4, fontSize: 11,
        background: bg, color: '#fff', fontWeight: 600, letterSpacing: 0.2,
        whiteSpace: 'nowrap',
      }}>
        {label}
      </span>
    );
  };

  const cellVal = (row: Zayavka, key: string) => {
    if (key === 'amount') return fmtSum(row.amount);
    if (key === 'num' && typeof row.id === 'string' && row.id.includes('-')) {
      return row.id.replace(/-/g, '').slice(0, 8).toUpperCase();
    }
    const v = (row as Record<string, unknown>)[key];
    return v ? String(v) : '—';
  };

  /* ═══════════════════════════════════════════
     CALENDAR DROPDOWN
  ════════════════════════════════════════════ */
  const calendarDropdown = (
    <>
      {/* invisible backdrop */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 498 }} onClick={() => setCalOpen(false)} />
      {/* panel */}
      <div style={{
        position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 499,
        background: D ? '#1c1c1e' : '#ffffff',
        border: `1px solid ${brd}`, borderRadius: 12,
        boxShadow: D ? '0 8px 32px rgba(0,0,0,0.7)' : '0 8px 32px rgba(0,0,0,0.14)',
        padding: '14px 16px', minWidth: 262, userSelect: 'none',
      }}>

        {/* ── Month navigation ── */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: 12 }}>
          <button
            onClick={() => setCalMonth(m => new Date(m.getFullYear(), m.getMonth()-1, 1))}
            style={{ background:'none', border:'none', color: txt, cursor:'pointer', padding:'3px 8px', borderRadius: 6, fontSize: 18, lineHeight:1 }}
          >‹</button>
          <span style={{ fontSize: 13, color: txt, fontWeight: 600 }}>
            {MONTH_NAMES[calMonth.getMonth()]} {calMonth.getFullYear()}
          </span>
          {(() => {
            const today = tashkentToday();
            const canNext = calMonth.getFullYear() < today.getFullYear()
              || (calMonth.getFullYear() === today.getFullYear() && calMonth.getMonth() < today.getMonth());
            return (
              <button
                disabled={!canNext}
                onClick={() => {
                  if (!canNext) return;
                  setCalMonth(m => new Date(m.getFullYear(), m.getMonth()+1, 1));
                }}
                style={{
                  background:'none', border:'none',
                  color: canNext ? txt : muted,
                  cursor: canNext ? 'pointer' : 'default',
                  padding:'3px 8px', borderRadius: 6, fontSize: 18, lineHeight:1,
                  opacity: canNext ? 1 : 0.35,
                }}
              >›</button>
            );
          })()}
        </div>

        {/* ── Day-of-week labels ── */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap: 2, marginBottom: 4 }}>
          {DAY_NAMES.map(dn => (
            <div key={dn} style={{ textAlign:'center', fontSize: 10, color: muted, padding: '2px 0' }}>{dn}</div>
          ))}
        </div>

        {/* ── Day cells ── */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap: 2 }}>
          {buildGrid(calMonth).map((day, idx) => {
            if (!day) return <div key={`e-${idx}`} />;

            const todayD   = tashkentToday();
            const disabled = isAfterToday(day, todayD);
            const isStart  = !!(dateStart && sameDay(day, dateStart));
            const isEnd    = !!(dateEnd   && sameDay(day, dateEnd));
            const isToday  = sameDay(day, todayD);

            /* hover-preview end — kelajak kunlar hisobga olinmaydi */
            const hovOk  = hovDate && !isAfterToday(hovDate, todayD) ? hovDate : null;
            const effEnd = dateEnd ?? (dateStart && hovOk && hovOk > dateStart ? hovOk : null);
            const inRng  = !!(dateStart && effEnd && day > dateStart && day < effEnd);

            const isSel  = isStart || isEnd;
            const cellBg =
              disabled ? 'transparent'
              : isSel   ? '#6366f1'
              : inRng ? (D ? '#3730a3' : '#e0e7ff')
              : !!(hovOk && sameDay(day, hovOk)) ? (D ? '#2a2a2e' : '#f3f4f6')
              : 'transparent';

            return (
              <button
                key={`d-${idx}`}
                disabled={disabled}
                onClick={() => handleDayClick(day)}
                onMouseEnter={() => { if (!disabled) setHovDate(day); }}
                onMouseLeave={() => setHovDate(null)}
                style={{
                  background: cellBg,
                  border: isToday && !isSel ? `1px solid #6366f1` : '1px solid transparent',
                  borderRadius: 6,
                  color: disabled
                    ? (D ? '#3f3f46' : '#d1d5db')
                    : isSel ? '#fff' : (D ? '#f2f2f7' : '#111827'),
                  cursor: disabled ? 'not-allowed' : 'pointer',
                  fontSize: 12,
                  padding: '5px 2px', textAlign: 'center',
                  transition: 'background 0.1s',
                  opacity: disabled ? 0.45 : 1,
                }}
              >
                {day.getDate()}
              </button>
            );
          })}
        </div>

        {/* ── Footer ── */}
        <div style={{ marginTop: 12, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <button
            onClick={() => setCalMonth(tashkentToday())}
            style={{ background:'none', border:'none', color: muted, cursor:'pointer', fontSize: 11 }}
          >
            {calTodayLabel}
          </button>
          {(dateStart || dateEnd) && (
            <button
              onClick={clearDates}
              style={{
                background: D ? '#2a2a2e' : '#f3f4f6',
                border:'none', borderRadius: 6,
                color: txt, cursor:'pointer', fontSize: 11,
                padding: '4px 10px',
              }}
            >
              ✕ {calClearLabel}
            </button>
          )}
        </div>
      </div>
    </>
  );

  /* ═══════════════════════════════════════════
     SHARED: TOOLBAR
  ════════════════════════════════════════════ */
  const toolbarRow = (
    <div style={{
      display: 'flex', gap: 8, padding: '10px 12px',
      background: card, borderBottom: `1px solid ${brd}`,
      flexWrap: 'wrap', alignItems: 'center',
    }}>
      {/* Create */}
      <button style={{
        display:'flex', alignItems:'center', gap: 5,
        padding:'6px 14px', borderRadius: 8, border:'none',
        background:'#6366f1', color:'#fff', fontSize: 13, cursor:'pointer', whiteSpace:'nowrap',
      }}>
        <Plus size={14} strokeWidth={2.5} />
        <span>{t.zCreate ?? 'Создать'}</span>
      </button>

      {/* Search */}
      <div style={{
        flex:1, minWidth:140, maxWidth:260,
        display:'flex', alignItems:'center', gap: 7,
        background: D ? '#111113' : '#f3f4f6',
        border:`1px solid ${brd}`, borderRadius: 8,
        padding:'0 10px', height: 34,
      }}>
        <Search size={13} color={muted} strokeWidth={2} />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={t.zSearch ?? 'Поиск...'}
          style={{ flex:1, background:'none', border:'none', outline:'none', color: txt, fontSize: 13 }}
        />
      </div>

      {/* Calendar button + dropdown */}
      <div ref={calWrapRef} style={{ position:'relative' }}>
        <button
          onClick={() => setCalOpen(o => !o)}
          style={{
            display:'flex', alignItems:'center', gap: 6,
            padding:'0 12px', height: 34, borderRadius: 8,
            border:`1px solid ${(calOpen || dateStart) ? '#6366f1' : brd}`,
            background: (calOpen || dateStart)
              ? (D ? '#1e1b4b' : '#ede9fe')
              : (D ? '#1c1c1e' : '#f9fafb'),
            color: (calOpen || dateStart) ? '#6366f1' : txt,
            cursor:'pointer', fontSize: 12, whiteSpace:'nowrap',
            transition:'all 0.15s',
          }}
        >
          <CalendarDays size={14} strokeWidth={2} />
          <span>{dateLabel}</span>
          {dateStart && (
            <span
              onClick={e => { e.stopPropagation(); clearDates(); }}
              style={{ marginLeft:2, color: muted, fontSize:15, lineHeight:1, cursor:'pointer' }}
            >×</span>
          )}
        </button>
        {calOpen && calendarDropdown}
      </div>

      {/* Row count */}
      <span style={{ fontSize:12, color: muted, marginLeft:'auto' }}>
        {loading
          ? (t.loading ?? 'Yuklanmoqda...')
          : `${rows.length} ${t.zRowCount ?? 'ta'}`}
      </span>
    </div>
  );

  /* ══════════════════════════════════════════
     SHARED: SCROLL + FULLSCREEN BUTTONS
  ════════════════════════════════════════════ */
  const navButtons = (
    <div className="nav-desktop-only" style={{ display:'flex', gap: 6, paddingLeft: 8 }}>
      {([['left', ChevronLeft], ['right', ChevronRight]] as const).map(([dir, Icon]) => (
        <button
          key={dir}
          onClick={() => scrollTable(dir)}
          style={{
            display:'flex', alignItems:'center', justifyContent:'center',
            width:28, height:28, borderRadius:6,
            border:`1px solid ${brd}`,
            background: D ? '#1c1c1e' : '#fff',
            color: txt, cursor:'pointer', transition:'background 0.15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = D ? '#222226' : '#f5f5f7')}
          onMouseLeave={e => (e.currentTarget.style.background = D ? '#1c1c1e' : '#fff')}
        >
          <Icon size={16} strokeWidth={2} />
        </button>
      ))}
      <button
        onClick={() => setIsFullscreen(f => !f)}
        title={isFullscreen ? 'Kichraytirish' : "To'liq ekran"}
        style={{
          display:'flex', alignItems:'center', justifyContent:'center',
          width:28, height:28, borderRadius:6,
          border:`1px solid ${brd}`,
          background: isFullscreen ? '#6366f1' : (D ? '#1c1c1e' : '#fff'),
          color: isFullscreen ? '#fff' : txt,
          cursor:'pointer', transition:'background 0.15s, color 0.15s',
        }}
        onMouseEnter={e => { if (!isFullscreen) e.currentTarget.style.background = D ? '#222226' : '#f5f5f7'; }}
        onMouseLeave={e => { if (!isFullscreen) e.currentTarget.style.background = D ? '#1c1c1e' : '#fff'; }}
      >
        {isFullscreen ? <Minimize2 size={14} strokeWidth={2} /> : <Maximize2 size={14} strokeWidth={2} />}
      </button>
    </div>
  );

  /* ═══════════════════════════════════════════
     SHARED: FILTER TABS ROW
  ════════════════════════════════════════════ */
  const filterTabsRow = (
    <div style={{ background: card, borderBottom:`1px solid ${brd}` }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap: 8, padding:'0 12px' }}>
        <div className="filter-tabs-scroll" style={{ display:'flex', overflowX:'auto', scrollbarWidth:'none', gap:0, flex:1 }}>
          {TABS.map(tb => {
            const active = tab === tb.id;
            return (
              <button key={tb.id} onClick={() => setTab(tb.id)} style={{
                padding:'11px 14px', background:'none', border:'none',
                borderBottom: active ? '2px solid #6366f1' : '2px solid transparent',
                color: active ? '#6366f1' : muted,
                cursor:'pointer', fontSize:13, whiteSpace:'nowrap',
                transition:'color 0.15s, border-color 0.15s',
              }}>{tb.label}</button>
            );
          })}
        </div>
        {navButtons}
      </div>
    </div>
  );

  /* ═══════════════════════════════════════════
     SHARED: TABLE INNER
  ════════════════════════════════════════════ */
  const tableInner = (refTarget: React.RefObject<HTMLDivElement>) => (
    <div ref={refTarget} style={{ flex:1, overflowX:'auto', background: card }}>
      <table style={{ borderCollapse:'collapse', fontSize:12, width:'100%', minWidth:1400 }}>
        <thead>
          <tr style={{ background: hdr, borderBottom:`2px solid ${brd}`, position:'sticky', top:0, zIndex:2 }}>
            {COLS.map(c => (
              <th key={c.key} style={{
                padding:'8px 8px', textAlign: c.right ? 'right' : 'left',
                color: muted, fontWeight:600, fontSize:11, textTransform:'uppercase',
                whiteSpace:'nowrap', width: c.w, minWidth: c.w,
                borderRight:`1px solid ${brd}`,
              }}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr
              key={row.id}
              style={{
                borderBottom:`1px solid ${brd}`, cursor:'pointer', transition:'background 0.1s',
                background: row.isUrgent
                  ? 'rgba(239,68,68,0.08)'
                  : row.status === 'cancelled' ? 'rgba(239,68,68,0.07)' : 'transparent',
                boxShadow: row.isUrgent ? 'inset 3px 0 0 #ef4444' : undefined,
              }}
              onClick={() => setDetailZayavka(toInfo(row))}
              onMouseEnter={e => (e.currentTarget.style.background = row.isUrgent
                ? 'rgba(239,68,68,0.14)'
                : row.status === 'cancelled' ? 'rgba(239,68,68,0.13)' : rowH)}
              onMouseLeave={e => (e.currentTarget.style.background = row.isUrgent
                ? 'rgba(239,68,68,0.08)'
                : row.status === 'cancelled' ? 'rgba(239,68,68,0.07)' : 'transparent')}
            >
              {COLS.map(c => (
                <td key={c.key} style={{
                  padding:'7px 8px',
                  textAlign: c.right ? 'right' : 'left',
                  color: c.key === 'amount' ? '#10b981'
                       : c.key === 'num' || c.key === 'code' ? muted
                       : txt,
                  whiteSpace:'nowrap', borderRight:`1px solid ${brd}`, fontSize:12,
                  maxWidth: c.key === 'client' ? 200 : undefined,
                  overflow: c.key === 'status' ? 'visible' : 'hidden',
                  textOverflow: c.key === 'status' ? 'clip' : 'ellipsis',
                }}>
                  {c.key === 'status'
                    ? (
                      <span style={{ display:'inline-flex', alignItems:'center', gap:6 }}>
                        {row.isUrgent && <UrgentDangerIcon title="Shoshilinch" size="sm" />}
                        {statusBadge(row.status)}
                      </span>
                    )
                    : c.key === 'client'
                      ? (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            borderBottom: `2px solid ${row.isUrgent ? '#ef4444' : row.status === 'pri' ? '#3b82f6' : '#f97316'}`,
                            paddingBottom: 1,
                            maxWidth: 190,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            verticalAlign: 'bottom',
                            cursor: 'default',
                            color: row.isUrgent ? '#dc2626' : undefined,
                            fontWeight: row.isUrgent ? 700 : undefined,
                          }}
                          onMouseEnter={e => {
                            const el = e.currentTarget;
                            if (el.scrollWidth > el.clientWidth) {
                              const r = el.getBoundingClientRect();
                              setTooltip({ text: row.client, x: r.left, y: r.bottom + 6 });
                            }
                          }}
                          onMouseLeave={() => setTooltip(null)}
                        >
                          {row.isUrgent && <UrgentDangerIcon title="Shoshilinch" size="sm" />}
                          {row.client}
                        </span>
                      )
                      : c.key === 'num'
                        ? (
                          <span style={{
                            display:'inline-flex', alignItems:'center', gap:5,
                            color: row.isUrgent ? '#dc2626' : muted,
                            fontWeight: row.isUrgent ? 700 : undefined,
                          }}>
                            {row.isUrgent && <UrgentDangerIcon title="Shoshilinch" size="sm" />}
                            {cellVal(row, c.key)}
                          </span>
                        )
                      : (() => {
                          const val = cellVal(row, c.key);
                          return (
                            <span
                              style={{
                                display: 'inline-block',
                                maxWidth: c.w ? c.w - 16 : undefined,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                verticalAlign: 'bottom',
                                cursor: 'default',
                              }}
                              onMouseEnter={e => {
                                const el = e.currentTarget;
                                if (el.scrollWidth > el.clientWidth) {
                                  const r = el.getBoundingClientRect();
                                  setTooltip({ text: val, x: r.left, y: r.bottom + 6 });
                                }
                              }}
                              onMouseLeave={() => setTooltip(null)}
                            >
                              {val}
                            </span>
                          );
                        })()
                  }
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 && (
        <div style={{ textAlign:'center', padding:'48px 0', color: muted, fontSize:13 }}>— Нет данных —</div>
      )}
    </div>
  );

  /* ═══════════════════════════════════════════
     RENDER
  ════════════════════════════════════════════ */
  return (
    <>
      <style>{`
        @media (min-width: 768px) {
          .desktop-only { display: flex !important; }
          .mobile-only  { display: none !important; }
        }
        @media (max-width: 767px) {
          .desktop-only { display: none !important; }
          .mobile-only  { display: flex !important; }
        }
        .fs-overlay {
          position: fixed; inset: 0; z-index: 9999;
          display: flex; flex-direction: column;
          animation: fsIn 0.18s ease;
        }
        @keyframes fsIn {
          from { opacity: 0; transform: scale(0.98); }
          to   { opacity: 1; transform: scale(1); }
        }
        .nav-desktop-only { display: flex; }
        @media (max-width: 767px) {
          .nav-desktop-only { display: none !important; }
        }
        .filter-tabs-scroll::-webkit-scrollbar { display: none; }
        @media (max-width: 767px) {
          .filter-tabs-scroll {
            flex-wrap: wrap !important;
          }
          .filter-tabs-scroll button {
            flex: 1 1 50% !important;
            min-width: 0 !important;
            text-align: center !important;
            font-size: 12px !important;
            padding: 9px 4px !important;
            justify-content: center;
          }
        }
      `}</style>

      {/* ── TOOLTIP ── */}
      {tooltip && (
        <div style={{
          position: 'fixed',
          left: Math.min(tooltip.x, window.innerWidth - 280),
          top: tooltip.y,
          zIndex: 99999,
          background: D ? '#2a2a2e' : '#1c1c1e',
          color: '#f2f2f7',
          padding: '6px 10px',
          borderRadius: 7,
          fontSize: 12,
          maxWidth: 260,
          whiteSpace: 'normal',
          wordBreak: 'break-word',
          boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
          pointerEvents: 'none',
          border: `1px solid ${D ? '#3a3a3e' : '#3a3a3e'}`,
          lineHeight: 1.4,
        }}>
          {tooltip.text}
        </div>
      )}

      {/* ══ FULLSCREEN OVERLAY ══ */}
      {isFullscreen && (
        <div className="fs-overlay" style={{ background: bg }}>
          {/* FS top bar */}
          <div style={{
            display:'flex', alignItems:'center', justifyContent:'space-between',
            padding:'0 12px', background: card, borderBottom:`1px solid ${brd}`,
            height:44, flexShrink:0,
          }}>
            <span style={{ fontSize:13, color: txt, fontWeight:600 }}>
              {t.zayavki ?? 'Zayavkalar'}&nbsp;
              <span style={{ color: muted, fontWeight:400 }}>— {rows.length}</span>
            </span>
            <div style={{ display:'flex', gap:6 }}>
              {navButtons}
              <button
                onClick={() => setIsFullscreen(false)}
                style={{
                  display:'flex', alignItems:'center', justifyContent:'center',
                  width:28, height:28, borderRadius:6,
                  border:`1px solid ${brd}`,
                  background: D ? '#1c1c1e' : '#fff',
                  color: txt, cursor:'pointer', marginLeft:4,
                }}
              >
                <X size={15} strokeWidth={2} />
              </button>
            </div>
          </div>
          {/* filter tabs */}
          <div style={{ background: card, borderBottom:`1px solid ${brd}`, flexShrink:0 }}>
            <div style={{ display:'flex', overflowX:'auto', scrollbarWidth:'none', padding:'0 12px' }}>
              {TABS.map(tb => {
                const active = tab === tb.id;
                return (
                  <button key={tb.id} onClick={() => setTab(tb.id)} style={{
                    padding:'10px 14px', background:'none', border:'none',
                    borderBottom: active ? '2px solid #6366f1' : '2px solid transparent',
                    color: active ? '#6366f1' : muted,
                    cursor:'pointer', fontSize:13, whiteSpace:'nowrap',
                    transition:'color 0.15s, border-color 0.15s',
                  }}>{tb.label}</button>
                );
              })}
            </div>
          </div>
          {toolbarRow}
          <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
            {tableInner(fsTableRef)}
          </div>
        </div>
      )}

      {/* ══ NORMAL VIEW ══ */}
      <div
        className={`flex flex-col flex-1 min-h-0 rounded-2xl border overflow-hidden ${D ? 'border-gray-800' : 'border-gray-200'}`}
        style={{ background: card }}
      >
        {loadError && (
          <div style={{
            padding: '8px 12px', fontSize: 12,
            background: D ? 'rgba(239,68,68,0.12)' : '#fef2f2',
            color: D ? '#fca5a5' : '#b91c1c',
            borderBottom: `1px solid ${brd}`,
          }}>
            {loadError}
          </div>
        )}
        {filterTabsRow}
        {tab !== 'vozvrat' && toolbarRow}

        {tab === 'vozvrat' ? (
          <div style={{ flex: 1, overflow: 'auto', padding: 12 }}>
            {returnsLoading && <div style={{ color: muted, padding: 16 }}>…</div>}
            {!returnsLoading && returns.length === 0 && (
              <div style={{ color: muted, padding: 24, textAlign: 'center' }}>
                {t.zVozvratEmpty ?? 'Vozvrat so\'rovlari yo\'q'}
              </div>
            )}
            {returns.map((r) => (
              <div
                key={r.id}
                style={{
                  background: card,
                  border: `1px solid ${brd}`,
                  borderRadius: 12,
                  padding: 14,
                  marginBottom: 10,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
                  <div>
                    <div style={{ fontWeight: 600, color: txt }}>
                      {r.clientName ?? 'Klient'} {r.clientCode ? `(${r.clientCode})` : ''}
                    </div>
                    <div style={{ fontSize: 12, color: muted }}>
                      {formatDisplayDateTime(r.createdAt)} · {Math.round(r.totalAmount).toLocaleString()} сум
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      type="button"
                      onClick={async () => {
                        await api.acceptReturn(r.id);
                        setReturns((prev) => prev.filter((x) => x.id !== r.id));
                      }}
                      style={{
                        border: 'none',
                        background: '#22c55e',
                        color: '#fff',
                        borderRadius: 8,
                        padding: '6px 12px',
                        cursor: 'pointer',
                        fontSize: 12,
                      }}
                    >
                      {t.zAccept ?? 'Qabul'}
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        await api.rejectReturn(r.id);
                        setReturns((prev) => prev.filter((x) => x.id !== r.id));
                      }}
                      style={{
                        border: `1px solid ${brd}`,
                        background: 'transparent',
                        color: muted,
                        borderRadius: 8,
                        padding: '6px 12px',
                        cursor: 'pointer',
                        fontSize: 12,
                      }}
                    >
                      {t.zReject ?? 'Rad'}
                    </button>
                  </div>
                </div>
                {r.items.map((it, i) => (
                  <div key={i} style={{ fontSize: 12, color: muted }}>
                    • {it.productName} × {it.quantity}
                    {(it.promotionId || it.isFree) && (
                      <span style={{ marginLeft: 6, color: '#7c3aed', fontWeight: 600 }}>
                        Aksiya{it.isFree || Number(it.price) === 0 ? ' · tekin' : ` · ${Number(it.price).toLocaleString('ru-RU')}`}
                      </span>
                    )}
                  </div>
                ))}
                {r.note && (
                  <div style={{ fontSize: 12, color: muted, marginTop: 6 }}>{r.note}</div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <>
        {/* DESKTOP TABLE */}
        <div className="desktop-only" style={{ flex:1, display:'none', flexDirection:'column', minHeight:0 }}>
          {tableInner(tableRef)}
        </div>

        {/* MOBILE CARDS */}
        <div
          className="mobile-only"
          style={{ flex:1, overflowY:'auto', padding:'8px 10px', display:'none', flexDirection:'column', gap:6 }}
        >
          {rows.map(row => {
            const open = expanded === row.id;
            return (
              <div key={row.id} style={{
                background: row.isUrgent
                  ? 'rgba(239,68,68,0.08)'
                  : row.status === 'cancelled' ? 'rgba(239,68,68,0.07)' : card,
                borderRadius:12,
                border: row.isUrgent
                  ? '1px solid rgba(239,68,68,0.45)'
                  : row.status === 'cancelled' ? '1px solid rgba(239,68,68,0.35)' : `1px solid ${brd}`,
                overflow:'hidden',
                boxShadow: row.isUrgent ? 'inset 3px 0 0 #ef4444' : undefined,
              }}>
                <button
                  onClick={() => setExpanded(open ? null : row.id)}
                  style={{ width:'100%', background:'none', border:'none', padding:'10px 12px', cursor:'pointer', textAlign:'left' }}
                >
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:6 }}>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{
                        fontSize:13, color: row.isUrgent ? '#dc2626' : txt, marginBottom:2,
                        overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
                        borderBottom: `2px solid ${row.isUrgent ? '#ef4444' : row.status === 'pri' ? '#3b82f6' : '#f97316'}`,
                        paddingBottom: 3,
                        fontWeight: row.isUrgent ? 700 : undefined,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                      }}>
                        {row.isUrgent && <UrgentDangerIcon title="Shoshilinch" size="sm" />}
                        {row.client}
                      </div>
                      <div style={{ display:'flex', gap:6, alignItems:'center', flexWrap:'wrap' }}>
                        {row.isUrgent && (
                          <span style={{
                            display:'inline-flex', alignItems:'center', gap:4,
                            fontSize:10, fontWeight:700, color:'#ef4444',
                            background:'rgba(239,68,68,0.1)', borderRadius:999, padding:'2px 8px',
                          }}>
                            <UrgentDangerIcon title="Shoshilinch" size="sm" />
                            Shoshilinch
                          </span>
                        )}
                        <span style={{ fontSize:11, color: muted }}>
                          #{typeof row.id === 'string' && row.id.includes('-')
                            ? row.id.replace(/-/g, '').slice(0, 8).toUpperCase()
                            : row.num}
                        </span>
                        <span style={{ fontSize:11, color: muted }}>{formatDisplayDate(row.orderDate)}</span>
                        <span style={{ fontSize:11, color: muted }}>{row.agent}</span>
                      </div>
                    </div>
                    <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:4, flexShrink:0 }}>
                      {statusBadge(row.status)}
                      <span style={{ fontSize:13, color:'#10b981' }}>{fmtSum(row.amount)}</span>
                    </div>
                    <div style={{ color: muted, marginLeft:4, alignSelf:'center', flexShrink:0 }}>
                      {open ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                    </div>
                  </div>
                </button>
                {open && (
                  <div style={{ borderTop:`1px solid ${brd}`, padding:'8px 12px', display:'flex', flexDirection:'column', gap:5 }}>
                    {[
                      { label: t.zOrg       ?? 'Организация', val: row.org          },
                      { label: t.zLine      ?? 'Линия',        val: row.liniya       },
                      { label: t.zDirection ?? 'Направление',  val: row.direction    },
                      { label: t.zFort      ?? 'Форт.',        val: row.fort         },
                      { label: t.zVS        ?? 'VS',           val: row.vs           },
                      { label: t.zClass     ?? 'Класс',        val: row.klass || '—' },
                      { label: t.zShipCol   ?? 'Отгр.',        val: row.otgr  || '—' },
                      { label: t.zConsDate  ?? 'Конс.дата',    val: row.konsDate || '—' },
                      { label: t.zNote      ?? 'Примеч.',      val: row.note  || '—' },
                    ].map(item => (
                      <div key={item.label} style={{ display:'flex', justifyContent:'space-between', gap:8 }}>
                        <span style={{ fontSize:11, color: muted }}>{item.label}</span>
                        <span style={{ fontSize:11, color: txt, textAlign:'right' }}>{item.val}</span>
                      </div>
                    ))}
                    <button
                      onClick={() => setDetailZayavka(toInfo(row))}
                      style={{
                        marginTop: 4, width: '100%', padding: '8px 12px', borderRadius: 8,
                        border: '1px solid rgba(99,102,241,0.3)',
                        background: 'rgba(99,102,241,0.1)', color: '#6366f1',
                        cursor: 'pointer', fontSize: 12, fontWeight: 600,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                      }}
                    >
                      📦 {t.zdTabTovar ?? 'Товарлар'}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
          {rows.length === 0 && (
            <div style={{ textAlign:'center', padding:'60px 0', color: muted, fontSize:13 }}>
              — {t.zSearch?.replace('...', '') ?? 'Нет данных'} —
            </div>
          )}
        </div>
          </>
        )}
      </div>

      {/* ── DETAIL MODAL ── */}
      {detailZayavka && (
        <ZayavkaDetailModal
          zayavka={detailZayavka}
          D={D}
          t={t}
          onClose={() => setDetailZayavka(null)}
        />
      )}
    </>
  );
}