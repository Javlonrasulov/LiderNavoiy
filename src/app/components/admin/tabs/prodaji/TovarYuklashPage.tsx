import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
  Plus, Search, ChevronDown, ChevronUp,
  ChevronLeft, ChevronRight, Maximize2, Minimize2, X,
  CalendarDays, Truck, PackageCheck, RefreshCw, Download,
} from 'lucide-react';
import { TovarYuklashCreateModal, ConfirmedOrder } from './TovarYuklashCreateModal';
import { demo } from '../../../../data/demoLimit';
import { api, type Distributor } from '../../../../api/client';
import { backendOrderToOtgr, type OtgrApiRow } from '../../../../utils/orderApi';

function hasApiToken(): boolean {
  return !!localStorage.getItem('api_access_token');
}

function isDeliveryPerson(d: Distributor): boolean {
  const p = (d.position ?? '').toLowerCase();
  return p.includes('delivery') || p.includes('yetkaz') || p.includes('kuryer')
    || p.includes('dostav') || p.includes('haydov');
}

/* ─── Types ───────────────────────────────────────────────── */
type OtgrStatus  = 'process' | 'done' | 'cancelled';
type FilterTab   = 'all' | 'process' | 'done' | 'cancelled';

interface OtgrRow {
  id: string | number;
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
  status: OtgrStatus;
  summa: number;
  ves: number;
  exid: string;
  direction: string;
  timeOtgr: string;
  author: string;
  needsDriver?: boolean;
  backendStatus?: string;
}

/* ─── Helpers ─────────────────────────────────────────────── */
function parseDateStr(s: string): Date | null {
  const p = s.split('.');
  if (p.length !== 3) return null;
  return new Date(+p[2], +p[1] - 1, +p[0]);
}
function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() &&
         a.getMonth()    === b.getMonth()    &&
         a.getDate()     === b.getDate();
}
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
  return `${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}.${d.getFullYear()}`;
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
function fmtSum(n: number) {
  if (!n) return '—';
  return n.toLocaleString('ru-RU');
}
function fmtVes(n: number) {
  if (!n) return '—';
  return n.toLocaleString('ru-RU');
}

/* ─── Mock data ───────────────────────────────────────────── */
const DATA: OtgrRow[] = demo([
  { id:1, date:'10.03.2026', num:1021, transport:'DAMAS (VAN) 01 9...', driver:'Садуллаев Шухра.',  reys:2,  kolTT:11, kol3k:11, obrn:0,  neobr:0,  term:'0/0', otgr:0,  status:'done',      summa:19_749_933, ves:303000, exid:'10.', direction:'SHERIN', timeOtgr:'10.03.2026 14:53', author:'Зарипов Б.' },
  { id:2, date:'10.03.2026', num:1022, transport:'DAMAS (VAN) 85 9...', driver:'Буронов Феруз',     reys:2,  kolTT:5,  kol3k:5,  obrn:0,  neobr:0,  term:'0/0', otgr:0,  status:'done',      summa:22_536_972, ves:348000, exid:'10.', direction:'SHERIN', timeOtgr:'10.03.2026 15:1..', author:'Зарипов Б.' },
  { id:3, date:'10.03.2026', num:1023, transport:'DAMAS (VAN) 01 5...', driver:'Иргашев Азизхон.',  reys:4,  kolTT:1,  kol3k:1,  obrn:0,  neobr:0,  term:'0/0', otgr:0,  status:'done',      summa:3_375_256,  ves:0,      exid:'10.', direction:'SHERIN', timeOtgr:'10.03.2026 15:4..', author:'Зарипов Б.' },
  { id:4, date:'11.03.2026', num:1024, transport:'DAMAS (VAN) 60 R...', driver:'Тухтапилов Умрз.',  reys:1,  kolTT:2,  kol3k:2,  obrn:2,  neobr:0,  term:'0/0', otgr:0,  status:'process',   summa:4_145_093,  ves:83000,  exid:'11.', direction:'SHERIN', timeOtgr:'11.03.2026 8:10',  author:'Зарипов Б.' },
  { id:5, date:'11.03.2026', num:1025, transport:'DAMAS (VAN) 01 5 797 LC', driver:'Тошниёзов Сунн.', reys:1, kolTT:0, kol3k:0, obrn:0, neobr:0, term:'0/0', otgr:0, status:'process',   summa:1_167_670,  ves:0,      exid:'11.', direction:'SHERIN', timeOtgr:'11.03.2026 9:...',  author:'Зарипов Б.' },
  { id:6, date:'11.03.2026', num:1026, transport:'DAMAS (LABO) 01 5...', driver:'Назаров Давлатб.',  reys:1,  kolTT:1,  kol3k:1,  obrn:1,  neobr:0,  term:'0/0', otgr:0,  status:'process',   summa:4_105_987,  ves:81000,  exid:'11.', direction:'SHERIN', timeOtgr:'11.03.2026 9:13',  author:'Зарипов Б.' },
  { id:7, date:'11.03.2026', num:1027, transport:'JAG 01 912 BNA',      driver:'Тошниёзов Шахзод',  reys:1,  kolTT:30, kol3k:30, obrn:30, neobr:0,  term:'0/0', otgr:0,  status:'process',   summa:89_749_878, ves:0,      exid:'11.', direction:'SHERIN', timeOtgr:'11.03.2026 9:...',  author:'Зарипов Б.' },
  { id:8, date:'11.03.2026', num:1028, transport:'DAMAS (VAN) 01 5...', driver:'Иргашев Азизхон.',  reys:1,  kolTT:2,  kol3k:2,  obrn:2,  neobr:0,  term:'0/0', otgr:0,  status:'process',   summa:2_640_225,  ves:34000,  exid:'11.', direction:'SHERIN', timeOtgr:'11.03.2026 9:22',  author:'Зарипов Б.' },
  { id:9, date:'11.03.2026', num:1029, transport:'DAMAS (VAN) 01 8...', driver:'Буронов Феруз',     reys:1,  kolTT:1,  kol3k:1,  obrn:1,  neobr:0,  term:'0/0', otgr:0,  status:'process',   summa:30_278_937, ves:0,      exid:'11.', direction:'SHERIN', timeOtgr:'11.03.2026 9:...',  author:'Зарипов Б.' },
  { id:10,date:'11.03.2026', num:1030, transport:'DAMAS (VAN) 01 8...', driver:'Пирназаров Оли.',   reys:1,  kolTT:24, kol3k:24, obrn:24, neobr:0,  term:'0/0', otgr:0,  status:'process',   summa:36_617_928, ves:690000, exid:'11.', direction:'SHERIN', timeOtgr:'11.03.2026 10:1..', author:'Зарипов Б.' },
  { id:11,date:'11.03.2026', num:1031, transport:'DAMAS (VAN) 01 8...', driver:'Абдухакимов Диё.',  reys:2,  kolTT:9,  kol3k:9,  obrn:4,  neobr:0,  term:'0/0', otgr:0,  status:'process',   summa:7_285_743,  ves:121000, exid:'11.', direction:'SHERIN', timeOtgr:'11.03.2026 10:..',  author:'Исматулла.' },
  { id:12,date:'11.03.2026', num:1032, transport:'DAMAS (VAN) 01 8...', driver:'Пирназаров Оли.',   reys:2,  kolTT:1,  kol3k:1,  obrn:1,  neobr:0,  term:'0/0', otgr:0,  status:'process',   summa:13_751_609, ves:303000, exid:'11.', direction:'SHERIN', timeOtgr:'11.03.2026 10:..',  author:'Зарипов Б.' },
  { id:13,date:'11.03.2026', num:1033, transport:'DAMAS 80 R 938 ZA',  driver:'Олимов Одилжон.',   reys:1,  kolTT:1,  kol3k:1,  obrn:1,  neobr:0,  term:'0/0', otgr:0,  status:'process',   summa:836_157,    ves:20000,  exid:'11.', direction:'SHERIN', timeOtgr:'11.03.2026 10:..',  author:'Зарипов Б.' },
  { id:14,date:'11.03.2026', num:1034, transport:'DAMAS (VAN) 01 5...', driver:'Иргашев Азизхон.',  reys:2,  kolTT:24, kol3k:24, obrn:24, neobr:0,  term:'0/0', otgr:0,  status:'process',   summa:45_888_918, ves:820000, exid:'11.', direction:'SHERIN', timeOtgr:'11.03.2026 12:0..', author:'Зарипов Б.' },
  { id:15,date:'11.03.2026', num:1035, transport:'DAMAS (VAN) 01 5...', driver:'Назаров Давлатб.',  reys:2,  kolTT:4,  kol3k:4,  obrn:4,  neobr:0,  term:'0/0', otgr:0,  status:'process',   summa:6_530_177,  ves:104000, exid:'11.', direction:'SHERIN', timeOtgr:'11.03.2026 12:0..', author:'Зарипов Б.' },
  { id:16,date:'11.03.2026', num:1036, transport:'DAMAS (VAN) 85 9...', driver:'Рустамов Шоруx.',   reys:1,  kolTT:11, kol3k:11, obrn:11, neobr:0,  term:'0/0', otgr:0,  status:'process',   summa:20_757_076, ves:362000, exid:'11.', direction:'SHERIN', timeOtgr:'11.03.2026 12:3..', author:'Зарипов Б.' },
  { id:17,date:'11.03.2026', num:1037, transport:'DAMAS (VAN) 01 5...', driver:'Иргашев Азизхон.',  reys:3,  kolTT:2,  kol3k:2,  obrn:2,  neobr:0,  term:'0/0', otgr:0,  status:'process',   summa:8_619_472,  ves:134000, exid:'11.', direction:'SHERIN', timeOtgr:'11.03.2026 12:3..', author:'Зарипов Б.' },
  { id:18,date:'11.03.2026', num:1038, transport:'DAMAS (VAN) 85 9...', driver:'Буронов Феруз',     reys:2,  kolTT:15, kol3k:15, obrn:15, neobr:0,  term:'0/0', otgr:0,  status:'process',   summa:18_033_779, ves:338000, exid:'11.', direction:'SHERIN', timeOtgr:'11.03.2026 13:0..', author:'Исматулла.' },
  { id:19,date:'11.03.2026', num:1039, transport:'DAMAS (LABO) 01 5...', driver:'Назаров Давлатб.', reys:3, kolTT:15, kol3k:15, obrn:15, neobr:0,  term:'0/0', otgr:0,  status:'process',   summa:14_894_348, ves:332000, exid:'11.', direction:'SHERIN', timeOtgr:'11.03.2026 13:0..', author:'Зарипов Б.' },
  { id:20,date:'11.03.2026', num:1040, transport:'DAMAS (VAN) 85 9...', driver:'Рустамов Шоруx.',   reys:1,  kolTT:6,  kol3k:6,  obrn:6,  neobr:0,  term:'0/0', otgr:0,  status:'process',   summa:12_324_302, ves:206000, exid:'11.', direction:'SHERIN', timeOtgr:'11.03.2026 13:3..', author:'Исматулла.' },
  { id:21,date:'11.03.2026', num:1041, transport:'DAMAS (VAN) 85 9...', driver:'Иргашев Азизхон.',  reys:4,  kolTT:6,  kol3k:6,  obrn:4,  neobr:4,  term:'0/0', otgr:0,  status:'process',   summa:7_765_534,  ves:153000, exid:'11.', direction:'SHERIN', timeOtgr:'11.03.2026 16:2..', author:'Зарипов Б.' },
  { id:22,date:'11.03.2026', num:1042, transport:'DAMAS (VAN) 01 5...', driver:'Буронов Феруз',     reys:2,  kolTT:2,  kol3k:2,  obrn:2,  neobr:0,  term:'0/0', otgr:0,  status:'cancelled', summa:548_676,    ves:0,      exid:'11.', direction:'SHERIN', timeOtgr:'11.03.2026 16:4..', author:'Зарипов Б.' },
  { id:23,date:'11.03.2026', num:1043, transport:'DAMAS (VAN) 01 9...', driver:'Садуллаев Шухра.',  reys:1,  kolTT:15, kol3k:15, obrn:15, neobr:0,  term:'0/0', otgr:0,  status:'done',      summa:27_657_639, ves:453000, exid:'11.', direction:'SHERIN', timeOtgr:'11.03.2026 16:3..', author:'Зарипов Б.' },
  { id:24,date:'11.03.2026', num:1044, transport:'DAMAS (VAN) 01 8...', driver:'Абдухакимов Диё.',  reys:2,  kolTT:2,  kol3k:2,  obrn:2,  neobr:0,  term:'0/0', otgr:0,  status:'process',   summa:1_204_294,  ves:27000,  exid:'11.', direction:'SHERIN', timeOtgr:'11.03.2026 17:1..', author:'Зарипов Б.' },
]);

/* ─── Props ──────────────────────────────────────────────── */
interface Props {
  D: boolean;
  t: Record<string, string>;
  onCreateClick?: () => void;
  pendingOrders?: ConfirmedOrder[];
  selectedCompanyIds?: Set<string>;
}

/* ═══════════════════════════════════════════════════════════
   COMPONENT
════════════════════════════════════════════════════════════ */
export function TovarYuklashPage({ D, t, onCreateClick, pendingOrders = [], selectedCompanyIds }: Props) {

  /* ── UI state ── */
  const [tab,          setTab]          = useState<FilterTab>('all');
  const [search,       setSearch]       = useState('');
  const [expanded,     setExpanded]     = useState<string | number | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [tooltip,      setTooltip]      = useState<{ text: string; x: number; y: number } | null>(null);
  const [createOpen,   setCreateOpen]   = useState(false);

  /* ── API: packing / on_way buyurtmalar (Tarozi → Tovar yuklash) ── */
  const [apiRows,      setApiRows]      = useState<OtgrRow[]>([]);
  const [backendReady, setBackendReady] = useState(hasApiToken());
  const [loading,      setLoading]      = useState(false);
  const [assignRow,    setAssignRow]    = useState<OtgrRow | null>(null);
  const [drivers,      setDrivers]      = useState<Distributor[]>([]);
  const [selectedDriverId, setSelectedDriverId] = useState('');
  const [assignSaving, setAssignSaving] = useState(false);
  const [assignError,  setAssignError]  = useState<string | null>(null);

  const companyId = selectedCompanyIds?.size === 1
    ? [...selectedCompanyIds][0]
    : undefined;

  const refreshOrders = useCallback(async () => {
    if (!hasApiToken()) {
      setBackendReady(false);
      // Mock: Tarozi sessionStorage dan
      try {
        const raw = sessionStorage.getItem('lider:ready-load-orders');
        const list = raw ? JSON.parse(raw) as Array<{
          id: string; client?: string; code?: string; agentName?: string;
          amount?: number; itemCount?: number; createdAt?: string; status?: string;
          driver?: string; deliveryDistributorId?: string;
        }> : [];
        setApiRows(list.map((o, i) => {
          const d = o.createdAt ? new Date(o.createdAt) : new Date();
          const date = `${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}.${d.getFullYear()}`;
          const isLoaded = o.status === 'on_way' || !!o.deliveryDistributorId;
          return {
            id: o.id,
            date,
            num: 99000 + i + 1,
            transport: isLoaded ? '—' : '—',
            driver: o.driver ?? '—',
            reys: 1,
            kolTT: o.itemCount ?? 0,
            kol3k: o.itemCount ?? 0,
            obrn: isLoaded ? (o.itemCount ?? 0) : 0,
            neobr: isLoaded ? 0 : (o.itemCount ?? 0),
            term: '0/0',
            otgr: isLoaded ? 1 : 0,
            status: (isLoaded ? 'done' : 'process') as OtgrStatus,
            summa: o.amount ?? 0,
            ves: 0,
            exid: o.code ?? '—',
            direction: '—',
            timeOtgr: isLoaded ? date : '—',
            author: o.agentName ?? '—',
            needsDriver: !isLoaded,
            backendStatus: o.status ?? 'packing',
          };
        }));
      } catch {
        setApiRows([]);
      }
      return;
    }
    setLoading(true);
    try {
      const raw = await api.getOrders(companyId);
      const mapped = raw
        .map(backendOrderToOtgr)
        .filter((r): r is OtgrApiRow => r !== null)
        .map((r): OtgrRow => ({ ...r }));
      setApiRows(mapped);
      setBackendReady(true);
    } catch {
      setApiRows([]);
      setBackendReady(false);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => { refreshOrders(); }, [refreshOrders]);

  useEffect(() => {
    const handler = () => { refreshOrders(); };
    window.addEventListener('lider:order-ready-load', handler);
    window.addEventListener('lider:order-created', handler);
    return () => {
      window.removeEventListener('lider:order-ready-load', handler);
      window.removeEventListener('lider:order-created', handler);
    };
  }, [refreshOrders]);

  const openAssign = async (row: OtgrRow) => {
    if (!row.needsDriver) return;
    setAssignRow(row);
    setSelectedDriverId('');
    setAssignError(null);
    if (!hasApiToken()) {
      // Demo dostavchiklar
      setDrivers([
        { id: 'mock-1', userId: '', companyId: null, companyName: null, lineCode: '01', phone: null, position: 'delivery', status: 'active', lastLatitude: null, lastLongitude: null, lastLocationAt: null, isOnline: true, user: { fullName: 'Sadullayev Shuxrat', username: 'sadullaev' } },
        { id: 'mock-2', userId: '', companyId: null, companyName: null, lineCode: '02', phone: null, position: 'delivery', status: 'active', lastLatitude: null, lastLongitude: null, lastLocationAt: null, isOnline: true, user: { fullName: 'Buronov Feruz', username: 'buronov' } },
        { id: 'mock-3', userId: '', companyId: null, companyName: null, lineCode: '03', phone: null, position: 'delivery', status: 'active', lastLatitude: null, lastLongitude: null, lastLocationAt: null, isOnline: false, user: { fullName: 'Irgashev Azizxon', username: 'irgashev' } },
        { id: 'mock-4', userId: '', companyId: null, companyName: null, lineCode: '05', phone: null, position: 'delivery', status: 'active', lastLatitude: null, lastLongitude: null, lastLocationAt: null, isOnline: true, user: { fullName: 'Nazarov Davlatbek', username: 'nazarov' } },
      ]);
      return;
    }
    try {
      const list = await api.getDistributors(companyId);
      const delivery = list.filter(isDeliveryPerson);
      setDrivers(delivery.length > 0 ? delivery : list);
    } catch {
      setDrivers([]);
      setAssignError(t.sysUserErrLoad ?? 'Yuklashda xatolik');
    }
  };

  const confirmAssign = async () => {
    if (!assignRow || !selectedDriverId) return;
    const driver = drivers.find(d => d.id === selectedDriverId);
    const driverName = driver?.user?.fullName ?? '—';
    setAssignSaving(true);
    setAssignError(null);
    try {
      if (backendReady && typeof assignRow.id === 'string') {
        await api.updateOrder(assignRow.id, {
          status: 'on_way',
          deliveryDistributorId: selectedDriverId,
        });
      } else {
        // Mock sessionStorage
        try {
          const raw = sessionStorage.getItem('lider:ready-load-orders');
          const list = raw ? JSON.parse(raw) as Array<Record<string, unknown>> : [];
          const next = list.map(o =>
            o.id === assignRow.id
              ? { ...o, status: 'on_way', deliveryDistributorId: selectedDriverId, driver: driverName }
              : o,
          );
          sessionStorage.setItem('lider:ready-load-orders', JSON.stringify(next));
        } catch { /* ignore */ }
      }
      setAssignRow(null);
      await refreshOrders();
    } catch (e) {
      setAssignError(e instanceof Error ? e.message : String(e));
    } finally {
      setAssignSaving(false);
    }
  };

  /* ── Calendar ── */
  const [calOpen,   setCalOpen]   = useState(false);
  const [calMonth,  setCalMonth]  = useState(() => tashkentToday());
  const [dateStart, setDateStart] = useState<Date | null>(null);
  const [dateEnd,   setDateEnd]   = useState<Date | null>(null);
  const [hovDate,   setHovDate]   = useState<Date | null>(null);
  const calWrapRef = useRef<HTMLDivElement>(null);

  const tableRef   = useRef<HTMLDivElement>(null);
  const fsTableRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!calOpen) return;
    const handle = (e: MouseEvent) => {
      if (calWrapRef.current && !calWrapRef.current.contains(e.target as Node))
        setCalOpen(false);
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [calOpen]);

  /* ── Theme ── */
  const bg    = D ? '#0d0d0d' : '#f5f5f7';
  const card  = D ? '#1c1c1e' : '#ffffff';
  const brd   = D ? '#2a2a2e' : '#e5e7eb';
  const txt   = D ? '#f2f2f7' : '#111827';
  const muted = D ? '#6b7280' : '#9ca3af';
  const hdr   = D ? '#111113' : '#f9fafb';
  const rowH  = D ? '#222226' : '#f5f5f7';

  const scrollTable = (dir: 'left' | 'right') => {
    const ref = isFullscreen ? fsTableRef : tableRef;
    ref.current?.scrollBy({ left: dir === 'right' ? 320 : -320, behavior: 'smooth' });
  };

  /* ── Calendar ── */
  const clearDates = () => { setDateStart(null); setDateEnd(null); setCalOpen(false); };
  const handleDayClick = (d: Date) => {
    if (isAfterToday(d)) return;
    if (!dateStart || (dateStart && dateEnd)) { setDateStart(d); setDateEnd(null); }
    else {
      if (sameDay(d, dateStart)) setDateStart(null);
      else if (d < dateStart)   { setDateEnd(dateStart); setDateStart(d); }
      else                       setDateEnd(d);
    }
  };
  const dateLabel = dateStart
    ? dateEnd ? `${fmtShort(dateStart)} — ${fmtShort(dateEnd)}` : fmtShort(dateStart)
    : (t.zDate ?? 'Sana');

  const MONTH_NAMES = (t.zatCalMonths ?? 'Январь,Февраль,Март,Апрель,Май,Июнь,Июль,Август,Сентябрь,Октябрь,Ноябрь,Декабрь').split(',');
  const DAY_NAMES   = (t.zatCalDays  ?? 'Пн,Вт,Ср,Чт,Пт,Сб,Вс').split(',');

  /* ── Status badge ── */
  const statusBadge = (s: OtgrStatus) => {
    const cfg = {
      process:   { bg: '#f59e0b', label: t.otgrProcess   ?? 'Jarayonda'   },
      done:      { bg: '#10b981', label: t.otgrDone       ?? 'Yakunlangan' },
      cancelled: { bg: '#ef4444', label: t.otgrCancelled  ?? 'Bekor'       },
    }[s];
    return (
      <span style={{
        display:'inline-block', padding:'2px 8px', borderRadius:4, fontSize:11,
        background: cfg.bg, color:'#fff', fontWeight:600, letterSpacing:0.2, whiteSpace:'nowrap',
      }}>{cfg.label}</span>
    );
  };

  /* ── Filter tabs ── */
  const TABS: { id: FilterTab; label: string }[] = [
    { id: 'all',       label: t.zAll         ?? 'Barchasi'   },
    { id: 'process',   label: t.otgrProcess  ?? 'Jarayonda'  },
    { id: 'done',      label: t.otgrDone     ?? 'Yakunlangan'},
    { id: 'cancelled', label: t.otgrCancelled?? 'Bekor'      },
  ];

  /* ── Rows ── */
  const rows = useMemo(() => {
    // API yoki Tarozi mock → asosiy manba; bo'sh bo'lsa demo jadval
    let d: OtgrRow[] = apiRows.length > 0 || backendReady ? apiRows : DATA;
    if (tab !== 'all') d = d.filter(r => r.status === tab);
    if (dateStart) {
      d = d.filter(r => {
        const rd = parseDateStr(r.date);
        if (!rd) return false;
        if (dateEnd) return rd >= dateStart && rd <= dateEnd;
        return sameDay(rd, dateStart);
      });
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      d = d.filter(r =>
        r.driver.toLowerCase().includes(q)    ||
        r.transport.toLowerCase().includes(q) ||
        String(r.num).includes(q)             ||
        r.direction.toLowerCase().includes(q) ||
        r.author.toLowerCase().includes(q)    ||
        r.exid.toLowerCase().includes(q)
      );
    }
    return d;
  }, [tab, search, dateStart, dateEnd, apiRows, backendReady]);

  /* ── Pending rows (from modal ✓) ── */
  const pendingRows = useMemo<OtgrRow[]>(() =>
    pendingOrders.map((o, i) => ({
      id:        -(i + 1),
      date:      o.date,
      num:       99000 + i + 1,
      transport: o.transport || '—',
      driver:    o.agent || '—',
      reys:      1,
      kolTT:     o.rowCount,
      kol3k:     o.rowCount,
      obrn:      0,
      neobr:     0,
      term:      '0/0',
      otgr:      0,
      status:    'process' as OtgrStatus,
      summa:     o.summa,
      ves:       o.ves,
      exid:      '—',
      direction: o.sklad,
      timeOtgr:  o.date,
      author:    o.agent || '—',
    }))
  , [pendingOrders]);

  /* ── Columns ── */
  const COLS = [
    { key:'date',      label: t.otgrDate      ?? 'Sana',        w:90  },
    { key:'num',       label: t.otgrNum       ?? '№',           w:58  },
    { key:'transport', label: t.otgrTransport ?? 'Transport',   w:170 },
    { key:'driver',    label: t.otgrDriver    ?? 'Haydovchi',   w:140 },
    { key:'reys',      label: t.otgrReys      ?? '№ Reys',      w:60  },
    { key:'kolTT',     label: t.otgrKolTT     ?? 'Kol TT',      w:58  },
    { key:'kol3k',     label: t.otgrKol3k     ?? 'Kol-3k',      w:58  },
    { key:'obrn',      label: t.otgrObrn      ?? 'Obr-n',       w:52  },
    { key:'neobr',     label: t.otgrNeobr     ?? 'Ne obr',      w:52  },
    { key:'term',      label: t.otgrTerm      ?? 'Term',        w:50  },
    { key:'otgr',      label: t.otgrOtgr      ?? 'Otgr',        w:46  },
    { key:'status',    label: t.zStatus       ?? 'Status',      w:120 },
    { key:'summa',     label: t.otgrSumma     ?? 'Summa',       w:130, right:true },
    { key:'ves',       label: t.otgrVes       ?? 'Vazn',        w:90,  right:true },
    { key:'exid',      label: 'ExID',                           w:50  },
    { key:'direction', label: t.zDirection    ?? 'Yo\'nalish',  w:80  },
    { key:'timeOtgr',  label: t.otgrTime      ?? 'Yuklash vaqti', w:140 },
    { key:'author',    label: t.otgrAuthor    ?? 'Muallif',     w:90  },
  ];

  const cellVal = (row: OtgrRow, key: string): string => {
    if (key === 'summa') return fmtSum(row.summa);
    if (key === 'ves')   return fmtVes(row.ves);
    const v = (row as Record<string, unknown>)[key];
    return v !== undefined && v !== null && v !== '' ? String(v) : '—';
  };

  /* ════════════════════════════════
     CALENDAR DROPDOWN
  ════════════════════════════════ */
  const calendarDropdown = (
    <>
      <div style={{ position:'fixed', inset:0, zIndex:498 }} onClick={() => setCalOpen(false)} />
      <div style={{
        position:'absolute', top:'calc(100% + 6px)', right:0, zIndex:499,
        background: D ? '#1c1c1e' : '#ffffff',
        border:`1px solid ${brd}`, borderRadius:12,
        boxShadow: D ? '0 8px 32px rgba(0,0,0,0.7)' : '0 8px 32px rgba(0,0,0,0.14)',
        padding:'14px 16px', minWidth:262, userSelect:'none',
      }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
          <button onClick={() => setCalMonth(m => new Date(m.getFullYear(), m.getMonth()-1, 1))}
            style={{ background:'none', border:'none', color:txt, cursor:'pointer', padding:'3px 8px', borderRadius:6, fontSize:18, lineHeight:1 }}>‹</button>
          <span style={{ fontSize:13, color:txt, fontWeight:600 }}>
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
                  padding:'3px 8px', borderRadius:6, fontSize:18, lineHeight:1,
                  opacity: canNext ? 1 : 0.35,
                }}
              >›</button>
            );
          })()}
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:2, marginBottom:4 }}>
          {DAY_NAMES.map(dn => (
            <div key={dn} style={{ textAlign:'center', fontSize:10, color:muted, padding:'2px 0' }}>{dn}</div>
          ))}
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:2 }}>
          {buildGrid(calMonth).map((day, idx) => {
            if (!day) return <div key={`e-${idx}`} />;
            const todayD   = tashkentToday();
            const disabled = isAfterToday(day, todayD);
            const isStart  = !!(dateStart && sameDay(day, dateStart));
            const isEnd    = !!(dateEnd   && sameDay(day, dateEnd));
            const isToday  = sameDay(day, todayD);
            const hovOk    = hovDate && !isAfterToday(hovDate, todayD) ? hovDate : null;
            const effEnd   = dateEnd ?? (dateStart && hovOk && hovOk > dateStart ? hovOk : null);
            const inRng    = !!(dateStart && effEnd && day > dateStart && day < effEnd);
            const isSel    = isStart || isEnd;
            const cellBg   = disabled ? 'transparent'
              : isSel ? '#6366f1' : inRng ? (D ? '#3730a3' : '#e0e7ff')
              : !!(hovOk && sameDay(day, hovOk)) ? (D ? '#2a2a2e' : '#f3f4f6') : 'transparent';
            return (
              <button key={`d-${idx}`}
                disabled={disabled}
                onClick={() => handleDayClick(day)}
                onMouseEnter={() => { if (!disabled) setHovDate(day); }}
                onMouseLeave={() => setHovDate(null)}
                style={{
                  background: cellBg,
                  border: isToday && !isSel ? '1px solid #6366f1' : '1px solid transparent',
                  borderRadius:6,
                  color: disabled
                    ? (D ? '#3f3f46' : '#d1d5db')
                    : isSel ? '#fff' : (D ? '#f2f2f7' : '#111827'),
                  cursor: disabled ? 'not-allowed' : 'pointer',
                  fontSize:12, padding:'5px 2px', textAlign:'center', transition:'background 0.1s',
                  opacity: disabled ? 0.45 : 1,
                }}
              >{day.getDate()}</button>
            );
          })}
        </div>
        <div style={{ marginTop:12, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <button onClick={() => setCalMonth(tashkentToday())}
            style={{ background:'none', border:'none', color:muted, cursor:'pointer', fontSize:11 }}>
            {t.zCalToday ?? 'Bugun'}
          </button>
          {(dateStart || dateEnd) && (
            <button onClick={clearDates} style={{
              background: D ? '#2a2a2e' : '#f3f4f6', border:'none', borderRadius:6,
              color:txt, cursor:'pointer', fontSize:11, padding:'4px 10px',
            }}>✕ {t.zCalClear ?? 'Tozalash'}</button>
          )}
        </div>
      </div>
    </>
  );

  /* ════════════════════════════════
     TOOLBAR
  ════════════════════════════════ */
  const toolbarRow = (
    <div style={{
      background: card, borderBottom:`1px solid ${brd}`,
      padding:'8px 12px', display:'flex', flexWrap:'wrap', gap:6, alignItems:'center',
    }}>
      {/* Create */}
      <button
        onClick={() => onCreateClick ? onCreateClick() : setCreateOpen(true)}
        style={{
        display:'flex', alignItems:'center', gap:5, padding:'6px 14px',
        borderRadius:8, border:'none', background:'#6366f1', color:'#fff',
        fontSize:13, cursor:'pointer', whiteSpace:'nowrap', flexShrink:0,
      }}>
        <Plus size={14} strokeWidth={2.5} />
        <span>{t.zCreate ?? 'Yaratish'}</span>
      </button>

      {/* Action icon buttons */}
      <button
        title="Yangilash"
        onClick={() => refreshOrders()}
        disabled={loading}
        style={{
          width:30, height:30, borderRadius:7, border:`1px solid ${brd}`,
          background: D ? '#2a2a2e' : '#f3f4f6', color:'#10b981',
          cursor: loading ? 'wait' : 'pointer', display:'flex', alignItems:'center', justifyContent:'center',
          flexShrink:0, opacity: loading ? 0.5 : 1,
        }}
      >
        <RefreshCw size={13} strokeWidth={2} className={loading ? 'animate-spin' : undefined} />
      </button>

      {/* Dropdown-style filter pills */}
      {[
        { label: t.otgrDostavka   ?? 'Dostavka',   icon: <Truck        size={12} strokeWidth={2} /> },
        { label: t.otgrFaktura    ?? 'Faktura',     icon: <PackageCheck size={12} strokeWidth={2} /> },
        { label: t.otgrSklad      ?? 'Sklad',       icon: <PackageCheck size={12} strokeWidth={2} /> },
        { label: t.otgrDostavchik ?? 'Haydovchi',   icon: <Truck        size={12} strokeWidth={2} /> },
      ].map((pill, i) => (
        <button key={i} style={{
          display:'flex', alignItems:'center', gap:5, padding:'0 10px', height:30,
          borderRadius:7, border:`1px solid ${brd}`,
          background: D ? '#1c1c1e' : '#fff', color:txt,
          fontSize:12, cursor:'pointer', whiteSpace:'nowrap', flexShrink:0,
        }}>
          {pill.icon}
          <span>{pill.label}</span>
          <ChevronDown size={11} color={muted} />
        </button>
      ))}

      {/* Spacer */}
      <div style={{ flex:1 }} />

      {/* Search */}
      <div style={{
        display:'flex', alignItems:'center', gap:6, height:30,
        background: D ? '#111113' : '#f3f4f6',
        border:`1px solid ${brd}`, borderRadius:8, padding:'0 10px',
        minWidth:130, maxWidth:200,
      }}>
        <Search size={12} color={muted} strokeWidth={2} />
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder={t.zSearch ?? 'Qidiruv...'}
          style={{ flex:1, background:'none', border:'none', outline:'none', color:txt, fontSize:12 }}
        />
      </div>

      {/* Calendar */}
      <div ref={calWrapRef} style={{ position:'relative', flexShrink:0 }}>
        <button onClick={() => setCalOpen(o => !o)} style={{
          display:'flex', alignItems:'center', gap:5, padding:'0 10px', height:30, borderRadius:8,
          border:`1px solid ${(calOpen||dateStart) ? '#6366f1' : brd}`,
          background: (calOpen||dateStart) ? (D ? '#1e1b4b' : '#ede9fe') : (D ? '#1c1c1e' : '#f9fafb'),
          color: (calOpen||dateStart) ? '#6366f1' : txt, cursor:'pointer', fontSize:12, whiteSpace:'nowrap',
        }}>
          <CalendarDays size={13} strokeWidth={2} />
          <span>{dateLabel}</span>
          {dateStart && (
            <span onClick={e => { e.stopPropagation(); clearDates(); }}
              style={{ marginLeft:2, color:muted, fontSize:15, lineHeight:1, cursor:'pointer' }}>×</span>
          )}
        </button>
        {calOpen && calendarDropdown}
      </div>

      {/* Row count */}
      <span style={{ fontSize:11, color:muted, whiteSpace:'nowrap' }}>
        {rows.length} {t.zRowCount ?? 'ta'}
      </span>
    </div>
  );

  /* ════════════════════════════════
     NAV BUTTONS (desktop only)
  ════════════════════════════════ */
  const navButtons = (
    <div className="ty-nav-desktop" style={{ display:'flex', gap:5 }}>
      {([['left', ChevronLeft], ['right', ChevronRight]] as const).map(([dir, Icon]) => (
        <button key={dir} onClick={() => scrollTable(dir)} style={{
          display:'flex', alignItems:'center', justifyContent:'center',
          width:28, height:28, borderRadius:6, border:`1px solid ${brd}`,
          background: D ? '#1c1c1e' : '#fff', color:txt, cursor:'pointer',
        }}>
          <Icon size={15} strokeWidth={2} />
        </button>
      ))}
      <button onClick={() => setIsFullscreen(f => !f)} style={{
        display:'flex', alignItems:'center', justifyContent:'center',
        width:28, height:28, borderRadius:6, border:`1px solid ${brd}`,
        background: isFullscreen ? '#6366f1' : (D ? '#1c1c1e' : '#fff'),
        color: isFullscreen ? '#fff' : txt, cursor:'pointer',
      }}>
        {isFullscreen ? <Minimize2 size={14} strokeWidth={2}/> : <Maximize2 size={14} strokeWidth={2}/>}
      </button>
    </div>
  );

  /* ════════════════════════════════
     FILTER TABS ROW
  ════════════════════════════════ */
  const filterTabsRow = (
    <div style={{ background:card, borderBottom:`1px solid ${brd}`, flexShrink:0 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 12px' }}>
        <div className="ty-tabs-scroll" style={{ display:'flex', overflowX:'auto', scrollbarWidth:'none', flex:1 }}>
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

  /* ════════════════════════════════
     TABLE INNER
  ════════════════════════════════ */
  const tableInner = (ref: React.RefObject<HTMLDivElement>) => (
    <div ref={ref} style={{ flex:1, overflowX:'auto', background:card }}>
      <table style={{ borderCollapse:'collapse', fontSize:12, width:'100%', minWidth:1600 }}>
        <thead>
          <tr style={{ background:hdr, borderBottom:`2px solid ${brd}`, position:'sticky', top:0, zIndex:2 }}>
            {COLS.map(c => (
              <th key={c.key} style={{
                padding:'8px 8px', textAlign: c.right ? 'right' : 'left',
                color:muted, fontWeight:600, fontSize:11, textTransform:'uppercase',
                whiteSpace:'nowrap', width:c.w, minWidth:c.w, borderRight:`1px solid ${brd}`,
              }}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {[...pendingRows, ...rows].map(row => {
            const isPending = typeof row.id === 'number' && row.id < 0;
            return (
            <tr key={row.id}
              onClick={() => { if (row.needsDriver) openAssign(row); }}
              style={{
                borderBottom:`1px solid ${brd}`, transition:'background 0.1s',
                background: isPending ? 'rgba(239,68,68,0.07)'
                  : row.needsDriver ? (D ? 'rgba(99,102,241,0.08)' : 'rgba(99,102,241,0.05)')
                  : 'transparent',
                cursor: row.needsDriver ? 'pointer' : 'default',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = isPending ? 'rgba(239,68,68,0.13)' : rowH)}
              onMouseLeave={e => (e.currentTarget.style.background = isPending ? 'rgba(239,68,68,0.07)'
                : row.needsDriver ? (D ? 'rgba(99,102,241,0.08)' : 'rgba(99,102,241,0.05)')
                : 'transparent')}
            >
              {COLS.map(c => (
                <td key={c.key} style={{
                  padding:'7px 8px', textAlign: c.right ? 'right' : 'left',
                  color: c.key === 'summa' ? '#10b981'
                       : c.key === 'num' || c.key === 'exid' ? muted
                       : txt,
                  whiteSpace:'nowrap', borderRight:`1px solid ${brd}`, fontSize:12,
                  overflow: c.key === 'status' ? 'visible' : 'hidden',
                  textOverflow: c.key === 'status' ? 'clip' : 'ellipsis',
                  maxWidth: c.w,
                }}>
                  {c.key === 'status'
                    ? (
                      <span style={{ display:'inline-flex', alignItems:'center', gap:6 }}>
                        {statusBadge(row.status)}
                        {row.needsDriver && (
                          <span style={{
                            fontSize:10, color:'#6366f1', fontWeight:600, whiteSpace:'nowrap',
                          }}>{t.modalDostavchik ?? 'Dostavchik'}…</span>
                        )}
                      </span>
                    )
                    : (() => {
                        const val = cellVal(row, c.key);
                        return (
                          <span
                            style={{
                              display:'inline-block',
                              maxWidth: c.w ? c.w - 16 : undefined,
                              overflow:'hidden', textOverflow:'ellipsis',
                              whiteSpace:'nowrap', verticalAlign:'bottom', cursor:'default',
                            }}
                            onMouseEnter={e => {
                              const el = e.currentTarget;
                              if (el.scrollWidth > el.clientWidth) {
                                const r = el.getBoundingClientRect();
                                setTooltip({ text: val, x: r.left, y: r.bottom + 6 });
                              }
                            }}
                            onMouseLeave={() => setTooltip(null)}
                          >{val}</span>
                        );
                      })()
                  }
                </td>
              ))}
            </tr>
          );})}
        </tbody>
      </table>
      {rows.length === 0 && pendingRows.length === 0 && (
        <div style={{ textAlign:'center', padding:'48px 0', color:muted, fontSize:13 }}>— Ma'lumot yo'q —</div>
      )}
    </div>
  );

  /* ════════════════════════════════
     MOBILE CARDS
  ════════════════════════════════ */
  const mobileCards = (
    <div className="ty-mobile-only"
      style={{ flex:1, overflowY:'auto', padding:'8px 10px', display:'none', flexDirection:'column', gap:6 }}
    >
      {[...pendingRows, ...rows].map(row => {
        const open = expanded === row.id;
        const isPending = typeof row.id === 'number' && row.id < 0;
        return (
          <div key={row.id} style={{
            background: isPending ? 'rgba(239,68,68,0.07)' : card,
            borderRadius:12,
            border: isPending ? '1px solid rgba(239,68,68,0.35)'
              : row.needsDriver ? '1px solid rgba(99,102,241,0.45)'
              : `1px solid ${brd}`,
            overflow:'hidden',
          }}>
            <button
              onClick={() => setExpanded(open ? null : row.id)}
              style={{ width:'100%', background:'none', border:'none', padding:'10px 12px', cursor:'pointer', textAlign:'left' }}
            >
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:6 }}>
                <div style={{ flex:1, minWidth:0 }}>
                  {/* Transport */}
                  <div style={{
                    fontSize:13, color:txt, marginBottom:3,
                    overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
                    borderBottom:`2px solid ${row.status === 'done' ? '#10b981' : row.status === 'cancelled' ? '#ef4444' : '#f59e0b'}`,
                    paddingBottom:3,
                  }}>{row.transport}</div>
                  {/* meta */}
                  <div style={{ display:'flex', gap:6, flexWrap:'wrap', alignItems:'center' }}>
                    <span style={{ fontSize:11, color:muted }}>#{row.num}</span>
                    <span style={{ fontSize:11, color:muted }}>{row.date}</span>
                    <span style={{ fontSize:11, color:muted }}>{row.driver}</span>
                  </div>
                </div>
                <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:4, flexShrink:0 }}>
                  {statusBadge(row.status)}
                  <span style={{ fontSize:13, color:'#10b981', whiteSpace:'nowrap' }}>
                    {fmtSum(row.summa)}
                  </span>
                </div>
                <div style={{ color:muted, marginLeft:2, alignSelf:'center', flexShrink:0 }}>
                  {open ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
                </div>
              </div>
            </button>

            {open && (
              <div style={{ borderTop:`1px solid ${brd}`, padding:'8px 12px', display:'flex', flexDirection:'column', gap:5 }}>
                {[
                  { label: t.otgrReys      ?? '№ Reys',        val: String(row.reys)   },
                  { label: t.otgrKolTT     ?? 'Kol TT',        val: String(row.kolTT)  },
                  { label: t.otgrKol3k     ?? 'Kol-3k',        val: String(row.kol3k)  },
                  { label: t.otgrObrn      ?? 'Obr-n',         val: String(row.obrn)   },
                  { label: t.otgrNeobr     ?? 'Ne obr',        val: String(row.neobr)  },
                  { label: t.otgrTerm      ?? 'Term',          val: row.term           },
                  { label: t.otgrOtgr      ?? 'Otgr',          val: String(row.otgr)   },
                  { label: t.otgrVes       ?? 'Vazn',          val: fmtVes(row.ves)    },
                  { label: 'ExID',                              val: row.exid           },
                  { label: t.zDirection    ?? 'Yo\'nalish',    val: row.direction      },
                  { label: t.otgrTime      ?? 'Yuklash vaqti', val: row.timeOtgr       },
                  { label: t.otgrAuthor    ?? 'Muallif',       val: row.author         },
                ].map(item => (
                  <div key={item.label} style={{ display:'flex', justifyContent:'space-between', gap:8 }}>
                    <span style={{ fontSize:11, color:muted }}>{item.label}</span>
                    <span style={{ fontSize:11, color:txt, textAlign:'right' }}>{item.val}</span>
                  </div>
                ))}
                {row.needsDriver && (
                  <button
                    onClick={() => openAssign(row)}
                    style={{
                      marginTop:6, padding:'8px 12px', borderRadius:8, border:'none',
                      background:'#6366f1', color:'#fff', fontSize:12, fontWeight:600, cursor:'pointer',
                    }}
                  >
                    {t.modalDostavchik ?? 'Dostavchik'} tanlash
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
      {rows.length === 0 && pendingRows.length === 0 && (
        <div style={{ textAlign:'center', padding:'60px 0', color:muted, fontSize:13 }}>
          — Ma'lumot yo'q —
        </div>
      )}
    </div>
  );

  /* ════════════════════════════════
     PAGE HEADER
  ═══════════════════════════════ */
  const pageHeader = (
    <div style={{
      display:'flex', alignItems:'center', justifyContent:'space-between',
      padding:'14px 16px 10px', background:bg, flexShrink:0,
    }}>
      <div>
        <h2 style={{ margin:0, fontSize:18, fontWeight:700, color:txt }}>
          {t.tovarYuklashTitle ?? 'Tovar yuklash'}
        </h2>
        <p style={{ margin:'2px 0 0', fontSize:12, color:muted, fontWeight:500 }}>
          ({t.tovarYuklashForma ?? 'Forma zayavki'})
        </p>
      </div>
      <button style={{
        display:'flex', alignItems:'center', gap:5, padding:'6px 14px', borderRadius:8,
        border:`1px solid ${brd}`, background: D ? '#1c1c1e' : '#fff',
        color:txt, fontSize:12, cursor:'pointer',
      }}>
        <Download size={13} strokeWidth={2} />
        <span>Export</span>
      </button>
    </div>
  );

  /* ═══════════════════════════════
     RENDER
  ════════════════════════════════ */
  return (
    <>
      <style>{`
        @media (min-width: 768px) {
          .ty-desktop-only { display: flex !important; }
          .ty-mobile-only  { display: none  !important; }
          .ty-nav-desktop  { display: flex  !important; }
        }
        @media (max-width: 767px) {
          .ty-desktop-only { display: none  !important; }
          .ty-mobile-only  { display: flex  !important; }
          .ty-nav-desktop  { display: none  !important; }
        }
        .ty-tabs-scroll::-webkit-scrollbar { display: none; }
        @media (max-width: 767px) {
          .ty-tabs-scroll { flex-wrap: wrap !important; }
          .ty-tabs-scroll button {
            flex: 1 1 50% !important;
            min-width: 0 !important;
            text-align: center !important;
            font-size: 12px !important;
            padding: 9px 4px !important;
            justify-content: center;
          }
        }
        .ty-fs {
          position: fixed; inset: 0; z-index: 9999;
          display: flex; flex-direction: column;
          animation: tyfsIn 0.18s ease;
        }
        @keyframes tyfsIn {
          from { opacity: 0; transform: scale(0.98); }
          to   { opacity: 1; transform: scale(1); }
        }
      `}</style>

      {/* Tooltip */}
      {tooltip && (
        <div style={{
          position:'fixed',
          left: Math.min(tooltip.x, (typeof window !== 'undefined' ? window.innerWidth : 800) - 280),
          top: tooltip.y, zIndex:99999,
          background: D ? '#2a2a2e' : '#1c1c1e', color:'#f2f2f7',
          padding:'6px 10px', borderRadius:7, fontSize:12, maxWidth:260,
          whiteSpace:'normal', wordBreak:'break-word',
          boxShadow:'0 4px 20px rgba(0,0,0,0.5)', pointerEvents:'none',
          border:'1px solid #3a3a3e', lineHeight:1.4,
        }}>{tooltip.text}</div>
      )}

      {/* ── CREATE MODAL ── */}
      {createOpen && (
        <TovarYuklashCreateModal D={D} t={t} onClose={() => setCreateOpen(false)} selectedCompanyIds={selectedCompanyIds} />
      )}

      {/* ── DOSTAVCHIK TANLASH ── */}
      {assignRow && (
        <div
          style={{
            position:'fixed', inset:0, zIndex:10000,
            background:'rgba(0,0,0,0.45)', backdropFilter:'blur(3px)',
            display:'flex', alignItems:'center', justifyContent:'center', padding:16,
          }}
          onClick={() => !assignSaving && setAssignRow(null)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width:'100%', maxWidth:420, borderRadius:14,
              background: card, border:`1px solid ${brd}`,
              boxShadow: D ? '0 16px 48px rgba(0,0,0,0.55)' : '0 16px 48px rgba(0,0,0,0.18)',
              padding:20,
            }}
          >
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
              <div>
                <div style={{ fontSize:15, fontWeight:700, color:txt }}>
                  {t.modalDostavchik ?? 'Dostavchik'} tanlash
                </div>
                <div style={{ fontSize:12, color:muted, marginTop:2 }}>
                  #{assignRow.num} · {assignRow.exid}
                </div>
              </div>
              <button
                onClick={() => !assignSaving && setAssignRow(null)}
                style={{
                  width:28, height:28, borderRadius:7, border:`1px solid ${brd}`,
                  background:'transparent', color:muted, cursor:'pointer',
                  display:'flex', alignItems:'center', justifyContent:'center',
                }}
              >
                <X size={14} />
              </button>
            </div>

            <div style={{
              maxHeight:280, overflowY:'auto', display:'flex', flexDirection:'column', gap:6,
              marginBottom:14,
            }}>
              {drivers.length === 0 ? (
                <div style={{ padding:24, textAlign:'center', color:muted, fontSize:13 }}>
                  {assignError ?? '— Dostavchik topilmadi —'}
                </div>
              ) : drivers.map(d => {
                const name = d.user?.fullName ?? d.user?.username ?? d.id;
                const active = selectedDriverId === d.id;
                return (
                  <button
                    key={d.id}
                    onClick={() => setSelectedDriverId(d.id)}
                    style={{
                      display:'flex', alignItems:'center', gap:10,
                      padding:'10px 12px', borderRadius:10, textAlign:'left', cursor:'pointer',
                      border: active ? '1.5px solid #6366f1' : `1px solid ${brd}`,
                      background: active ? (D ? 'rgba(99,102,241,0.15)' : '#eef2ff') : (D ? '#161618' : '#f9fafb'),
                      color: txt, fontSize:13,
                    }}
                  >
                    <Truck size={15} color={active ? '#6366f1' : muted} />
                    <span style={{ flex:1, fontWeight: active ? 600 : 500 }}>{name}</span>
                    {d.lineCode && (
                      <span style={{ fontSize:11, color:muted }}>{d.lineCode}</span>
                    )}
                  </button>
                );
              })}
            </div>

            {assignError && drivers.length > 0 && (
              <div style={{ fontSize:12, color:'#ef4444', marginBottom:10 }}>{assignError}</div>
            )}

            <button
              onClick={confirmAssign}
              disabled={!selectedDriverId || assignSaving}
              style={{
                width:'100%', padding:'11px 14px', borderRadius:10, border:'none',
                background: selectedDriverId && !assignSaving ? '#6366f1' : (D ? '#2a2a2e' : '#e5e7eb'),
                color: selectedDriverId && !assignSaving ? '#fff' : muted,
                fontSize:13, fontWeight:600,
                cursor: selectedDriverId && !assignSaving ? 'pointer' : 'not-allowed',
              }}
            >
              {assignSaving
                ? '...'
                : (t.otgrOtgr ? `${t.otgrOtgr} / Yuklash` : 'Mashinaga yuklash')}
            </button>
          </div>
        </div>
      )}

      {/* ── FULLSCREEN ── */}
      {isFullscreen && (
        <div className="ty-fs" style={{ background:bg }}>
          {filterTabsRow}
          {toolbarRow}
          <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
            {tableInner(fsTableRef)}
          </div>
        </div>
      )}

      {/* ── NORMAL VIEW ── */}
      <div
        className={`flex flex-col flex-1 min-h-0 rounded-2xl border overflow-hidden ${D ? 'border-gray-800' : 'border-gray-200'}`}
        style={{ background: card }}
      >
        {pageHeader}
        {filterTabsRow}
        {toolbarRow}

        {/* Desktop table */}
        <div className="ty-desktop-only" style={{ flex:1, display:'none', flexDirection:'column', overflow:'hidden', minHeight:0 }}>
          {tableInner(tableRef)}
        </div>

        {/* Mobile cards */}
        {mobileCards}
      </div>
    </>
  );
}