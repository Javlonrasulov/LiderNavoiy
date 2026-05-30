import { useState, useMemo } from 'react';
import {
  ChevronLeft, Search, X, Package, List, LayoutGrid,
  SlidersHorizontal, BarChart3,
} from 'lucide-react';
import { useTheme } from '../../components/ThemeContext';
import { useNavigate } from 'react-router';
import BottomNav from '../../components/BottomNav';
import { allCategories } from '../../data/categories';

// ── Extended product type ─────────────────────────────────────────────────────
interface ExtProduct {
  id: number;
  code: string;
  name: string;
  brand: string;
  group: string;
  type: string;
  supplier: string;
  barcode: string;
  ikpu: string;
  pcsPerPack: number;
  netto: number;
  brutto: number;
  price: number;
  balance: number;
  unit: string;
}

// ── Mock meta per brand ───────────────────────────────────────────────────────
const BRAND_META: Record<string, { type: string; supplier: string; group: string }> = {
  sherin:              { type: 'Тарози', supplier: 'ЧП "SALAR ME..."', group: 'Шерин (Склад)' },
  tim:                 { type: 'Тарози', supplier: 'ЧП "SALAR ME..."', group: 'Тим (Склад)' },
  sir:                 { type: 'Тарози', supplier: 'Беларус Сыр Г...',  group: 'Сыр (Склад)' },
  'sir-sklad':         { type: 'Тарози', supplier: 'Беларус Сыр Г...',  group: 'Сыр (Склад)' },
  'cheese-house':      { type: 'Штучн.', supplier: 'SOLPRO ALLEA...',   group: 'PILLER' },
  tanlangan:           { type: 'Штучн.', supplier: 'SOLPRO ALLEA...',   group: 'PILLER' },
  'xayrli-tong':       { type: 'Тарози', supplier: 'ЧП "MILKY" MCH...', group: 'Васточный Сыр' },
  'tim-sklad':         { type: 'Тарози', supplier: 'ЧП "SALAR ME..."',  group: 'Тим (Склад)' },
  'tim-kopchenye':     { type: 'Тарози', supplier: 'ЧП "SALAR ME..."',  group: 'Тим (Склад)' },
  'sherin-sklad':      { type: 'Тарози', supplier: 'ЧП "SALAR ME..."',  group: 'Шерин (Склад)' },
  'alo-tam':           { type: 'Тарози', supplier: "A'lo ta'm",          group: "A'lo ta'm" },
  'andalus-sosiki':    { type: 'Тарози', supplier: 'AHBK0...ANDALUS',    group: 'Шерин (Склад)' },
  'andalus-kopchenye': { type: 'Тарози', supplier: 'AHBK0...ANDALUS',    group: 'Шерин (Склад)' },
  'andalus-varenye':   { type: 'Тарози', supplier: 'AHBK0...ANDALUS',    group: 'Шерин (Склад)' },
};

function mockBarcode(id: number) { return String(4690000000000 + id * 137).slice(0, 13); }
function mockIkpu(id: number)    { return String(10200000 + id * 239); }

const ALL_PRODUCTS: ExtProduct[] = allCategories.flatMap(cat => {
  const meta = BRAND_META[cat.id] ?? { type: 'Тарози', supplier: '—', group: cat.name };
  return cat.products.map(p => ({
    id: p.id, code: p.code, name: p.name,
    brand: cat.name.toUpperCase(), group: meta.group, type: meta.type,
    supplier: meta.supplier, barcode: mockBarcode(p.id), ikpu: mockIkpu(p.id),
    pcsPerPack: p.unit === 'Штучн.' ? 10 : 1,
    netto: parseFloat((p.balance * 0.95).toFixed(3)),
    brutto: parseFloat((p.balance).toFixed(3)),
    price: p.price, balance: p.balance, unit: p.unit,
  }));
});

const EXTRA: ExtProduct[] = [
  { id:101, code:'10645', name:'Масло Сливочное "PILLER" 82.5% 500 гр',     brand:'PILLER', group:'PILLER', type:'Штучн.', supplier:'SOLPRO ALLEA...', barcode:'4690000645001', ikpu:'10200645999', pcsPerPack:9,  netto:0.500, brutto:0.520, price:28500, balance:45, unit:'Штучн.' },
  { id:102, code:'10646', name:'Масло Сливочное растительное "PILLER" 1кг',  brand:'PILLER', group:'PILLER', type:'Штучн.', supplier:'SOLPRO ALLEA...', barcode:'4690000646001', ikpu:'10200646999', pcsPerPack:9,  netto:1.000, brutto:1.020, price:28500, balance:32, unit:'Штучн.' },
  { id:103, code:'10647', name:'Масло Сливочное раст."PILLER" 72.5% 300 гр',brand:'PILLER', group:'PILLER', type:'Штучн.', supplier:'SOLPRO ALLEA...', barcode:'4690000647001', ikpu:'10200647999', pcsPerPack:36, netto:0.300, brutto:0.320, price:19900, balance:60, unit:'Штучн.' },
  { id:104, code:'10648', name:'Масло Сливочное "PILLER" 82.5% 200 гр',     brand:'PILLER', group:'PILLER', type:'Штучн.', supplier:'SOLPRO ALLEA...', barcode:'4690000648001', ikpu:'10200648999', pcsPerPack:15, netto:0.200, brutto:0.210, price:14500, balance:80, unit:'Штучн.' },
  { id:105, code:'10649', name:'Масло Сливочное раст."PILLER" 82.5% 450 гр',brand:'PILLER', group:'PILLER', type:'Штучн.', supplier:'SOLPRO ALLEA...', barcode:'4690000649001', ikpu:'10200649999', pcsPerPack:38, netto:0.450, brutto:0.470, price:11200, balance:25, unit:'Штучн.' },
  { id:106, code:'10650', name:'Масло Сливочное "PILLER" 82.5% 150 гр',     brand:'PILLER', group:'PILLER', type:'Штучн.', supplier:'SOLPRO ALLEA...', barcode:'4690000650001', ikpu:'10200650999', pcsPerPack:41, netto:0.150, brutto:0.160, price:3800,  balance:120, unit:'Штучн.' },
];

const PRODUCTS_FULL = [...EXTRA, ...ALL_PRODUCTS];

// ── Translations ─────────────────────────────────────────────────────────────
const T = {
  uz_latn: {
    title:      'Mahsulotlar',
    search:     'Qidirish...',
    all:        'Barchasi',
    noResults:  'Mahsulot topilmadi',
    total:      'ta mahsulot',      // ← fixed
    code:       'Kod',
    name:       'Tovar',
    brand:      'Brend',
    group:      'Guruh',
    type:       'TipTo',
    supplier:   'Postavshik',
    barcode:    'Shtrix kod',
    ikpu:       'IKPU',
    pcsPerPack: 'шт.уп',
    netto:      'Netto',
    brutto:     'Brutto',
    price:      'RTL',
    balance:    'Qoldiq',
    inStock:    "Mavjud",
    noStock:    "Yo'q",
    tableView:  'Jadval',
    cardView:   'Kartalar',
    currency:   "so'm",
  },
  uz_cyrl: {
    title:      'Маҳсулотлар',
    search:     'Қидириш...',
    all:        'Барчаси',
    noResults:  'Маҳсулот топилмади',
    total:      'та маҳсулот',      // ← fixed
    code:       'Код',
    name:       'Товар',
    brand:      'Бренд',
    group:      'Гуруҳ',
    type:       'ТипТо',
    supplier:   'Поставшик',
    barcode:    'Штрих код',
    ikpu:       'ИКПУ',
    pcsPerPack: 'шт.уп',
    netto:      'Нетто',
    brutto:     'Брутто',
    price:      'RTL',
    balance:    'Қолдиқ',
    inStock:    'Мавжу��',
    noStock:    'Йўқ',
    tableView:  'Жадвал',
    cardView:   'Карталар',
    currency:   'сўм',
  },
  ru: {
    title:      'Товары',
    search:     'Поиск...',
    all:        'Все',
    noResults:  'Товары не найдены',
    total:      'товар',            // ← fixed
    code:       'Kod',
    name:       'Товар',
    brand:      'Бренд',
    group:      'Группа',
    type:       'TipTo',
    supplier:   'Поставщик',
    barcode:    'Штрих код',
    ikpu:       'ИКПУ',
    pcsPerPack: 'шт.уп',
    netto:      'Нетто',
    brutto:     'Брутто',
    price:      'RTL',
    balance:    'Остаток',
    inStock:    'В наличии',
    noStock:    'Нет',
    tableView:  'Таблица',
    cardView:   'Карточки',
    currency:   'сум',
  },
};

function fmt(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + ' mln';
  if (n >= 1_000)     return (n / 1_000).toFixed(0) + ' ming';
  return String(n);
}

const BRAND_COLORS: Record<string, string> = {
  PILLER: '#6366f1', SHERIN: '#10b981', TIM: '#f59e0b',
  SIR: '#3b82f6', ANDALUS: '#ef4444', "A'LO TA'M": '#8b5cf6',
};
function brandColor(b: string) {
  for (const [k, v] of Object.entries(BRAND_COLORS)) {
    if (b.toUpperCase().includes(k)) return v;
  }
  return '#6b7280';
}

// ─────────────────────────────────────────────────────────────────────────────
export default function Products() {
  const { isDark, language } = useTheme();
  const navigate = useNavigate();
  const t = T[language];

  const [search, setSearch]       = useState('');
  const [brandFilter, setBrand]   = useState('all');
  const [showTable, setShowTable] = useState(false);   // default: card view
  const [showFilter, setShowFilter] = useState(false);
  const [stockOnly, setStockOnly] = useState(false);

  const brands = useMemo(() => {
    const set = new Set(PRODUCTS_FULL.map(p => p.brand));
    return ['all', ...Array.from(set)];
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return PRODUCTS_FULL.filter(p => {
      if (brandFilter !== 'all' && p.brand !== brandFilter) return false;
      if (stockOnly && p.balance <= 0) return false;
      if (!q) return true;
      return (
        p.code.toLowerCase().includes(q) ||
        p.name.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        p.barcode.includes(q) ||
        p.supplier.toLowerCase().includes(q)
      );
    });
  }, [search, brandFilter, stockOnly]);

  // theme shorthands
  const sub    = isDark ? 'text-gray-400' : 'text-gray-500';
  const border = isDark ? 'border-gray-800' : 'border-gray-200';

  return (
    <div className={`min-h-screen flex flex-col ${isDark ? 'bg-black' : 'bg-gray-50'}`}>

      {/* ── Sticky header — always narrow-centered ─────────────────────────── */}
      <div className={`sticky top-0 z-40 ${isDark ? 'bg-black/95' : 'bg-gray-50/95'} backdrop-blur-md`}>
        <div className="w-full max-w-md mx-auto">

          {/* Title row */}
          <div className="flex items-center gap-3 px-4 pt-12 pb-3">
            <button
              onClick={() => navigate('/')}
              className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
                isDark ? 'bg-gray-800 text-gray-300 hover:text-white' : 'bg-gray-100 text-gray-600 hover:text-black'
              }`}
            >
              <ChevronLeft size={20} />
            </button>

            <div className="flex-1 min-w-0">
              <h1 className={`text-xl font-bold truncate ${isDark ? 'text-white' : 'text-black'}`}>{t.title}</h1>
              <p className={`text-xs ${sub}`}>{filtered.length} {t.total}</p>
            </div>

            {/* View toggle */}
            <button
              onClick={() => setShowTable(v => !v)}
              title={showTable ? t.cardView : t.tableView}
              className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
                showTable
                  ? 'bg-indigo-600 text-white'
                  : isDark ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-500'
              }`}
            >
              {showTable ? <LayoutGrid size={16} /> : <List size={16} />}
            </button>

            {/* Filter */}
            <button
              onClick={() => setShowFilter(v => !v)}
              className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
                stockOnly
                  ? 'bg-indigo-600 text-white'
                  : isDark ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-500'
              }`}
            >
              <SlidersHorizontal size={16} />
            </button>
          </div>

          {/* Search */}
          <div className="px-4 pb-2">
            <div className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl border ${border} ${
              isDark ? 'bg-gray-900' : 'bg-white'
            }`}>
              <Search size={16} className={sub} />
              <input
                type="text"
                placeholder={t.search}
                value={search}
                onChange={e => setSearch(e.target.value)}
                className={`flex-1 bg-transparent outline-none text-sm ${
                  isDark ? 'text-white placeholder:text-gray-600' : 'text-black placeholder:text-gray-400'
                }`}
              />
              {search && (
                <button onClick={() => setSearch('')} className={sub}>
                  <X size={15} />
                </button>
              )}
            </div>
          </div>

          {/* Filter panel */}
          {showFilter && (
            <div className={`px-4 pb-3 border-b ${border}`}>
              <label className={`flex items-center gap-2 py-2 text-sm cursor-pointer select-none ${
                isDark ? 'text-gray-300' : 'text-gray-700'
              }`}>
                <div
                  onClick={() => setStockOnly(v => !v)}
                  className={`w-10 h-6 rounded-full transition-colors relative flex-shrink-0 ${
                    stockOnly ? 'bg-indigo-600' : isDark ? 'bg-gray-700' : 'bg-gray-200'
                  }`}
                >
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${
                    stockOnly ? 'left-5' : 'left-1'
                  }`} />
                </div>
                <span>{t.inStock}</span>
              </label>
            </div>
          )}

          {/* Brand tabs */}
          <div className="px-4 pb-3 overflow-x-auto scrollbar-hide">
            <div className="flex gap-2 min-w-max">
              {brands.map(b => (
                <button
                  key={b}
                  onClick={() => setBrand(b)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all whitespace-nowrap ${
                    brandFilter === b
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : isDark
                        ? 'bg-gray-800 text-gray-400 hover:text-white'
                        : 'bg-gray-100 text-gray-500 hover:text-gray-800'
                  }`}
                >
                  {b === 'all' ? t.all : b}
                </button>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* ── Content ─────────────────────────────────────────────────────────── */}
      <div className="flex-1 pb-28">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}>
              <Package size={28} className={sub} />
            </div>
            <p className={`text-sm ${sub}`}>{t.noResults}</p>
          </div>

        ) : showTable ? (
          /* ── TABLE VIEW — full page width with horizontal scroll ── */
          <div className="w-full overflow-x-auto">
            <table className="text-xs" style={{ minWidth: 900, width: '100%' }}>
              <thead>
                <tr className={`${isDark ? 'bg-gray-900 text-gray-400' : 'bg-gray-100 text-gray-500'} border-b ${border}`}>
                  <th className="px-2 py-2.5 text-left font-medium w-7 sticky left-0 z-10" style={{ background: isDark ? '#111827' : '#f3f4f6' }}>#</th>
                  <th className="px-2 py-2.5 text-left font-medium whitespace-nowrap sticky left-7 z-10" style={{ background: isDark ? '#111827' : '#f3f4f6', minWidth: 60 }}>{t.code}</th>
                  <th className="px-2 py-2.5 text-left font-medium" style={{ minWidth: 180 }}>{t.name}</th>
                  <th className="px-2 py-2.5 text-left font-medium whitespace-nowrap" style={{ minWidth: 70 }}>{t.brand}</th>
                  <th className="px-2 py-2.5 text-center font-medium whitespace-nowrap">П1</th>
                  <th className="px-2 py-2.5 text-left font-medium whitespace-nowrap">{t.type}</th>
                  <th className="px-2 py-2.5 text-left font-medium whitespace-nowrap" style={{ minWidth: 90 }}>{t.group}</th>
                  <th className="px-2 py-2.5 text-right font-medium whitespace-nowrap">{t.pcsPerPack}</th>
                  <th className="px-2 py-2.5 text-right font-medium whitespace-nowrap">{t.netto}</th>
                  <th className="px-2 py-2.5 text-right font-medium whitespace-nowrap">{t.brutto}</th>
                  <th className="px-2 py-2.5 text-right font-medium whitespace-nowrap">EdIzm</th>
                  <th className="px-2 py-2.5 text-right font-medium whitespace-nowrap">{t.price}</th>
                  <th className="px-2 py-2.5 text-left font-medium whitespace-nowrap" style={{ minWidth: 110 }}>{t.supplier}</th>
                  <th className="px-2 py-2.5 text-right font-medium whitespace-nowrap">IKPU</th>
                  <th className="px-2 py-2.5 text-right font-medium whitespace-nowrap">{t.balance}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p, idx) => {
                  const inStock = p.balance > 0;
                  const stickyBg = isDark ? '#0d1117' : '#ffffff';
                  return (
                    <tr
                      key={p.id}
                      className={`border-b ${border} transition-colors cursor-pointer ${
                        isDark ? 'hover:bg-gray-800/60 text-gray-300' : 'hover:bg-gray-50 text-gray-700'
                      }`}
                    >
                      <td className={`px-2 py-2.5 sticky left-0 z-10 ${sub}`} style={{ background: stickyBg }}>{idx + 1}</td>
                      <td className={`px-2 py-2.5 font-mono whitespace-nowrap sticky left-7 z-10 ${
                        isDark ? 'text-indigo-400' : 'text-indigo-600'
                      }`} style={{ background: stickyBg }}>{p.code}</td>
                      <td className={`px-2 py-2.5 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>{p.name}</td>
                      <td className="px-2 py-2.5">
                        <span className="px-1.5 py-0.5 rounded text-white text-[10px] font-semibold whitespace-nowrap"
                          style={{ background: brandColor(p.brand) }}>
                          {p.brand.slice(0, 8)}
                        </span>
                      </td>
                      <td className="px-2 py-2.5 text-center">{p.pcsPerPack}</td>
                      <td className="px-2 py-2.5">
                        <span className="px-1.5 py-0.5 rounded text-white text-[10px] font-semibold whitespace-nowrap"
                          style={{ background: p.type === 'Штучн.' ? '#6366f1' : '#f59e0b' }}>
                          {p.type}
                        </span>
                      </td>
                      <td className={`px-2 py-2.5 text-[11px] ${sub}`}>{p.group.slice(0, 14)}</td>
                      <td className="px-2 py-2.5 text-right">{p.pcsPerPack}</td>
                      <td className="px-2 py-2.5 text-right">{p.netto.toFixed(3)}</td>
                      <td className="px-2 py-2.5 text-right">{p.brutto.toFixed(3)}</td>
                      <td className={`px-2 py-2.5 text-right ${sub}`}>{p.unit}</td>
                      <td className={`px-2 py-2.5 text-right font-semibold whitespace-nowrap ${isDark ? 'text-white' : 'text-black'}`}>
                        {fmt(p.price)}
                      </td>
                      <td className={`px-2 py-2.5 text-[11px] ${sub} whitespace-nowrap`}>{p.supplier}</td>
                      <td className={`px-2 py-2.5 text-right text-[11px] font-mono ${sub}`}>{p.ikpu}</td>
                      <td className="px-2 py-2.5 text-right">
                        <span className={`font-semibold ${inStock ? 'text-emerald-500' : 'text-rose-500'}`}>
                          {p.balance > 0 ? p.balance.toFixed(3) : '—'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>

              {/* Footer totals */}
              <tfoot>
                <tr className={`border-t-2 ${isDark ? 'border-gray-700 bg-gray-900/80 text-gray-300' : 'border-gray-300 bg-gray-100 text-gray-700'}`}>
                  <td className={`px-2 py-2.5 text-xs font-semibold sticky left-0 z-10`} style={{ background: isDark ? '#111827' : '#f3f4f6' }} />
                  <td className={`px-2 py-2.5 text-xs font-semibold sticky left-7 z-10`} style={{ background: isDark ? '#111827' : '#f3f4f6' }}>
                    Jami: {filtered.length}
                  </td>
                  <td colSpan={12} className="px-2 py-2.5 text-xs">
                    <span className="text-emerald-500 font-semibold">Mavjud: {filtered.filter(p => p.balance > 0).length}</span>
                    <span className={`ml-3 ${sub}`}>·</span>
                    <span className="ml-3 text-rose-500 font-semibold">Tugagan: {filtered.filter(p => p.balance <= 0).length}</span>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

        ) : (
          /* ── CARD VIEW — narrow centered ── */
          <div className="w-full max-w-md mx-auto px-4 space-y-2.5 mt-1">
            {filtered.map(p => {
              const inStock = p.balance > 0;
              const color   = brandColor(p.brand);
              return (
                <div
                  key={p.id}
                  className={`rounded-2xl border ${border} overflow-hidden ${
                    isDark ? 'bg-gray-900' : 'bg-white'
                  }`}
                >
                  {/* Top row */}
                  <div className="flex items-start gap-3 p-4 pb-3">
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 text-white text-[10px] font-bold"
                      style={{ background: color }}
                    >
                      {p.brand.slice(0, 3).toUpperCase()}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold leading-snug ${isDark ? 'text-white' : 'text-black'}`}>
                        {p.name}
                      </p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className={`text-[11px] font-mono ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`}>
                          {p.code}
                        </span>
                        <span className={`text-[11px] ${sub}`}>·</span>
                        <span
                          className="px-1.5 py-0.5 rounded text-white text-[10px] font-semibold"
                          style={{ background: p.type === 'Штучн.' ? '#6366f1' : '#f59e0b' }}
                        >
                          {p.type}
                        </span>
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <div className={`text-base font-bold ${isDark ? 'text-white' : 'text-black'}`}>
                        {fmt(p.price)}
                      </div>
                      <div className={`text-[10px] ${sub}`}>{t.currency}</div>
                    </div>
                  </div>

                  {/* Stats row */}
                  <div className={`flex border-t ${border}`}>
                    <StatCell label={t.pcsPerPack} value={String(p.pcsPerPack)} dark={isDark} />
                    <StatCell label={t.netto}      value={p.netto.toFixed(3)}   dark={isDark} />
                    <StatCell label={t.brutto}     value={p.brutto.toFixed(3)}  dark={isDark} />
                    <div className="flex-1 flex flex-col items-center justify-center py-2 px-1">
                      <span className={`text-[10px] mb-0.5 ${sub}`}>{t.balance}</span>
                      <span className={`text-xs font-semibold ${inStock ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {inStock ? p.balance.toFixed(3) : '—'}
                      </span>
                    </div>
                  </div>

                  {/* Supplier row */}
                  <div className={`flex items-center justify-between px-4 py-2.5 border-t ${border} ${
                    isDark ? 'bg-gray-800/40' : 'bg-gray-50/60'
                  }`}>
                    <div className="flex items-center gap-1.5 min-w-0">
                      <BarChart3 size={11} className={sub} />
                      <span className={`text-[11px] truncate ${sub}`}>{p.supplier}</span>
                    </div>
                    <span className={`text-[10px] font-mono flex-shrink-0 ml-2 ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
                      {p.barcode}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Bottom Nav ────────────────────────────────────────────────────────── */}
      <div className="w-full max-w-md mx-auto">
        <BottomNav activePage="dostavka" />
      </div>
    </div>
  );
}

function StatCell({ label, value, dark }: { label: string; value: string; dark: boolean }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center py-2 px-1">
      <span className={`text-[10px] mb-0.5 ${dark ? 'text-gray-500' : 'text-gray-400'}`}>{label}</span>
      <span className={`text-xs font-medium ${dark ? 'text-gray-200' : 'text-gray-700'}`}>{value}</span>
    </div>
  );
}