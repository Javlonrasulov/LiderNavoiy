import { useState, useRef } from 'react';
import {
  X, Maximize2, Minimize2,
  ChevronDown, ChevronUp, ChevronLeft, ChevronRight,
} from 'lucide-react';

/* ─────────────────────────────────────────────────────────────────── */
/*  Types                                                              */
/* ─────────────────────────────────────────────────────────────────── */
interface ItemRow {
  id:         number;
  brand:      string;
  group:      string;
  tovar:      string;
  artikul:    string;
  shtUp:      number;
  kolFakt:    number;
  kolBrak:    number;
  upakovka:   string;
  pokupTsena: number;
  tsenaPost:  number;
  skid:       number;
  tsenaPriv:  number;
  summa:      number;
  ves:        number;
}

export interface PostRowRef {
  id:       number;
  date:     string;
  num:      string;
  ox:       boolean;
  supplier: string;
  org:      string;
  warehouse:string;
  wagon:    string;
  dir:      string;
  invoice:  string;
  sum:      number;
  netto:    number;
  type:     'opt' | 'chakana' | 'ishlab';
  author:   string;
  authorId?: string;
}

interface Props {
  D:       boolean;
  t:       Record<string, string>;
  row:     PostRowRef;
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  hasPrev?: boolean;
  hasNext?: boolean;
}

/* ─────────────────────────────────────────────────────────────────── */
/*  Mock items data (used for all docs in demo)                        */
/* ─────────────────────────────────────────────────────────────────── */
const ITEMS: ItemRow[] = [
  { id:  1, brand:'SOF IN Сыр', group:'Mozzarella', tovar:'Mozzarella 250 гр',            artikul:'', shtUp:1, kolFakt:540,   kolBrak:0, upakovka:'540 шт',   pokupTsena:25_000,  tsenaPost:25_000,  skid:0, tsenaPriv:25_000,  summa:13_500_000, ves:135   },
  { id:  2, brand:'SOF IN',     group:'SOF IN',      tovar:'Тара яшик SOF IN',              artikul:'', shtUp:1, kolFakt:124,   kolBrak:0, upakovka:'124 шт',   pokupTsena:0,       tsenaPost:0,       skid:0, tsenaPriv:0,       summa:0,          ves:0     },
  { id:  3, brand:'SOF IN',     group:'SOF IN',      tovar:'Катик 1% ПЭТ 450г',             artikul:'', shtUp:1, kolFakt:2_400, kolBrak:0, upakovka:'2 400 шт', pokupTsena:5_500,   tsenaPost:5_500,   skid:0, tsenaPriv:5_500,   summa:13_200_000, ves:480   },
  { id:  4, brand:'SOF IN',     group:'SOF IN',      tovar:'Кефир 1% ПЭТ 900г',             artikul:'', shtUp:1, kolFakt:300,   kolBrak:0, upakovka:'300 шт',   pokupTsena:9_600,   tsenaPost:9_600,   skid:0, tsenaPriv:9_600,   summa:2_880_000,  ves:300   },
  { id:  5, brand:'SOF IN',     group:'SOF IN',      tovar:'Кефир 2,5% ПЭТ 450г',           artikul:'', shtUp:1, kolFakt:2_400, kolBrak:0, upakovka:'2 400 шт', pokupTsena:5_700,   tsenaPost:5_700,   skid:0, tsenaPriv:5_700,   summa:13_680_000, ves:480   },
  { id:  6, brand:'SOF IN',     group:'SOF IN',      tovar:'Кефир 3,2% ПЭТ 900г',           artikul:'', shtUp:1, kolFakt:300,   kolBrak:0, upakovka:'300 шт',   pokupTsena:11_400,  tsenaPost:11_400,  skid:0, tsenaPriv:11_400,  summa:3_420_000,  ves:300   },
  { id:  7, brand:'SOF IN',     group:'SOF IN',      tovar:'Кефир 3,2% ПЭТ 450г',           artikul:'', shtUp:1, kolFakt:480,   kolBrak:0, upakovka:'480 шт',   pokupTsena:6_500,   tsenaPost:6_500,   skid:0, tsenaPriv:6_500,   summa:3_120_000,  ves:480   },
  { id:  8, brand:'SOF IN',     group:'SOF IN',      tovar:'Йогурт 1,2% ПЭТ Банан 270г',    artikul:'', shtUp:1, kolFakt:330,   kolBrak:0, upakovka:'330 шт',   pokupTsena:6_500,   tsenaPost:6_500,   skid:0, tsenaPriv:6_500,   summa:2_145_000,  ves:330   },
  { id:  9, brand:'SOF IN',     group:'SOF IN',      tovar:'Йогурт 1,2% ПЭТ Черника',       artikul:'', shtUp:1, kolFakt:465,   kolBrak:0, upakovka:'465 шт',   pokupTsena:6_500,   tsenaPost:6_500,   skid:0, tsenaPriv:6_500,   summa:3_022_500,  ves:465   },
  { id: 10, brand:'SOF IN',     group:'SOF IN',      tovar:'Йогурт 1,2% ПЭТ Клубника 270г', artikul:'', shtUp:1, kolFakt:645,   kolBrak:0, upakovka:'645 шт',   pokupTsena:6_500,   tsenaPost:6_500,   skid:0, tsenaPriv:6_500,   summa:4_192_500,  ves:645   },
  { id: 11, brand:'SOF IN',     group:'SOF IN',      tovar:'Сметана 20% Стакан 350г',        artikul:'', shtUp:1, kolFakt:1_200, kolBrak:0, upakovka:'1 200 шт', pokupTsena:13_400,  tsenaPost:13_400,  skid:0, tsenaPriv:13_400,  summa:16_080_000, ves:480   },
  { id: 12, brand:'SOF IN',     group:'SOF IN',      tovar:'Сметана 20% Стакан 180г',        artikul:'', shtUp:1, kolFakt:600,   kolBrak:0, upakovka:'600 шт',   pokupTsena:8_400,   tsenaPost:8_400,   skid:0, tsenaPriv:8_400,   summa:5_040_000,  ves:600   },
  { id: 13, brand:'SOF IN',     group:'SOF IN',      tovar:'Кайнок 45% стакан 180г',         artikul:'', shtUp:1, kolFakt:3_000, kolBrak:0, upakovka:'3 000 шт', pokupTsena:10_500,  tsenaPost:10_500,  skid:0, tsenaPriv:10_500,  summa:31_500_000, ves:3_000 },
  { id: 14, brand:'SOF IN',     group:'SOF IN',      tovar:'Кайнок 45% стакан 350г',         artikul:'', shtUp:1, kolFakt:600,   kolBrak:0, upakovka:'600 шт',   pokupTsena:20_000,  tsenaPost:20_000,  skid:0, tsenaPriv:20_000,  summa:12_000_000, ves:600   },
  { id: 15, brand:'SOF IN',     group:'SOF IN',      tovar:'Брынза 20% весовой',              artikul:'', shtUp:1, kolFakt:91,    kolBrak:0, upakovka:'91 кг 200г',pokupTsena:52_000, tsenaPost:52_000,  skid:0, tsenaPriv:52_000,  summa:4_742_400,  ves:91.2  },
];

/* ─────────────────────────────────────────────────────────────────── */
/*  Helpers                                                            */
/* ─────────────────────────────────────────────────────────────────── */
function N(n: number) {
  if (n === 0) return '—';
  return n.toLocaleString('ru-RU');
}

/* ─────────────────────────────────────────────────────────────────── */
/*  Component                                                          */
/* ─────────────────────────────────────────────────────────────────── */
export function PostupleniyaDetailModal({ D, t, row, onClose, onPrev, onNext, hasPrev, hasNext }: Props) {
  const [fullscreen, setFullscreen] = useState(false);
  const [expanded,   setExpanded]   = useState<Set<number>>(new Set());

  const tableRef = useRef<HTMLDivElement>(null);
  const scrollTable = (dir: 'left' | 'right') => {
    tableRef.current?.scrollBy({ left: dir === 'right' ? 240 : -240, behavior: 'smooth' });
  };

  const toggleExp = (id: number) =>
    setExpanded(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });

  /* totals */
  const totalKol   = ITEMS.reduce((s,r) => s + r.kolFakt,    0);
  const totalBrak  = ITEMS.reduce((s,r) => s + r.kolBrak,    0);
  const totalPokup = ITEMS.reduce((s,r) => s + r.pokupTsena, 0);
  const totalPost  = ITEMS.reduce((s,r) => s + r.tsenaPost,  0);
  const totalSumma = ITEMS.reduce((s,r) => s + r.summa,      0);
  const totalVes   = ITEMS.reduce((s,r) => s + r.ves,        0);

  /* style shortcuts */
  const bg      = D ? 'bg-[#0d0d0d]'           : 'bg-white';
  const card    = D ? 'bg-[#111] border-gray-800' : 'bg-gray-50 border-gray-200';
  const bdr     = D ? 'border-gray-800'          : 'border-gray-200';
  const sub     = D ? 'text-gray-500'            : 'text-gray-400';
  const text    = D ? 'text-white'               : 'text-gray-900';
  const inp     = D ? 'bg-[#1a1a1a] border-gray-700 text-white' : 'bg-white border-gray-200 text-gray-900';
  const hdr     = D ? 'bg-[#161616] border-gray-800' : 'bg-gray-50 border-gray-200';
  const divider = D ? 'border-gray-800'          : 'border-gray-100';

  /* form fields helper */
  const formFields1 = [
    { label: t.detVidPost,    value:'Баланс' },
    { label: t.detTselPrih,   value:'Оптовая' },
    { label: t.detSchFak,     value: row.invoice || '—' },
    { label: t.detDataDoc,    value: row.date.split(' ')[0] },
    { label: t.detDataPog,    value:'—' },
    { label: t.postSupplier,  value: row.supplier },
    { label: t.detPoluchatel, value: row.org },
    { label: t.postDir,       value: row.dir },
    { label: t.detAvtor,      value: row.author || '—' },
    { label: t.postWarehouse, value: row.warehouse },
  ];

  const formFields2 = [
    { label: t.detPere,       value: N(row.sum),  hi: false },
    { label: t.detNal,        value:'0,00',        hi: false },
    { label: t.detPoluchNal,  value:'0,00',        hi: false },
    { label: t.detSkidkaPer,  value:'0,00',        hi: false },
    { label: t.detKOplate,    value:'0,00',        hi: false },
    { label: t.detSummaBrak,  value:'0,00',        hi: false },
    { label: t.detKontPrays,  value: N(row.sum),  hi: true  },
    { label: t.detColSumma,   value: N(row.sum),  hi: true  },
  ];

  return (
    <div
      className="fixed inset-0 z-[270] flex items-end sm:items-center justify-center"
      style={{ background:'rgba(0,0,0,0.72)', backdropFilter:'blur(8px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className={`flex flex-col ${bg} shadow-2xl transition-all duration-300 w-full
          ${fullscreen
            ? 'fixed inset-0 rounded-none'
            : 'sm:w-[96vw] sm:max-w-6xl sm:max-h-[90vh] sm:rounded-2xl rounded-t-3xl max-h-[93vh]'
          }`}
        style={{ minHeight: fullscreen ? '100vh' : undefined }}
      >
        {/* ── Mobile drag handle ── */}
        <div className="sm:hidden flex justify-center pt-2.5 pb-1 flex-shrink-0">
          <div className={`w-10 h-1 rounded-full ${D ? 'bg-gray-700' : 'bg-gray-300'}`} />
        </div>

        {/* ══ HEADER ══ */}
        <div className={`flex items-center gap-2 px-4 py-3 border-b ${bdr} ${hdr} flex-shrink-0`}>

          {/* Status badge */}
          <span className={`hidden sm:flex items-center justify-center w-6 h-6 rounded-lg flex-shrink-0 text-[10px] font-bold ${
            row.ox ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
          }`}>{row.ox ? '✓' : '!'}</span>

          {/* Title */}
          <div className="flex-1 min-w-0">
            <h2 className={`text-sm font-bold leading-tight ${text}`}>
              <span className="hidden sm:inline">{t.supTabPostup} </span>
              <span className="text-indigo-400">#{row.num}</span>
              <span className={` ${sub} font-normal`}> от {row.date}</span>
            </h2>
            <p className={`text-[10px] ${sub} mt-0.5 sm:hidden`}>{t.supTabPostup}</p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={() => setFullscreen(v => !v)}
              className={`hidden sm:flex p-1.5 rounded-lg transition-colors ${D ? 'hover:bg-gray-800' : 'hover:bg-gray-100'}`}
              title={fullscreen ? 'Свернуть' : 'Развернуть'}
            >
              {fullscreen ? <Minimize2 size={14} className={sub} /> : <Maximize2 size={14} className={sub} />}
            </button>
            <button
              onClick={onClose}
              className={`p-1.5 rounded-lg transition-colors ${D ? 'hover:bg-gray-800' : 'hover:bg-gray-100'}`}
            >
              <X size={16} className={sub} />
            </button>
          </div>
        </div>

        {/* ══ SCROLLABLE CONTENT ══ */}
        <div className="flex-1 overflow-y-auto">

          {/* ── Content ── */}
          <div className="p-3 sm:p-4 space-y-3">

            {/* Form block 1: main fields */}
            <div className={`rounded-2xl border ${card} p-3`}>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                {formFields1.map(f => (
                  <div key={f.label} className="flex flex-col gap-1 min-w-0">
                    <span className={`text-[9px] font-semibold uppercase tracking-wide ${sub}`}>{f.label}</span>
                    <div className={`rounded-xl border px-2.5 py-1.5 text-xs truncate ${inp}`}>{f.value || '—'}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Form block 2: financial */}
            <div className={`rounded-2xl border ${card} p-3`}>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
                {formFields2.map(f => (
                  <div key={f.label} className="flex flex-col gap-1 min-w-0">
                    <span className={`text-[9px] font-semibold uppercase tracking-wide ${sub}`}>{f.label}</span>
                    <div className={`rounded-xl border px-2.5 py-1.5 text-xs font-semibold tabular-nums truncate ${
                      f.hi
                        ? D ? 'border-indigo-500/40 bg-indigo-500/10 text-indigo-300' : 'border-indigo-200 bg-indigo-50 text-indigo-700'
                        : inp
                    }`}>{f.value}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Items section */}
            <div className={`rounded-2xl border overflow-hidden ${card}`}>

              {/* Scroll nav for desktop table */}
              <div className={`hidden md:flex justify-end gap-1 px-3 py-2 border-b ${bdr} ${D ? 'bg-white/[0.02]' : 'bg-gray-50/60'}`}>
                <button onClick={() => scrollTable('left')}  className={`flex items-center justify-center w-7 h-7 rounded-lg border ${D ? 'border-gray-700 bg-white/[0.05] hover:bg-white/[0.1] text-gray-300' : 'border-gray-200 bg-gray-100 hover:bg-gray-200 text-gray-600'} transition-colors`}><ChevronLeft  size={14} /></button>
                <button onClick={() => scrollTable('right')} className={`flex items-center justify-center w-7 h-7 rounded-lg border ${D ? 'border-gray-700 bg-white/[0.05] hover:bg-white/[0.1] text-gray-300' : 'border-gray-200 bg-gray-100 hover:bg-gray-200 text-gray-600'} transition-colors`}><ChevronRight size={14} /></button>
              </div>

              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto" ref={tableRef}>
                <table className="w-full min-w-[1100px] text-xs">
                  <thead>
                    <tr className={`border-b ${divider} ${D ? 'bg-white/[0.02]' : 'bg-gray-50'}`}>
                      {[
                        'N', t.detColBrand, t.detColGroup, t.detColTovar, t.detColArtikul,
                        t.detColShtUp, t.detColKolFakt, t.detColKolBrak, t.detColUpakovka,
                        t.detColPokup, t.detColPost, t.detColSkid, t.detColPriv, t.detColSumma, t.detColVes
                      ].map(h => (
                        <th key={h} className={`px-3 py-2.5 text-left font-semibold ${sub} whitespace-nowrap`}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {ITEMS.map((r, i) => (
                      <tr
                        key={r.id}
                        className={`transition-colors
                          ${i < ITEMS.length - 1 ? `border-b ${divider}` : ''}
                          ${r.kolBrak > 0 ? D ? 'bg-rose-500/5' : 'bg-rose-50/40' : ''}
                          ${D ? 'hover:bg-white/[0.025]' : 'hover:bg-indigo-50/40'}
                        `}
                      >
                        <td className={`px-3 py-2.5 ${sub}`}>{r.id}</td>
                        <td className={`px-3 py-2.5 font-semibold whitespace-nowrap ${text}`}>{r.brand}</td>
                        <td className={`px-3 py-2.5 ${sub}`}>{r.group}</td>
                        <td className={`px-3 py-2.5 whitespace-nowrap ${text}`}>{r.tovar}</td>
                        <td className={`px-3 py-2.5 ${sub}`}>{r.artikul || '—'}</td>
                        <td className={`px-3 py-2.5 text-center tabular-nums ${sub}`}>{r.shtUp}</td>
                        <td className={`px-3 py-2.5 text-right tabular-nums font-semibold ${text}`}>{N(r.kolFakt)}</td>
                        <td className={`px-3 py-2.5 text-right tabular-nums font-semibold ${r.kolBrak > 0 ? 'text-rose-400' : sub}`}>{N(r.kolBrak)}</td>
                        <td className={`px-3 py-2.5 whitespace-nowrap ${sub}`}>{r.upakovka}</td>
                        <td className={`px-3 py-2.5 text-right tabular-nums font-semibold ${r.pokupTsena > 0 ? 'text-rose-400' : sub}`}>{N(r.pokupTsena)}</td>
                        <td className={`px-3 py-2.5 text-right tabular-nums ${text}`}>{N(r.tsenaPost)}</td>
                        <td className={`px-3 py-2.5 text-right tabular-nums ${sub}`}>{r.skid || '—'}</td>
                        <td className={`px-3 py-2.5 text-right tabular-nums font-semibold ${text}`}>{N(r.tsenaPriv)}</td>
                        <td className={`px-3 py-2.5 text-right tabular-nums font-bold ${text}`}>{N(r.summa)}</td>
                        <td className={`px-3 py-2.5 text-right tabular-nums ${sub}`}>{r.ves > 0 ? r.ves : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className={`border-t-2 ${D ? 'border-gray-700 bg-white/[0.04]' : 'border-gray-200 bg-gray-50'}`}>
                      <td colSpan={5} className={`px-3 py-3 text-xs font-bold ${text}`}>
                        {t.detItogo}: {ITEMS.length} {t.detPoz}
                      </td>
                      <td />
                      <td className={`px-3 py-3 text-right text-xs font-bold tabular-nums ${text}`}>{N(totalKol)}</td>
                      <td className={`px-3 py-3 text-right text-xs font-bold tabular-nums ${totalBrak > 0 ? 'text-rose-400' : sub}`}>{N(totalBrak)}</td>
                      <td />
                      <td className="px-3 py-3 text-right text-xs font-bold tabular-nums text-rose-400">{N(totalPokup)}</td>
                      <td className={`px-3 py-3 text-right text-xs font-bold tabular-nums ${text}`}>{N(totalPost)}</td>
                      <td /><td />
                      <td className="px-3 py-3 text-right text-xs font-bold tabular-nums text-indigo-400">{N(totalSumma)}</td>
                      <td className={`px-3 py-3 text-right text-xs font-bold tabular-nums ${sub}`}>{totalVes.toLocaleString('ru-RU', { maximumFractionDigits: 1 })}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden">
                {ITEMS.map((r, i) => {
                  const isExp = expanded.has(r.id);
                  return (
                    <div key={r.id} className={i < ITEMS.length - 1 ? `border-b ${divider}` : ''}>
                      <button
                        onClick={() => toggleExp(r.id)}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors
                          ${D ? 'hover:bg-white/[0.025]' : 'hover:bg-gray-50'}
                          ${r.kolBrak > 0 ? D ? 'bg-rose-500/5' : 'bg-rose-50/30' : ''}
                        `}
                      >
                        {/* Row number */}
                        <span className={`flex-shrink-0 w-5 h-5 rounded flex items-center justify-center text-[9px] font-bold ${D ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>
                          {r.id}
                        </span>

                        {/* Name + brand */}
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs font-semibold truncate leading-tight ${text}`}>{r.tovar}</p>
                          <p className={`text-[10px] ${sub} mt-0.5`}>{r.brand} · {r.upakovka}</p>
                        </div>

                        {/* Qty + Sum */}
                        <div className="flex-shrink-0 text-right">
                          {r.summa > 0
                            ? <p className={`text-xs font-bold tabular-nums ${text}`}>{N(r.summa)}</p>
                            : <p className={`text-xs ${sub}`}>—</p>
                          }
                          <p className={`text-[10px] tabular-nums mt-0.5 ${sub}`}>{N(r.kolFakt)} шт</p>
                        </div>

                        {isExp
                          ? <ChevronUp size={13} className={`flex-shrink-0 ${sub}`} />
                          : <ChevronDown size={13} className={`flex-shrink-0 ${sub}`} />
                        }
                      </button>

                      {/* Expanded detail */}
                      {isExp && (
                        <div className={`px-4 pb-3.5 pt-2 border-t ${divider} space-y-2 ${D ? 'bg-white/[0.015]' : 'bg-gray-50/60'}`}>
                          <div className="grid grid-cols-2 gap-1.5">
                            {[
                              { l: t.detColPokup,  v:N(r.pokupTsena), hi: r.pokupTsena > 0 ? 'rose' : '' },
                              { l: t.detColPost,   v:N(r.tsenaPost),  hi: '' },
                              { l: t.detColPriv,   v:N(r.tsenaPriv),  hi: '' },
                              { l: t.detColSkid,   v:`${r.skid}%`,    hi: '' },
                              { l: t.detKolItogo,  v:N(r.kolFakt),    hi: '' },
                              { l: t.detColKolBrak,v:N(r.kolBrak),    hi: r.kolBrak > 0 ? 'rose' : '' },
                              { l: t.detColArtikul,v:r.artikul||'—',  hi: '' },
                              { l: t.detColVes,    v:String(r.ves||'—'), hi:'' },
                            ].map(item => (
                              <div key={item.l} className={`rounded-xl border px-2.5 py-2 ${card}`}>
                                <p className={`text-[9px] ${sub} mb-0.5`}>{item.l}</p>
                                <p className={`text-xs font-semibold tabular-nums ${
                                  item.hi === 'rose' ? 'text-rose-400' : text
                                }`}>{item.v}</p>
                              </div>
                            ))}
                          </div>
                          {/* Summa highlight */}
                          <div className={`rounded-xl border px-3 py-2.5 ${
                            D ? 'border-indigo-500/30 bg-indigo-500/10' : 'border-indigo-200 bg-indigo-50'
                          }`}>
                            <p className={`text-[9px] font-semibold ${sub} mb-0.5`}>{t.detColSumma}</p>
                            <p className={`text-sm font-bold tabular-nums ${D ? 'text-indigo-300' : 'text-indigo-700'}`}>
                              {N(r.summa)}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Mobile totals */}
                <div className={`border-t-2 ${D ? 'border-gray-700' : 'border-gray-200'} px-4 py-4 ${D ? 'bg-white/[0.03]' : 'bg-gray-50'}`}>
                  <p className={`text-xs font-bold mb-3 ${text}`}>
                    {t.detItogo} — {ITEMS.length} {t.detPoz}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <div className={`rounded-xl border px-3 py-2.5 ${card}`}>
                      <p className={`text-[9px] ${sub} mb-0.5`}>{t.detKolItogo}</p>
                      <p className={`text-sm font-bold tabular-nums ${text}`}>{N(totalKol)}</p>
                    </div>
                    <div className={`rounded-xl border px-3 py-2.5 ${card}`}>
                      <p className={`text-[9px] ${sub} mb-0.5`}>{t.detColPost}</p>
                      <p className={`text-sm font-bold tabular-nums ${text}`}>{N(totalPost)}</p>
                    </div>
                    <div
                      className={`rounded-xl border px-3 py-3 ${
                        D ? 'border-indigo-500/30 bg-indigo-500/10' : 'border-indigo-200 bg-indigo-50'
                      }`}
                      style={{ gridColumn:'1 / -1' }}
                    >
                      <p className={`text-[9px] font-semibold ${sub} mb-0.5`}>{t.detObshSumma}</p>
                      <p className={`text-base font-bold tabular-nums ${D ? 'text-indigo-300' : 'text-indigo-700'}`}>
                        {N(totalSumma)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}