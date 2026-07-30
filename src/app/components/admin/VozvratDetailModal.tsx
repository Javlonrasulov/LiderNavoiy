import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import {
  X, Maximize2, Minimize2,
  FileDown, ChevronDown, ChevronUp, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { formatDisplayDate } from '../../utils/dateFormat';

/* ─── Types ─── */
export interface VozRowRef {
  id:         number;
  dateSend:   string;
  dateAccept: string;
  num:        string;
  supplier:   string;
  org:        string;
  warehouse:  string;
  note:       string;
  dir:        string;
  sum:        number;
}

interface VozItem {
  id:       number;
  group:    string;
  tovar:    string;
  vneshKod: string;
  shtUp:    number;
  ostatok:  number;
  qty:      number;
  kolUpak:  string;
  tsena:    number;
  tsenaDop: number;
  tsenaDR:  number;
  summa:    number;
  summaDR:  number;
  ves:      number;
}

interface Props {
  D:       boolean;
  t:       Record<string, string>;
  row:     VozRowRef;
  onClose: () => void;
}

/* ─── Mock items (matches screenshot data) ─── */
const ITEMS: VozItem[] = [
  { id:1,  group:'Mozzarella', tovar:'SOF IN Mozzarella 200 гр',          vneshKod:'', shtUp:1, ostatok:1_000,  qty:1_000,   kolUpak:'1 шт',    tsena:18_000,  tsenaDop:0, tsenaDR:18_000,  summa:18_000_000,  summaDR:18_000_000,  ves:0.200 },
  { id:2,  group:'Mozzarella', tovar:'SOF IN Mozzarella 250 гр',          vneshKod:'', shtUp:1, ostatok:2_000,  qty:2_000,   kolUpak:'2 шт',    tsena:25_000,  tsenaDop:0, tsenaDR:25_000,  summa:50_000_000,  summaDR:50_000_000,  ves:0.500 },
  { id:3,  group:'SOF IN',     tovar:'Тара яшик SOF IN',                  vneshKod:'', shtUp:1, ostatok:1_000,  qty:125_000, kolUpak:'125 шт',  tsena:0,       tsenaDop:0, tsenaDR:0,       summa:0,           summaDR:0,           ves:0     },
  { id:4,  group:'SOF IN',     tovar:'Пор Пшлок Жирност 3% стакан...',    vneshKod:'', shtUp:1, ostatok:12_000, qty:12_000,  kolUpak:'12 шт',   tsena:12_800,  tsenaDop:0, tsenaDR:12_800,  summa:153_600_000, summaDR:153_600_000, ves:2.400 },
  { id:5,  group:'SOF IN',     tovar:'Творог 9% стаканчик 2...',          vneshKod:'', shtUp:1, ostatok:23_000, qty:23_000,  kolUpak:'23 шт',   tsena:13_500,  tsenaDop:0, tsenaDR:13_500,  summa:310_500_000, summaDR:310_500_000, ves:4.600 },
  { id:6,  group:'SOF IN',     tovar:'Творог Жирност 5% стаканчик 2...',  vneshKod:'', shtUp:1, ostatok:27_000, qty:27_000,  kolUpak:'27 шт',   tsena:13_200,  tsenaDop:0, tsenaDR:13_200,  summa:356_400_000, summaDR:356_400_000, ves:5.400 },
  { id:7,  group:'SOF IN',     tovar:'Творог 5% контейнер 2...',          vneshKod:'', shtUp:1, ostatok:2_000,  qty:2_000,   kolUpak:'2 шт',    tsena:10_290,  tsenaDop:0, tsenaDR:10_290,  summa:20_580_000,  summaDR:20_580_000,  ves:5.400 },
  { id:8,  group:'SOF IN',     tovar:'Творог 9% контейнер 200г',          vneshKod:'', shtUp:1, ostatok:18_000, qty:8_000,   kolUpak:'8 шт',    tsena:10_700,  tsenaDop:0, tsenaDR:10_700,  summa:85_600_000,  summaDR:85_600_000,  ves:8.000 },
  { id:9,  group:'SOF IN',     tovar:'Катик 1% ПЭТ 450г',                 vneshKod:'', shtUp:1, ostatok:102_000,qty:102_000, kolUpak:'102 шт',  tsena:5_500,   tsenaDop:0, tsenaDR:5_500,   summa:561_000_000, summaDR:561_000_000, ves:102.000},
  { id:10, group:'SOF IN',     tovar:'Кефир 1% ПЭТ 900г',                 vneshKod:'', shtUp:1, ostatok:27_000, qty:27_000,  kolUpak:'27 шт',   tsena:9_600,   tsenaDop:0, tsenaDR:9_600,   summa:259_200_000, summaDR:259_200_000, ves:27.000},
  { id:11, group:'SOF IN',     tovar:'Кефир 1% ПЭТ 450г',                 vneshKod:'', shtUp:1, ostatok:12_000, qty:12_000,  kolUpak:'12 шт',   tsena:5_500,   tsenaDop:0, tsenaDR:5_500,   summa:66_000_000,  summaDR:66_000_000,  ves:12.000},
  { id:12, group:'SOF IN',     tovar:'Кефир 2,5% ПЭТ 900г',               vneshKod:'', shtUp:1, ostatok:39_000, qty:39_000,  kolUpak:'39 шт',   tsena:10_900,  tsenaDop:0, tsenaDR:10_900,  summa:425_100_000, summaDR:425_100_000, ves:39.000},
  { id:13, group:'SOF IN',     tovar:'Кефир 2,5% ПЭТ 450г',               vneshKod:'', shtUp:1, ostatok:34_000, qty:34_000,  kolUpak:'34 шт',   tsena:5_700,   tsenaDop:0, tsenaDR:5_700,   summa:193_800_000, summaDR:193_800_000, ves:39.000},
];

function N(n: number) {
  if (n === 0) return '—';
  return n.toLocaleString('ru-RU');
}
function F(n: number) {
  if (n === 0) return '—';
  return n.toLocaleString('ru-RU', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
}

type InnerTab = 'tovary' | 'gruppy';

export function VozvratDetailModal({ D, t, row, onClose }: Props) {
  const [fullscreen, setFullscreen] = useState(false);
  const [innerTab,   setInnerTab]   = useState<InnerTab>('tovary');
  const [expanded,   setExpanded]   = useState<Set<number>>(new Set());
  const tableWrapRef = useRef<HTMLDivElement>(null);

  const scrollTable = (dir: 'left' | 'right') => {
    tableWrapRef.current?.scrollBy({ left: dir === 'right' ? 320 : -320, behavior: 'smooth' });
  };

  const toggleExp = (id: number) =>
    setExpanded(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });

  /* totals */
  const totalQty    = ITEMS.reduce((s, r) => s + r.qty,     0);
  const totalSumma  = ITEMS.reduce((s, r) => s + r.summa,   0);
  const totalSumDR  = ITEMS.reduce((s, r) => s + r.summaDR, 0);
  const totalVes    = ITEMS.reduce((s, r) => s + r.ves,     0);

  /* Grouped summary for "Группы" tab */
  const groupMap: Record<string, { qty: number; summa: number }> = {};
  ITEMS.forEach(r => {
    if (!groupMap[r.group]) groupMap[r.group] = { qty: 0, summa: 0 };
    groupMap[r.group].qty   += r.qty;
    groupMap[r.group].summa += r.summa;
  });
  const groups = Object.entries(groupMap).map(([g, v], i) => ({ id: i, group: g, ...v }));

  /* style shortcuts */
  const bg      = D ? 'bg-[#0d0d0d]'              : 'bg-white';
  const card    = D ? 'bg-[#111] border-gray-800'  : 'bg-gray-50 border-gray-200';
  const bdr     = D ? 'border-gray-800'             : 'border-gray-200';
  const sub     = D ? 'text-gray-500'               : 'text-gray-400';
  const text    = D ? 'text-white'                  : 'text-gray-900';
  const inp     = D ? 'bg-[#1a1a1a] border-gray-700 text-white' : 'bg-white border-gray-200 text-gray-900';
  const hdr     = D ? 'bg-[#161616] border-gray-800' : 'bg-gray-50 border-gray-200';
  const divider = D ? 'border-gray-800'             : 'border-gray-100';
  const tabHov  = D ? 'hover:text-gray-200'         : 'hover:text-gray-800';

  /* ── Excel export ── */
  const handleExport = () => {
    const wb = XLSX.utils.book_new();

    /* ── Sheet 1: Tovarlar ── */
    const infoRows = [
      [t.vozNum ?? 'Номер', row.num],
      [t.vozDateSend ?? 'Дата отправки', formatDisplayDate(row.dateSend)],
      [t.vozDateAccept ?? 'Дата принятия', formatDisplayDate(row.dateAccept)],
      [t.detPoluchatel ?? 'Получатель', row.supplier],
      [t.vozSender ?? 'Отправитель', row.org || 'LEADERS BARAKA'],
      [t.detAvtor ?? 'Автор', 'Фарноков Жасур'],
      [t.vozDir ?? 'Направление', row.dir],
      [t.postWarehouse ?? 'Склад', row.warehouse || 'Брак'],
      [t.detPere ?? 'Перечисление', row.sum],
      [t.vozNote ?? 'Примечание', row.note || '—'],
      [],
    ];

    const headers = [
      'N',
      t.detColGroup    ?? 'Группа',
      t.detColTovar    ?? 'Товар',
      t.vozColVnesh    ?? 'Внеш код',
      t.detColShtUp    ?? 'уп.шт',
      t.vozColOstatok  ?? 'Остаток',
      t.vozColQty      ?? 'Количество',
      t.detColUpakovka ?? 'кол упак',
      t.vozColTsena    ?? 'Цена',
      t.vozColTsenaDop ?? 'Цена доп',
      t.vozColTsenaDR  ?? 'Цена+ДР',
      t.detColSumma    ?? 'Сумма',
      t.vozColSummaDR  ?? 'Сумма+ДР',
      t.detColVes      ?? 'Вес',
    ];

    const dataRows = ITEMS.map(r => [
      r.id, r.group, r.tovar, r.vneshKod || '—',
      r.shtUp, r.ostatok, r.qty, r.kolUpak,
      r.tsena, r.tsenaDop || 0, r.tsenaDR,
      r.summa, r.summaDR, r.ves,
    ]);

    const totalsRow = [
      `${t.detItogo ?? 'Итого'} (${ITEMS.length})`,
      '', '', '', '', '',
      totalQty, '', '', '', '',
      totalSumma, totalSumDR, totalVes,
    ];

    const ws1Data = [...infoRows, [t.vozTitle ?? 'Возврат товаров поставщику'], [], [headers, ...dataRows, totalsRow]].flat();
    const ws1 = XLSX.utils.aoa_to_sheet([
      ...infoRows,
      [t.vozTitle ?? 'Возврат товаров поставщику'],
      [],
      headers,
      ...dataRows,
      totalsRow,
    ]);

    /* column widths */
    ws1['!cols'] = [
      { wch: 5 }, { wch: 18 }, { wch: 36 }, { wch: 12 },
      { wch: 8 }, { wch: 12 }, { wch: 12 }, { wch: 10 },
      { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 16 }, { wch: 16 }, { wch: 10 },
    ];

    XLSX.utils.book_append_sheet(wb, ws1, t.detTabTovary ?? 'Товары');

    /* ── Sheet 2: Guruhlar ── */
    const ws2 = XLSX.utils.aoa_to_sheet([
      ['N', t.detColGroup ?? 'Группа', t.vozColQty ?? 'Количество', t.detColSumma ?? 'Сумма'],
      ...groups.map((g, i) => [i + 1, g.group, g.qty, g.summa]),
      [`${t.detItogo ?? 'Итого'}`, '', totalQty, totalSumma],
    ]);
    ws2['!cols'] = [{ wch: 5 }, { wch: 22 }, { wch: 14 }, { wch: 18 }];
    XLSX.utils.book_append_sheet(wb, ws2, t.detTabGruppy ?? 'Группы');

    /* download */
    XLSX.writeFile(wb, `vozvrat_${row.num}_${row.dateSend}.xlsx`);
  };

  /* Form fields */
  const mainFields = [
    { label: t.vozNum        ?? 'Номер',                 value: row.num },
    { label: t.vozDateSend   ?? 'Дата отправки',         value: formatDisplayDate(row.dateSend) },
    { label: t.vozDateAccept ?? 'Дата принятия',         value: formatDisplayDate(row.dateAccept) },
    { label: t.detPoluchatel ?? 'Получатель',             value: row.supplier },
    { label: t.vozSender     ?? 'Отправитель',            value: row.org || 'LEADERS BARAKA' },
    { label: t.detAvtor      ?? 'Автор',                 value: 'Фарноков Жасур' },
  ];
  const extraFields = [
    { label: t.vozDir        ?? 'Направление',           value: row.dir },
    { label: t.postWagon  ?? 'Вагон',                    value: '—' },
    { label: t.detSchFak  ?? '№ счет фак',               value: '—' },
    { label: t.postWarehouse ?? 'Склад',                 value: row.warehouse || 'Брак' },
  ];
  const finFields = [
    { label: t.detPere  ?? 'Перечисление', value: N(row.sum),       hi: true  },
    { label: t.detNal   ?? 'Наличные',     value: '0,00',           hi: false },
    { label: t.vozCorr  ?? 'Корр',         value: '0,00',           hi: false },
    { label: t.vozNote  ?? 'Примечание',   value: row.note || '—', hi: false },
  ];

  const DESKTOP_COLS = [
    { k:'N',         label:'N',                                          cls:'w-10 text-center' },
    { k:'group',     label: t.detColGroup    ?? 'Группа',              cls:'min-w-[90px]' },
    { k:'tovar',     label: t.detColTovar    ?? 'Товар',               cls:'min-w-[200px]' },
    { k:'vneshKod',  label: t.vozColVnesh    ?? 'Внеш код',            cls:'min-w-[70px]' },
    { k:'shtUp',     label: t.detColShtUp    ?? 'уп.шт',               cls:'text-right' },
    { k:'ostatok',   label: t.vozColOstatok  ?? 'Остаток',             cls:'text-right' },
    { k:'qty',       label: t.vozColQty      ?? 'Количество',          cls:'text-right' },
    { k:'kolUpak',   label: t.detColUpakovka ?? 'кол упак',            cls:'text-right min-w-[70px]' },
    { k:'tsena',     label: t.vozColTsena    ?? 'Цена',                cls:'text-right' },
    { k:'tsenaDop',  label: t.vozColTsenaDop ?? 'Цена доп',            cls:'text-right' },
    { k:'tsenaDR',   label: t.vozColTsenaDR  ?? 'Цена+ДР',             cls:'text-right' },
    { k:'summa',     label: t.detColSumma    ?? 'Сумма',               cls:'text-right min-w-[110px]' },
    { k:'summaDR',   label: t.vozColSummaDR  ?? 'Сумма+ДР',            cls:'text-right min-w-[110px]' },
    { k:'ves',       label: t.detColVes      ?? 'Вес',                 cls:'text-right' },
  ];

  return (
    <div
      className="fixed inset-0 z-[270] flex items-end sm:items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.76)', backdropFilter: 'blur(8px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >

      <div
        className={`flex flex-col ${bg} shadow-2xl transition-all duration-300 w-full ${
          fullscreen
            ? 'fixed inset-0 rounded-none'
            : 'sm:w-[97vw] sm:max-w-[1200px] sm:max-h-[92vh] sm:rounded-2xl rounded-3xl max-h-[94vh]'
        } overflow-hidden`}
      >
        {/* Mobile drag handle */}
        <div className="sm:hidden flex justify-center pt-2.5 pb-1 flex-shrink-0">
          <div className={`w-10 h-1 rounded-full ${D ? 'bg-gray-700' : 'bg-gray-300'}`} />
        </div>

        {/* ══ HEADER ══ */}
        <div className={`flex items-center gap-3 px-4 py-3 border-b ${bdr} ${hdr} flex-shrink-0`}>

          {/* Title block */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className={`text-sm font-bold leading-tight ${D ? 'text-white' : 'text-gray-900'}`}>
                {t.vozTitle ?? 'Возврат товаров поставщику'}
              </h2>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide ${
                D ? 'bg-rose-500/15 text-rose-400 ring-1 ring-rose-500/25' : 'bg-rose-50 text-rose-600 ring-1 ring-rose-200'
              }`}>
                № {row.num}
              </span>
            </div>
            <p className={`text-[10px] mt-0.5 flex items-center gap-1 ${sub}`}>
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              {formatDisplayDate(row.dateSend)}
              {row.supplier && (
                <>
                  <span className={`mx-0.5 ${D ? 'text-gray-700' : 'text-gray-300'}`}>·</span>
                  <span className="truncate max-w-[140px] sm:max-w-none">{row.supplier}</span>
                </>
              )}
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={handleExport}
              className={`hidden sm:flex items-center gap-1 px-2 py-1.5 rounded-lg border text-xs font-medium transition-colors ${D ? 'border-gray-700 hover:bg-white/5' : 'border-gray-200 hover:bg-gray-100'}`}
            >
              <FileDown size={11} className={sub} />
            </button>
            <button
              onClick={() => setFullscreen(v => !v)}
              className={`hidden sm:flex p-1.5 rounded-lg transition-colors ${D ? 'hover:bg-gray-800' : 'hover:bg-gray-100'}`}
            >
              {fullscreen
                ? <Minimize2 size={14} className={sub} />
                : <Maximize2 size={14} className={sub} />}
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
          <div className="p-3 sm:p-4 space-y-3">

            {/* ── Main fields ── */}
            <div className={`rounded-2xl border ${card} p-3`}>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                {mainFields.map(f => (
                  <div key={f.label} className="flex flex-col gap-1 min-w-0">
                    <span className={`text-[9px] font-semibold uppercase tracking-wide ${sub}`}>{f.label}</span>
                    <div className={`rounded-xl border px-2.5 py-1.5 text-xs truncate ${inp}`}>{f.value || '—'}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Extra + Finance fields ── */}
            <div className={`rounded-2xl border ${card} p-3`}>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
                {[...extraFields, ...finFields].map(f => (
                  <div key={f.label} className="flex flex-col gap-1 min-w-0">
                    <span className={`text-[9px] font-semibold uppercase tracking-wide ${sub}`}>{f.label}</span>
                    <div className={`rounded-xl border px-2.5 py-1.5 text-xs font-semibold tabular-nums truncate ${
                      (f as any).hi
                        ? D ? 'border-rose-500/40 bg-rose-500/10 text-rose-300' : 'border-rose-200 bg-rose-50 text-rose-600'
                        : inp
                    }`}>{(f as any).value}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Items section ── */}
            <div className={`rounded-2xl border ${card}`}>

              {/* Inner tabs */}
              <div
                className={`flex items-center border-b ${bdr} ${hdr}`}
                style={{ scrollbarWidth: 'none', overflowX: 'auto' }}
              >
                {/* Tabs */}
                {(['tovary', 'gruppy'] as const).map((id) => (
                  <button
                    key={id}
                    onClick={() => setInnerTab(id)}
                    className={`flex-shrink-0 px-4 py-2.5 text-xs font-semibold transition-colors border-b-2 -mb-px whitespace-nowrap ${
                      innerTab === id
                        ? 'border-indigo-500 text-indigo-400'
                        : `border-transparent ${sub} ${tabHov}`
                    }`}
                  >
                    {id === 'tovary' ? (t.detTabTovary ?? 'Товары') : (t.detTabGruppy ?? 'Группы')}
                  </button>
                ))}
              </div>

              {/* ── ТОВАРЫ tab ── */}
              {innerTab === 'tovary' && (
                <>
                  {/* Scroll nav — desktop only */}
                  <div className={`hidden md:flex justify-end gap-1 px-3 py-2 border-b ${divider} ${D ? 'bg-white/[0.02]' : 'bg-gray-50/60'}`}>
                    <button
                      onClick={() => scrollTable('left')}
                      className={`flex items-center justify-center w-7 h-7 rounded-lg border ${D ? 'border-gray-700 bg-white/[0.05] hover:bg-white/[0.1] text-gray-300' : 'border-gray-200 bg-gray-100 hover:bg-gray-200 text-gray-600'} transition-colors`}
                    ><ChevronLeft size={14} /></button>
                    <button
                      onClick={() => scrollTable('right')}
                      className={`flex items-center justify-center w-7 h-7 rounded-lg border ${D ? 'border-gray-700 bg-white/[0.05] hover:bg-white/[0.1] text-gray-300' : 'border-gray-200 bg-gray-100 hover:bg-gray-200 text-gray-600'} transition-colors`}
                    ><ChevronRight size={14} /></button>
                  </div>

                  {/* Desktop table */}
                  <div
                    ref={tableWrapRef}
                    className="hidden md:block"
                    style={{
                      width: '100%',
                      overflowX: 'auto',
                      overflowY: 'auto',
                      maxHeight: '400px',
                    }}
                  >
                    <table
                      className="text-xs"
                      style={{ minWidth: '1600px', borderCollapse: 'collapse', tableLayout: 'auto' }}
                    >
                      <thead>
                        <tr className={`border-b ${divider} ${D ? 'bg-white/[0.02]' : 'bg-gray-50/80'}`}
                          style={{ position: 'sticky', top: 0, zIndex: 2 }}
                        >
                          {DESKTOP_COLS.map(c => (
                            <th
                              key={c.k}
                              className={`px-3 py-2.5 text-left font-semibold whitespace-nowrap ${sub} ${c.cls}`}
                            >
                              {c.label}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {ITEMS.map((r, i) => (
                          <tr
                            key={r.id}
                            className={`${i < ITEMS.length - 1 ? `border-b ${divider}` : ''} ${
                              D ? 'hover:bg-white/[0.02]' : 'hover:bg-rose-50/30'
                            } transition-colors`}
                          >
                            <td className={`px-3 py-2 text-center tabular-nums whitespace-nowrap ${sub}`}>{r.id}</td>
                            <td className={`px-3 py-2 whitespace-nowrap ${sub}`}>{r.group}</td>
                            <td className="px-3 py-2 min-w-[180px] max-w-[220px]">
                              <span className="truncate block">{r.tovar}</span>
                            </td>
                            <td className={`px-3 py-2 whitespace-nowrap tabular-nums ${sub}`}>{r.vneshKod || '—'}</td>
                            <td className="px-3 py-2 text-right tabular-nums whitespace-nowrap">{r.shtUp}</td>
                            <td className="px-3 py-2 text-right tabular-nums whitespace-nowrap">{N(r.ostatok)}</td>
                            <td className={`px-3 py-2 text-right tabular-nums whitespace-nowrap font-semibold ${D ? 'text-white' : 'text-gray-900'}`}>
                              {N(r.qty)}
                            </td>
                            <td className={`px-3 py-2 text-right tabular-nums whitespace-nowrap ${sub}`}>{r.kolUpak}</td>
                            <td className="px-3 py-2 text-right tabular-nums whitespace-nowrap">{N(r.tsena)}</td>
                            <td className={`px-3 py-2 text-right tabular-nums whitespace-nowrap ${sub}`}>{r.tsenaDop || '—'}</td>
                            <td className="px-3 py-2 text-right tabular-nums whitespace-nowrap">{N(r.tsenaDR)}</td>
                            <td className={`px-3 py-2 text-right tabular-nums whitespace-nowrap font-semibold ${D ? 'text-rose-300' : 'text-rose-600'}`}>
                              {N(r.summa)}
                            </td>
                            <td className={`px-3 py-2 text-right tabular-nums whitespace-nowrap font-semibold ${D ? 'text-rose-300' : 'text-rose-600'}`}>
                              {N(r.summaDR)}
                            </td>
                            <td className={`px-3 py-2 text-right tabular-nums whitespace-nowrap ${sub}`}>{F(r.ves)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className={`border-t-2 ${D ? 'border-gray-700 bg-white/[0.03]' : 'border-gray-200 bg-gray-50'}`}>
                          <td colSpan={6} className="px-3 py-3 text-xs font-bold whitespace-nowrap">{t.detItogo ?? 'Итого'} ({ITEMS.length})</td>
                          <td className="px-3 py-3 text-right text-xs font-bold tabular-nums whitespace-nowrap">{N(totalQty)}</td>
                          <td colSpan={4} />
                          <td className={`px-3 py-3 text-right text-xs font-bold tabular-nums whitespace-nowrap ${D ? 'text-rose-300' : 'text-rose-600'}`}>
                            {N(totalSumma)}
                          </td>
                          <td className={`px-3 py-3 text-right text-xs font-bold tabular-nums whitespace-nowrap ${D ? 'text-rose-300' : 'text-rose-600'}`}>
                            {N(totalSumDR)}
                          </td>
                          <td className={`px-3 py-3 text-right text-xs font-bold tabular-nums whitespace-nowrap ${sub}`}>
                            {F(totalVes)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  {/* Scroll buttons — faqat desktop */}
                  <div className={`hidden md:flex items-center justify-between px-3 py-2 border-t ${divider}`}>
                    <span className={`text-[10px] ${sub}`}>{t.vozScrollHint ?? "← o'ng ustunlarni ko'rish uchun scroll qiling →"}</span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => scrollTable('left')}
                        className={`p-1.5 rounded-lg transition-colors ${D ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}
                      >
                        <ChevronLeft size={14} />
                      </button>
                      <button
                        onClick={() => scrollTable('right')}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${D ? 'bg-gray-800 hover:bg-gray-700 text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}
                      >
                        {t.vozScrollRight ?? 'Scroll right'} <ChevronRight size={12} />
                      </button>
                    </div>
                  </div>

                  {/* Mobile accordion cards */}
                  <div className="md:hidden">
                    {ITEMS.map((r, i) => {
                      const isExp = expanded.has(r.id);
                      return (
                        <div key={r.id} className={i < ITEMS.length - 1 ? `border-b ${divider}` : ''}>
                          <button
                            onClick={() => toggleExp(r.id)}
                            className={`w-full flex items-start gap-2.5 px-4 py-3 text-left transition-colors ${
                              D ? 'hover:bg-white/[0.02]' : 'hover:bg-rose-50/30'
                            }`}
                          >
                            {/* Row number */}
                            <span className={`flex-shrink-0 w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold mt-0.5 ${
                              D ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-500'
                            }`}>{r.id}</span>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 mb-0.5">
                                <span className={`text-[9px] px-1.5 py-0.5 rounded font-semibold ${
                                  D ? 'bg-indigo-500/15 text-indigo-400' : 'bg-indigo-50 text-indigo-600'
                                }`}>{r.group}</span>
                              </div>
                              <p className="text-xs font-semibold leading-snug">{r.tovar}</p>
                              <p className={`text-[10px] ${sub} mt-0.5 tabular-nums`}>
                                Кол: <strong>{N(r.qty)}</strong> · {t.vozColTsena ?? 'Цена'}: {N(r.tsena)}
                              </p>
                            </div>

                            {/* Sum + chevron */}
                            <div className="flex-shrink-0 flex items-center gap-1.5">
                              <div className="text-right">
                                {r.summa > 0
                                  ? <p className={`text-xs font-bold tabular-nums ${D ? 'text-rose-400' : 'text-rose-500'}`}>
                                      {N(r.summa)}
                                    </p>
                                  : <p className={`text-xs ${sub}`}>—</p>
                                }
                                {r.ves > 0 && (
                                  <p className={`text-[9px] tabular-nums ${sub}`}>{F(r.ves)} кг</p>
                                )}
                              </div>
                              {isExp
                                ? <ChevronUp size={13} className={sub} />
                                : <ChevronDown size={13} className={sub} />}
                            </div>
                          </button>

                          {isExp && (
                            <div className={`px-4 pb-4 pt-2 border-t ${divider} ${D ? 'bg-white/[0.015]' : 'bg-gray-50/60'}`}>
                              <div className="grid grid-cols-2 gap-2">
                                {[
                                  { l: t.detColShtUp    ?? 'уп.шт',     v: String(r.shtUp) },
                                  { l: t.vozColOstatok  ?? 'Остаток',   v: N(r.ostatok) },
                                  { l: t.vozColQty      ?? 'Количество',v: N(r.qty) },
                                  { l: t.detColUpakovka ?? 'кол упак',  v: r.kolUpak },
                                  { l: t.vozColTsena    ?? 'Цена',      v: N(r.tsena) },
                                  { l: t.vozColTsenaDop ?? 'Цена доп',  v: r.tsenaDop > 0 ? N(r.tsenaDop) : '—' },
                                  { l: t.vozColTsenaDR  ?? 'Цена+ДР',   v: N(r.tsenaDR) },
                                  { l: t.detColVes      ?? 'Вес',       v: F(r.ves) + ' кг' },
                                ].map(item => (
                                  <div key={item.l} className={`rounded-xl border px-2.5 py-2 ${inp} border-opacity-50`}>
                                    <p className={`text-[9px] ${sub} mb-0.5`}>{item.l}</p>
                                    <p className="text-xs font-semibold tabular-nums truncate">{item.v}</p>
                                  </div>
                                ))}
                              </div>
                              {r.summa > 0 && (
                                <div className="grid grid-cols-2 gap-2 mt-2">
                                  <div className={`rounded-xl border px-3 py-2.5 ${D ? 'border-rose-500/30 bg-rose-500/10' : 'border-rose-200 bg-rose-50'}`}>
                                    <p className={`text-[9px] font-semibold ${sub} mb-0.5`}>{t.detColSumma ?? 'Сумма'}</p>
                                    <p className={`text-sm font-bold tabular-nums ${D ? 'text-rose-400' : 'text-rose-500'}`}>{N(r.summa)}</p>
                                  </div>
                                  <div className={`rounded-xl border px-3 py-2.5 ${D ? 'border-rose-500/30 bg-rose-500/10' : 'border-rose-200 bg-rose-50'}`}>
                                    <p className={`text-[9px] font-semibold ${sub} mb-0.5`}>{t.vozColSummaDR ?? 'Сумма+ДР'}</p>
                                    <p className={`text-sm font-bold tabular-nums ${D ? 'text-rose-400' : 'text-rose-500'}`}>{N(r.summaDR)}</p>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* Mobile total footer */}
                    <div className={`border-t-2 ${D ? 'border-gray-700 bg-white/[0.03]' : 'border-gray-200 bg-gray-50'} px-4 py-3`}>
                      <div className="grid grid-cols-3 gap-2">
                        <div className={`rounded-xl border px-2.5 py-2 ${card}`}>
                          <p className={`text-[9px] ${sub} mb-0.5`}>{t.vozColQty ?? 'Количество'}</p>
                          <p className="text-xs font-bold tabular-nums">{N(totalQty)}</p>
                        </div>
                        <div className={`rounded-xl border px-2.5 py-2 ${D ? 'border-rose-500/30 bg-rose-500/10' : 'border-rose-100 bg-rose-50'}`}>
                          <p className={`text-[9px] ${sub} mb-0.5`}>{t.detColSumma ?? 'Сумма'}</p>
                          <p className={`text-xs font-bold tabular-nums ${D ? 'text-rose-400' : 'text-rose-500'}`}>{N(totalSumma)}</p>
                        </div>
                        <div className={`rounded-xl border px-2.5 py-2 ${card}`}>
                          <p className={`text-[9px] ${sub} mb-0.5`}>{t.detColVes ?? 'Вес'}</p>
                          <p className="text-xs font-bold tabular-nums">{F(totalVes)} кг</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* ── ГРУППЫ tab ── */}
              {innerTab === 'gruppy' && (
                <>
                  {/* Desktop */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className={`border-b ${divider} ${D ? 'bg-white/[0.02]' : 'bg-gray-50/80'}`}>
                          {['N', t.detColGroup ?? 'Группа', t.vozColQty ?? 'Количество', t.detColSumma ?? 'Сумма'].map(h => (
                            <th key={h} className={`px-4 py-2.5 text-left font-semibold ${sub} ${h !== 'N' && h !== (t.detColGroup ?? 'Группа') ? 'text-right' : ''}`}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {groups.map((g, i) => (
                          <tr key={g.id} className={`${i < groups.length - 1 ? `border-b ${divider}` : ''} ${D ? 'hover:bg-white/[0.02]' : 'hover:bg-gray-50'} transition-colors`}>
                            <td className={`px-4 py-2.5 ${sub}`}>{i + 1}</td>
                            <td className="px-4 py-2.5 font-medium">{g.group}</td>
                            <td className="px-4 py-2.5 text-right tabular-nums">{N(g.qty)}</td>
                            <td className={`px-4 py-2.5 text-right tabular-nums font-semibold ${D ? 'text-rose-300' : 'text-rose-600'}`}>{N(g.summa)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className={`border-t-2 ${D ? 'border-gray-700 bg-white/[0.03]' : 'border-gray-200 bg-gray-50'}`}>
                          <td colSpan={2} className="px-4 py-3 text-xs font-bold">{t.detItogo ?? 'Итого'}</td>
                          <td className="px-4 py-3 text-right text-xs font-bold tabular-nums">{N(totalQty)}</td>
                          <td className={`px-4 py-3 text-right text-xs font-bold tabular-nums ${D ? 'text-rose-300' : 'text-rose-600'}`}>{N(totalSumma)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  {/* Mobile */}
                  <div className="md:hidden p-3 space-y-2">
                    {groups.map((g, i) => (
                      <div key={g.id} className={`rounded-xl border ${card} px-3 py-3`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-bold ${sub}`}>{i + 1}</span>
                            <span className="text-xs font-semibold">{g.group}</span>
                          </div>
                          <div className="text-right">
                            <p className={`text-xs font-bold tabular-nums ${D ? 'text-rose-400' : 'text-rose-500'}`}>{N(g.summa)}</p>
                            <p className={`text-[10px] ${sub} tabular-nums`}>{N(g.qty)} шт</p>
                          </div>
                        </div>
                      </div>
                    ))}
                    <div className={`rounded-xl border ${D ? 'border-rose-500/30 bg-rose-500/10' : 'border-rose-200 bg-rose-50'} px-3 py-3 flex items-center justify-between`}>
                      <span className="text-xs font-bold">{t.detItogo ?? 'Итого'}</span>
                      <div className="text-right">
                        <p className={`text-xs font-bold tabular-nums ${D ? 'text-rose-400' : 'text-rose-500'}`}>{N(totalSumma)}</p>
                        <p className={`text-[10px] ${sub} tabular-nums`}>{N(totalQty)} шт</p>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* ══ MOBILE BOTTOM ACTION BAR ══ */}
        <div className={`sm:hidden border-t ${bdr} px-4 py-3 flex-shrink-0 ${hdr}`}>
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={onClose}
              className={`flex items-center gap-1 px-3 py-2.5 rounded-xl border text-sm font-medium transition-colors ${D ? 'border-gray-700 hover:bg-white/5' : 'border-gray-200 hover:bg-gray-100'}`}
            >
              <X size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}