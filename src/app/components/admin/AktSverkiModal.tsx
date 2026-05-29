import { useState, useRef, useEffect } from 'react';
import {
  X, Download, ChevronLeft, ChevronRight,
  Calendar, Building2, ChevronsUpDown, ChevronDown,
  Maximize2, Minimize2, Search,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { SUP_DATA } from './tabs/AdminPostavchikTab';

const ORGS = [
  'OOO "BORAN LEADERS"',
  'OOO "ALISHER TRADE"',
  'OOO "NAVOIY SAVDO"',
  'IP Karimov A.B.',
];

/* ── Mini Calendar Picker ──────────────────────────── */
const MONTH_NAMES = ['Yanvar','Fevral','Mart','Aprel','May','Iyun','Iyul','Avgust','Sentabr','Oktabr','Noyabr','Dekabr'];
const DOW = ['Du','Se','Ch','Pa','Ju','Sh','Ya'];

function parseDMY(s: string): Date | null {
  const [d, m, y] = s.split('.').map(Number);
  if (!d || !m || !y || y < 2000) return null;
  return new Date(y, m - 1, d);
}
function fmtDMY(d: Date) {
  return `${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}.${d.getFullYear()}`;
}

interface DPProps {
  value: string;
  onChange: (v: string) => void;
  label: string;
  D: boolean;
  sub: string;
}
function DatePickerPill({ value, onChange, label, D, sub }: DPProps) {
  const [open, setOpen] = useState(false);
  const ref  = useRef<HTMLDivElement>(null);
  const parsed = parseDMY(value);
  const [view, setView] = useState<Date>(parsed ?? new Date(2026, 0, 1));

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const year  = view.getFullYear();
  const month = view.getMonth();
  const firstDow = (new Date(year, month, 1).getDay() + 6) % 7; // Mon=0
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (number | null)[] = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const select = (day: number) => {
    onChange(fmtDMY(new Date(year, month, day)));
    setOpen(false);
  };

  const prevMonth = () => setView(new Date(year, month - 1, 1));
  const nextMonth = () => setView(new Date(year, month + 1, 1));

  const selDate = parseDMY(value);
  const isSelected = (day: number) =>
    selDate?.getFullYear() === year &&
    selDate?.getMonth() === month &&
    selDate?.getDate() === day;
  const isToday = (day: number) => {
    const t = new Date();
    return t.getFullYear() === year && t.getMonth() === month && t.getDate() === day;
  };

  return (
    <div ref={ref} className="relative flex-shrink-0">
      {/* Trigger pill */}
      <button
        onClick={() => setOpen(o => !o)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs transition-colors
          ${open
            ? D ? 'bg-[#1a1a1a] border-indigo-500/70' : 'bg-white border-indigo-400'
            : D ? 'bg-[#1a1a1a] border-gray-700 hover:border-indigo-500/60' : 'bg-white border-gray-200 hover:border-indigo-300'
          }`}
      >
        <Calendar size={12} className={D ? 'text-indigo-400' : 'text-indigo-500'} />
        <span className={`text-[11px] ${sub}`}>{label}:</span>
        <span className={`font-mono font-semibold tracking-wide text-xs ${D ? 'text-white' : 'text-gray-900'}`}>{value}</span>
      </button>

      {/* Calendar dropdown */}
      {open && (
        <div className={`absolute top-full left-0 mt-2 z-[100] rounded-2xl border shadow-2xl p-3 w-[240px]
          ${D ? 'bg-[#141414] border-gray-700 shadow-black/70' : 'bg-white border-gray-200 shadow-gray-300/60'}`}>
          {/* Month nav */}
          <div className="flex items-center justify-between mb-3">
            <button onClick={prevMonth}
              className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors
                ${D ? 'hover:bg-white/10 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}>
              <ChevronLeft size={14} />
            </button>
            <span className={`text-xs font-bold ${D ? 'text-white' : 'text-gray-900'}`}>
              {MONTH_NAMES[month]} {year}
            </span>
            <button onClick={nextMonth}
              className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors
                ${D ? 'hover:bg-white/10 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}>
              <ChevronRight size={14} />
            </button>
          </div>

          {/* Day-of-week headers */}
          <div className="grid grid-cols-7 mb-1">
            {DOW.map(d => (
              <div key={d} className={`text-center text-[10px] font-semibold py-0.5 ${sub}`}>{d}</div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 gap-y-0.5">
            {cells.map((day, idx) => (
              <div key={idx} className="flex items-center justify-center">
                {day ? (
                  <button
                    onClick={() => select(day)}
                    className={`w-8 h-8 rounded-xl text-xs font-semibold transition-all
                      ${isSelected(day)
                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/40'
                        : isToday(day)
                          ? D ? 'bg-indigo-500/20 text-indigo-400 ring-1 ring-indigo-500/50' : 'bg-indigo-50 text-indigo-600 ring-1 ring-indigo-300'
                          : D ? 'text-gray-300 hover:bg-white/10' : 'text-gray-700 hover:bg-gray-100'
                      }`}
                  >
                    {day}
                  </button>
                ) : <div className="w-8 h-8" />}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Types ─────────────────────────────────────────── */
interface SupRow {
  id: number;
  name: string;
  d_open: number;
  c_open: number;
  debit: number;
  credit: number;
  d_close: number;
  c_close: number;
}

interface TxRow {
  date: string;
  op: string;
  debet: number;
  kredit: number;
  saldo: number;
  payer: string;
  note: string;
}

interface Props {
  sup: SupRow;
  D: boolean;
  card: string;
  divider: string;
  sub: string;
  text: string;
  onClose: () => void;
  t: Record<string, string>;
}

/* ── Helpers ───────────────────────────────────────── */
const N = (n: number) =>
  n.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const UNITS = ['', 'бир', 'икки', 'уч', 'тўрт', 'беш', 'олти', 'етти', 'саккиз', 'тўққиз'];
const TEENS = ['ўн', 'ўн бир', 'ўн икки', 'ўн уч', 'ўн тўрт', 'ўн беш', 'ўн олти', 'ўн етти', 'ўн саккиз', 'ўн тўққиз'];
const TENS  = ['', 'ўн', 'йигирма', 'ўттиз', 'қирқ', 'эллик', 'олтмиш', 'етмиш', 'саксон', 'тўқсон'];

function chunk3(n: number): string {
  if (n === 0) return '';
  const h = Math.floor(n / 100);
  const r = n % 100;
  const parts: string[] = [];
  if (h > 0) parts.push(UNITS[h] + ' юз');
  if (r >= 10 && r < 20) parts.push(TEENS[r - 10]);
  else {
    if (Math.floor(r / 10) > 0) parts.push(TENS[Math.floor(r / 10)]);
    if (r % 10 > 0) parts.push(UNITS[r % 10]);
  }
  return parts.join(' ');
}

function numToWords(n: number): string {
  if (n === 0) return 'нол сўм 00 тийин';
  const tiyin = Math.round((n % 1) * 100);
  const whole = Math.floor(n);
  const mlrd  = Math.floor(whole / 1_000_000_000);
  const mln   = Math.floor((whole % 1_000_000_000) / 1_000_000);
  const thous = Math.floor((whole % 1_000_000) / 1_000);
  const rem   = whole % 1_000;
  const parts: string[] = [];
  if (mlrd  > 0) parts.push(chunk3(mlrd)  + ' миллиард');
  if (mln   > 0) parts.push(chunk3(mln)   + ' миллион');
  if (thous > 0) parts.push(chunk3(thous) + ' минг');
  if (rem   > 0) parts.push(chunk3(rem));
  const tiyinStr = tiyin > 0 ? String(tiyin).padStart(2, '0') : '00';
  return parts.join(' ') + ' сўм ' + tiyinStr + ' тийин';
}

/* ── Mock transaction generator ───────────────────── */
function genTxRows(sup: SupRow): TxRow[] {
  // Real data for IMILKY
  if (sup.id === 1) {
    return [
      { date: '31.01.2026', op: 'Бонусы штрафы от поставщика 1 от 31.01.2026 12:00', debet: -745_000,     kredit: 0,          saldo: -745_000,      payer: 'OOO "BORAN LEADERS"', note: 'Январ ойи Скитка' },
      { date: '31.01.2026', op: 'Поступили товары (3)',                                debet: 24_847_450,  kredit: 0,          saldo: 24_102_450,    payer: 'OOO "BORAN LEADERS"', note: 'Сч1., 3' },
      { date: '31.01.2026', op: 'Поступили товары (3)',                                debet: 24_915_250,  kredit: 0,          saldo: 49_017_700,    payer: 'OOO "BORAN LEADERS"', note: 'Сч1., 3' },
      { date: '20.02.2026', op: 'Оплата через банк (88)',                              debet: 0,           kredit: 5_000_000,  saldo: 44_017_700,    payer: 'OOO "BORAN LEADERS"', note: '00510 06.01.2025 йилдаги №3 шартнома асосан пишлоқ махсупотлари олиш учун тулов' },
      { date: '22.02.2026', op: 'Поступили товары (3)',                                debet: 29_089_700,  kredit: 0,          saldo: 73_107_400,    payer: 'OOO "BORAN LEADERS"', note: 'Сч1., 3' },
      { date: '24.02.2026', op: 'Оплата через банк (93)',                              debet: 0,           kredit: 20_000_000, saldo: 53_107_400,    payer: 'OOO "BORAN LEADERS"', note: '00510 06.01.2025 йилдаги №3 шартнома асосан пишлоқ махсупотлари олиш учун тулов' },
      { date: '28.02.2026', op: 'Бонусы штрафы от поставщика 2 от 28.02.2026 12:00', debet: -1_620_000,  kredit: 0,          saldo: 51_487_400,    payer: 'OOO "BORAN LEADERS"', note: 'Феврал Ойи скитка' },
      { date: '09.03.2026', op: 'Поступили товары (2)',                                debet: 32_031_650,  kredit: 0,          saldo: 83_519_050,    payer: 'OOO "BORAN LEADERS"', note: 'Сч1., 2' },
      { date: '10.03.2026', op: 'Оплата через банк (114)',                             debet: 0,           kredit: 20_000_000, saldo: 63_519_050,    payer: 'OOO "BORAN LEADERS"', note: '00510 06.01.2025 йилдаги №3 шартнома асосан пишлоқ махсупотлари олиш учун тулов' },
      { date: '10.03.2026', op: 'Наличная оплата (1415)',                              debet: 0,           kredit: 20_000_000, saldo: 43_519_050,    payer: 'OOO "BORAN LEADERS"', note: 'AZIZ ASIL SHAMS MCHJ ,20 000 000,00 * 1 / 1' },
    ];
  }

  // Generate plausible transactions for others
  const org = 'OOO "BORAN LEADERS"';
  const rows: TxRow[] = [];
  let saldo = sup.d_open - sup.c_open;
  const months = ['01.2026', '02.2026', '03.2026'];
  let docNum = sup.id * 10 + 1;

  // Spread debit across ~3 supply deliveries
  if (sup.debit > 0) {
    const parts = [0.35, 0.38, 0.27];
    parts.forEach((p, mi) => {
      const amt = Math.round(sup.debit * p);
      const dd  = mi === 0 ? '28' : mi === 1 ? '15' : '05';
      const mo  = months[mi] ?? months[2];
      saldo += amt;
      rows.push({ date: `${dd}.${mo}`, op: `Поступили товары (${docNum++})`, debet: amt, kredit: 0, saldo, payer: org, note: `Сч1., ${docNum - sup.id}` });
    });
  }

  // Spread credit across 2-3 payments
  if (sup.credit > 0) {
    const parts = sup.credit > 30_000_000 ? [0.45, 0.35, 0.20] : [0.55, 0.45];
    parts.forEach((p, mi) => {
      const amt = Math.round(sup.credit * p);
      const dd  = mi === 0 ? '20' : mi === 1 ? '05' : '25';
      const mo  = months[Math.min(mi + 1, 2)] ?? months[2];
      saldo -= amt;
      rows.push({ date: `${dd}.${mo}`, op: `Оплата через банк (${docNum++})`, debet: 0, kredit: amt, saldo, payer: org, note: 'Шартнома асосан тўлов' });
    });
  }

  rows.sort((a, b) => {
    const [da, ma, ya] = a.date.split('.').map(Number);
    const [db, mb, yb] = b.date.split('.').map(Number);
    return new Date(ya, ma - 1, da).getTime() - new Date(yb, mb - 1, db).getTime();
  });

  return rows;
}

/* ── Main component ────────────────────────────────── */
export function AktSverkiModal({ sup, D, divider, sub, text, onClose, t }: Props) {
  const [dateFrom, setDateFrom] = useState('01.01.2026');
  const [dateTo,   setDateTo]   = useState('10.03.2026');
  const [currency, setCurrency] = useState('UZS');
  const [skidki,   setSkidki]   = useState(false);
  const [kredit,   setKredit]   = useState(true);
  const [debet,    setDebet]    = useState(true);
  const [vPuti,    setVPuti]    = useState(false);
  const [show,     setShow]     = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const [currOpen,   setCurrOpen]   = useState(false);
  const [usdRate,    setUsdRate]    = useState('');

  // Supplier & org selectors
  const [selectedSup, setSelectedSup] = useState(sup);
  const [selectedOrg, setSelectedOrg] = useState(ORGS[0]);
  const [supDropOpen, setSupDropOpen] = useState(false);
  const [orgDropOpen, setOrgDropOpen] = useState(false);
  const [supSearch,   setSupSearch]   = useState('');
  const supDropRef = useRef<HTMLDivElement>(null);
  const orgDropRef = useRef<HTMLDivElement>(null);

  const tableRef   = useRef<HTMLDivElement>(null);
  const currRef    = useRef<HTMLDivElement>(null);

  // Close currency dropdown on outside click
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (currRef.current && !currRef.current.contains(e.target as Node)) setCurrOpen(false);
      if (supDropRef.current && !supDropRef.current.contains(e.target as Node)) setSupDropOpen(false);
      if (orgDropRef.current && !orgDropRef.current.contains(e.target as Node)) setOrgDropOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const txRows  = genTxRows(selectedSup);
  const totalDeb = txRows.reduce((s, r) => s + Math.max(0, r.debet), 0);
  const totalKre = txRows.reduce((s, r) => s + r.kredit, 0);
  const closeSaldo = selectedSup.d_close - selectedSup.c_close;
  const myDebt = closeSaldo;

  // Currency conversion
  const rate    = currency === 'USD' && parseFloat(usdRate) > 0 ? parseFloat(usdRate) : 1;
  const isUSD   = currency === 'USD' && rate > 1;
  const conv    = (v: number) => isUSD ? v / rate : v;
  const fmt     = (v: number) =>
    isUSD
      ? '$' + (v / rate).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : N(v);

  const bg    = D ? 'bg-[#0a0a0a]'    : 'bg-white';
  const hdr   = D ? 'bg-[#111111]'    : 'bg-gray-50';
  const bdCol = D ? 'border-gray-800' : 'border-gray-200';
  const th    = D ? 'bg-[#111]'       : 'bg-gray-50';
  const rowH  = D ? 'hover:bg-white/[0.025]' : 'hover:bg-indigo-50/60';
  const inp   = D ? 'bg-[#1a1a1a] border-gray-700 text-white placeholder-gray-600'
                  : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400';

  const tog = (active: boolean, setter: (v: boolean) => void, label: string) => (
    <button
      onClick={() => setter(!active)}
      className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all border whitespace-nowrap
        ${active
          ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-900/30'
          : D ? `bg-white/[0.04] border-gray-700 ${sub} hover:bg-white/[0.08]`
              : 'bg-gray-100 border-gray-200 text-gray-500 hover:bg-gray-200'}`}
    >
      {label}
    </button>
  );

  const scrollTable = (dir: 'left' | 'right') =>
    tableRef.current?.scrollBy({ left: dir === 'right' ? 220 : -220, behavior: 'smooth' });

  const handleExport = () => {
    const rows = txRows.map(r => ({
      'Дата':            r.date,
      'Операции':        r.op,
      'Дебет':           r.debet !== 0 ? r.debet : '',
      'Кредит':          r.kredit !== 0 ? r.kredit : '',
      'Текущее сальдо':  r.saldo,
      'Плательщик':      r.payer,
      'Примечание':      r.note,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Акт сверки');
    XLSX.writeFile(wb, `akt_sverki_${selectedSup.name.replace(/[^\w]/g, '_')}.xlsx`);
  };

  // Close on Escape
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[9999] flex items-start justify-center" style={{ backdropFilter: 'blur(4px)', backgroundColor: D ? 'rgba(0,0,0,0.85)' : 'rgba(0,0,0,0.5)' }}>
      {/* Backdrop click */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Panel */}
      <div
        className={`relative z-10 flex flex-col w-full mx-2 my-3 rounded-2xl border ${bdCol} ${bg} shadow-2xl
          ${fullscreen ? 'max-w-none !mx-0 !my-0 !rounded-none' : 'max-w-[1100px]'}`}
        style={fullscreen ? { height: '100vh', maxHeight: '100vh' } : { maxHeight: 'calc(100vh - 24px)', height: '100%' }}
      >
        {/* ── TOP HEADER ── */}
        <div className={`flex-shrink-0 px-4 py-3 border-b ${bdCol} ${hdr} ${fullscreen ? 'rounded-none' : 'rounded-t-2xl'}`}>
          {/* Title row */}
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2 min-w-0">
              <div className={`w-1.5 h-5 rounded-full flex-shrink-0 bg-indigo-500`} />
              <h2 className="font-bold truncate text-sm sm:text-base">
                {t.aktSverkiTitle ?? 'Акт сверки'}{': '}
                <span className={`${D ? 'text-indigo-400' : 'text-indigo-600'}`}>{selectedSup.name}</span>
              </h2>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                onClick={() => setFullscreen(f => !f)}
                className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors
                  ${D ? 'bg-gray-800 hover:bg-gray-700 text-gray-400' : 'bg-gray-100 hover:bg-gray-200 text-gray-500'}`}
                title={fullscreen ? 'Kichraytirish' : 'To\'liq ekran'}
              >
                {fullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
              </button>
              <button onClick={onClose}
                className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors
                  ${D ? 'bg-gray-800 hover:bg-gray-700 text-gray-400' : 'bg-gray-100 hover:bg-gray-200 text-gray-500'}`}>
                <X size={15} />
              </button>
            </div>
          </div>

          {/* Controls row */}
          <div className="flex flex-wrap gap-2 items-center">

            {/* Date from */}
            <DatePickerPill
              value={dateFrom}
              onChange={setDateFrom}
              label={t.aktDate1 ?? 'Sana1'}
              D={D}
              sub={sub}
            />

            {/* Date to */}
            <DatePickerPill
              value={dateTo}
              onChange={setDateTo}
              label={t.aktDate2 ?? 'Sana2'}
              D={D}
              sub={sub}
            />

            {/* Currency custom dropdown */}
            <div ref={currRef} className="relative flex-shrink-0">
              <button
                onClick={() => setCurrOpen(o => !o)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold transition-colors
                  ${currOpen
                    ? D ? 'bg-[#1a1a1a] border-indigo-500/70 text-white' : 'bg-white border-indigo-400 text-gray-900'
                    : D ? 'bg-[#1a1a1a] border-gray-700 text-white hover:border-indigo-500/60' : 'bg-white border-gray-200 text-gray-900 hover:border-indigo-300'
                  }`}
              >
                <span className={`text-[11px] ${sub}`}>{t.aktValuta ?? 'Valyuta'}:</span>
                <span className="font-mono font-bold tracking-wider">{currency}</span>
                <ChevronDown size={11} className={`transition-transform ${currOpen ? 'rotate-180' : ''} ${sub}`} />
              </button>

              {currOpen && (
                <div className={`absolute top-full left-0 mt-1 min-w-full rounded-xl border shadow-xl z-50 overflow-hidden
                  ${D ? 'bg-[#1a1a1a] border-gray-700 shadow-black/60' : 'bg-white border-gray-200 shadow-gray-200/80'}`}>
                  {['UZS', 'USD'].map(c => (
                    <button
                      key={c}
                      onClick={() => { setCurrency(c); setCurrOpen(false); if (c === 'UZS') setUsdRate(''); }}
                      className={`w-full flex items-center justify-between px-4 py-2.5 text-xs font-bold font-mono tracking-wider transition-colors
                        ${currency === c
                          ? D ? 'bg-indigo-600/20 text-indigo-400' : 'bg-indigo-50 text-indigo-600'
                          : D ? 'text-white hover:bg-white/[0.06]' : 'text-gray-900 hover:bg-gray-50'
                        }`}
                    >
                      {c}
                      {currency === c && <span className={`w-1.5 h-1.5 rounded-full ${D ? 'bg-indigo-400' : 'bg-indigo-500'}`} />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* USD rate input */}
            {currency === 'USD' && (
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs flex-shrink-0 transition-colors
                ${isUSD
                  ? D ? 'bg-[#1a1a1a] border-amber-500/60' : 'bg-white border-amber-400'
                  : D ? 'bg-[#1a1a1a] border-gray-700' : 'bg-white border-gray-200'}`}>
                <span className={`text-[11px] font-semibold ${D ? 'text-amber-400' : 'text-amber-600'}`}>1$=</span>
                <input
                  type="number"
                  value={usdRate}
                  onChange={e => setUsdRate(e.target.value)}
                  placeholder="12 900"
                  className={`bg-transparent outline-none w-20 font-mono font-semibold text-xs tracking-wide
                    ${D ? 'text-white placeholder-gray-600' : 'text-gray-900 placeholder-gray-400'}`}
                />
                <span className={`text-[11px] ${sub}`}>UZS</span>
              </div>
            )}

            {/* Toggle buttons */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {tog(skidki, setSkidki, t.aktSkidki ?? 'Скидки')}
              {tog(kredit, setKredit, t.aktKredit ?? '+Кредит')}
              {tog(debet,  setDebet,  t.aktDebet  ?? '−Дебет')}
              {tog(vPuti,  setVPuti,  t.aktVPuti  ?? 'В пути')}
              {tog(show,   setShow,   t.aktVkl    ?? 'Вкл')}
            </div>

            {/* Export */}
            <button onClick={handleExport}
              className={`ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors flex-shrink-0
                ${D ? 'bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 border border-emerald-500/20'
                    : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'}`}>
              <Download size={11} />
              <span className="hidden sm:inline">{t.exportBtn ?? 'Excel'}</span>
            </button>
          </div>
        </div>

        {/* ── SUPPLIER & ORG ROW ── */}
        <div className={`flex-shrink-0 flex flex-wrap gap-2 px-4 py-2.5 border-b ${bdCol} ${D ? 'bg-[#0d0d0d]' : 'bg-white'}`}>

          {/* Supplier selector */}
          <div ref={supDropRef} className="relative flex-1 min-w-[180px]">
            <button
              onClick={() => { setSupDropOpen(o => !o); setOrgDropOpen(false); setSupSearch(''); }}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl border transition-colors text-left
                ${supDropOpen
                  ? D ? 'bg-[#1a1a1a] border-indigo-500/70' : 'bg-white border-indigo-400'
                  : D ? 'bg-[#1a1a1a] border-gray-700 hover:border-indigo-500/40' : 'bg-gray-50 border-gray-200 hover:border-indigo-300'}`}
            >
              <Building2 size={13} className={`${sub} flex-shrink-0`} />
              <div className="min-w-0 flex-1">
                <p className={`text-[10px] ${sub} leading-none mb-0.5`}>{t.aktSupplier ?? 'Yetkazib beruvchi'}</p>
                <p className={`text-xs font-semibold truncate ${D ? 'text-white' : 'text-gray-900'}`}>{selectedSup.name}</p>
              </div>
              <ChevronsUpDown size={11} className={`${sub} flex-shrink-0`} />
            </button>

            {supDropOpen && (
              <div className={`absolute top-full left-0 mt-1 w-72 rounded-2xl border shadow-2xl z-[200] overflow-hidden
                ${D ? 'bg-[#141414] border-gray-700 shadow-black/70' : 'bg-white border-gray-200 shadow-gray-300/60'}`}>
                {/* Search */}
                <div className={`px-3 py-2.5 border-b ${D ? 'border-gray-800' : 'border-gray-100'}`}>
                  <div className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl border
                    ${D ? 'bg-[#1a1a1a] border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                    <Search size={12} className={sub} />
                    <input
                      autoFocus
                      value={supSearch}
                      onChange={e => setSupSearch(e.target.value)}
                      placeholder={t.supSearch ?? 'Qidirish...'}
                      className={`bg-transparent outline-none text-xs flex-1 ${D ? 'text-white placeholder-gray-600' : 'text-gray-900 placeholder-gray-400'}`}
                    />
                  </div>
                </div>
                {/* List */}
                <div className="max-h-52 overflow-y-auto">
                  {SUP_DATA.filter(s => s.name.toLowerCase().includes(supSearch.toLowerCase())).map(s => (
                    <button
                      key={s.id}
                      onClick={() => { setSelectedSup(s); setSupDropOpen(false); }}
                      className={`w-full flex items-center justify-between gap-2 px-4 py-2.5 text-left transition-colors
                        ${selectedSup.id === s.id
                          ? D ? 'bg-indigo-600/20 text-indigo-400' : 'bg-indigo-50 text-indigo-700'
                          : D ? 'text-gray-200 hover:bg-white/[0.06]' : 'text-gray-800 hover:bg-gray-50'
                        }`}
                    >
                      <span className="text-xs font-semibold truncate">{s.name}</span>
                      {selectedSup.id === s.id && <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${D ? 'bg-indigo-400' : 'bg-indigo-500'}`} />}
                    </button>
                  ))}
                  {SUP_DATA.filter(s => s.name.toLowerCase().includes(supSearch.toLowerCase())).length === 0 && (
                    <p className={`text-xs ${sub} text-center py-6`}>Natija topilmadi</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Org selector */}
          <div ref={orgDropRef} className="relative flex-1 min-w-[160px]">
            <button
              onClick={() => { setOrgDropOpen(o => !o); setSupDropOpen(false); }}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl border transition-colors text-left
                ${orgDropOpen
                  ? D ? 'bg-[#1a1a1a] border-indigo-500/70' : 'bg-white border-indigo-400'
                  : D ? 'bg-[#1a1a1a] border-gray-700 hover:border-indigo-500/40' : 'bg-gray-50 border-gray-200 hover:border-indigo-300'}`}
            >
              <Building2 size={13} className={`${sub} flex-shrink-0`} />
              <div className="min-w-0 flex-1">
                <p className={`text-[10px] ${sub} leading-none mb-0.5`}>{t.aktOrg ?? 'Tashkilot'}</p>
                <p className={`text-xs font-semibold truncate ${D ? 'text-white' : 'text-gray-900'}`}>{selectedOrg}</p>
              </div>
              <ChevronsUpDown size={11} className={`${sub} flex-shrink-0`} />
            </button>

            {orgDropOpen && (
              <div className={`absolute top-full left-0 mt-1 w-64 rounded-2xl border shadow-2xl z-[200] overflow-hidden
                ${D ? 'bg-[#141414] border-gray-700 shadow-black/70' : 'bg-white border-gray-200 shadow-gray-300/60'}`}>
                {ORGS.map(org => (
                  <button
                    key={org}
                    onClick={() => { setSelectedOrg(org); setOrgDropOpen(false); }}
                    className={`w-full flex items-center justify-between gap-2 px-4 py-3 text-left transition-colors
                      ${selectedOrg === org
                        ? D ? 'bg-indigo-600/20 text-indigo-400' : 'bg-indigo-50 text-indigo-700'
                        : D ? 'text-gray-200 hover:bg-white/[0.06]' : 'text-gray-800 hover:bg-gray-50'
                      }`}
                  >
                    <span className="text-xs font-semibold">{org}</span>
                    {selectedOrg === org && <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${D ? 'bg-indigo-400' : 'bg-indigo-500'}`} />}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className={`flex items-center gap-2 min-w-[120px] px-3 py-2 rounded-xl border ${D ? 'bg-[#1a1a1a] border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
            <div className="min-w-0 flex-1">
              <p className={`text-[10px] ${sub} leading-none mb-0.5`}>{t.aktTipOpl ?? 'Тип опл.'}</p>
              <p className={`text-xs font-semibold ${sub}`}>—</p>
            </div>
            <ChevronsUpDown size={11} className={`${sub} flex-shrink-0`} />
          </div>
        </div>

        {/* ── TABLE AREA ── */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {/* scroll nav */}
          <div className={`flex-shrink-0 flex items-center justify-between px-4 py-2 border-b ${bdCol}`}>
            <p className={`text-[11px] ${sub}`}>
              {t.aktPeriod ?? 'Период'}: <span className="font-semibold">{dateFrom} — {dateTo}</span>
            </p>
            <div className="flex gap-1">
              <button onClick={() => scrollTable('left')}
                className={`flex items-center justify-center w-7 h-7 rounded-lg border transition-colors
                  ${D ? `border-gray-700 bg-white/[0.05] hover:bg-white/[0.1] text-gray-300`
                      : `border-gray-200 bg-gray-100 hover:bg-gray-200 text-gray-600`}`}>
                <ChevronLeft size={13} />
              </button>
              <button onClick={() => scrollTable('right')}
                className={`flex items-center justify-center w-7 h-7 rounded-lg border transition-colors
                  ${D ? `border-gray-700 bg-white/[0.05] hover:bg-white/[0.1] text-gray-300`
                      : `border-gray-200 bg-gray-100 hover:bg-gray-200 text-gray-600`}`}>
                <ChevronRight size={13} />
              </button>
            </div>
          </div>

          {/* Desktop table (md+) */}
          <div ref={tableRef} className="hidden md:block flex-1 overflow-auto">
            <table className="w-full min-w-[860px] text-xs border-collapse">
              <thead className={`sticky top-0 z-10 ${th}`}>
                {/* Opening balance row */}
                <tr className={`border-b ${bdCol}`}>
                  <td colSpan={7} className={`px-4 py-2 text-xs font-bold ${D ? 'text-gray-300' : 'text-gray-700'}`}>
                    {t.aktSaldoNa ?? 'Сальдо на'} {dateFrom}
                  </td>
                </tr>
                {/* Column headers */}
                <tr className={`border-b-2 ${D ? 'border-gray-700' : 'border-gray-300'}`}>
                  {[
                    { k: 'aktColDate',   def: 'Дата',            w: 'w-24',  right: false },
                    { k: 'aktColOp',     def: 'Операции',        w: 'w-64',  right: false },
                    { k: 'aktColDebet',  def: 'Дебет',           w: 'w-32',  right: true  },
                    { k: 'aktColKredit', def: 'Кредит',          w: 'w-32',  right: true  },
                    { k: 'aktColSaldo',  def: 'Текущее сальдо',  w: 'w-32',  right: true  },
                    { k: 'aktColPayer',  def: 'Плательщик',      w: 'w-48',  right: false },
                    { k: 'aktColNote',   def: 'Примечание',      w: '',      right: false },
                  ].map(col => (
                    <th key={col.k}
                      className={`px-4 py-2.5 ${col.right ? 'text-right' : 'text-left'} font-semibold ${sub} ${col.w} whitespace-nowrap`}>
                      {t[col.k] ?? col.def}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {txRows.map((r, i) => (
                  <tr key={i}
                    className={`border-b ${bdCol} ${rowH} transition-colors cursor-default`}>
                    <td className={`px-4 py-2.5 font-mono whitespace-nowrap ${sub}`}>{r.date}</td>
                    <td className={`px-4 py-2.5 ${text}`} style={{ maxWidth: 260, wordBreak: 'break-word' }}>{r.op}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums whitespace-nowrap">
                      {r.debet > 0
                        ? <span className={D ? 'text-sky-400 font-semibold' : 'text-sky-700 font-semibold'}>{fmt(r.debet)}</span>
                        : r.debet < 0
                          ? <span className="text-rose-400 font-semibold">-{fmt(Math.abs(r.debet))}</span>
                          : <span className={sub}>—</span>}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums whitespace-nowrap">
                      {r.kredit > 0
                        ? <span className={D ? 'text-emerald-400 font-semibold' : 'text-emerald-700 font-semibold'}>{fmt(r.kredit)}</span>
                        : <span className={sub}>—</span>}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums whitespace-nowrap">
                      <span className={`font-semibold ${r.saldo > 0 ? (D ? 'text-amber-400' : 'text-amber-600') : r.saldo < 0 ? 'text-rose-400' : sub}`}>
                        {r.saldo !== 0 ? fmt(Math.abs(r.saldo)) : '—'}
                      </span>
                    </td>
                    <td className={`px-4 py-2.5 ${sub} whitespace-nowrap`}>{r.payer}</td>
                    <td className={`px-4 py-2.5 ${sub} text-[11px]`} style={{ maxWidth: 220, wordBreak: 'break-word' }}>{r.note}</td>
                  </tr>
                ))}
              </tbody>

              <tfoot>
                {/* ИТОГО row */}
                <tr className={`border-t-2 ${D ? 'border-gray-600 bg-white/[0.04]' : 'border-gray-400 bg-gray-100'}`}>
                  <td colSpan={2}
                    className={`px-4 py-3 font-bold text-xs ${D ? 'text-white' : 'text-gray-900'}`}>
                    {t.aktItogo ?? 'ИТОГО'}
                  </td>
                  <td className={`px-4 py-3 text-right tabular-nums font-bold text-xs ${D ? 'text-sky-400' : 'text-sky-700'}`}>
                    {fmt(totalDeb)}
                  </td>
                  <td className={`px-4 py-3 text-right tabular-nums font-bold text-xs ${D ? 'text-emerald-400' : 'text-emerald-700'}`}>
                    {fmt(totalKre)}
                  </td>
                  <td colSpan={3} />
                </tr>
                {/* Closing saldo row */}
                <tr className={`border-t ${bdCol} ${D ? 'bg-white/[0.02]' : 'bg-gray-50'}`}>
                  <td colSpan={2}
                    className={`px-4 py-3 font-bold text-xs ${D ? 'text-white' : 'text-gray-900'}`}>
                    {t.aktSaldoNa ?? 'Сальдо на'} {dateTo}
                  </td>
                  <td className={`px-4 py-3 text-right tabular-nums font-bold text-xs ${closeSaldo > 0 ? (D ? 'text-amber-400' : 'text-amber-700') : sub}`}>
                    {closeSaldo > 0 ? fmt(closeSaldo) : '—'}
                  </td>
                  <td colSpan={4} />
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Mobile cards (< md) */}
          <div className="md:hidden flex-1 overflow-y-auto">
            {/* Opening saldo */}
            <div className={`px-4 py-3 border-b ${bdCol} ${D ? 'bg-white/[0.03]' : 'bg-gray-50'}`}>
              <p className={`text-xs font-bold ${D ? 'text-gray-300' : 'text-gray-700'}`}>
                {t.aktSaldoNa ?? 'Сальдо на'} {dateFrom}
              </p>
            </div>

            {txRows.map((r, i) => (
              <div key={i} className={`border-b ${bdCol} px-4 py-3 ${rowH} transition-colors`}>
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <span className={`font-mono text-[11px] ${sub} flex-shrink-0`}>{r.date}</span>
                  <div className="text-right flex-shrink-0">
                    {r.debet > 0 && (
                      <span className={`text-xs font-bold ${D ? 'text-sky-400' : 'text-sky-600'}`}>
                        +{fmt(r.debet)}
                      </span>
                    )}
                    {r.debet < 0 && (
                      <span className="text-xs font-bold text-rose-400">-{fmt(Math.abs(r.debet))}</span>
                    )}
                    {r.kredit > 0 && (
                      <span className={`text-xs font-bold ${D ? 'text-emerald-400' : 'text-emerald-600'}`}>
                        -{fmt(r.kredit)}
                      </span>
                    )}
                  </div>
                </div>
                <p className={`text-xs ${text} mb-1 leading-snug`}>{r.op}</p>
                <div className="flex items-center justify-between gap-2">
                  <p className={`text-[11px] ${sub} truncate`}>{r.payer}</p>
                  <span className={`text-[11px] font-semibold tabular-nums flex-shrink-0 ${r.saldo > 0 ? (D ? 'text-amber-400' : 'text-amber-600') : sub}`}>
                    {r.saldo !== 0 ? `Сальдо: ${fmt(Math.abs(r.saldo))}` : ''}
                  </span>
                </div>
                {r.note && <p className={`text-[10px] ${sub} mt-1 line-clamp-2`}>{r.note}</p>}
              </div>
            ))}

            {/* ИТОГО mobile */}
            <div className={`border-t-2 ${D ? 'border-gray-600 bg-white/[0.04]' : 'border-gray-300 bg-gray-100'} px-4 py-3`}>
              <p className={`text-xs font-bold mb-2 ${D ? 'text-white' : 'text-gray-900'}`}>{t.aktItogo ?? 'ИТОГО'}</p>
              <div className="grid grid-cols-2 gap-2">
                <div className={`rounded-xl px-3 py-2.5 border ${D ? 'border-gray-700 bg-[#1a1a1a]' : 'border-gray-200 bg-white'}`}>
                  <p className={`text-[10px] ${sub} mb-0.5`}>{t.aktColDebet ?? 'Дебет'}</p>
                  <p className={`text-sm font-bold tabular-nums ${D ? 'text-sky-400' : 'text-sky-700'}`}>{fmt(totalDeb)}</p>
                </div>
                <div className={`rounded-xl px-3 py-2.5 border ${D ? 'border-gray-700 bg-[#1a1a1a]' : 'border-gray-200 bg-white'}`}>
                  <p className={`text-[10px] ${sub} mb-0.5`}>{t.aktKredit ?? 'Кредит'}</p>
                  <p className={`text-sm font-bold tabular-nums ${D ? 'text-emerald-400' : 'text-emerald-700'}`}>{fmt(totalKre)}</p>
                </div>
              </div>
            </div>

            {/* Closing saldo mobile */}
            <div className={`border-t ${bdCol} ${D ? 'bg-white/[0.02]' : 'bg-gray-50'} px-4 py-3`}>
              <p className={`text-xs font-bold ${D ? 'text-gray-300' : 'text-gray-700'}`}>
                {t.aktSaldoNa ?? 'Сальдо на'} {dateTo}
              </p>
              {closeSaldo !== 0 && (
                <p className={`text-lg font-bold tabular-nums mt-1 ${closeSaldo > 0 ? (D ? 'text-amber-400' : 'text-amber-600') : 'text-rose-400'}`}>
                  {fmt(Math.abs(closeSaldo))}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ── FOOTER ── */}
        <div className={`flex-shrink-0 px-4 py-3 border-t ${D ? 'border-gray-800 bg-[#111111]' : 'border-gray-200 bg-white'} ${fullscreen ? 'rounded-none' : 'rounded-b-2xl'}`}>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className={`text-xs font-bold uppercase tracking-wider ${D ? 'text-red-400' : 'text-red-600'}`}>
                {t.aktOurDebt ?? 'НАШ ДОЛГ'}
              </span>
              <span className={`text-sm font-bold tabular-nums ${D ? 'text-red-400' : 'text-red-600'}`}>
                {fmt(Math.abs(myDebt))}
              </span>
            </div>
            <p className={`text-[11px] italic flex-1 min-w-0 ${D ? 'text-gray-500' : 'text-gray-400'} leading-snug`}>
              ({numToWords(Math.abs(myDebt))}) {currency === 'UZS' ? 'сўм' : currency}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}