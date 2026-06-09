import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  X, Maximize2, Minimize2, Check, ChevronDown, ChevronLeft, ChevronRight,
  Calculator, Package, Tag, Plus, Trash2, ArrowUp, ArrowDown,
  RefreshCw, FileDown, FileUp, AlertCircle, CheckCircle2, Calendar, Search,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { createPortal } from 'react-dom';
import type { PostRowRef, PostReceiptItem } from './PostupleniyaDetailModal';
import {
  syncReceiptItemsToCatalog,
  persistSupplierPrice,
  resolveSupplierPrice,
} from '../../utils/receiptProductSync';
import { useAdminAuth } from '../AdminAuthContext';
import { useCompanies } from '../CompaniesContext';
import { api, type AppUserRecord } from '../../api/client';
import { ADMIN_PRODUCTS, type AdminProduct } from '../../data/adminProducts';

function hasApiToken(): boolean {
  return typeof localStorage !== 'undefined' && !!localStorage.getItem('api_access_token');
}

interface PostItem {
  id: number;
  productId?: string;
  tovar: string;
  artikul: string;
  kolFakt: number;
  kolBrak: number;
  upakovka: string;
  tsenaPost: number;
  skid: number;
  tsenaPriv: number;
  summa: number;
  ves: number;
}

interface ReceiptProduct {
  id: string;
  name: string;
  code: string;
  artikul: string;
  price: number;
  unitLabel: string;
  brand: string;
}

function adminProductToReceipt(p: AdminProduct): ReceiptProduct {
  return {
    id: p.id,
    name: p.ismi,
    code: p.kod,
    artikul: p.artikul || p.kod,
    price: p.rtl,
    unitLabel: p.tipTo === 'Штучн.' ? 'шт' : 'кг',
    brand: p.brend,
  };
}

function backendProductToReceipt(p: {
  id: string;
  code: string;
  name: string;
  brand: string | null;
  price: number | string;
  unit: string;
}): ReceiptProduct {
  const unit = p.unit.trim().toLowerCase();
  const unitLabel = unit === 'kg' || unit === 'кг' || unit === 'g' || unit === 'gr' ? 'кг' : 'шт';
  const catalogPrice = typeof p.price === 'number' ? p.price : Number(p.price) || 0;
  return {
    id: p.id,
    name: p.name,
    code: p.code,
    artikul: p.code,
    price: resolveSupplierPrice(p.id, catalogPrice),
    unitLabel,
    brand: p.brand ?? '',
  };
}

function adminProductToReceiptWithCache(p: AdminProduct): ReceiptProduct {
  const base = adminProductToReceipt(p);
  return { ...base, price: resolveSupplierPrice(p.id, base.price) };
}

interface Props {
  D: boolean;
  t: Record<string, string>;
  onClose: () => void;
  onSave?: (row: PostRowRef) => void;
  suppliers?: string[];
  nextNum?: string;
}

type MainTab = 'postavshiki' | 'vagon' | 'prodazha';
type InnerTab = 'tovary' | 'gruppy' | 'brendy' | 'dop' | 'materialy';

const VIDY     = ['Баланс', 'Отв.хран'];
const TSELI    = ['Оптовая', 'Розничная', 'Производство'];
const SKLADY   = ['Склад SHERIN', 'Склад SOFIN', 'Склад MAIN'];
const NAPRAVL  = ['SHERIN', 'SOF IN', 'MAIN'];

const TSELI_TYPE: Record<string, PostRowRef['type']> = {
  'Оптовая': 'opt',
  'Розничная': 'chakana',
  'Производство': 'ishlab',
};

function todayStr() {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
}

function parseDMY(s: string): Date | null {
  const [d, m, y] = s.split('.').map(Number);
  if (!d || !m || !y || y < 2000) return null;
  return new Date(y, m - 1, d);
}

function fmtDMY(d: Date) {
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
}

function fieldCls(D: boolean, red?: boolean) {
  if (red) return 'border-rose-500/50 bg-rose-500/5 text-rose-400';
  return D
    ? 'bg-[#1c1c1e] border-[#2a2a2e] text-white placeholder:text-gray-600'
    : 'bg-white border-gray-200 text-gray-900 placeholder:text-gray-400';
}

function FormSelect({
  D, sub, value, onChange, options, placeholder, w, error,
}: {
  D: boolean;
  sub: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
  w?: string;
  error?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  const display = value || placeholder || '—';

  return (
    <div ref={ref} className={`relative ${w ?? 'w-full'}`}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`w-full rounded-xl border px-3 py-2.5 pr-8 text-xs text-left outline-none transition-all
          focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500
          ${error ? 'border-rose-500 ring-2 ring-rose-500/20' : open ? 'border-indigo-500 ring-2 ring-indigo-500/30' : ''}
          ${fieldCls(D, error)}
          ${!value ? sub : ''}`}
      >
        <span className="block truncate">{display}</span>
      </button>
      <ChevronDown
        size={13}
        className={`pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 transition-transform
          ${open ? 'rotate-180' : ''} ${sub}`}
      />
      {open && (
        <div
          className={`absolute top-full left-0 right-0 mt-1.5 z-[300] rounded-xl border shadow-xl overflow-hidden max-h-52 overflow-y-auto
            ${D ? 'bg-[#1c1c1e] border-gray-700 shadow-black/60' : 'bg-white border-gray-200 shadow-gray-300/50'}`}
        >
          {placeholder && (
            <button
              type="button"
              onClick={() => { onChange(''); setOpen(false); }}
              className={`w-full text-left px-3 py-2.5 text-xs transition-colors border-b
                ${D ? 'text-gray-500 hover:bg-gray-800 border-gray-800' : 'text-gray-400 hover:bg-gray-50 border-gray-100'}`}
            >
              {placeholder}
            </button>
          )}
          {options.map(opt => (
            <button
              key={opt}
              type="button"
              onClick={() => { onChange(opt); setOpen(false); }}
              className={`w-full text-left px-3 py-2.5 text-xs transition-colors
                ${value === opt
                  ? D ? 'bg-indigo-500/20 text-indigo-300 font-semibold' : 'bg-indigo-50 text-indigo-600 font-semibold'
                  : D ? 'text-gray-200 hover:bg-gray-800' : 'text-gray-800 hover:bg-gray-50'}`}
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function FormDatePicker({
  D, sub, value, onChange, placeholder, w, t,
}: {
  D: boolean;
  sub: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  w?: string;
  t: Record<string, string>;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const parsed = parseDMY(value);
  const [view, setView] = useState<Date>(() => parsed ?? new Date());

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  useEffect(() => {
    if (parsed) setView(new Date(parsed.getFullYear(), parsed.getMonth(), 1));
  }, [value]);

  const months = (t.zatCalMonths || 'Yan,Fev,Mar,Apr,May,Iyn,Iyl,Avg,Sen,Okt,Noy,Dek').split(',');
  const days   = (t.zatCalDays || 'Du,Se,Ch,Pa,Ju,Sh,Ya').split(',');
  const year  = view.getFullYear();
  const month = view.getMonth();
  const firstDow = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const today = new Date();
  const isSelected = (day: number) =>
    parsed &&
    parsed.getFullYear() === year &&
    parsed.getMonth() === month &&
    parsed.getDate() === day;
  const isToday = (day: number) =>
    today.getFullYear() === year &&
    today.getMonth() === month &&
    today.getDate() === day;

  return (
    <div ref={ref} className={`relative ${w ?? 'w-full'}`}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`w-full rounded-xl border px-3 py-2.5 pr-8 text-xs text-left outline-none transition-all
          focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 flex items-center gap-2
          ${open ? 'border-indigo-500 ring-2 ring-indigo-500/30' : ''}
          ${fieldCls(D)}`}
      >
        <Calendar size={12} className={`flex-shrink-0 ${D ? 'text-indigo-400' : 'text-indigo-500'}`} />
        <span className={`truncate ${value ? '' : sub}`}>{value || placeholder || '—'}</span>
      </button>
      <ChevronDown
        size={13}
        className={`pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 transition-transform
          ${open ? 'rotate-180' : ''} ${sub}`}
      />

      {open && (
        <div
          className={`absolute top-full left-0 mt-1.5 z-[300] rounded-2xl border shadow-2xl p-3 w-[248px]
            ${D ? 'bg-[#141414] border-gray-700 shadow-black/70' : 'bg-white border-gray-200 shadow-gray-300/60'}`}
        >
          <div className="flex items-center justify-between mb-3">
            <button
              type="button"
              onClick={() => setView(new Date(year, month - 1, 1))}
              className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors
                ${D ? 'hover:bg-white/10 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}
            >
              <ChevronLeft size={14} />
            </button>
            <span className={`text-xs font-bold ${D ? 'text-white' : 'text-gray-900'}`}>
              {months[month] ?? month + 1} {year}
            </span>
            <button
              type="button"
              onClick={() => setView(new Date(year, month + 1, 1))}
              className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors
                ${D ? 'hover:bg-white/10 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}
            >
              <ChevronRight size={14} />
            </button>
          </div>

          <div className="grid grid-cols-7 mb-1">
            {days.map(d => (
              <div key={d} className={`text-center text-[10px] font-semibold py-0.5 ${sub}`}>{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-0.5">
            {cells.map((day, i) => day === null ? (
              <div key={`e-${i}`} />
            ) : (
              <button
                key={day}
                type="button"
                onClick={() => {
                  onChange(fmtDMY(new Date(year, month, day)));
                  setOpen(false);
                }}
                className={`h-8 rounded-lg text-xs font-medium transition-colors
                  ${isSelected(day)
                    ? 'bg-indigo-500 text-white font-bold'
                    : isToday(day)
                      ? D ? 'bg-indigo-500/20 text-indigo-300 ring-1 ring-indigo-500/40' : 'bg-indigo-50 text-indigo-600 ring-1 ring-indigo-200'
                      : D ? 'text-gray-300 hover:bg-white/10' : 'text-gray-700 hover:bg-gray-100'}`}
              >
                {day}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between mt-3 pt-2 border-t border-dashed border-gray-700/40">
            <button
              type="button"
              onClick={() => { onChange(''); setOpen(false); }}
              className={`text-[10px] px-2 py-1 rounded-lg transition-colors ${sub} ${D ? 'hover:bg-white/5' : 'hover:bg-gray-100'}`}
            >
              ✕
            </button>
            <button
              type="button"
              onClick={() => { onChange(todayStr()); setOpen(false); }}
              className={`text-[10px] px-2.5 py-1 rounded-lg font-semibold transition-colors
                ${D ? 'text-indigo-300 hover:bg-indigo-500/15' : 'text-indigo-600 hover:bg-indigo-50'}`}
            >
              {t.calToday ?? 'Bugun'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ProductSearchSelect({
  D, sub, inp, value, products, onSelect, onCustomName, placeholder, searchPlaceholder, emptyText,
  customLabel, defaultOpen, onOpened, error,
}: {
  D: boolean;
  sub: string;
  inp: string;
  value: string;
  products: ReceiptProduct[];
  onSelect: (p: ReceiptProduct) => void;
  onCustomName?: (name: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  customLabel?: string;
  defaultOpen?: boolean;
  onOpened?: () => void;
  error?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen ?? false);
  const [q, setQ] = useState('');
  const [pos, setPos] = useState({ top: 0, left: 0, width: 280, listMaxHeight: 208, openUp: false });
  const btnRef = useRef<HTMLButtonElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const reposition = useCallback(() => {
    if (!btnRef.current) return;
    const r = btnRef.current.getBoundingClientRect();
    const searchH = 52;
    const preferredListH = 208;
    const totalH = searchH + preferredListH;
    const spaceBelow = window.innerHeight - r.bottom - 8;
    const spaceAbove = r.top - 8;
    const openUp = spaceBelow < totalH && spaceAbove > spaceBelow;
    const available = openUp ? spaceAbove : spaceBelow;
    const listMaxHeight = Math.max(Math.min(preferredListH, available - searchH), 100);
    setPos({
      top: openUp ? r.top - 4 : r.bottom + 4,
      left: r.left,
      width: Math.max(r.width, 280),
      listMaxHeight,
      openUp,
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    reposition();
    window.addEventListener('scroll', reposition, true);
    window.addEventListener('resize', reposition);
    return () => {
      window.removeEventListener('scroll', reposition, true);
      window.removeEventListener('resize', reposition);
    };
  }, [open, reposition]);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (
        btnRef.current && !btnRef.current.contains(e.target as Node) &&
        dropRef.current && !dropRef.current.contains(e.target as Node)
      ) setOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setQ('');
    reposition();
    const timer = setTimeout(() => searchRef.current?.focus(), 50);
    return () => clearTimeout(timer);
  }, [open, reposition]);

  useEffect(() => {
    if (!defaultOpen) return;
    setOpen(true);
    onOpened?.();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultOpen]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return products.slice(0, 100);
    return products.filter(p =>
      p.name.toLowerCase().includes(needle) ||
      p.code.toLowerCase().includes(needle) ||
      p.artikul.toLowerCase().includes(needle) ||
      p.brand.toLowerCase().includes(needle),
    ).slice(0, 100);
  }, [products, q]);

  const display = value || placeholder || '—';

  const dropdown = open ? createPortal(
    <div
      ref={dropRef}
      style={{
        position: 'fixed',
        top: pos.top,
        left: pos.left,
        width: pos.width,
        zIndex: 10060,
        transform: pos.openUp ? 'translateY(-100%)' : undefined,
      }}
      className={`rounded-xl border shadow-xl overflow-hidden
        ${D ? 'bg-[#1c1c1e] border-gray-700 shadow-black/60' : 'bg-white border-gray-200 shadow-gray-300/50'}`}
    >
      <div className={`p-2 border-b ${D ? 'border-gray-800' : 'border-gray-100'}`}>
        <div className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg border
          ${D ? 'bg-[#111] border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
          <Search size={12} className={sub} />
          <input
            ref={searchRef}
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder={searchPlaceholder}
            className={`flex-1 bg-transparent text-xs outline-none ${D ? 'text-white placeholder-gray-600' : 'text-gray-900 placeholder-gray-400'}`}
          />
          {q && (
            <button type="button" onClick={() => setQ('')} className={sub}>
              <X size={10} />
            </button>
          )}
        </div>
      </div>
      <div className="overflow-y-auto overscroll-contain" style={{ maxHeight: pos.listMaxHeight }}>
        {filtered.length === 0 ? (
          <div className="px-3 py-3">
            <p className={`text-xs text-center mb-2 ${sub}`}>{emptyText ?? 'Topilmadi'}</p>
            {q.trim() && onCustomName && (
              <button
                type="button"
                onClick={() => { onCustomName(q.trim()); setOpen(false); }}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors
                  ${D ? 'bg-indigo-500/15 text-indigo-300 hover:bg-indigo-500/25' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'}`}
              >
                + {customLabel ?? 'Yangi mahsulot'}: &quot;{q.trim()}&quot;
              </button>
            )}
          </div>
        ) : filtered.map(p => (
          <button
            key={p.id}
            type="button"
            onClick={() => { onSelect(p); setOpen(false); }}
            className={`w-full text-left px-3 py-2.5 transition-colors border-b last:border-b-0
              ${D ? 'border-gray-800 hover:bg-gray-800' : 'border-gray-50 hover:bg-gray-50'}
              ${value === p.name
                ? D ? 'bg-indigo-500/15 text-indigo-300' : 'bg-indigo-50 text-indigo-600'
                : ''}`}
          >
            <p className="text-xs font-medium truncate">{p.name}</p>
            <p className={`text-[10px] mt-0.5 truncate ${sub}`}>
              {[p.code, p.brand, p.price > 0 ? p.price.toLocaleString('ru-RU') : ''].filter(Boolean).join(' · ')}
            </p>
          </button>
        ))}
      </div>
    </div>,
    document.body,
  ) : null;

  return (
    <div className="relative min-w-[160px]">
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`w-full rounded border px-1.5 py-1 pr-6 text-xs text-left outline-none transition-all
          focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500
          ${error ? 'border-rose-500 ring-1 ring-rose-500/30' : inp}
          ${!value ? sub : ''}`}
      >
        <span className="block truncate">{display}</span>
      </button>
      <ChevronDown
        size={11}
        className={`pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 transition-transform
          ${open ? 'rotate-180' : ''} ${sub}`}
      />
      {dropdown}
    </div>
  );
}

export function PostupleniyaModal({ D, t, onClose, onSave, suppliers = [], nextNum }: Props) {
  const { selectedCompany, adminUser } = useAdminAuth();
  const { companies } = useCompanies();
  const organizations = companies.map(c => c.name);
  const defaultOrg = selectedCompany?.name ?? organizations[0] ?? '';
  const [fullscreen, setFullscreen]     = useState(false);
  const [mainTab,    setMainTab]        = useState<MainTab>('postavshiki');
  const [innerTab,   setInnerTab]       = useState<InnerTab>('tovary');
  const [items,      setItems]          = useState<PostItem[]>([]);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [saveError, setSaveError]       = useState<string | null>(null);
  const [fieldErrors, setFieldErrors]   = useState<Set<string>>(new Set());
  const [invalidItemIds, setInvalidItemIds] = useState<Set<number>>(new Set());
  const [saving, setSaving]             = useState(false);
  const [catalogProducts, setCatalogProducts] = useState<ReceiptProduct[]>([]);
  const [autoOpenProductRow, setAutoOpenProductRow] = useState<number | null>(null);

  /* ── import state ── */
  const fileInputRef                    = useRef<HTMLInputElement>(null);
  const [importPreview, setImportPreview] = useState<PostItem[] | null>(null);
  const [importError,   setImportError]   = useState<string | null>(null);
  const [importSelAll,  setImportSelAll]  = useState(true);
  const [importSel,     setImportSel]     = useState<Set<number>>(new Set());

  /* ── form state ── */
  const [vidPost,     setVidPost]     = useState('Баланс');
  const [tselPrikh,   setTselPrikh]   = useState('Оптовая');
  const [nSchFak,     setNSchFak]     = useState('');
  const [dataDoc,     setDataDoc]     = useState(todayStr);
  const [dataPog,     setDataPog]     = useState('');
  const [postavshik,  setPostavshik]  = useState('');
  const [poluchatel,  setPoluchatel]  = useState(defaultOrg);
  const [napravlenie, setNapravlenie] = useState('SHERIN');
  const [appUsers,    setAppUsers]    = useState<AppUserRecord[]>([]);
  const [avtor,       setAvtor]       = useState('');
  const [avtorReady,  setAvtorReady]  = useState(false);
  const [sklad,       setSklad]       = useState('Склад SHERIN');
  const [pere,        setPere]        = useState('0.00');
  const [nal,         setNal]         = useState('0.00');
  const [poluchNal,   setPoluchNal]   = useState('0.00');
  const [skidkaPer,   setSkidkaPer]   = useState('0.00');
  const [skidkaNal,   setSkidkaNal]   = useState('0.00');
  const [kontPrays,   setKontPrays]   = useState('Нет');

  /* ESC to close */
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  useEffect(() => {
    if (!hasApiToken()) return;
    api.listAppUsers()
      .then(users => setAppUsers(users.filter(u => u.isActive)))
      .catch(() => setAppUsers([]));
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadCatalog() {
      if (hasApiToken()) {
        try {
          const data = await api.getProducts();
          const active = data.filter(p => p.isActive !== false);
          if (!cancelled && active.length > 0) {
            setCatalogProducts(active.map(backendProductToReceipt));
            return;
          }
        } catch {
          /* fallback below */
        }
      }
      if (!cancelled) {
        setCatalogProducts(ADMIN_PRODUCTS.map(adminProductToReceiptWithCache));
      }
    }
    loadCatalog();
    return () => { cancelled = true; };
  }, []);

  const authorOptions = useMemo(() => {
    const names = appUsers.map(u => u.fullName);
    if (names.length > 0) return names;
    if (adminUser?.name) return [adminUser.name];
    return [];
  }, [appUsers, adminUser]);

  useEffect(() => {
    if (avtorReady || authorOptions.length === 0) return;
    const match = adminUser?.name
      ? authorOptions.find(n => n === adminUser.name) ?? authorOptions[0]
      : authorOptions[0];
    setAvtor(match);
    setAvtorReady(true);
  }, [authorOptions, adminUser, avtorReady]);

  /* ── style helpers ── */
  const bg    = D ? 'bg-[#0d0d0d]' : 'bg-white';
  const card  = D ? 'bg-[#111] border-gray-800' : 'bg-gray-50 border-gray-200';
  const bdr   = D ? 'border-gray-800' : 'border-gray-200';
  const sub   = D ? 'text-gray-500' : 'text-gray-400';
  const inp   = D ? 'bg-[#1a1a1a] border-gray-700 text-white placeholder-gray-600' : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400';
  const lbl   = D ? 'text-gray-400' : 'text-gray-500';
  const hdr   = D ? 'bg-[#161616] border-gray-800' : 'bg-gray-50 border-gray-200';

  const Field = ({
    label, children, required, error,
  }: { label: string; children: React.ReactNode; required?: boolean; error?: boolean }) => (
    <div className="flex flex-col gap-1 min-w-0">
      <span className={`text-[10px] font-medium whitespace-nowrap ${error ? 'text-rose-400' : lbl}`}>
        {label}{required && <span className="text-rose-400 ml-0.5">*</span>}
      </span>
      {children}
    </div>
  );

  const clearFieldError = (key: string) => {
    setFieldErrors(prev => {
      if (!prev.has(key)) return prev;
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
  };

  const clearItemError = (id: number) => {
    setInvalidItemIds(prev => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const Inp = ({
    value, onChange, w, red, placeholder,
  }: { value: string; onChange: (v: string) => void; w?: string; red?: boolean; placeholder?: string }) => (
    <input
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className={`rounded-xl border px-3 py-2.5 text-xs outline-none transition-all
        focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 ${w ?? 'w-full'}
        ${fieldCls(D, red)}`}
    />
  );

  const toggleRow = (id: number) => setSelectedRows(prev => {
    const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s;
  });

  const updateItem = (id: number, patch: Partial<PostItem>) => {
    setItems(prev => {
      const next = prev.map(r => {
        if (r.id !== id) return r;
        const updated = { ...r, ...patch };
        updated.tsenaPriv = updated.tsenaPost * (1 - updated.skid / 100);
        updated.summa = updated.kolFakt * updated.tsenaPriv;
        return updated;
      });
      const row = next.find(i => i.id === id);
      if (row?.tovar.trim() && row.kolFakt > 0) clearItemError(id);
      return next;
    });
  };

  const handleSupplierPriceBlur = async (item: PostItem) => {
    if (!item.productId || item.tsenaPost <= 0) return;
    try {
      await persistSupplierPrice(item.productId, item.tsenaPost);
      setCatalogProducts(prev => prev.map(p =>
        p.id === item.productId ? { ...p, price: item.tsenaPost } : p,
      ));
    } catch (error) {
      console.error('Failed to save supplier price', error);
    }
  };

  const selectProductForItem = (itemId: number, p: ReceiptProduct) => {
    const savedPrice = resolveSupplierPrice(p.id, p.price);
    setItems(prev => prev.map(r => {
      if (r.id !== itemId) return r;
      const updated = {
        ...r,
        productId: p.id,
        tovar: p.name,
        artikul: p.artikul,
        upakovka: p.unitLabel,
        tsenaPost: savedPrice,
      };
      updated.tsenaPriv = updated.tsenaPost * (1 - updated.skid / 100);
      updated.summa = updated.kolFakt * updated.tsenaPriv;
      return updated;
    }));
    if (p.name.trim()) clearItemError(itemId);
  };

  const handleAddItem = () => {
    const id = Date.now();
    setItems(prev => [...prev, {
      id,
      tovar: '',
      artikul: '',
      kolFakt: 0,
      kolBrak: 0,
      upakovka: 'шт',
      tsenaPost: 0,
      skid: 0,
      tsenaPriv: 0,
      summa: 0,
      ves: 0,
    }]);
    setAutoOpenProductRow(id);
    clearFieldError('items');
  };

  const handleDeleteSelected = () => {
    if (selectedRows.size === 0) return;
    setItems(prev => prev.filter(r => !selectedRows.has(r.id)));
    setSelectedRows(new Set());
  };

  const handleSave = async (closeAfter: boolean) => {
    const missing: string[] = [];
    const errs = new Set<string>();
    const badItems = new Set<number>();

    if (!postavshik.trim()) {
      errs.add('supplier');
      missing.push(t.postSupplier ?? 'Yetkazib beruvchi');
    }
    if (!avtor.trim()) {
      errs.add('author');
      missing.push(t.detAvtor ?? 'Muallif');
    }
    if (!dataDoc.trim()) {
      errs.add('date');
      missing.push(t.detDataDoc ?? 'Sana');
    }
    if (!poluchatel.trim()) {
      errs.add('recipient');
      missing.push(t.detPoluchatel ?? 'Oluvchi');
    }

    const validItems = items.filter(i => i.tovar.trim() && i.kolFakt > 0);
    if (validItems.length === 0) {
      errs.add('items');
      missing.push(t.detTabTovary ?? 'Tovarlar');
      items.forEach(i => {
        if (!i.tovar.trim() || i.kolFakt <= 0) badItems.add(i.id);
      });
    }

    if (missing.length > 0) {
      setFieldErrors(errs);
      setInvalidItemIds(badItems);
      const base = t.zatFillRequired ?? "Majburiy maydonlarni to'ldiring";
      setSaveError(`${base}: ${missing.join(', ')}`);
      if (errs.has('items')) setInnerTab('tovary');
      return;
    }

    setSaveError(null);
    setFieldErrors(new Set());
    setInvalidItemIds(new Set());
    const now = new Date();
    const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const authorUser = appUsers.find(u => u.fullName === avtor);
    const receiptItems: PostReceiptItem[] = validItems.map(i => ({ ...i }));
    const row: PostRowRef = {
      id: Date.now(),
      date: `${dataDoc} ${time}`,
      num: nextNum ?? String(Date.now()).slice(-5),
      ox: true,
      supplier: postavshik,
      org: poluchatel,
      warehouse: sklad,
      wagon: '',
      dir: napravlenie,
      invoice: nSchFak,
      sum: totalSumma,
      netto: totalVes > 0 ? totalVes : totalSumma,
      type: TSELI_TYPE[tselPrikh] ?? 'opt',
      author: avtor,
      authorId: authorUser?.id,
      items: receiptItems,
    };

    setSaving(true);
    try {
      if (hasApiToken()) {
        await syncReceiptItemsToCatalog(validItems, {
          direction: napravlenie,
          supplier: postavshik,
        });
      }
      onSave?.(row);
      if (closeAfter) onClose();
    } catch (error) {
      console.error('Failed to sync receipt products', error);
      setSaveError(t.postSyncError ?? 'Mahsulotlarni katalogga yozib bo\'lmadi. Qayta urinib ko\'ring.');
    } finally {
      setSaving(false);
    }
  };

  const totalSumma = items.reduce((s, r) => s + r.summa, 0);
  const totalVes   = items.reduce((s, r) => s + r.ves,   0);

  /* ══ EXCEL IMPORT LOGIC ══ */
  const handleImportClick = () => {
    setImportError(null);
    fileInputRef.current?.click();
  };

  const parseExcel = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data    = new Uint8Array(e.target!.result as ArrayBuffer);
        const wb      = XLSX.read(data, { type: 'array' });
        const ws      = wb.Sheets[wb.SheetNames[0]];
        const rows    = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1, defval: '' }) as string[][];

        /* Find header row: contains "Артикул" */
        let hdrIdx = -1;
        for (let i = 0; i < rows.length; i++) {
          const rowStr = rows[i].join('|').toLowerCase();
          if (rowStr.includes('артикул') || rowStr.includes('artikul')) {
            hdrIdx = i; break;
          }
        }
        if (hdrIdx === -1) {
          setImportError('Заголовок таблицы не найден. Убедитесь что файл содержит колонку "Артикул".');
          return;
        }

        const hdr     = rows[hdrIdx].map(c => String(c).toLowerCase().trim());
        const col     = (kws: string[]) => hdr.findIndex(h => kws.some(k => h.includes(k)));

        const cArtikul  = col(['артикул', 'artikul']);
        const cTovar    = col(['наименование', 'товар', 'tovar']);
        const cEd       = col(['ед', 'единиц', 'уп']);
        const cKol      = col(['количество', 'кол-во', 'kol', 'кол']);
        const cTsena    = col(['цена', 'tsena']);
        const cSumma    = col(['стоимость', 'сумма', 'summa']);

        const parsed: PostItem[] = [];
        for (let i = hdrIdx + 1; i < rows.length; i++) {
          const r = rows[i];
          const tovarName = String(r[cTovar] ?? '').trim();
          /* skip empty rows and "Всего" footer */
          if (!tovarName || /всего|итого/i.test(tovarName)) continue;

          const kol      = parseFloat(String(r[cKol] ?? '').replace(/\s/g, '').replace(',', '.')) || 0;
          const tsena    = parseFloat(String(r[cTsena] ?? '').replace(/\s/g, '').replace(',', '.')) || 0;
          const summa    = parseFloat(String(r[cSumma] ?? '').replace(/\s/g, '').replace(',', '.')) || (kol * tsena);

          parsed.push({
            id:        Date.now() + i,
            tovar:     tovarName,
            artikul:   String(r[cArtikul] ?? '').trim(),
            kolFakt:   kol,
            kolBrak:   0,
            upakovka:  String(r[cEd] ?? 'шт').trim() || 'шт',
            tsenaPost: tsena,
            skid:      0,
            tsenaPriv: tsena,
            summa:     summa,
            ves:       0,
          });
        }

        if (parsed.length === 0) {
          setImportError('Данные не найдены. Проверьте структуру файла.');
          return;
        }

        const allIds = new Set(parsed.map(p => p.id));
        setImportPreview(parsed);
        setImportSel(allIds);
        setImportSelAll(true);
        setImportError(null);
      } catch {
        setImportError('Ошибка чтения файла. Убедитесь что это корректный Excel (.xlsx / .xls).');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const confirmImport = () => {
    if (!importPreview) return;
    const toAdd = importPreview.filter(p => importSel.has(p.id));
    setItems(prev => [...prev, ...toAdd]);
    setImportPreview(null);
  };

  const toggleImportRow = (id: number) => {
    setImportSel(prev => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  };

  const toggleImportAll = () => {
    if (!importPreview) return;
    if (importSelAll) {
      setImportSel(new Set());
      setImportSelAll(false);
    } else {
      setImportSel(new Set(importPreview.map(p => p.id)));
      setImportSelAll(true);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[260] flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.70)', backdropFilter: 'blur(6px)' }}
    >
      <div
        className={`flex flex-col ${bg} shadow-2xl transition-all duration-200 overflow-hidden
          ${fullscreen ? 'fixed inset-0 rounded-none' : 'w-[96vw] max-w-5xl max-h-[88vh] rounded-2xl'}`}
      >

        {/* ══ TOP ACTION BAR ══ */}
        <div className={`flex items-center gap-2 px-4 py-2.5 border-b ${bdr} ${hdr} flex-shrink-0 flex-wrap`}>
          <div className="flex items-center gap-2 mr-2">
            <Package size={15} className="text-indigo-400" />
            <span className="text-sm font-bold">
              {t.supTabPostup ?? 'Поступление товаров'}{' '}
              <span className={`font-normal text-xs ${sub}`}>{t.postModalCreating ?? '— yaratish'}</span>
            </span>
          </div>

          <button
            onClick={() => void handleSave(true)}
            disabled={saving}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-semibold transition-colors"
          >
            <Check size={12} /> {t.detProvestiClose ?? "O'tkazish va yopish"}
          </button>
          <button
            onClick={() => void handleSave(false)}
            disabled={saving}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${D ? 'border-gray-700 hover:bg-white/5' : 'border-gray-200 hover:bg-gray-100'}`}
          >
            <Check size={11} className="text-emerald-400" /> {t.detProvesti ?? "O'tkazish"}
          </button>
          <button className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${D ? 'border-gray-700 hover:bg-white/5' : 'border-gray-200 hover:bg-gray-100'}`}>
            <Calculator size={11} className="text-blue-400" /> Прогноз прибыли
          </button>

          <div className="flex-1" />

          <button
            onClick={() => setFullscreen(v => !v)}
            className={`p-1.5 rounded-lg border transition-colors ${D ? 'border-gray-700 hover:bg-white/5' : 'border-gray-200 hover:bg-gray-100'}`}
            title={fullscreen ? 'Оконный режим' : 'На весь экран'}
          >
            {fullscreen
              ? <Minimize2 size={14} className={sub} />
              : <Maximize2 size={14} className={sub} />}
          </button>
          <button
            onClick={onClose}
            className={`p-1.5 rounded-lg border transition-colors ${D ? 'border-gray-700 hover:bg-rose-500/20 hover:border-rose-500/40' : 'border-gray-200 hover:bg-rose-50 hover:border-rose-200'}`}
          >
            <X size={14} className="text-rose-400" />
          </button>
        </div>

        {/* ══ MAIN TABS ══ */}
        <div className={`flex items-center gap-0 border-b ${bdr} flex-shrink-0 px-4`}>
          {([
            { id: 'postavshiki', label: t.detTabPostavshiki ?? t.postSupplier ?? 'Ta\'minotchilar' },
            { id: 'vagon',       label: t.detTabVagon ?? 'Vagon'       },
            { id: 'prodazha',    label: t.detTabProdazha ?? 'Sotish'     },
          ] as const).map(tab => (
            <button
              key={tab.id}
              onClick={() => setMainTab(tab.id)}
              className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors -mb-px ${
                mainTab === tab.id
                  ? 'border-indigo-500 text-indigo-400'
                  : `border-transparent ${sub} hover:text-current`
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ══ FORM AREA ══ */}
        <div className="flex-1 overflow-y-auto min-h-0 p-4 space-y-3">

          {saveError && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
              <AlertCircle size={13} className="shrink-0" />
              {saveError}
              <button className="ml-auto" onClick={() => setSaveError(null)}><X size={12} /></button>
            </div>
          )}

          {/* ── ПОСТАВЩИКИ ── */}
          {mainTab === 'postavshiki' && (
            <>
              {/* Row 1: basic info */}
              <div className={`rounded-xl border ${card} p-3`}>
                <div className="flex flex-wrap gap-3 items-end">

                  <Field label={t.detVidPost ?? 'Qabul turi'}>
                    <div className={`flex rounded-lg border overflow-hidden ${D ? 'border-gray-700' : 'border-gray-200'}`}>
                      {VIDY.map(v => (
                        <button
                          key={v}
                          onClick={() => setVidPost(v)}
                          className={`px-3 py-1.5 text-xs font-semibold transition-colors ${
                            vidPost === v
                              ? 'bg-indigo-500 text-white'
                              : D ? `${sub} hover:bg-white/5` : 'text-gray-500 hover:bg-gray-100'
                          }`}
                        >
                          {v}
                        </button>
                      ))}
                    </div>
                  </Field>

                  <Field label={t.detTselPrih ?? 'Maqsad'}>
                    <FormSelect D={D} sub={sub} value={tselPrikh} onChange={setTselPrikh} options={TSELI} w="w-36" />
                  </Field>

                  <Field label={t.detSchFak ?? 'Sch-fak'}>
                    <Inp value={nSchFak} onChange={setNSchFak} w="w-28" placeholder="—" />
                  </Field>

                  <Field label={t.detDataDoc ?? 'Sana'} required error={fieldErrors.has('date')}>
                    <FormDatePicker
                      D={D}
                      sub={sub}
                      t={t}
                      value={dataDoc}
                      onChange={v => { setDataDoc(v); clearFieldError('date'); }}
                      w="w-36"
                    />
                  </Field>

                  <Field label={t.detDataPog ?? "To'lov sanasi"}>
                    <FormDatePicker
                      D={D}
                      sub={sub}
                      t={t}
                      value={dataPog}
                      onChange={setDataPog}
                      placeholder="—"
                      w="w-36"
                    />
                  </Field>

                  <Field
                    label={t.postSupplier ?? 'Yetkazib beruvchi'}
                    required
                    error={fieldErrors.has('supplier')}
                  >
                    <FormSelect
                      D={D}
                      sub={sub}
                      value={postavshik}
                      onChange={v => { setPostavshik(v); clearFieldError('supplier'); }}
                      options={suppliers}
                      placeholder={t.zatSelect ?? 'Tanlang...'}
                      w="w-44"
                      error={fieldErrors.has('supplier')}
                    />
                  </Field>

                  <Field
                    label={t.detPoluchatel ?? 'Oluvchi'}
                    required
                    error={fieldErrors.has('recipient')}
                  >
                    <FormSelect
                      D={D}
                      sub={sub}
                      value={poluchatel}
                      onChange={v => { setPoluchatel(v); clearFieldError('recipient'); }}
                      options={organizations}
                      w="w-52"
                      error={fieldErrors.has('recipient')}
                    />
                  </Field>

                  <Field label={t.postDir ?? "Yo'nalish"}>
                    <FormSelect D={D} sub={sub} value={napravlenie} onChange={setNapravlenie} options={NAPRAVL} w="w-28" />
                  </Field>

                  <Field label={t.detAvtor ?? 'Muallif'} required error={fieldErrors.has('author')}>
                    <FormSelect
                      D={D}
                      sub={sub}
                      value={avtor}
                      onChange={v => { setAvtor(v); clearFieldError('author'); }}
                      options={authorOptions}
                      placeholder={t.zatSelect ?? 'Tanlang...'}
                      w="w-44"
                      error={fieldErrors.has('author')}
                    />
                  </Field>
                </div>
              </div>

              {/* Row 2: warehouse + payments */}
              <div className={`rounded-xl border ${card} p-3`}>
                <div className="flex flex-wrap gap-3 items-end">

                  <Field label={t.postWarehouse ?? 'Ombor'}>
                    <FormSelect D={D} sub={sub} value={sklad} onChange={setSklad} options={SKLADY} w="w-40" />
                  </Field>

                  <Field label={t.detPere ?? "O'tkazma"}>
                    <Inp value={pere} onChange={setPere} w="w-20" />
                  </Field>

                  <Field label={t.detNal ?? 'Naqd'}>
                    <Inp value={nal} onChange={setNal} w="w-20" />
                  </Field>

                  <Field label={t.detPoluchNal ?? 'Qab.naqd'}>
                    <Inp value={poluchNal} onChange={setPoluchNal} w="w-20" />
                  </Field>

                  <Field label={t.detSkidkaPer ?? 'Chegirma'}>
                    <Inp value={skidkaPer} onChange={setSkidkaPer} w="w-20" />
                  </Field>

                  <Field label={t.detKOplate ?? "To'lash"}>
                    <div className={`px-2 py-1.5 rounded-lg border text-xs font-semibold tabular-nums w-28
                      ${D ? 'border-gray-700 bg-[#1a1a1a] text-emerald-400' : 'border-gray-200 bg-white text-emerald-600'}`}>
                      {totalSumma.toLocaleString('ru-RU')}
                    </div>
                  </Field>

                  <Field label={t.detSummaBrak ?? 'Brak summasi'}>
                    <div className={`px-2 py-1.5 rounded-lg border text-xs tabular-nums w-20 ${sub}
                      ${D ? 'border-gray-700 bg-[#1a1a1a]' : 'border-gray-200 bg-white'}`}>
                      0.00
                    </div>
                  </Field>

                  <Field label={t.detKontPrays ?? 'Kont.narx'}>
                    <FormSelect D={D} sub={sub} value={kontPrays} onChange={setKontPrays} options={['Нет', 'Да']} w="w-24" />
                  </Field>
                </div>
              </div>

              {/* ══ INNER TABS + TABLE ══ */}
              <div className={`rounded-xl border overflow-hidden ${
                fieldErrors.has('items')
                  ? 'border-rose-500 ring-1 ring-rose-500/30'
                  : D ? 'border-gray-800' : 'border-gray-200'
              }`}>

                {/* Tab bar */}
                <div className={`flex items-center border-b ${bdr} ${hdr} px-2`}>
                  {([
                    { id: 'tovary',    label: t.detTabTovary ?? 'Tovarlar'      },
                    { id: 'gruppy',    label: t.detTabGruppy ?? 'Guruhlar'      },
                    { id: 'brendy',    label: t.detTabBrendy ?? 'Brendlar'      },
                    { id: 'dop',       label: t.detTabDop ?? "Qo'sh.xarajat" },
                    { id: 'materialy', label: t.detTabMat ?? 'Materiallar'   },
                  ] as const).map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setInnerTab(tab.id)}
                      className={`px-3 py-2.5 text-xs font-semibold border-b-2 transition-colors -mb-px whitespace-nowrap ${
                        innerTab === tab.id
                          ? 'border-indigo-500 text-indigo-400'
                          : `border-transparent ${sub} hover:text-current`
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Toolbar */}
                <div className={`flex items-center gap-1 px-3 py-2 border-b ${bdr} flex-wrap`}>
                  <button
                    onClick={handleAddItem}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-semibold transition-colors"
                  >
                    <Plus size={11} /> {t.detAddBtn ?? "Qo'shish"}
                  </button>
                  {[
                    { icon: <Trash2 size={11} />, tip: "O'chirish", onClick: handleDeleteSelected },
                    { icon: <ArrowUp size={11} />,   tip: '↑', onClick: undefined },
                    { icon: <ArrowDown size={11} />, tip: '↓', onClick: undefined },
                  ].map((b, i) => (
                    <button key={i} title={b.tip} onClick={b.onClick}
                      className={`p-1.5 rounded-lg border transition-colors ${D ? 'border-gray-700 hover:bg-white/5' : 'border-gray-200 hover:bg-gray-100'} ${sub}`}
                    >
                      {b.icon}
                    </button>
                  ))}
                  <div className={`w-px h-4 mx-1 ${D ? 'bg-gray-700' : 'bg-gray-200'}`} />
                  {[
                    { icon: <RefreshCw size={11} />, label: t.detFillBtn ?? "To'ldirish", onClick: undefined, importBtn: false },
                    { icon: <FileDown size={11} />,  label: t.vozExport ?? 'Export',   onClick: undefined, importBtn: false },
                    { icon: <FileUp size={11} />,    label: t.detImportBtn ?? 'Import',    onClick: handleImportClick, importBtn: true },
                  ].map((b, i) => (
                    <button key={i} onClick={b.onClick}
                      className={`flex items-center gap-1 px-2 py-1.5 rounded-lg border text-xs font-medium transition-colors
                        ${b.importBtn
                          ? D ? 'border-indigo-500/50 text-indigo-400 hover:bg-indigo-500/10' : 'border-indigo-300 text-indigo-600 hover:bg-indigo-50'
                          : D ? 'border-gray-700 hover:bg-white/5' : 'border-gray-200 hover:bg-gray-100'
                        } ${!b.importBtn ? sub : ''}`}
                    >
                      {b.icon}
                      <span className="hidden sm:inline">{b.label}</span>
                    </button>
                  ))}
                </div>

                {/* hidden file input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={e => {
                    const f = e.target.files?.[0];
                    if (f) parseExcel(f);
                    e.target.value = '';
                  }}
                />

                {/* import error banner */}
                {importError && (
                  <div className="mx-3 mt-2 flex items-center gap-2 px-3 py-2 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
                    <AlertCircle size={13} className="shrink-0" />
                    {importError}
                    <button className="ml-auto" onClick={() => setImportError(null)}><X size={12} /></button>
                  </div>
                )}

                {/* Table — Товары */}
                {innerTab === 'tovary' && (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[700px] text-xs">
                      <thead>
                        <tr className={`border-b ${bdr} ${D ? 'bg-white/[0.02]' : 'bg-gray-50'}`}>
                          {[
                            { k: '№', w: 'w-8', req: false },
                            { k: t.detColTovar ?? 'Tovar', w: '', req: true },
                            { k: t.detColArtikul ?? 'Artikul', w: 'w-24', req: false },
                            { k: t.detColKolFakt ?? 'Miqdor', w: 'w-20', req: true },
                            { k: t.detColKolBrak ?? 'Brak', w: 'w-20', req: false },
                            { k: t.detColUpakovka ?? 'Qadoq', w: 'w-16', req: false },
                            { k: t.detColPost ?? 'Narx', w: 'w-24', req: false },
                            { k: t.detColSkid ?? '%', w: 'w-16', req: false },
                            { k: t.detColPriv ?? 'Kirish', w: 'w-24', req: false },
                            { k: t.detColSumma ?? 'Summa', w: 'w-28', req: false },
                            { k: t.detColVes ?? "Og'irlik", w: 'w-18', req: false },
                          ].map(h => (
                            <th key={h.k} className={`px-3 py-2.5 text-left font-semibold ${sub} whitespace-nowrap ${h.w}`}>
                              {h.k}{h.req && <span className="text-rose-400 ml-0.5">*</span>}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {items.length === 0 ? (
                          <tr>
                            <td colSpan={11}>
                              <div className={`flex flex-col items-center justify-center py-10 gap-2 ${
                                fieldErrors.has('items') ? 'text-rose-400' : sub
                              }`}>
                                <Package size={22} className="opacity-25" />
                                <p>{t.postEmptyItems ?? "Tovarlar qo'shilmagan — «Qo'shish» tugmasini bosing"}</p>
                              </div>
                            </td>
                          </tr>
                        ) : items.map((r, i) => {
                          const rowInvalid = invalidItemIds.has(r.id);
                          const tovarInvalid = rowInvalid && !r.tovar.trim();
                          const qtyInvalid = rowInvalid && r.kolFakt <= 0;
                          return (
                          <tr
                            key={r.id}
                            onClick={() => toggleRow(r.id)}
                            className={`cursor-pointer border-b ${bdr} transition-colors ${
                              rowInvalid
                                ? D ? 'bg-rose-500/5' : 'bg-rose-50'
                                : selectedRows.has(r.id)
                                  ? D ? 'bg-indigo-500/10' : 'bg-indigo-50'
                                  : D ? 'hover:bg-white/[0.02]' : 'hover:bg-gray-50'
                            }`}
                          >
                            <td className={`px-3 py-2 ${sub}`}>{i + 1}</td>
                            <td className="px-3 py-2 font-medium" onClick={e => e.stopPropagation()}>
                              <ProductSearchSelect
                                D={D}
                                sub={sub}
                                inp={inp}
                                value={r.tovar}
                                products={catalogProducts}
                                onSelect={p => selectProductForItem(r.id, p)}
                                onCustomName={name => updateItem(r.id, { tovar: name, productId: undefined })}
                                placeholder={t.detColTovar ?? 'Tovar tanlang...'}
                                searchPlaceholder={t.noPickerSearch ?? 'Tovar qidirish...'}
                                emptyText={t.noPickerEmpty ?? 'Topilmadi'}
                                customLabel={t.postNewProduct}
                                defaultOpen={autoOpenProductRow === r.id}
                                onOpened={() => {
                                  if (autoOpenProductRow === r.id) setAutoOpenProductRow(null);
                                }}
                                error={tovarInvalid}
                              />
                            </td>
                            <td className={`px-3 py-2 tabular-nums ${sub}`} onClick={e => e.stopPropagation()}>
                              <input
                                value={r.artikul}
                                onChange={e => updateItem(r.id, { artikul: e.target.value })}
                                className={`w-full rounded border px-1.5 py-1 text-xs outline-none ${inp}`}
                              />
                            </td>
                            <td className="px-3 py-2 tabular-nums text-right font-semibold" onClick={e => e.stopPropagation()}>
                              <input
                                type="number"
                                min={0}
                                value={r.kolFakt || ''}
                                onChange={e => updateItem(r.id, { kolFakt: parseFloat(e.target.value) || 0 })}
                                className={`w-16 rounded border px-1.5 py-1 text-xs text-right outline-none
                                  ${qtyInvalid ? 'border-rose-500 ring-1 ring-rose-500/30' : inp}`}
                              />
                            </td>
                            <td className={`px-3 py-2 tabular-nums text-right ${r.kolBrak > 0 ? 'text-rose-400 font-semibold' : sub}`} onClick={e => e.stopPropagation()}>
                              <input
                                type="number"
                                min={0}
                                value={r.kolBrak || ''}
                                onChange={e => updateItem(r.id, { kolBrak: parseFloat(e.target.value) || 0 })}
                                className={`w-16 rounded border px-1.5 py-1 text-xs text-right outline-none ${inp}`}
                              />
                            </td>
                            <td className={`px-3 py-2 ${sub}`} onClick={e => e.stopPropagation()}>
                              <input
                                value={r.upakovka}
                                onChange={e => updateItem(r.id, { upakovka: e.target.value })}
                                className={`w-14 rounded border px-1.5 py-1 text-xs outline-none ${inp}`}
                              />
                            </td>
                            <td className="px-3 py-2 tabular-nums text-right" onClick={e => e.stopPropagation()}>
                              <input
                                type="number"
                                min={0}
                                value={r.tsenaPost || ''}
                                onChange={e => updateItem(r.id, { tsenaPost: parseFloat(e.target.value) || 0 })}
                                onBlur={() => handleSupplierPriceBlur(r)}
                                className={`w-20 rounded border px-1.5 py-1 text-xs text-right outline-none ${inp}`}
                              />
                            </td>
                            <td className={`px-3 py-2 tabular-nums text-right ${r.skid > 0 ? 'text-rose-400' : sub}`} onClick={e => e.stopPropagation()}>
                              <input
                                type="number"
                                min={0}
                                max={100}
                                value={r.skid || ''}
                                onChange={e => updateItem(r.id, { skid: parseFloat(e.target.value) || 0 })}
                                className={`w-12 rounded border px-1.5 py-1 text-xs text-right outline-none ${inp}`}
                              />
                            </td>
                            <td className="px-3 py-2 tabular-nums text-right">{r.tsenaPriv.toLocaleString('ru-RU')}</td>
                            <td className="px-3 py-2 tabular-nums text-right font-semibold text-emerald-400">
                              {r.summa.toLocaleString('ru-RU')}
                            </td>
                            <td className={`px-3 py-2 tabular-nums text-right ${sub}`} onClick={e => e.stopPropagation()}>
                              <input
                                type="number"
                                min={0}
                                step={0.1}
                                value={r.ves || ''}
                                onChange={e => updateItem(r.id, { ves: parseFloat(e.target.value) || 0 })}
                                className={`w-14 rounded border px-1.5 py-1 text-xs text-right outline-none ${inp}`}
                              />
                            </td>
                          </tr>
                          );
                        })}
                      </tbody>
                      {items.length > 0 && (
                        <tfoot>
                          <tr className={`border-t-2 ${D ? 'border-gray-700 bg-white/[0.03]' : 'border-gray-300 bg-gray-100'}`}>
                            <td colSpan={3} className="px-3 py-2 font-bold">{t.detItogo ?? 'Jami'} ({items.length})</td>
                            <td className="px-3 py-2 tabular-nums text-right font-bold">
                              {items.reduce((s, r) => s + r.kolFakt, 0)}
                            </td>
                            <td colSpan={5} />
                            <td className="px-3 py-2 tabular-nums text-right font-bold text-emerald-400">
                              {totalSumma.toLocaleString('ru-RU')}
                            </td>
                            <td className={`px-3 py-2 tabular-nums text-right font-bold ${sub}`}>
                              {totalVes.toFixed(1)}
                            </td>
                          </tr>
                        </tfoot>
                      )}
                    </table>
                  </div>
                )}

                {/* Empty state for other inner tabs */}
                {innerTab !== 'tovary' && (
                  <div className={`flex flex-col items-center justify-center py-10 ${sub}`}>
                    <Package size={22} className="mb-2 opacity-25" />
                    <p className="text-xs">{t.detNoData ?? "Ma'lumot yo'q"}</p>
                  </div>
                )}
              </div>
            </>
          )}

          {/* ── ВАГОН ── */}
          {mainTab === 'vagon' && (
            <div className="flex flex-col items-center justify-center py-16">
              <div className={`rounded-2xl border ${card} p-10 text-center max-w-xs w-full`}>
                <Package size={28} className="mx-auto mb-3 text-indigo-400 opacity-50" />
                <p className="text-sm font-semibold mb-1">{t.detTabVagon ?? 'Vagon'}</p>
                <p className={`text-xs ${sub}`}>{t.detInDev ?? "Bo'lim ishlanmoqda"}</p>
              </div>
            </div>
          )}

          {/* ── ПРОДАЖА ── */}
          {mainTab === 'prodazha' && (
            <div className="flex flex-col items-center justify-center py-16">
              <div className={`rounded-2xl border ${card} p-10 text-center max-w-xs w-full`}>
                <Tag size={28} className="mx-auto mb-3 text-emerald-400 opacity-50" />
                <p className="text-sm font-semibold mb-1">{t.detTabProdazha ?? 'Sotish'}</p>
                <p className={`text-xs ${sub}`}>{t.detInDev ?? "Bo'lim ishlanmoqda"}</p>
              </div>
            </div>
          )}
        </div>

        {/* ══ BOTTOM STATUS BAR ══ */}
        <div className={`flex items-center justify-between px-4 py-2 border-t ${bdr} ${hdr} flex-shrink-0`}>
          <span className={`text-[11px] ${sub}`}>
            <span className="text-amber-400 font-semibold">{t.postDraft ?? 'Qoralama'}</span>
          </span>
          <span className={`text-[11px] ${sub}`}>
            {fullscreen ? '⛶ Полный экран' : '▢ Оконный режим'}
          </span>
        </div>
      </div>

      {/* ══════════════════════════════════
          IMPORT PREVIEW OVERLAY
      ══════════════════════════════════ */}
      {importPreview && (
        <div className="fixed inset-0 z-[270] flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }}
        >
          <div className={`flex flex-col w-[92vw] max-w-4xl max-h-[82vh] rounded-2xl border shadow-2xl overflow-hidden
            ${D ? 'bg-[#111] border-gray-800' : 'bg-white border-gray-200'}`}
          >
            {/* header */}
            <div className={`flex items-center gap-3 px-5 py-3.5 border-b ${bdr} ${hdr} flex-shrink-0`}>
              <FileUp size={16} className="text-indigo-400" />
              <div className="flex-1">
                <p className="text-sm font-bold">Импорт из Excel</p>
                <p className={`text-[11px] ${sub}`}>
                  Найдено <span className="text-indigo-400 font-semibold">{importPreview.length}</span> позиций
                  — выбрано <span className="text-emerald-400 font-semibold">{importSel.size}</span>
                </p>
              </div>
              <button onClick={() => setImportPreview(null)}
                className={`p-1.5 rounded-lg border transition-colors ${D ? 'border-gray-700 hover:bg-rose-500/20' : 'border-gray-200 hover:bg-rose-50'}`}>
                <X size={14} className="text-rose-400" />
              </button>
            </div>

            {/* table */}
            <div className="flex-1 overflow-auto min-h-0">
              <table className="w-full min-w-[600px] text-xs">
                <thead className={`sticky top-0 ${D ? 'bg-[#161616]' : 'bg-gray-50'}`}>
                  <tr className={`border-b ${bdr}`}>
                    <th className="px-3 py-2.5 w-8">
                      <input type="checkbox" checked={importSelAll} onChange={toggleImportAll}
                        className="accent-indigo-500 w-3.5 h-3.5 cursor-pointer" />
                    </th>
                    {['N', 'Артикул', 'Наименование товара', 'Ед.изм', 'Кол-во', 'Цена', 'Сумма'].map(h => (
                      <th key={h} className={`px-3 py-2.5 text-left font-semibold ${sub} whitespace-nowrap`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {importPreview.map((r, i) => {
                    const sel = importSel.has(r.id);
                    return (
                      <tr key={r.id} onClick={() => toggleImportRow(r.id)}
                        className={`cursor-pointer border-b ${bdr} transition-colors ${
                          sel
                            ? D ? 'bg-indigo-500/10' : 'bg-indigo-50'
                            : D ? 'hover:bg-white/[0.02]' : 'hover:bg-gray-50'
                        } ${!sel ? 'opacity-40' : ''}`}
                      >
                        <td className="px-3 py-2" onClick={e => { e.stopPropagation(); toggleImportRow(r.id); }}>
                          <input type="checkbox" checked={sel} onChange={() => toggleImportRow(r.id)}
                            className="accent-indigo-500 w-3.5 h-3.5 cursor-pointer" />
                        </td>
                        <td className={`px-3 py-2 ${sub}`}>{i + 1}</td>
                        <td className="px-3 py-2 font-mono font-medium text-[11px]">{r.artikul}</td>
                        <td className="px-3 py-2 font-medium max-w-[200px] truncate">{r.tovar}</td>
                        <td className={`px-3 py-2 ${sub}`}>{r.upakovka}</td>
                        <td className="px-3 py-2 tabular-nums text-right font-semibold">{r.kolFakt.toLocaleString('ru-RU')}</td>
                        <td className="px-3 py-2 tabular-nums text-right">{r.tsenaPost.toLocaleString('ru-RU')}</td>
                        <td className="px-3 py-2 tabular-nums text-right font-semibold text-emerald-400">
                          {r.summa.toLocaleString('ru-RU')}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                {/* footer totals */}
                <tfoot>
                  <tr className={`border-t-2 ${D ? 'border-gray-700 bg-white/[0.03]' : 'border-gray-300 bg-gray-100'}`}>
                    <td colSpan={4} className="px-3 py-2.5 font-bold text-xs">
                      Выбрано: {importSel.size} / {importPreview.length}
                    </td>
                    <td className="px-3 py-2.5 tabular-nums text-right font-bold text-xs">
                      {importPreview.filter(p => importSel.has(p.id)).reduce((s, r) => s + r.kolFakt, 0).toLocaleString('ru-RU')}
                    </td>
                    <td />
                    <td className="px-3 py-2.5 tabular-nums text-right font-bold text-xs text-emerald-400">
                      {importPreview.filter(p => importSel.has(p.id)).reduce((s, r) => s + r.summa, 0).toLocaleString('ru-RU')}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* actions */}
            <div className={`flex items-center justify-between gap-3 px-5 py-3 border-t ${bdr} ${hdr} flex-shrink-0`}>
              <p className={`text-[11px] ${sub}`}>
                Нажмите на строку чтобы выбрать / снять выбор
              </p>
              <div className="flex items-center gap-2">
                <button onClick={() => setImportPreview(null)}
                  className={`px-4 py-2 rounded-xl border text-xs font-medium transition-colors ${D ? 'border-gray-700 hover:bg-white/5' : 'border-gray-200 hover:bg-gray-100'}`}>
                  Отмена
                </button>
                <button
                  onClick={confirmImport}
                  disabled={importSel.size === 0}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold transition-colors"
                >
                  <CheckCircle2 size={13} />
                  Добавить {importSel.size} поз.
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}