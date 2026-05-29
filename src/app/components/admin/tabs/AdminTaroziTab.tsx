/* @refresh reset */
import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import {
  ChevronLeft, ChevronRight, RefreshCw, Scale, Package,
  Trash2, RotateCcw, Calendar,
  Tag, FolderOpen, ArrowRight, Zap, ChevronDown,
  LayoutList, Truck, CheckCircle2, Phone, Smartphone,
  Search, Plus, Minus, X as XIcon, Printer,
} from 'lucide-react';
import { NumpadModal } from '../NumpadModal';
import { NewOrderModal } from './NewOrderModal';

interface Props {
  D: boolean; card: string; divider: string; sub: string;
  t: Record<string, string>;
}

// ── Send Button — truck icon, active only when ALL rows have ves/dona filled ───
function SendButton({
  D, hasData, sendState, setSendState, setShowSendDone, t,
}: {
  D: boolean; hasData: boolean;
  sendState: 'idle' | 'loading' | 'done';
  setSendState: (s: 'idle' | 'loading' | 'done') => void;
  setShowSendDone: (v: boolean) => void;
  t: Record<string, string>;
}) {
  const isLoading = sendState === 'loading';
  const isDone    = sendState === 'done';

  const handleSend = () => {
    if (!hasData || isLoading || isDone) return;
    setSendState('loading');
    setTimeout(() => {
      setSendState('done');
      setShowSendDone(true);
      setTimeout(() => setSendState('idle'), 2600);
    }, 950);
  };

  // ── SVG colour tokens ────────────────────────────────────────────────────
  const cargoBg  = isDone ? '#059669' : hasData ? '#6366f1' : (D?'#27272a':'#e2e8f0');
  const cargoStk = isDone ? '#6ee7b7' : hasData ? '#c7d2fe' : (D?'#3f3f46':'#cbd5e1');
  const cabBg    = isDone ? '#10b981' : hasData ? '#818cf8' : (D?'#3f3f46':'#f1f5f9');
  const cabWin   = isDone ? '#d1fae5' : hasData ? '#e0e7ff' : (D?'#52525b':'#f8fafc');
  const whlOut   = isDone ? '#065f46' : hasData ? '#3730a3' : (D?'#18181b':'#94a3b8');
  const whlIn    = isDone ? '#34d399' : hasData ? '#a5b4fc' : (D?'#3f3f46':'#cbd5e1');
  const lamp     = (hasData||isDone) ? '#fbbf24' : (D?'#27272a':'#e2e8f0');
  const labelClr = isDone ? (D?'text-emerald-400':'text-emerald-600')
    : hasData   ? (D?'text-indigo-300':'text-indigo-600')
    : (D?'text-gray-600':'text-gray-400');

  return (
    <button
      onClick={handleSend}
      disabled={!hasData || isLoading}
      title={hasData ? t.taroziSendTooltipOk : t.taroziSendTooltipNo}
      className={`
        relative flex items-center gap-1.5 pl-1.5 pr-2.5 py-1.5 rounded-xl border
        transition-all select-none
        ${isDone
          ? D ? 'bg-[#052e16] border-emerald-500/70 hover:bg-[#064e3b]'
              : 'bg-emerald-50 border-emerald-400 hover:bg-emerald-100'
          : hasData
            ? D ? 'bg-[#1c1c1e] hover:bg-[#252528] border-indigo-500/50 hover:border-indigo-400 active:scale-95 cursor-pointer'
                : 'bg-white hover:bg-indigo-50 border-indigo-300 hover:border-indigo-400 active:scale-95 cursor-pointer'
            : D ? 'bg-[#161618] border-gray-700/40 opacity-30 cursor-not-allowed'
                : 'bg-gray-50 border-gray-200 opacity-30 cursor-not-allowed'
        }`}
      style={hasData && !isDone ? {
        boxShadow: D
          ? '0 0 0 1px rgba(99,102,241,.3), 0 2px 10px rgba(99,102,241,.18)'
          : '0 0 0 1px rgba(99,102,241,.25), 0 2px 10px rgba(99,102,241,.2)'
      } : {}}
    >
      {/* ── Delivery Truck SVG ─────────────────────────────────────── */}
      <svg width="34" height="22" viewBox="0 0 34 22" fill="none"
        className={isLoading ? 'animate-[truckMove_.5s_ease-in-out_infinite_alternate]' : ''}>

        {/* ground */}
        <line x1="0" y1="21.2" x2="34" y2="21.2"
          stroke={D?'#3f3f46':'#e2e8f0'} strokeWidth="0.7"/>

        {/* ── cargo box ── */}
        <rect x="1" y="3.5" width="19" height="12.5" rx="1.8" fill={cargoBg}/>
        {/* vertical divider */}
        <line x1="10" y1="3.5" x2="10" y2="16" stroke={cargoStk} strokeWidth="0.8" opacity="0.45"/>
        {/* horizontal mid */}
        <line x1="1" y1="9.75" x2="20" y2="9.75" stroke={cargoStk} strokeWidth="0.6" opacity="0.3"/>
        {/* door handle */}
        <rect x="13" y="9" width="3.5" height="1.6" rx="0.8" fill={cargoStk} opacity="0.65"/>

        {/* ── cab ── */}
        <path d="M20 7 L20 16 L32.5 16 L32.5 11.2 L28.2 7 Z"
          fill={cabBg}/>
        {/* windshield */}
        <path d="M21.5 8.6 L27.4 8.6 L30 11.2 L21.5 11.2 Z"
          fill={cabWin} opacity="0.9"/>
        {/* cab door line */}
        <line x1="24.5" y1="11.2" x2="24.5" y2="16"
          stroke={cargoStk} strokeWidth="0.5" opacity="0.35"/>
        {/* door handle */}
        <rect x="22" y="13.2" width="2.8" height="1.1" rx="0.55"
          fill={cargoStk} opacity="0.5"/>

        {/* ── headlight ── */}
        <rect x="31.2" y="13" width="2.8" height="2" rx="0.7" fill={lamp}/>
        {(hasData||isDone) && (
          <ellipse cx="33.5" cy="14" rx="2.2" ry="1.4"
            fill="#fbbf24" opacity="0.2"/>
        )}

        {/* ── exhaust ── */}
        <rect x="4" y="1.5" width="1.5" height="3.5" rx="0.75"
          fill={isLoading?(D?'#71717a':'#a1a1aa'):(D?'#3f3f46':'#d4d4d8')} opacity="0.75"/>
        {isLoading && [
          {cx:4.75, cy:0.5, r:1.2,  dl:'0s'   },
          {cx:6.1,  cy:0,   r:0.75, dl:'.16s'  },
          {cx:3.4,  cy:0,   r:0.6,  dl:'.3s'   },
        ].map((s,i)=>(
          <circle key={i} cx={s.cx} cy={s.cy} r={s.r}
            fill="#a1a1aa" opacity="0.3"
            style={{animation:`smokeUp .7s ${s.dl} ease-out infinite`}}/>
        ))}

        {/* ── rear wheel ── */}
        <circle cx="7" cy="18.2" r="3.5" fill={whlOut}/>
        <circle cx="7" cy="18.2" r="2"   fill={whlIn}/>
        <circle cx="7" cy="18.2" r="0.8" fill={D?'#09090b':'rgba(255,255,255,.75)'}/>
        {[0,1,2,3,4].map(i=>{
          const a=(i/5)*Math.PI*2;
          return <circle key={i}
            cx={7+Math.cos(a)*1.3} cy={18.2+Math.sin(a)*1.3}
            r="0.32" fill={D?'#09090b':'rgba(255,255,255,.55)'}/>;
        })}

        {/* ── front wheel ── */}
        <circle cx="26" cy="18.2" r="3.5" fill={whlOut}/>
        <circle cx="26" cy="18.2" r="2"   fill={whlIn}/>
        <circle cx="26" cy="18.2" r="0.8" fill={D?'#09090b':'rgba(255,255,255,.75)'}/>
        {[0,1,2,3,4].map(i=>{
          const a=(i/5)*Math.PI*2;
          return <circle key={i}
            cx={26+Math.cos(a)*1.3} cy={18.2+Math.sin(a)*1.3}
            r="0.32" fill={D?'#09090b':'rgba(255,255,255,.55)'}/>;
        })}

        {/* ── done checkmark on cargo ── */}
        {isDone && (
          <path d="M5 10 L8.5 13.5 L16 7"
            stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
            style={{animation:'checkDraw .3s .05s ease-out both'}}/>
        )}
      </svg>

      {/* ── label ── */}
      <span className={`text-[11px] font-semibold ${labelClr}`}>
        {isDone ? t.taroziSentDone : isLoading ? '···' : t.taroziSendBtn}
      </span>

      {/* active pulse ring */}
      {hasData && !isDone && !isLoading && (
        <span className="absolute inset-0 rounded-xl pointer-events-none"
          style={{animation:'sendPulse 2s ease-in-out infinite'}}/>
      )}
    </button>
  );
}

// ── Status types ──────────────────────────────────────────────────────────────
// pending   = qora   — agent buyurtma berdi, tayyorlanmagan
// ready     = ko'k   — tayyorlangan, yuklashga tayyor (lekin klientga yetkazilmagan)
// delivered = yashil — klientga yuborilgan / yetkazilgan

type OrderStatus = 'pending' | 'ready' | 'delivered';

// ── Mock data ─────────────────────────────────────────────────────────────────
const AGENTS: { id:number; name:string; code:string; client:string; status:OrderStatus; group:boolean }[] = [
  { id: 1,  name: 'Норова Нодира', code: '',      client: '22 / 28',                  status:'pending',   group: true  },
  { id: 2,  name: '',              code: '15028', client: 'NAVOI MALINA MARKET',       status:'ready',     group: false },
  { id: 3,  name: '',              code: '16004', client: 'NAVOIY OYBEK ZIYO MC.',     status:'ready',     group: false },
  { id: 4,  name: '',              code: '15048', client: 'AMIRXON UMIDIMIZ OK',       status:'delivered', group: false },
  { id: 5,  name: '',              code: '15012', client: 'FARMON OK-19 (NAVOIY...)',  status:'ready',     group: false },
  { id: 6,  name: '',              code: '28801', client: 'XUMO GULI MCHJ',            status:'delivered', group: false },
  { id: 7,  name: '',              code: '15018', client: 'ASLAN NAVOIY TONGI',        status:'delivered', group: false },
  { id: 8,  name: '',              code: '16011', client: 'МУРОДОВА НАВРУЗА',          status:'ready',     group: false },
  { id: 9,  name: '',              code: '16024', client: 'ORZIYEV UMID YaTT',         status:'pending',   group: false },
  { id: 10, name: '',              code: '28788', client: 'ZAHIDUN',                   status:'pending',   group: false },
  { id: 11, name: '',              code: '16008', client: 'BEK SARDOR 2005 OK',        status:'pending',   group: false },
  { id: 12, name: '',              code: '16009', client: 'FARXOD XURSHIDA OK',        status:'pending',   group: false },
  { id: 13, name: '',              code: '16011', client: 'МУРОДОВА НАВРУЗА 2',        status:'pending',   group: false },
  { id: 14, name: '',              code: '15040', client: 'RASULOVA FERUZA AZI...',    status:'pending',   group: false },
  { id: 15, name: '',              code: '16013', client: 'NURILLAYEV ABDULLA X..',    status:'pending',   group: false },
  { id: 16, name: '',              code: '16029', client: 'BAHONOV BAHRIDDIN F...',    status:'pending',   group: false },
  { id: 17, name: '',              code: '28784', client: 'Raxmonova Umida Odil gizi', status:'pending',   group: false },
  { id: 18, name: '',              code: '28670', client: 'SUXROB GOLD XK',            status:'pending',   group: false },
];

const PRODUCTS = [
  { id: 1,  n: 1,  name: 'Кока-Кола 1.5L (quti)',       zakaz: 1,  cena: 90200, ves: 0, ed: 'kg',   summa: 0, qoldiq: 1020.300, danger: false },
  { id: 2,  n: 2,  name: 'Pepsi 1L x6 (o\'ram)',         zakaz: 1,  cena: 90200, ves: 0, ed: 'kg',   summa: 0, qoldiq:  379.360, danger: false },
  { id: 3,  n: 3,  name: 'Sprite 0.5L (quti)',           zakaz: 1,  cena: 90200, ves: 0, ed: 'kg',   summa: 0, qoldiq:    0.860, danger: false },
  { id: 4,  n: 4,  name: 'Fanta Apelsin 2L',             zakaz: 8,  cena: 32800, ves: 0, ed: 'kg',   summa: 0, qoldiq:  846.130, danger: false },
  { id: 5,  n: 5,  name: 'Nestlé Pure Life 5L',          zakaz: 1,  cena: 37500, ves: 0, ed: 'kg',   summa: 0, qoldiq:  663.220, danger: false },
  { id: 6,  n: 6,  name: 'Lipton Ice Tea 1L',            zakaz: 10, cena: 24700, ves: 0, ed: 'dona', summa: 0, qoldiq: 3502.000, danger: false },
  { id: 7,  n: 7,  name: 'Bonaqua 0.5L (quti)',          zakaz: 3,  cena: 30700, ves: 0, ed: 'kg',   summa: 0, qoldiq: 5272.700, danger: false },
  { id: 8,  n: 8,  name: 'Red Bull 0.25L',               zakaz: 2,  cena: 18900, ves: 0, ed: 'dona', summa: 0, qoldiq:  221.000, danger: false },
  { id: 9,  n: 9,  name: 'Mirinda Apelsin 2L',           zakaz: 5,  cena: 28500, ves: 0, ed: 'kg',   summa: 0, qoldiq:  944.500, danger: false },
  { id: 10, n: 10, name: 'Mountain Dew 0.5L',            zakaz: 4,  cena: 15600, ves: 0, ed: 'dona', summa: 0, qoldiq: 1300.000, danger: false },
  { id: 11, n: 11, name: 'Aquafina 1.5L',                zakaz: 6,  cena: 12400, ves: 0, ed: 'dona', summa: 0, qoldiq: 2800.000, danger: false },
  { id: 12, n: 12, name: 'Juicy 1L Apelsin',             zakaz: 3,  cena: 22300, ves: 0, ed: 'dona', summa: 0, qoldiq:  512.000, danger: false },
  { id: 13, n: 13, name: 'Lipton Ice Tea 0.5L',         zakaz: 2,  cena: 24700, ves: 0, ed: 'dona', summa: 0, qoldiq: 3502.000, danger: true  },
];

// qoldiq uchun formatlash: "1 020,300"
const fmtQ = (n: number) =>
  n.toLocaleString('ru-RU', { minimumFractionDigits: 3, maximumFractionDigits: 3 });

const LINES  = ['01-Toshrabot', '02-Navoiy Shimol', '03-Karmana', '05-Markaz'];
const DIRS   = ['Shimol', 'Janub', 'Markaz', 'G\'arb', 'Sharq'];
const TYPES  = ['Odd', 'Maxsus', 'Eksport'];

const fmt = (n: number) => n.toLocaleString('uz-UZ');

// ── Per-agent products (deterministic mock) ───────────────────────────────────
const getProductsForAgent = (agentId: number, isPast = false) => {
  const seed = agentId % 4;
  return PRODUCTS
    .filter((_, i) => (i + seed) % 6 !== 0)
    .map((p, i) => {
      const zakaz = Math.max(1, ((agentId * 3 + p.id * 7) % 11) + 1);
      // O'tgan kunlar uchun deterministic ves va summa
      const ves = isPast
        ? parseFloat((zakaz * (0.5 + ((agentId * 7 + p.id * 13 + i * 3) % 100) / 100)).toFixed(3))
        : 0;
      return {
        ...p,
        n: i + 1,
        zakaz,
        ves,
        summa: isPast ? Math.round(ves * p.cena) : 0,
      };
    });
};

// ── Agents visible for a given date (deterministic mock) ─────────────────────
const getAgentsForDate = (date: Date) => {
  const day   = date.getDate();
  const month = date.getMonth();
  const seed  = (day * 3 + month * 7) % 5;

  // O'tgan kunlarda hammasi 'delivered' (yashil)
  const d = new Date(date); d.setHours(0,0,0,0);
  const t = new Date(_today);
  const isPast = d < t;

  return AGENTS.filter(a => {
    if (a.group) return true;
    return ((a.id + seed) % 4) !== 0;
  }).map(a => isPast ? { ...a, status: 'delivered' as OrderStatus } : a);
};

// ── Days in a month that have at least 1 order (only past + today) ───────────
const _today = new Date();
_today.setHours(0, 0, 0, 0);

const getDaysWithOrders = (year: number, month: number): Set<number> => {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const result = new Set<number>();
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d);
    date.setHours(0, 0, 0, 0);
    if (date > _today) break;                                        // kelasi kunlar — nuqta yo'q
    if (getAgentsForDate(date).filter(a => !a.group).length > 0)
      result.add(d);
  }
  return result;
};

export function AdminTaroziTab({ D, card, divider, sub, t }: Props) {
  const today = new Date();
  const fmtDate = (d: Date) =>
    `${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getFullYear()).slice(2)}`;

  const [currentDate, setCurrentDate] = useState(today);
  const [selectedAgent, setSelectedAgent] = useState<number | null>(null);
  const [zayvka, setZayvka]   = useState('');
  const [clientName, setClientName] = useState('');
  const [liniya, setLiniya]   = useState(LINES[0]);
  const [naprav, setNaprav]   = useState(DIRS[0]);
  const [tip, setTip]         = useState(TYPES[0]);
  const [search, setSearch]   = useState('');
  const [rows, setRows]       = useState<typeof PRODUCTS>([]);
  const [note, setNote]       = useState('');
  const [activePane, setActivePane] = useState<'left'|'right'>('left');
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [numpad, setNumpad] = useState<{ rowId: number; name: string; n: number; val: number } | null>(null);
  const [selectedRow, setSelectedRow] = useState<number | null>(null);
  const [showQoldiq, setShowQoldiq]   = useState(false);
  const [qoldiqLoading, setQoldiqLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: number; name: string } | null>(null);
  // ── Package qty counters (Xalta / Quti / Paket / Mayda_kor) ──────────────
  const [pkgQty, setPkgQty] = useState({ xalta: 0, quti: 0, paket: 0, mayda: 0 });
  const changePkg = (key: keyof typeof pkgQty, delta: number) =>
    setPkgQty(p => ({ ...p, [key]: Math.max(0, p[key] + delta) }));

  // ── New Order Modal ───────────────────────────────────────────────────────
  const [showNewOrder, setShowNewOrder] = useState(false);

  // ── Mobile panel detection (<500px) ──────────────────────────────────────
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 500);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 500);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // ── Product Picker ────────────────────────────────────────────────────────
  const [showPicker, setShowPicker]     = useState(false);
  const [pickerSearch, setPickerSearch] = useState('');
  const pickerSearchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (showPicker) setTimeout(() => pickerSearchRef.current?.focus(), 80);
  }, [showPicker]);

  const filteredPickerProducts = useMemo(() =>
    PRODUCTS.filter(p => p.name.toLowerCase().includes(pickerSearch.toLowerCase())),
    [pickerSearch]
  );

  const pickerAddProduct = (p: typeof PRODUCTS[number]) => {
    setRows(prev => {
      const exists = prev.find(r => r.id === p.id);
      if (exists) return prev.map(r => r.id === p.id ? { ...r, zakaz: r.zakaz + 1 } : r);
      return [...prev, { ...p, n: prev.length + 1, zakaz: 1, ves: 0, summa: 0 }];
    });
  };

  const pickerDecrProduct = (pid: number) => {
    setRows(prev => {
      const exists = prev.find(r => r.id === pid);
      if (!exists) return prev;
      if (exists.zakaz <= 1) return prev.filter(r => r.id !== pid).map((r, i) => ({ ...r, n: i + 1 }));
      return prev.map(r => r.id === pid ? { ...r, zakaz: r.zakaz - 1 } : r);
    });
  };

  const getPickerQty = (id: number) => rows.find(r => r.id === id)?.zakaz ?? 0;

  // ── Send (Yuborish) state ─────────────────────────────────────────────────
  const [sendState, setSendState] = useState<'idle' | 'loading' | 'done'>('idle');
  const [showSendDone, setShowSendDone] = useState(false);

  // ── Calendar state ────────────────────────────────────────────────────────
  const [showCalendar, setShowCalendar] = useState(false);
  const [calMonth, setCalMonth] = useState({ year: today.getFullYear(), month: today.getMonth() });
  const calendarRef = useRef<HTMLDivElement>(null);

  // ── Active filter: which orders to show ──────────────────────────────────
  // 'all'        → ready + pending  (yashil + qora)
  // 'accepted'   → pending only     (faqat qora)
  // 'ready-load' → ready + delivered (yashil + ko'k)
  type FilterKey = 'all' | 'accepted' | 'ready-load';
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all');

  // ── Resizable left panel ──────────────────────────────────────────────────
  const [leftWidth, setLeftWidth] = useState(220);
  const isResizing = useRef(false);
  const startX     = useRef(0);
  const startW     = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isResizing.current = true;
    startX.current     = e.clientX;
    startW.current     = leftWidth;
    document.body.style.cursor   = 'col-resize';
    document.body.style.userSelect = 'none';
  }, [leftWidth]);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    isResizing.current = true;
    startX.current     = e.touches[0].clientX;
    startW.current     = leftWidth;
  }, [leftWidth]);

  // Close calendar on outside click
  useEffect(() => {
    if (!showCalendar) return;
    const handler = (e: MouseEvent) => {
      if (calendarRef.current && !calendarRef.current.contains(e.target as Node))
        setShowCalendar(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showCalendar]);

  useEffect(() => {
    const containerW = () => containerRef.current?.offsetWidth ?? 800;
    const onMove = (x: number) => {
      if (!isResizing.current) return;
      const delta = x - startX.current;
      const newW  = Math.min(Math.max(startW.current + delta, 140), containerW() - 200);
      setLeftWidth(newW);
    };
    const onMouseMove = (e: MouseEvent)  => onMove(e.clientX);
    const onTouchMove = (e: TouchEvent)  => onMove(e.touches[0].clientX);
    const onUp = () => {
      if (!isResizing.current) return;
      isResizing.current = false;
      document.body.style.cursor    = '';
      document.body.style.userSelect = '';
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup',   onUp);
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend',  onUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup',   onUp);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend',  onUp);
    };
  }, []);

  const prevDay = () => setCurrentDate(d => { const n=new Date(d); n.setDate(n.getDate()-1); return n; });
  const nextDay = () => setCurrentDate(d => { const n=new Date(d); n.setDate(n.getDate()+1); return n; });

  const deleteRow    = (id: number) => setRows(r => r.filter(x => x.id !== id));
  const updateRowVes = (id: number, val: number) =>
    setRows(r => r.map(x => x.id === id ? { ...x, ves: val, summa: val * x.cena } : x));
  const toggleExpand = (id: number) =>
    setExpandedRows(prev => { const s=new Set(prev); s.has(id)?s.delete(id):s.add(id); return s; });

  const filteredAgents = useMemo(() => {
    const dateAgents = getAgentsForDate(currentDate);
    const statusAllowed: OrderStatus[] =
      activeFilter === 'all'        ? ['delivered', 'pending'] :
      activeFilter === 'accepted'   ? ['pending']              :
      /* ready-load */                ['ready', 'delivered'];

    return dateAgents.filter(a =>
      (a.group || statusAllowed.includes(a.status)) &&
      (!search || a.client.toLowerCase().includes(search.toLowerCase()) || a.code.includes(search))
    );
  }, [search, activeFilter, currentDate]);

  // ── Footer counts ─���──────────────────────────────────────────────────────
  const nonGroup = filteredAgents.filter(a => !a.group);
  const cntReady     = nonGroup.filter(a => a.status === 'ready').length;
  const cntPending   = nonGroup.filter(a => a.status === 'pending').length;
  const cntDelivered = nonGroup.filter(a => a.status === 'delivered').length;
  const cntTotal     = nonGroup.length;

  const totalVes   = rows.reduce((s, r) => s + r.ves, 0);
  const totalSum   = rows.reduce((s, r) => s + r.summa, 0);
  const totalZakaz = rows.reduce((s, r) => s + r.zakaz, 0);

  // ── Colors ────────────────────────────────────────────────────────────────
  const bg      = D ? 'bg-[#0d0d0d]'  : 'bg-white';
  const inputCls = `w-full px-2.5 py-1.5 rounded-lg text-xs border outline-none transition-colors
    ${D ? 'bg-[#1c1c1e] border-gray-700 text-gray-200 placeholder-gray-600 focus:border-indigo-500'
        : 'bg-gray-50 border-gray-200 text-gray-800 placeholder-gray-400 focus:border-indigo-400'}`;
  const labelCls = `text-[10px] font-medium mb-0.5 ${D ? 'text-gray-500' : 'text-gray-400'}`;
  const btnBase  = `flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all`;
  const btnGhost = `${btnBase} ${D ? 'bg-gray-800 hover:bg-gray-700 text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'}`;

  const selectClient = (a: typeof AGENTS[0]) => {
    if (a.group) return;
    setSelectedAgent(a.id);
    setClientName(a.client);
    setZayvka(String(10040 + a.id));
    setRows(getProductsForAgent(a.id, a.status === 'delivered'));
    setNote('');
    setExpandedRows(new Set());
    setSelectedRow(null);
    setActivePane('right');
    setShowQoldiq(false);    // ← ostatok yashiriladi
    setQoldiqLoading(false); // ← loading ham reset
  };

  // ── Readonly: delivered agentlar o'zgartirib bo'lmaydi ───────────────────
  const isReadonly = selectedAgent !== null &&
    getAgentsForDate(currentDate).find(a => a.id === selectedAgent)?.status === 'delivered';

  const handleRefresh = () => {
    setQoldiqLoading(true);
    setTimeout(() => {
      setShowQoldiq(true);
      setQoldiqLoading(false);
    }, 700);
  };

  // ── Grid template — qoldiq ustuni ko'rinsa kengayadi ─────────────────────
  // Ustun tartibi: N | Tovar | [Ostatok] | Zakaz | Narx | Ves | Ed | Summa | del
  const gridCols = showQoldiq
    ? '28px 1fr 72px 46px 74px 54px 38px 80px 24px'
    : '28px 1fr 46px 74px 54px 38px 80px 24px';

  // ustun sarlavhalari
  const colHeaders = [
    { label: '№',         cls: '' },
    { label: t.taroziTovar, cls: '' },
    ...(showQoldiq ? [{ label: 'Остаток', cls: D ? 'text-amber-400' : 'text-amber-600' }] : []),
    { label: t.taroziMiqdor, cls: '' },
    { label: t.taroziNarx,   cls: '' },
    { label: t.taroziVaz,    cls: `font-bold px-1 rounded ${D ? 'bg-indigo-600/30 text-indigo-300' : 'bg-indigo-100 text-indigo-600'}` },
    { label: t.taroziEd,     cls: '' },
    { label: t.taroziSumma,  cls: '' },
    { label: '',             cls: '' },
  ];

  // ─── LEFT PANEL ─────────────────────────────────────────────────────────────
  const LeftPanel = () => {
    const isRu = t.taroziCancel === 'Отмена';
    const MONTHS_UZ = ['Yanvar','Fevral','Mart','Aprel','May','Iyun','Iyul','Avgust','Sentabr','Oktabr','Noyabr','Dekabr'];
    const MONTHS_RU = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
    const MONTHS = isRu ? MONTHS_RU : MONTHS_UZ;
    const DAY_LABELS = isRu ? ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'] : ['Du','Se','Ch','Pa','Ju','Sh','Ya'];

    const { year: calYear, month: calMon } = calMonth;
    const firstDay    = new Date(calYear, calMon, 1).getDay();
    const daysInMonth = new Date(calYear, calMon + 1, 0).getDate();
    const startOffset = (firstDay + 6) % 7;
    const cells: (number | null)[] = [];
    for (let i = 0; i < startOffset; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);

    const orderDays = getDaysWithOrders(calYear, calMon);

    const isCalSelected = (d: number) =>
      currentDate.getDate() === d && currentDate.getMonth() === calMon && currentDate.getFullYear() === calYear;
    const isCalToday = (d: number) =>
      today.getDate() === d && today.getMonth() === calMon && today.getFullYear() === calYear;

    const pickDay = (d: number) => {
      setCurrentDate(new Date(calYear, calMon, d));
      setSelectedAgent(null);
      setClientName('');
      setRows([]);
      setNote('');
      setShowQoldiq(false);
      setShowCalendar(false);
    };
    const prevCalMonth = () => setCalMonth(cm =>
      cm.month === 0 ? { year: cm.year - 1, month: 11 } : { ...cm, month: cm.month - 1 });
    const nextCalMonth = () => setCalMonth(cm =>
      cm.month === 11 ? { year: cm.year + 1, month: 0 } : { ...cm, month: cm.month + 1 });

    return (
    <div className={`flex flex-col h-full border-r ${divider}`}>
      {/* Date bar */}
      <div ref={calendarRef} className={`relative flex items-center gap-1.5 px-3 py-2 border-b ${divider}`}>
        <button onClick={prevDay} className={`${btnGhost} !px-1.5`}><ChevronLeft size={13}/></button>
        <button
          onClick={() => {
            setCalMonth({ year: currentDate.getFullYear(), month: currentDate.getMonth() });
            setShowCalendar(s => !s);
          }}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-colors
            ${showCalendar
              ? D ? 'bg-indigo-600/30 text-indigo-300 ring-1 ring-indigo-500/50' : 'bg-indigo-100 text-indigo-700 ring-1 ring-indigo-300'
              : D ? 'bg-[#1c1c1e] text-indigo-400 hover:bg-[#252528]'           : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'}`}
        >
          <Scale size={12}/>
          {fmtDate(currentDate)}
          <Calendar size={10} className="opacity-50"/>
        </button>
        <button onClick={nextDay} className={`${btnGhost} !px-1.5`}><ChevronRight size={13}/></button>
        <button className={`${btnGhost} !px-1.5 ml-auto`} title="Yangilash"><RefreshCw size={12}/></button>

        {/* ── Calendar popup ── */}
        {showCalendar && (
          <div
            className={`absolute top-full left-0 mt-1 z-50 rounded-2xl shadow-2xl border overflow-hidden
              ${D ? 'bg-[#1c1c1e] border-gray-700/60' : 'bg-white border-gray-200'}`}
            style={{ width: 224, animation: 'scaleIn .16s cubic-bezier(.34,1.56,.64,1)' }}
          >
            {/* Month header */}
            <div className={`flex items-center justify-between px-3 py-2.5 border-b ${divider}`}>
              <button onClick={prevCalMonth}
                className={`w-6 h-6 flex items-center justify-center rounded-lg transition-colors
                  ${D ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}>
                <ChevronLeft size={13}/>
              </button>
              <span className={`text-xs font-semibold ${D ? 'text-gray-200' : 'text-gray-700'}`}>
                {MONTHS[calMon]} {calYear}
              </span>
              <button onClick={nextCalMonth}
                className={`w-6 h-6 flex items-center justify-center rounded-lg transition-colors
                  ${D ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}>
                <ChevronRight size={13}/>
              </button>
            </div>

            <div className="px-2.5 py-2">
              {/* Day labels */}
              <div className="grid grid-cols-7 mb-1">
                {DAY_LABELS.map(l => (
                  <span key={l} className={`text-center text-[9px] font-semibold py-0.5
                    ${D ? 'text-gray-600' : 'text-gray-400'}`}>{l}</span>
                ))}
              </div>
              {/* Day cells */}
              <div className="grid grid-cols-7 gap-y-0.5">
                {cells.map((d, i) => d === null ? (
                  <span key={`e-${i}`}/>
                ) : (
                  <button key={d} onClick={() => pickDay(d)}
                    className={`relative flex flex-col items-center justify-center h-7 w-full rounded-lg
                      text-[11px] font-medium transition-colors
                      ${isCalSelected(d)
                        ? 'bg-indigo-500 text-white'
                        : isCalToday(d)
                          ? D ? 'ring-1 ring-indigo-500 text-indigo-400 hover:bg-indigo-600/20'
                               : 'ring-1 ring-indigo-400 text-indigo-600 hover:bg-indigo-50'
                          : orderDays.has(d)
                            ? D ? 'text-gray-200 hover:bg-gray-700/60' : 'text-gray-800 hover:bg-gray-100'
                            : D ? 'text-gray-600 hover:bg-gray-700/40' : 'text-gray-400 hover:bg-gray-100'}`}
                  >
                    {d}
                    {orderDays.has(d) && !isCalSelected(d) && (
                      <span className={`absolute bottom-[3px] left-1/2 -translate-x-1/2
                        w-[3px] h-[3px] rounded-full
                        ${isCalToday(d)
                          ? D ? 'bg-indigo-400' : 'bg-indigo-500'
                          : D ? 'bg-sky-500' : 'bg-sky-400'}`}/>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Filter buttons — 3 tabs ── */}
      <div className={`flex items-stretch gap-0 border-b ${divider}`}>
        {([
          {
            key: 'all' as FilterKey,
            icon: LayoutList,
            label: t.taroziAllOrders,
            iconColor: D ? 'text-emerald-400' : 'text-emerald-500',
            dots: [
              { c: D ? 'bg-emerald-400' : 'bg-emerald-500' },
              { c: D ? 'bg-gray-500'    : 'bg-gray-400'    },
            ],
          },
          {
            key: 'accepted' as FilterKey,
            icon: CheckCircle2,
            label: t.taroziAccepted,
            iconColor: D ? 'text-gray-500' : 'text-gray-400',
            dots: [
              { c: D ? 'bg-gray-500' : 'bg-gray-400' },
            ],
          },
          {
            key: 'ready-load' as FilterKey,
            icon: Truck,
            label: t.taroziReadyLoad,
            iconColor: D ? 'text-sky-400' : 'text-sky-500',
            dots: [
              { c: D ? 'bg-sky-400'     : 'bg-sky-500'     },
              { c: D ? 'bg-emerald-400' : 'bg-emerald-500' },
            ],
          },
        ] as const).map(btn => {
          const isActive = activeFilter === btn.key;
          return (
            <button
              key={btn.key}
              onClick={() => setActiveFilter(btn.key)}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2 px-1 transition-all relative
                ${isActive
                  ? D ? 'bg-[#1c1c1e]' : 'bg-white'
                  : D
                    ? 'hover:bg-gray-800/40'
                    : 'hover:bg-gray-50'
                }`}
            >
              {isActive && (
                <span className={`absolute bottom-0 left-2 right-2 h-[2px] rounded-t-full
                  ${btn.key==='all'      ? 'bg-emerald-500' :
                    btn.key==='accepted' ? 'bg-gray-500'    :
                    'bg-sky-500'}`}/>
              )}
              <btn.icon
                size={16}
                className={isActive ? btn.iconColor : D ? 'text-gray-600' : 'text-gray-400'}
              />
              <span className={`text-[9px] font-medium leading-tight text-center
                ${isActive
                  ? btn.iconColor
                  : D ? 'text-gray-600' : 'text-gray-400'}`}>
                {btn.label}
              </span>
              <div className="flex items-center gap-[3px] mt-0.5">
                {btn.dots.map((d, i) => (
                  <span key={i} className={`inline-block w-[5px] h-[5px] rounded-full ${d.c}`}/>
                ))}
              </div>
            </button>
          );
        })}
      </div>

      {/* Column headers */}
      <div className={`grid gap-0 border-b ${divider} ${D ? 'bg-[#161618]' : 'bg-gray-50'}`}
        style={{gridTemplateColumns:'36px 52px 1fr'}}>
        <span className={`text-[10px] font-semibold ${sub} px-1 py-1.5 border-r ${divider}`}>{t.taroziAgent}</span>
        <span className={`text-[10px] font-semibold ${sub} px-1.5 py-1.5 border-r ${divider}`}>{t.taroziCode}</span>
        <span className={`text-[10px] font-semibold ${sub} px-1.5 py-1.5`}>{t.taroziClient}</span>
      </div>

      {/* Agent list */}
      <div className="flex-1 overflow-y-auto">
        {filteredAgents.filter(a => !a.group).length === 0 ? (
          <div className={`flex flex-col items-center justify-center h-24 gap-1.5 ${sub}`}>
            <Calendar size={20} className="opacity-30"/>
            <span className="text-[11px]">{fmtDate(currentDate)}</span>
          </div>
        ) : filteredAgents.map(a => {
          const isActive = selectedAgent === a.id;
          if (a.group) return (
            <div key={a.id}
              className={`grid items-center border-b ${divider} ${D?'bg-[#161618]':'bg-gray-100/80'}`}
              style={{gridTemplateColumns:'36px 52px 1fr'}}>
              {/* Agent col — ⊖ */}
              <div className={`flex items-center justify-center py-1.5 self-stretch border-r ${divider}`}>
                <span className={`text-[10px] ${sub}`}>⊖</span>
              </div>
              {/* Nom + hisoblagich — 2-3 ustunni birlashtirish */}
              <div className="flex items-center justify-between px-1.5 py-1.5"
                style={{gridColumn:'2 / -1'}}>
                <span className={`text-[11px] font-semibold ${D?'text-indigo-400':'text-indigo-600'}`}>
                  {a.name}
                </span>
                <span className={`text-[11px] font-bold flex-shrink-0 ml-2 ${D?'text-gray-300':'text-gray-600'}`}>
                  {a.client}
                </span>
              </div>
            </div>
          );

          // ── status dot & text color ───────────────────────────────────────
          const statusDot =
            a.status === 'delivered' ? <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 flex-shrink-0"/> :
            a.status === 'ready'     ? <span className="w-2.5 h-2.5 rounded-full bg-sky-400 flex-shrink-0"/>     :
            /* pending */               <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0
                                          ${D ? 'bg-gray-600 border border-gray-500' : 'bg-gray-300 border border-gray-400'}`}/>;

          const textCls =
            a.status === 'delivered'
              ? D ? 'text-emerald-400' : 'text-emerald-700'
              : a.status === 'ready'
                ? D ? 'text-sky-400'   : 'text-sky-600'
                : D ? 'text-gray-400'  : 'text-gray-600';

          return (
            <button key={a.id} onClick={() => selectClient(a)}
              className={`w-full grid items-center text-left transition-colors border-b ${divider}
                ${isActive
                  ? D?'bg-indigo-600/20 border-l-2 border-l-indigo-500':'bg-indigo-50 border-l-2 border-l-indigo-500'
                  : D?'hover:bg-gray-800/60':'hover:bg-gray-50'}`}
              style={{gridTemplateColumns:'36px 52px 1fr'}}>
              {/* Status dot */}
              <div className={`flex items-center justify-center py-2 h-full border-r ${divider}`}>
                {statusDot}
              </div>
              {/* Kod */}
              <div className={`px-1.5 py-2 border-r ${divider}`}>
                <span className={`text-[11px] font-mono font-semibold ${D?'text-gray-300':'text-gray-600'}`}>
                  {a.code}
                </span>
              </div>
              {/* Klient */}
              <div className="px-1.5 py-2">
                <span className={`text-[11px] truncate block leading-tight ${textCls}`}>
                  {a.client}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* ── Footer: dynamic counts ── */}
      <div className={`border-t ${divider} ${D?'bg-[#161618]':'bg-gray-50'}`}>
        {/* Color legend + counts row */}
        <div className="flex items-center justify-around px-2 py-1.5 gap-1">
          {/* Total */}
          <div className="flex flex-col items-center">
            <span className={`text-xs font-bold ${D?'text-indigo-400':'text-indigo-600'}`}>{cntTotal}</span>
            <span className={`text-[9px] ${sub}`}>{t.taroziTotal}</span>
          </div>
          {/* Green (delivered) — shown in all & ready-load */}
          {activeFilter !== 'accepted' && (
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-0.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block"/>
                <span className="text-xs font-bold text-emerald-400">{cntDelivered}</span>
              </div>
              <span className={`text-[9px] ${sub}`}>Yuborilgan</span>
            </div>
          )}
          {/* Blue (ready) — shown in ready-load */}
          {activeFilter === 'ready-load' && (
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-0.5">
                <span className="w-2 h-2 rounded-full bg-sky-400 inline-block"/>
                <span className="text-xs font-bold text-sky-400">{cntReady}</span>
              </div>
              <span className={`text-[9px] ${sub}`}>Tayyor</span>
            </div>
          )}
          {/* Dark (pending) — shown in all & accepted */}
          {activeFilter !== 'ready-load' && (
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-0.5">
                <span className={`w-2 h-2 rounded-full inline-block ${D?'bg-gray-500':'bg-gray-400'}`}/>
                <span className={`text-xs font-bold ${D?'text-gray-400':'text-gray-500'}`}>{cntPending}</span>
              </div>
              <span className={`text-[9px] ${sub}`}>Qabul</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
  };

  // ─── RIGHT PANEL ─────────────────────────────────────────────────────────────
  const RightPanel = () => (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Row 1 — Buyurtma fields */}
      <div className={`px-3 py-2 border-b ${divider} ${D?'bg-[#161618]':'bg-gray-50/50'}`}>
        <div className="flex flex-wrap gap-2 items-end">
          <div className="flex-1 min-w-[80px] max-w-[120px]">
            <p className={labelCls}>{t.taroziBuyurtma}</p>
            <input value={zayvka} onChange={e=>setZayvka(e.target.value)} className={inputCls}/>
          </div>
          <div className="flex-1 min-w-[90px] max-w-[130px]">
            <p className={labelCls}>{t.taroziSana}</p>
            <input value={fmtDate(currentDate)} readOnly className={`${inputCls} cursor-default`}/>
          </div>
          <div className="flex-1 min-w-[100px]">
            <p className={labelCls}>{t.taroziClient}</p>
            <input value={clientName} onChange={e=>setClientName(e.target.value)} className={inputCls}/>
          </div>
          <button
            title={t.taroziClear}
            onClick={() => {
              setSelectedAgent(null);
              setClientName('');
              setZayvka('');
              setRows([]);
              setNote('');
              setExpandedRows(new Set());
              setSelectedRow(null);
              setShowQoldiq(false);
            }}
            className={`flex items-center justify-center w-7 h-7 rounded-lg transition-colors mb-0.5
              ${D?'bg-rose-900/30 hover:bg-rose-800/50 text-rose-400':'bg-rose-50 hover:bg-rose-100 text-rose-500'}`}>
            <RotateCcw size={13}/>
          </button>
        </div>
      </div>

      {/* Row 2 — Route fields */}
      <div className={`px-3 py-2 border-b ${divider}`}>
        <div className="flex flex-wrap gap-2 items-end">
          {/* TP — agent nomi (read-only) */}
          <div className="min-w-[120px] max-w-[180px]">
            <p className={labelCls}>{t.taroziAgent}</p>
            <div className={`${inputCls} cursor-default truncate`}>
              {clientName || <span className={sub}>—</span>}
            </div>
          </div>
          {[
            { label: t.taroziLiniya,   val:liniya,set:setLiniya,opts:LINES,  w:'min-w-[100px] flex-1' },
            { label: t.taroziYonalish, val:naprav,set:setNaprav,opts:DIRS,   w:'min-w-[80px] max-w-[120px]' },
            { label: t.taroziTur,      val: tip,  set: setTip,  opts: TYPES, w:'min-w-[70px] max-w-[100px]' },
          ].map(f=>(
            <div key={f.label} className={`${f.w}`}>
              <p className={labelCls}>{f.label}</p>
              <div className="relative">
                <select value={f.val} onChange={e=>f.set(e.target.value)}
                  className={`${inputCls} appearance-none pr-5`}>
                  {f.opts.map(o=><option key={o}>{o}</option>)}
                </select>
                <ChevronDown size={10} className={`absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none ${sub}`}/>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Row 2.5 — Package counters */}
      <div className={`px-3 py-2.5 border-b ${divider}`}>
        <div className="flex gap-2">
          {([
            { key:'xalta' as const, label: t.taroziPkgXalta },
            { key:'quti'  as const, label: t.taroziPkgQuti  },
            { key:'paket' as const, label: t.taroziPkgPaket },
            { key:'mayda' as const, label: t.taroziPkgMayda },
          ]).map(item => {
            const active = pkgQty[item.key] > 0;
            return (
              <div key={item.key} className="flex-1 flex flex-col gap-1 min-w-0">
                <span className={`text-[9px] font-semibold tracking-wide truncate
                  ${active
                    ? D ? 'text-violet-400' : 'text-violet-600'
                    : D ? 'text-gray-500'   : 'text-gray-400'}`}>
                  {item.label}
                </span>
                <div className={`flex items-center rounded-lg overflow-hidden border transition-colors duration-150
                  ${active
                    ? D ? 'border-violet-700/60 bg-violet-950/40' : 'border-violet-300 bg-violet-50'
                    : D ? 'border-gray-700/50 bg-[#1c1c1e]'       : 'border-gray-200 bg-gray-50'}`}>
                  <button
                    onClick={() => changePkg(item.key, -1)}
                    className={`w-7 h-7 flex items-center justify-center shrink-0 select-none transition-colors active:scale-90
                      ${D ? 'text-rose-500 hover:text-rose-300 hover:bg-rose-950/60'
                          : 'text-rose-400 hover:text-rose-600 hover:bg-rose-50'}`}
                  >
                    <svg width="9" height="2" viewBox="0 0 9 2" fill="none">
                      <rect y="0.4" width="9" height="1.2" rx="0.6" fill="currentColor"/>
                    </svg>
                  </button>
                  <span className={`flex-1 text-center tabular-nums text-[13px] font-semibold select-none
                    ${active
                      ? D ? 'text-white'    : 'text-gray-900'
                      : D ? 'text-gray-600' : 'text-gray-400'}`}>
                    {pkgQty[item.key]}
                  </span>
                  <button
                    onClick={() => changePkg(item.key, 1)}
                    className={`w-7 h-7 flex items-center justify-center shrink-0 select-none transition-colors active:scale-90
                      ${D ? 'text-emerald-500 hover:text-emerald-300 hover:bg-emerald-950/60'
                          : 'text-emerald-500 hover:text-emerald-700 hover:bg-emerald-50'}`}
                  >
                    <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
                      <rect x="3.9" y="0" width="1.2" height="9" rx="0.6" fill="currentColor"/>
                      <rect x="0" y="3.9" width="9" height="1.2" rx="0.6" fill="currentColor"/>
                    </svg>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Row 3 — Toolbar */}
      <div className={`px-3 py-1.5 border-b ${divider} flex items-center gap-1 flex-wrap`}>
        {/* Readonly banner */}
        {isReadonly && (
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-medium mr-auto
            ${D ? 'bg-emerald-900/30 text-emerald-400 border border-emerald-800/40'
                : 'bg-emerald-50 text-emerald-600 border border-emerald-200'}`}>
            <CheckCircle2 size={11}/>
            <span>Yetkazilgan — o'zgartirish mumkin emas</span>
          </div>
        )}
        {!isReadonly && (
          <>
            {[
              { icon: Tag,       label: t.taroziTovar          },
              { icon: FolderOpen,label: t.taroziGuruh          },
              { icon: ArrowRight,label: t.taroziYonalish       },
              { icon: Zap,       label: t.taroziAksiya         },
              { icon: Trash2,    label: t.taroziDeleteRow, danger:true },
              { icon: RefreshCw, label: t.taroziRefresh, refresh:true },
            ].map(btn => {
              const isTovar   = btn.label === t.taroziTovar;
              const isRefresh = (btn as {refresh?: boolean}).refresh;
              const isDanger  = (btn as {danger?: boolean}).danger;
              return (
                <button key={btn.label}
                  onClick={
                    isDanger   ? () => {
                      if (selectedRow !== null) {
                        const row = rows.find(x => x.id === selectedRow);
                        if (row) setDeleteConfirm({ id: row.id, name: row.name });
                      }
                    } :
                    isRefresh  ? handleRefresh :
                    isTovar    ? () => setShowPicker(s => !s) :
                    undefined
                  }
                  className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium transition-all
                    ${isDanger
                      ? selectedRow !== null
                        ? D ? 'text-rose-400 bg-rose-900/30 hover:bg-rose-900/50' : 'text-rose-500 bg-rose-50 hover:bg-rose-100'
                        : D ? 'text-gray-600 cursor-not-allowed opacity-40' : 'text-gray-400 cursor-not-allowed opacity-40'
                      : isRefresh
                        ? showQoldiq
                          ? D ? 'text-emerald-400 bg-emerald-900/20 hover:bg-emerald-900/30' : 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100'
                          : btnGhost
                        : isTovar && showPicker
                          ? D ? 'text-indigo-300 bg-indigo-600/20 border border-indigo-600/40' : 'text-indigo-600 bg-indigo-50 border border-indigo-200'
                          : btnGhost}`}>
                  <btn.icon size={11} className={qoldiqLoading && isRefresh ? 'animate-spin' : ''}/>
                  <span>{btn.label}</span>
                  {isTovar && rows.length > 0 && (
                    <span className={`ml-0.5 min-w-[14px] h-3.5 px-1 rounded-full text-[9px] font-bold flex items-center justify-center
                      ${D ? 'bg-indigo-600/40 text-indigo-300' : 'bg-indigo-100 text-indigo-600'}`}>
                      {rows.length}
                    </span>
                  )}
                </button>
              );
            })}
          </>
        )}
      </div>

      {/* ─── Table ─────────────────────���─── */}
      <div className="flex flex-1 flex-col overflow-hidden relative">
        {/* Header — hidden on mobile */}
        {!isMobile && (
          <div className={`grid items-center px-3 py-1.5 border-b ${divider} ${D?'bg-[#161618]':'bg-gray-50'}`}
            style={{gridTemplateColumns: gridCols}}>
            {colHeaders.map((h, i) => (
              <span key={i} className={`text-[10px] font-semibold ${sub} ${h.cls}`}>{h.label}</span>
            ))}
          </div>
        )}

        {/* Rows */}
        <div className="flex-1 overflow-y-auto">
          {rows.length === 0 ? (
            <div className={`flex flex-col items-center justify-center h-32 gap-2 ${sub}`}>
              <Package size={28} className="opacity-30"/>
              <span className="text-xs">{t.taroziNoProducts}</span>
            </div>
          ) : rows.map((r) => {
            const isDanger = r.danger;
            const dangerTxt = isDanger ? (D ? 'text-rose-400' : 'text-rose-500') : '';

            /* ── Mobile card row ── */
            if (isMobile) return (
              <div key={r.id}
                onClick={() => !isReadonly && setSelectedRow(r.id === selectedRow ? null : r.id)}
                className={`px-3 py-2.5 border-b ${divider} transition-colors cursor-pointer
                  ${r.id === selectedRow
                    ? D ? 'bg-indigo-600/20 border-l-2 border-l-indigo-500' : 'bg-indigo-50 border-l-2 border-l-indigo-500'
                    : isDanger
                      ? D ? 'bg-rose-950/20' : 'bg-rose-50/60'
                      : D ? 'hover:bg-gray-800/40' : 'hover:bg-gray-50'}`}>
                <div className="flex items-start gap-2">
                  <span className={`text-[10px] font-mono w-5 flex-shrink-0 mt-0.5 ${isDanger ? dangerTxt : sub}`}>{r.n}</span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-[11px] truncate mb-1.5 ${isDanger ? dangerTxt : D ? 'text-gray-200' : 'text-gray-800'}`}>{r.name}</p>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`text-[11px] font-bold ${isDanger ? dangerTxt : D ? 'text-gray-100' : 'text-gray-800'}`}>
                        {r.zakaz} {r.ed === 'dona' ? 'шт' : r.ed}
                      </span>
                      <span className={`text-[10px] ${sub}`}>× {r.cena.toLocaleString('ru-RU')}</span>
                      {/* Ves button */}
                      {!isReadonly ? (
                        <button
                          onClick={e => { e.stopPropagation(); setNumpad({ rowId: r.id, name: r.name, n: r.n, val: r.ves }); }}
                          className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-medium border transition-colors
                            ${r.ves > 0
                              ? D ? 'bg-indigo-900/40 border-indigo-700/60 text-indigo-300' : 'bg-indigo-100 border-indigo-300 text-indigo-700'
                              : D ? 'bg-[#1c1c24] border-gray-700/60 text-gray-500' : 'bg-gray-100 border-gray-200 text-gray-400'}`}>
                          {r.ves > 0 ? r.ves : <span className="opacity-50">{t.taroziVaz}?</span>}
                        </button>
                      ) : (
                        r.ves > 0 && <span className={`text-[10px] font-medium ${D ? 'text-emerald-400' : 'text-emerald-600'}`}>{r.ves}</span>
                      )}
                      {r.summa > 0 && (
                        <span className={`text-[11px] font-semibold ml-auto ${isDanger ? dangerTxt : D ? 'text-indigo-400' : 'text-indigo-600'}`}>
                          {fmt(r.summa)}
                        </span>
                      )}
                    </div>
                    {showQoldiq && (
                      <p className={`text-[9px] mt-0.5 ${r.qoldiq < r.zakaz ? D ? 'text-rose-400' : 'text-rose-500' : D ? 'text-amber-400' : 'text-amber-700'}`}>
                        qoldiq: {fmtQ(r.qoldiq)}
                      </p>
                    )}
                  </div>
                  {!isReadonly && (
                    <button onClick={e => { e.stopPropagation(); setDeleteConfirm({ id: r.id, name: r.name }); }}
                      className={`w-6 h-6 flex items-center justify-center rounded-lg flex-shrink-0 mt-0.5 transition-colors
                        ${D?'text-gray-600 hover:text-rose-400 hover:bg-rose-900/30':'text-gray-300 hover:text-rose-500 hover:bg-rose-50'}`}>
                      <Trash2 size={12}/>
                    </button>
                  )}
                </div>
              </div>
            );

            /* ── Desktop grid row ── */
            return (
              <div key={r.id}
                onClick={() => !isReadonly && setSelectedRow(r.id === selectedRow ? null : r.id)}
                className={`grid items-center px-3 border-b text-xs transition-colors ${divider}
                  ${isReadonly
                    ? D ? 'opacity-70' : 'opacity-80'
                    : r.id === selectedRow
                      ? D ? 'bg-indigo-600/20 border-l-2 border-l-indigo-500 cursor-pointer' : 'bg-indigo-50 border-l-2 border-l-indigo-500 cursor-pointer'
                      : isDanger
                        ? D ? 'bg-rose-950/20 hover:bg-rose-950/30 cursor-pointer' : 'bg-rose-50/60 hover:bg-rose-50 cursor-pointer'
                        : D ? 'hover:bg-gray-800/50 cursor-pointer' : 'hover:bg-gray-50 cursor-pointer'}`}
                style={{gridTemplateColumns: gridCols, minHeight: 34}}>
                <span className={`font-mono text-[11px] ${isDanger ? dangerTxt : sub}`}>{r.n}</span>
                <span className={`truncate text-[11px] ${isDanger ? dangerTxt : D ? 'text-gray-200' : 'text-gray-800'}`}>{r.name}</span>
                {showQoldiq && (
                  <span className={`text-right text-[11px] font-medium pr-2 truncate
                    ${isDanger ? dangerTxt : r.qoldiq < r.zakaz ? D ? 'text-rose-400' : 'text-rose-500' : D ? 'text-amber-400' : 'text-amber-700'}`}>
                    {fmtQ(r.qoldiq)}
                  </span>
                )}
                <span className={`text-center font-bold text-[12px] ${isDanger ? dangerTxt : D ? 'text-gray-100' : 'text-gray-800'}`}>{r.zakaz}</span>
                <span className={`text-right pr-1 text-[11px] ${isDanger ? dangerTxt : sub}`}>{r.cena.toLocaleString('ru-RU')},00</span>
                {isReadonly ? (
                  <span className={`text-center text-[11px] font-medium ${r.ves > 0 ? D ? 'text-emerald-400' : 'text-emerald-600' : sub}`}>
                    {r.ves > 0 ? r.ves : '—'}
                  </span>
                ) : (
                  <button
                    onClick={e => { e.stopPropagation(); setNumpad({ rowId: r.id, name: r.name, n: r.n, val: r.ves }); }}
                    className={`w-full h-full text-center text-[11px] font-medium rounded px-0.5 py-0.5 border transition-colors
                      ${r.ves > 0
                        ? D ? 'bg-indigo-900/40 border-indigo-700/60 text-indigo-300' : 'bg-indigo-100 border-indigo-300 text-indigo-700'
                        : D ? 'bg-[#1c1c24] border-gray-700/60 text-gray-700' : 'bg-gray-100 border-gray-200 text-gray-300'}`}>
                    {r.ves > 0 ? r.ves : ''}
                  </button>
                )}
                <span className={`text-[10px] font-bold text-center ${isDanger ? dangerTxt : D ? 'text-gray-300' : 'text-gray-700'}`}>
                  {r.ed === 'dona' ? 'шт' : r.ed}
                </span>
                <span className={`text-right text-[11px] font-semibold pr-1 ${isDanger ? dangerTxt : D ? 'text-indigo-400' : 'text-indigo-600'}`}>
                  {r.summa > 0 ? fmt(r.summa) : ''}
                </span>
                {isReadonly ? <span/> : (
                  <button onClick={e => { e.stopPropagation(); setDeleteConfirm({ id: r.id, name: r.name }); }}
                    className={`w-5 h-5 flex items-center justify-center rounded transition-colors
                      ${D?'hover:bg-rose-900/30 text-gray-600 hover:text-rose-400':'hover:bg-rose-50 text-gray-300 hover:text-rose-400'}`}>
                    <Trash2 size={11}/>
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Totals row */}
        {isMobile ? (
          rows.length > 0 && (
            <div className={`flex items-center justify-between px-3 py-2 border-t ${divider} ${D?'bg-[#161618]':'bg-gray-50'}`}>
              <span className={`text-[10px] font-semibold ${sub}`}>
                {t.taroziTotal}: <span className={D?'text-gray-200':'text-gray-700'}>{totalZakaz}</span>
                {totalVes > 0 && <span className={`ml-2 ${D?'text-indigo-300':'text-indigo-600'}`}>{totalVes.toFixed(3)}</span>}
              </span>
              <span className={`text-xs font-bold ${D?'text-indigo-400':'text-indigo-600'}`}>{totalSum > 0 ? fmt(totalSum) : ''}</span>
            </div>
          )
        ) : (
          <div className={`grid items-center px-3 py-2 border-t ${divider} text-xs font-semibold ${D?'bg-[#161618]':'bg-gray-50'}`}
            style={{gridTemplateColumns: gridCols}}>
            <span/>
            <span className={sub}>{t.taroziTotal}:</span>
            {showQoldiq && <span/>}
            <span className={`text-center font-bold ${D?'text-gray-200':'text-gray-800'}`}>{totalZakaz}</span>
            <span/>
            <span className={`text-center ${D?'text-indigo-300':'text-indigo-600'}`}>{totalVes > 0 ? totalVes.toFixed(3) : ''}</span>
            <span/>
            <span className={D?'text-indigo-400':'text-indigo-600'}>{totalSum > 0 ? fmt(totalSum) : ''}</span>
            <span/>
          </div>
        )}

        {/* ── Product Picker Overlay ──────────────────────────────────── */}
        {showPicker && (
          <div
            className={`absolute inset-0 z-20 flex flex-col ${D ? 'bg-[#0d0d0d]' : 'bg-white'}`}
            style={{ animation: 'pickerSlide .2s cubic-bezier(.32,1.2,.56,1)' }}
          >
            {/* Header */}
            <div className={`flex-shrink-0 flex items-center gap-2 px-3 py-2.5 border-b ${divider}
              ${D ? 'bg-[#161618]' : 'bg-gray-50'}`}>
              <Tag size={12} className={D ? 'text-indigo-400' : 'text-indigo-500'}/>
              <span className={`text-xs font-semibold flex-1 ${D ? 'text-gray-200' : 'text-gray-700'}`}>
                {t.noPickerTitle}
              </span>
              {rows.length > 0 && (
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold
                  ${D ? 'bg-indigo-600/30 text-indigo-300' : 'bg-indigo-100 text-indigo-600'}`}>
                  {rows.length} {t.noPickerAdded}
                </span>
              )}
              <button
                onClick={() => setShowPicker(false)}
                className={`w-7 h-7 flex items-center justify-center rounded-xl transition-colors
                  ${D ? 'bg-gray-800 hover:bg-gray-700 text-gray-400' : 'bg-gray-100 hover:bg-gray-200 text-gray-500'}`}>
                <XIcon size={13}/>
              </button>
            </div>

            {/* Search */}
            <div className={`flex-shrink-0 px-3 py-2 border-b ${divider}`}>
              <div className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl border transition-colors
                ${D ? 'bg-[#1c1c1e] border-gray-700 focus-within:border-indigo-500'
                    : 'bg-gray-50 border-gray-200 focus-within:border-indigo-400'}`}>
                <Search size={12} className={D ? 'text-gray-500' : 'text-gray-400'}/>
                <input
                  ref={pickerSearchRef}
                  value={pickerSearch}
                  onChange={e => setPickerSearch(e.target.value)}
                  placeholder={t.noPickerSearch}
                  className={`flex-1 text-xs bg-transparent outline-none
                    ${D ? 'text-gray-200 placeholder-gray-600' : 'text-gray-800 placeholder-gray-400'}`}
                />
                {pickerSearch && (
                  <button onClick={() => setPickerSearch('')}
                    className={D ? 'text-gray-600 hover:text-gray-300' : 'text-gray-300 hover:text-gray-500'}>
                    <XIcon size={10}/>
                  </button>
                )}
              </div>
            </div>

            {/* Product list */}
            <div className="flex-1 overflow-y-auto overscroll-contain">
              {filteredPickerProducts.length === 0 && (
                <div className={`flex flex-col items-center justify-center h-32 gap-2 ${sub}`}>
                  <Package size={24} className="opacity-20"/>
                  <span className="text-xs">{t.noPickerEmpty}</span>
                </div>
              )}
              {filteredPickerProducts.map(p => {
                const qty     = getPickerQty(p.id);
                const inOrder = qty > 0;
                return (
                  <div
                    key={p.id}
                    onClick={() => pickerAddProduct(p)}
                    className={`flex items-center gap-3 px-3 py-2.5 border-b cursor-pointer transition-colors ${divider}
                      ${inOrder
                        ? D ? 'bg-indigo-950/40 hover:bg-indigo-950/60' : 'bg-indigo-50/80 hover:bg-indigo-50'
                        : D ? 'hover:bg-gray-800/50' : 'hover:bg-gray-50'}`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className={`text-[11px] font-medium truncate leading-tight
                        ${inOrder
                          ? D ? 'text-indigo-200' : 'text-indigo-700'
                          : D ? 'text-gray-200' : 'text-gray-700'}`}>
                        {p.name}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-[10px] font-semibold ${D ? 'text-indigo-400' : 'text-indigo-600'}`}>
                          {fmt(p.cena)}
                        </span>
                        <span className={`text-[9px] ${p.qoldiq < 5 ? 'text-rose-400' : D ? 'text-emerald-500' : 'text-emerald-600'}`}>
                          {fmtQ(p.qoldiq)} {p.ed}
                        </span>
                        {p.danger && <span className="text-[9px] text-rose-400 font-semibold">⚠ Kam</span>}
                      </div>
                    </div>

                    {inOrder ? (
                      <div className="flex items-center gap-1.5 flex-shrink-0" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => pickerDecrProduct(p.id)}
                          className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors
                            ${D ? 'bg-gray-800 hover:bg-rose-900/50 text-rose-400'
                                : 'bg-white hover:bg-rose-50 text-rose-500 border border-gray-200'}`}>
                          <Minus size={9}/>
                        </button>
                        <span className={`text-xs font-bold min-w-[18px] text-center tabular-nums
                          ${D ? 'text-indigo-300' : 'text-indigo-600'}`}>{qty}</span>
                        <button
                          onClick={() => pickerAddProduct(p)}
                          className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors
                            ${D ? 'bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-400'
                                : 'bg-indigo-100 hover:bg-indigo-200 text-indigo-600'}`}>
                          <Plus size={9}/>
                        </button>
                      </div>
                    ) : (
                      <div className={`w-7 h-7 flex-shrink-0 rounded-xl flex items-center justify-center
                        ${D ? 'bg-gray-800 hover:bg-indigo-600/30 text-gray-500 hover:text-indigo-400'
                            : 'bg-gray-100 hover:bg-indigo-100 text-gray-400 hover:text-indigo-600'}`}>
                        <Plus size={12}/>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className={`flex-shrink-0 flex items-center justify-between px-3 py-2.5 border-t ${divider}
              ${D ? 'bg-[#161618]' : 'bg-gray-50'}`}>
              <span className={`text-[10px] ${sub}`}>
                {rows.length > 0
                  ? `${rows.length} ${t.noTovarCount}, ${rows.reduce((s,r) => s + r.zakaz, 0)} ${t.noDona}`
                  : t.noPickerNone}
              </span>
              <button
                onClick={() => setShowPicker(false)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors">
                {t.noPickerTayyor} →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Note + Yuborish */}
      <div className={`px-3 py-2 border-t ${divider} flex items-center gap-2`}>
        <span className={`text-[10px] flex-shrink-0 ${sub}`}>{t.taroziNote}</span>
        <input value={note} onChange={e=>setNote(e.target.value)}
          placeholder={t.taroziNotePlaceholder}
          className={`${inputCls} flex-1`}/>


      </div>
    </div>
  );

  // ─── RENDER ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col overflow-hidden" style={{height:'calc(100vh - var(--nav-h))'}}>

      {/* ── Main layout ── */}
      <div ref={containerRef} className="flex h-full overflow-hidden">

        {/* Left panel — resizable on desktop, full-screen on mobile */}
        <div
          className={`flex flex-col flex-shrink-0 overflow-hidden ${D?'bg-[#0d0d0d]':'bg-white'}
            ${isMobile ? (activePane === 'left' ? 'w-full' : '!hidden') : ''}`}
          style={!isMobile ? { width: leftWidth } : {}}
        >
          <LeftPanel/>
        </div>

        {/* ── Drag handle — hidden on mobile ── */}
        {!isMobile && (
          <div
            onMouseDown={onMouseDown}
            onTouchStart={onTouchStart}
            className={`relative flex-shrink-0 w-[5px] cursor-col-resize group z-10 select-none
              ${D ? 'hover:bg-indigo-600/60' : 'hover:bg-indigo-400/50'}
              transition-colors`}
            style={{ background: 'transparent' }}
            title="Kengroq / Torroq qilish"
          >
            <div className={`absolute inset-y-0 left-[2px] w-[1px] ${D?'bg-gray-700':'bg-gray-200'} group-hover:bg-indigo-500 transition-colors`}/>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col gap-[3px] opacity-0 group-hover:opacity-100 transition-opacity">
              {[0,1,2,3,4].map(i=>(
                <div key={i} className={`w-[3px] h-[3px] rounded-full ${D?'bg-indigo-400':'bg-indigo-500'}`}/>
              ))}
            </div>
          </div>
        )}

        {/* Right panel — full-screen on mobile when activePane==='right' */}
        <div className={`flex-1 min-w-0 flex flex-col overflow-hidden ${D?'bg-[#0d0d0d]':'bg-white'}
          ${isMobile && activePane === 'left' ? '!hidden' : ''}`}>
          {/* Right panel header */}
          <div className={`flex items-center gap-1.5 px-2 py-2 border-b ${divider} ${D?'bg-[#161618]':'bg-gray-50/80'}`}>
            {/* Back button — mobile only */}
            {isMobile && (
              <button
                onClick={() => setActivePane('left')}
                className={`w-7 h-7 flex items-center justify-center rounded-lg flex-shrink-0 transition-colors
                  ${D ? 'bg-gray-800 hover:bg-gray-700 text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'}`}>
                <ChevronLeft size={15}/>
              </button>
            )}
            <Scale size={13} className={`flex-shrink-0 ${D?'text-indigo-400':'text-indigo-600'}`}/>
            <span className="text-xs font-semibold truncate min-w-0 flex-1">
              {clientName || t.taroziNoClient}
            </span>
            {!isMobile && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-md flex-shrink-0 ${D?'bg-gray-800 text-gray-400':'bg-gray-100 text-gray-500'}`}>
                #{zayvka}
              </span>
            )}
            {selectedAgent !== null &&
              AGENTS.find(a => a.id === selectedAgent)?.status === 'ready' && !isMobile && (
              <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold flex-shrink-0
                ${D
                  ? 'bg-sky-900/40 text-sky-400 border border-sky-700/40'
                  : 'bg-sky-50 text-sky-600 border border-sky-200'}`}>
                <Truck size={9}/>
                {t.taroziReadyLoad}
              </span>
            )}
            <div className="flex items-center gap-1 flex-shrink-0 ml-auto">
              {/* ── Yuborish button ── */}
              <SendButton
                D={D}
                hasData={rows.length > 0 && rows.every(r => r.ves > 0)}
                sendState={sendState}
                setSendState={setSendState}
                setShowSendDone={setShowSendDone}
                t={t}
              />
              {/* ── Yangi Zakaz: Smartphone button — icon-only on mobile ── */}
              <button
                onClick={() => setShowNewOrder(true)}
                title={t.taroziNewOrder}
                className={`relative flex items-center gap-1.5 pl-1.5 py-1.5 rounded-xl
                  transition-all active:scale-95 border
                  ${isMobile ? 'pr-1.5' : 'pr-3'}
                  ${D
                    ? 'bg-[#1c1c1e] hover:bg-[#252528] border-gray-700/60 hover:border-indigo-500/60'
                    : 'bg-white hover:bg-indigo-50 border-gray-200 hover:border-indigo-300'}`}
              >
                <span className={`relative flex-shrink-0 w-5 h-7 rounded-[4px] border-2 flex flex-col overflow-hidden
                  ${D ? 'border-indigo-400 bg-[#0d0d0d]' : 'border-indigo-500 bg-gray-50'}`}>
                  <span className={`flex-1 mx-[2px] mt-[3px] mb-[4px] rounded-[2px]`}
                    style={{ background: 'linear-gradient(135deg,#34d399 0%,#10b981 100%)' }}
                  >
                    <span className="flex flex-col gap-[2px] p-[2px]">
                      <span className="block h-[1.5px] rounded-full bg-white/70 w-full"/>
                      <span className="block h-[1.5px] rounded-full bg-white/50 w-2/3"/>
                      <span className="block h-[1.5px] rounded-full bg-white/50 w-4/5"/>
                    </span>
                  </span>
                  <span className={`absolute bottom-[1px] left-1/2 -translate-x-1/2
                    w-[4px] h-[4px] rounded-full
                    ${D ? 'bg-indigo-400' : 'bg-indigo-500'}`}/>
                </span>
                {!isMobile && (
                  <span className={`text-[11px] font-semibold
                    ${D ? 'text-indigo-300' : 'text-indigo-600'}`}>
                    {t.taroziNewOrder}
                  </span>
                )}
              </button>
              {/* ── Printer button ── */}
              <button
                title={t.taroziPrint ?? 'Chop etish'}
                className={`w-8 h-8 flex items-center justify-center rounded-xl border transition-all active:scale-95
                  ${D
                    ? 'bg-[#1c1c1e] hover:bg-[#252528] border-gray-700/60 hover:border-gray-500/60 text-gray-400 hover:text-gray-200'
                    : 'bg-white hover:bg-gray-50 border-gray-200 hover:border-gray-300 text-gray-400 hover:text-gray-700'}`}>
                <Printer size={14}/>
              </button>
            </div>
          </div>
          <RightPanel/>
        </div>
      </div>

      {/* ── Numpad modal ── */}
      {numpad && (
        <NumpadModal
          D={D}
          productName={numpad.name}
          rowNum={numpad.n}
          initialValue={numpad.val}
          onConfirm={val => {
            const id = numpad!.rowId;   // stale closureni oldini olish
            updateRowVes(id, val);
          }}
          onClose={() => setNumpad(null)}
        />
      )}

      {/* ── Delete confirm modal ── */}
      {deleteConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(4px)' }}
          onClick={() => setDeleteConfirm(null)}
        >
          <div
            onClick={e => e.stopPropagation()}
            className={`w-full max-w-[320px] rounded-2xl overflow-hidden shadow-2xl
              ${D ? 'bg-[#1c1c1e] border border-gray-700/60' : 'bg-white border border-gray-200'}`}
            style={{ animation: 'scaleIn .18s cubic-bezier(.34,1.56,.64,1)' }}
          >
            {/* Icon + title */}
            <div className="flex flex-col items-center gap-3 px-6 pt-7 pb-5">
              <div className={`w-14 h-14 rounded-full flex items-center justify-center
                ${D ? 'bg-rose-900/40' : 'bg-rose-50'}`}>
                <Trash2 size={26} className={D ? 'text-rose-400' : 'text-rose-500'}/>
              </div>
              <p className={`text-sm font-semibold text-center ${D ? 'text-gray-100' : 'text-gray-800'}`}>
                {t.taroziDelConfirmTitle}
              </p>
              <p className={`text-xs text-center leading-relaxed ${D ? 'text-gray-400' : 'text-gray-500'}`}>
                <span className={`font-semibold ${D ? 'text-gray-200' : 'text-gray-700'}`}>
                  «{deleteConfirm.name}»
                </span>{' '}
                {t.taroziDelConfirmMsg}<br/>{t.taroziDelConfirmWarn}
              </p>
            </div>

            {/* Divider */}
            <div className={`h-px ${D ? 'bg-gray-700/60' : 'bg-gray-100'}`}/>

            {/* Buttons */}
            <div className="flex">
              <button
                onClick={() => setDeleteConfirm(null)}
                className={`flex-1 py-3.5 text-sm font-medium transition-colors border-r
                  ${D
                    ? 'text-gray-300 hover:bg-gray-700/50 border-gray-700/60'
                    : 'text-gray-600 hover:bg-gray-50 border-gray-100'}`}
              >
                {t.taroziCancel}
              </button>
              <button
                onClick={() => {
                  deleteRow(deleteConfirm.id);
                  if (selectedRow === deleteConfirm.id) setSelectedRow(null);
                  setDeleteConfirm(null);
                }}
                className={`flex-1 py-3.5 text-sm font-semibold transition-colors
                  ${D
                    ? 'text-rose-400 hover:bg-rose-900/30'
                    : 'text-rose-500 hover:bg-rose-50'}`}
              >
                {t.taroziDelete}
              </button>
            </div>
          </div>
          <style>{`
            @keyframes scaleIn{from{opacity:0;transform:scale(.88)}to{opacity:1;transform:scale(1)}}
            @keyframes pickerSlide{from{opacity:0;transform:translateX(18px)}to{opacity:1;transform:translateX(0)}}
          `}</style>
        </div>
      )}

      {/* ── New Order Modal ── */}
      {showNewOrder && (
        <NewOrderModal
          D={D}
          divider={divider}
          sub={sub}
          t={t}
          onClose={() => setShowNewOrder(false)}
        />
      )}

      {/* ── Send Done Modal ── */}
      {showSendDone && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }}
          onClick={() => setShowSendDone(false)}
        >
          <div
            onClick={e => e.stopPropagation()}
            className={`w-full max-w-[300px] rounded-3xl overflow-hidden shadow-2xl
              ${D ? 'bg-[#0d1a12] border border-emerald-800/40' : 'bg-white border border-emerald-200'}`}
            style={{ animation: 'scaleIn .22s cubic-bezier(.34,1.56,.64,1)' }}
          >
            {/* Truck animation area */}
            <div className={`relative flex items-center justify-center py-8 overflow-hidden
              ${D ? 'bg-[#0a1f14]' : 'bg-emerald-50'}`}>
              {/* Road dashes */}
              <div className="absolute bottom-6 left-0 right-0 flex items-center justify-center gap-3">
                {[0,1,2,3,4,5].map(i => (
                  <div key={i} className={`h-[3px] rounded-full
                    ${D ? 'bg-emerald-900/60' : 'bg-emerald-200'}`}
                    style={{ width: 18, animation: `roadDash .5s ${i*0.08}s ease-out both` }}/>
                ))}
              </div>
              {/* Big truck SVG */}
              <svg width="100" height="56" viewBox="0 0 100 56" fill="none"
                style={{ animation: 'truckRide .7s cubic-bezier(.34,1.56,.64,1)' }}>
                <rect x="2" y="8" width="56" height="32" rx="5"
                  fill={D ? '#065f46' : '#059669'} opacity="0.9"/>
                <line x1="30" y1="8" x2="30" y2="40" stroke={D?'#6ee7b7':'#fff'} strokeWidth="1.5" opacity="0.4"/>
                <line x1="2"  y1="24" x2="58" y2="24" stroke={D?'#6ee7b7':'#fff'} strokeWidth="1" opacity="0.3"/>
                {/* checkmark on cargo */}
                <path d="M17 24 L26 33 L44 16"
                  stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"
                  style={{animation:'checkDraw .35s .4s ease-out both'}}/>
                {/* Cab */}
                <path d="M58 17 L58 40 L96 40 L96 29 L83 17 Z" fill={D?'#34d399':'#10b981'}/>
                {/* Window */}
                <path d="M61 20 L82 20 L90 29 L61 29 Z" fill={D?'#d1fae5':'#ecfdf5'} opacity="0.9"/>
                {/* Headlight */}
                <rect x="93" y="33" width="5" height="4" rx="1.5"
                  fill="#fbbf24"/>
                <rect x="94" y="33" width="5" height="4" rx="1.5"
                  fill="#fef08a" opacity="0.6"/>
                {/* Exhaust */}
                <rect x="8" y="4" width="4" height="7" rx="2"
                  fill={D?'#059669':'#6ee7b7'} opacity="0.7"/>
                <circle cx="10" cy="2" r="2.5" fill="#94a3b8" opacity="0.3"
                  style={{animation:'smokeUp .6s ease-out'}}/>
                {/* Rear wheel */}
                <circle cx="20" cy="46" r="9" fill={D?'#064e3b':'#065f46'}/>
                <circle cx="20" cy="46" r="5" fill={D?'#34d399':'#6ee7b7'}/>
                <circle cx="20" cy="46" r="2" fill={D?'#0f172a':'#fff'} opacity="0.7"/>
                {/* Front wheel */}
                <circle cx="76" cy="46" r="9" fill={D?'#064e3b':'#065f46'}/>
                <circle cx="76" cy="46" r="5" fill={D?'#34d399':'#6ee7b7'}/>
                <circle cx="76" cy="46" r="2" fill={D?'#0f172a':'#fff'} opacity="0.7"/>
              </svg>
            </div>

            {/* Text */}
            <div className="px-6 py-5 text-center">
              <p className={`font-bold mb-1 ${D ? 'text-emerald-400' : 'text-emerald-700'}`}>
                {t.taroziSentTitle}
              </p>
              <p className={`text-xs leading-relaxed ${D ? 'text-gray-400' : 'text-gray-500'}`}>
                <span className={`font-semibold ${D?'text-gray-200':'text-gray-700'}`}>
                  {clientName}
                </span>{' '}
                {t.taroziSentFor} #{zayvka} {t.taroziSentAccepted}
              </p>
              <p className={`text-xs mt-0.5 font-semibold ${D?'text-indigo-400':'text-indigo-600'}`}>
                {t.taroziSentTotal} {fmt(totalSum)} {t.taroziSomUnit} · {totalVes.toFixed(3)} kg
              </p>
            </div>

            <div className={`h-px ${D?'bg-gray-800':'bg-gray-100'}`}/>
            <button
              onClick={() => setShowSendDone(false)}
              className={`w-full py-3.5 text-sm font-semibold transition-colors
                ${D ? 'text-emerald-400 hover:bg-emerald-900/20' : 'text-emerald-600 hover:bg-emerald-50'}`}
            >
              {t.taroziSentClose}
            </button>
          </div>

          <style>{`
            @keyframes truckRide   { from{opacity:0;transform:translateX(-30px) scale(.9)} to{opacity:1;transform:none} }
            @keyframes roadDash    { from{opacity:0;transform:scaleX(0)} to{opacity:1;transform:scaleX(1)} }
            @keyframes checkDraw   { from{stroke-dasharray:0 80} to{stroke-dasharray:80 0} }
            @keyframes smokeUp     { from{opacity:.4;transform:translateY(0) scale(1)} to{opacity:0;transform:translateY(-8px) scale(1.6)} }
            @keyframes sendPulse   { 0%,100%{box-shadow:0 0 0 0 rgba(56,189,248,.4)} 50%{box-shadow:0 0 0 5px rgba(56,189,248,0)} }
            @keyframes truckMove   { from{transform:translateX(-2px)} to{transform:translateX(2px)} }
            @keyframes loadDot     { from{transform:translateY(0);opacity:.4} to{transform:translateY(-3px);opacity:1} }
          `}</style>
        </div>
      )}
    </div>
  );
}