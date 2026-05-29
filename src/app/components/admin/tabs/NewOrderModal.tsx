import { useState, useEffect, useRef, useMemo } from 'react';
import {
  X, Phone, ChevronDown, Trash2, RefreshCw,
  Package, Tag, FolderOpen, ArrowRight, Zap, Save,
  Search, Building2, User, Layers, Warehouse, FileText,
  Maximize2, Minimize2, Plus, Minus, ChevronRight,
} from 'lucide-react';

interface Props {
  D: boolean;
  divider: string;
  sub: string;
  t: Record<string, string>;
  onClose: () => void;
}

// ── Mock data ─────────────────────────────────────────────────────────────────
const MOCK_CLIENTS = [
  'NAVOI MALINA MARKET', 'NAVOIY OYBEK ZIYO MC.', 'AMIRXON UMIDIMIZ OK',
  'FARMON OK-19 (NAVOIY)', 'XUMO GULI MCHJ', 'ASLAN NAVOIY TONGI',
  'ZAHIDUN SAVDO', 'BEK SARDOR 2005 OK',
];
const MOCK_AGENTS  = ['Норова Нодира', 'Каримов Алишер', 'Рахимов Бобур', 'Юсупова Зулфия'];
const MOCK_CATS    = ['SHERIN', 'PREMIUM', 'EXPORT', 'LOCAL'];
const MOCK_SKLADS  = ['Sklad SHERIN', 'Sklad PREMIUM', 'Asosiy Sklad'];

interface Product {
  id: number;
  name: string;
  cena: number;
  qoldiq: number;
  ed: string;
  kategory: string;
}
const MOCK_PRODUCTS: Product[] = [
  { id: 1,  name: 'Кока-Кола 1.5L (quti)',   cena: 90200, qoldiq: 1020.300, ed: 'dona', kategory: 'SHERIN' },
  { id: 2,  name: "Pepsi 1L x6 (o'ram)",      cena: 90200, qoldiq:  379.360, ed: 'dona', kategory: 'SHERIN' },
  { id: 3,  name: 'Sprite 0.5L (quti)',        cena: 90200, qoldiq:    0.860, ed: 'dona', kategory: 'SHERIN' },
  { id: 4,  name: 'Fanta Apelsin 2L',          cena: 32800, qoldiq:  846.130, ed: 'kg',   kategory: 'SHERIN' },
  { id: 5,  name: 'Nestlé Pure Life 5L',       cena: 37500, qoldiq:  663.220, ed: 'dona', kategory: 'PREMIUM' },
  { id: 6,  name: 'Lipton Ice Tea 1L',         cena: 24700, qoldiq: 3502.000, ed: 'dona', kategory: 'PREMIUM' },
  { id: 7,  name: 'Bonaqua 0.5L (quti)',       cena: 30700, qoldiq: 5272.700, ed: 'dona', kategory: 'PREMIUM' },
  { id: 8,  name: 'Red Bull 0.25L',            cena: 18900, qoldiq:  221.000, ed: 'dona', kategory: 'EXPORT' },
  { id: 9,  name: 'Mirinda Apelsin 2L',        cena: 28500, qoldiq:  944.500, ed: 'kg',   kategory: 'EXPORT' },
  { id: 10, name: 'Mountain Dew 0.5L',         cena: 15600, qoldiq: 1300.000, ed: 'dona', kategory: 'LOCAL'  },
  { id: 11, name: 'Aquafina 1.5L',             cena: 12400, qoldiq: 2800.000, ed: 'dona', kategory: 'LOCAL'  },
  { id: 12, name: 'Juicy 1L Apelsin',          cena: 22300, qoldiq:  512.000, ed: 'dona', kategory: 'LOCAL'  },
];

type Row = {
  id: number;
  prodId: number;
  name: string;
  cena: number;
  qoldiq: number;
  qty: number;
  skidka: number;
  ed: string;
  summa: number;
};

const fmt      = (n: number) => n.toLocaleString('uz-UZ');
const fmtQ     = (n: number) => n.toLocaleString('ru-RU', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
const fmtDate  = (d: Date) =>
  `${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}.${d.getFullYear()}` +
  ` ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;

const calcSumma = (qty: number, cena: number, skidka: number) =>
  Math.round(qty * cena * (1 - skidka / 100));

// ─────────────────────────────────────────────────────────────────────────────
export function NewOrderModal({ D, divider, sub, t, onClose }: Props) {
  const [zayvkaNo]    = useState(() => Math.floor(10000 + Math.random() * 90000));
  const [sana]        = useState(fmtDate(new Date()));
  const [klient, setKlient]             = useState('');
  const [klientSearch, setKlientSearch] = useState('');
  const [showKlientDrop, setShowKlientDrop] = useState(false);
  const [agent, setAgent]       = useState('');
  const [kategoriya, setKat]    = useState(MOCK_CATS[0]);
  const [sklad, setSklad]       = useState(MOCK_SKLADS[0]);
  const [izoh, setIzoh]         = useState('');
  const [rows, setRows]         = useState<Row[]>([]);
  const [showOstatok, setShowOstatok] = useState(false);
  const [saved, setSaved]       = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

  // Product picker panel
  const [showPicker, setShowPicker]     = useState(false);
  const [pickerSearch, setPickerSearch] = useState('');
  const [pickerKat, setPickerKat]       = useState('');

  const klientRef  = useRef<HTMLDivElement>(null);
  const pickerRef  = useRef<HTMLDivElement>(null);
  const searchRef  = useRef<HTMLInputElement>(null);

  // Close klient dropdown on outside click
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (klientRef.current && !klientRef.current.contains(e.target as Node))
        setShowKlientDrop(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  // Body scroll lock
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  // Focus picker search when opened
  useEffect(() => {
    if (showPicker) setTimeout(() => searchRef.current?.focus(), 80);
  }, [showPicker]);

  const filteredClients = MOCK_CLIENTS.filter(c =>
    c.toLowerCase().includes(klientSearch.toLowerCase())
  );

  const filteredProducts = useMemo(() =>
    MOCK_PRODUCTS.filter(p => {
      const matchSearch = p.name.toLowerCase().includes(pickerSearch.toLowerCase());
      const matchKat    = !pickerKat || p.kategory === pickerKat;
      return matchSearch && matchKat;
    }),
    [pickerSearch, pickerKat]
  );

  // Row helpers
  const getRowQty = (prodId: number) => rows.find(r => r.prodId === prodId)?.qty ?? 0;

  const addOrIncrProduct = (p: Product) => {
    setRows(prev => {
      const exist = prev.find(r => r.prodId === p.id);
      if (exist) {
        return prev.map(r => r.prodId === p.id
          ? { ...r, qty: r.qty + 1, summa: calcSumma(r.qty + 1, r.cena, r.skidka) }
          : r
        );
      }
      const newRow: Row = {
        id: Date.now() + Math.random(),
        prodId: p.id, name: p.name, cena: p.cena, qoldiq: p.qoldiq,
        qty: 1, skidka: 0, ed: p.ed,
        summa: calcSumma(1, p.cena, 0),
      };
      return [...prev, newRow];
    });
  };

  const decrProduct = (prodId: number) => {
    setRows(prev => {
      const exist = prev.find(r => r.prodId === prodId);
      if (!exist) return prev;
      if (exist.qty <= 1) return prev.filter(r => r.prodId !== prodId);
      return prev.map(r => r.prodId === prodId
        ? { ...r, qty: r.qty - 1, summa: calcSumma(r.qty - 1, r.cena, r.skidka) }
        : r
      );
    });
  };

  const updateRowQty = (id: number, val: number) => {
    const q = Math.max(0, val);
    setRows(prev =>
      q === 0
        ? prev.filter(r => r.id !== id)
        : prev.map(r => r.id === id ? { ...r, qty: q, summa: calcSumma(q, r.cena, r.skidka) } : r)
    );
  };

  const updateRowSkidka = (id: number, val: number) => {
    const s = Math.min(100, Math.max(0, val));
    setRows(prev => prev.map(r => r.id === id
      ? { ...r, skidka: s, summa: calcSumma(r.qty, r.cena, s) }
      : r
    ));
  };

  const deleteRow   = (id: number)  => setRows(r => r.filter(x => x.id !== id));
  const clearAll    = ()             => setRows([]);

  const totalQty = rows.reduce((s, r) => s + r.qty, 0);
  const totalSum = rows.reduce((s, r) => s + r.summa, 0);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => { setSaved(false); onClose(); }, 900);
  };

  // ── Style helpers ─────────────────────────────────────────────────────────
  const inputCls = `w-full px-3 py-2 rounded-xl text-xs border outline-none transition-colors
    ${D
      ? 'bg-[#1c1c1e] border-gray-700 text-gray-200 placeholder-gray-600 focus:border-indigo-500'
      : 'bg-gray-50 border-gray-200 text-gray-800 placeholder-gray-400 focus:border-indigo-400'}`;
  const labelCls = `flex items-center gap-1 text-[10px] font-semibold mb-1 ${D ? 'text-gray-500' : 'text-gray-400'}`;
  const selectCls = `${inputCls} appearance-none pr-6 cursor-pointer`;

  // Table: №(28) | Tovar(1fr) | Kol-vo(88px) | Cena(68px) | Skidka(52px) | Ed(36px) | Summa(74px) | del(22px)
  const gridCols = '28px 1fr 88px 68px 52px 36px 74px 22px';

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div
      className="fixed inset-0 z-[300] flex flex-col sm:items-end sm:justify-end md:items-center md:justify-center"
      style={{ background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        className={`
          relative flex flex-col transition-all duration-300
          ${fullscreen
            ? 'w-full h-full'
            : 'w-full h-[92dvh] sm:h-[88dvh] sm:rounded-t-3xl md:h-auto md:max-h-[90dvh] md:max-w-3xl md:rounded-2xl md:mx-4 lg:max-w-4xl'}
          overflow-hidden shadow-2xl
          ${D
            ? 'bg-[#0d0d0d] sm:border-t border-gray-700/60 md:border'
            : 'bg-white sm:border-t border-gray-200 md:border'}
        `}
        style={{ animation: 'orderSlide .24s cubic-bezier(.32,1.2,.56,1)' }}
      >
        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className={`flex-shrink-0 flex items-center gap-3 px-4 py-3 border-b ${divider}
          ${D ? 'bg-[#161618]' : 'bg-gray-50/80'}`}>
          <div className={`w-9 h-9 rounded-2xl flex items-center justify-center flex-shrink-0
            ${D ? 'bg-indigo-600/25 ring-1 ring-indigo-500/30' : 'bg-indigo-100'}`}>
            <Phone size={15} className={D ? 'text-indigo-400' : 'text-indigo-600'}/>
          </div>
          <div className="min-w-0">
            <p className={`text-sm font-bold leading-tight ${D ? 'text-gray-100' : 'text-gray-800'}`}>
              {t.noTitle}
            </p>
            <p className={`text-[10px] font-mono ${sub}`}>{t.noZayvka}{zayvkaNo}</p>
          </div>
          <div className="flex-1"/>
          <button
            onClick={() => setFullscreen(f => !f)}
            className={`w-8 h-8 flex items-center justify-center rounded-xl transition-colors flex-shrink-0 mr-1
              ${D ? 'bg-gray-800 hover:bg-gray-700 text-gray-400' : 'bg-gray-100 hover:bg-gray-200 text-gray-500'}`}>
            {fullscreen ? <Minimize2 size={13}/> : <Maximize2 size={13}/>}
          </button>
          <button
            onClick={onClose}
            className={`w-8 h-8 flex items-center justify-center rounded-xl transition-colors flex-shrink-0
              ${D ? 'bg-gray-800 hover:bg-gray-700 text-gray-400' : 'bg-gray-100 hover:bg-gray-200 text-gray-500'}`}>
            <X size={14}/>
          </button>
        </div>

        {/* ── Body split: main | picker panel ─────────────────────────────── */}
        <div className="flex flex-1 min-h-0 overflow-hidden">

          {/* ── MAIN SCROLL AREA ──────────────────────────────────────────── */}
          <div className="flex-1 flex flex-col min-w-0 overflow-y-auto overscroll-contain">

            {/* Fields */}
            <div className={`px-4 py-3 border-b ${divider}`}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                <div>
                  <p className={labelCls}><FileText size={10}/> {t.noSana}</p>
                  <input value={sana} readOnly className={`${inputCls} cursor-default font-mono`}/>
                </div>
                <div ref={klientRef}>
                  <p className={labelCls}><Building2 size={10}/> {t.noKlient}</p>
                  <div className="relative">
                    <div className={`flex items-center rounded-xl border overflow-hidden transition-colors
                      ${showKlientDrop
                        ? D ? 'border-indigo-500' : 'border-indigo-400'
                        : D ? 'border-gray-700' : 'border-gray-200'}`}>
                      <input
                        value={klient || klientSearch}
                        onChange={e => { setKlientSearch(e.target.value); setKlient(''); setShowKlientDrop(true); }}
                        onFocus={() => setShowKlientDrop(true)}
                        placeholder={t.noKlientPh}
                        className={`flex-1 px-3 py-2 text-xs outline-none bg-transparent
                          ${D ? 'text-gray-200 placeholder-gray-600' : 'text-gray-800 placeholder-gray-400'}`}
                      />
                      <span
                        className={`px-2 text-[10px] font-bold cursor-pointer
                          ${D ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'}`}
                        onClick={() => setShowKlientDrop(s => !s)}>···</span>
                    </div>
                    {showKlientDrop && filteredClients.length > 0 && (
                      <div className={`absolute top-full left-0 right-0 mt-1 z-20 rounded-xl overflow-hidden shadow-xl border
                        ${D ? 'bg-[#1c1c1e] border-gray-700' : 'bg-white border-gray-200'}`}>
                        {filteredClients.map(c => (
                          <button key={c}
                            onClick={() => { setKlient(c); setKlientSearch(''); setShowKlientDrop(false); }}
                            className={`w-full text-left px-3 py-2 text-xs transition-colors
                              ${D ? 'hover:bg-gray-700/60 text-gray-300' : 'hover:bg-indigo-50 text-gray-700'}`}>
                            {c}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                <div>
                  <p className={labelCls}><User size={10}/> {t.noAgent}</p>
                  <div className="relative">
                    <select value={agent} onChange={e => setAgent(e.target.value)} className={selectCls}>
                      <option value="">{t.noAgentPh}</option>
                      {MOCK_AGENTS.map(a => <option key={a}>{a}</option>)}
                    </select>
                    <ChevronDown size={10} className={`absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none ${sub}`}/>
                  </div>
                </div>
                <div>
                  <p className={labelCls}><Layers size={10}/> {t.noKategoriya}</p>
                  <div className="relative">
                    <select value={kategoriya} onChange={e => setKat(e.target.value)} className={selectCls}>
                      {MOCK_CATS.map(c => <option key={c}>{c}</option>)}
                    </select>
                    <ChevronDown size={10} className={`absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none ${sub}`}/>
                  </div>
                </div>
                <div>
                  <p className={labelCls}><Warehouse size={10}/> {t.noSklad}</p>
                  <div className="relative">
                    <select value={sklad} onChange={e => setSklad(e.target.value)} className={selectCls}>
                      {MOCK_SKLADS.map(s => <option key={s}>{s}</option>)}
                    </select>
                    <ChevronDown size={10} className={`absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none ${sub}`}/>
                  </div>
                </div>
              </div>

              <div>
                <p className={labelCls}><FileText size={10}/> {t.noIzoh}</p>
                <input value={izoh} onChange={e => setIzoh(e.target.value)}
                  placeholder={t.noIzohPh} className={inputCls}/>
              </div>
            </div>

            {/* Toolbar */}
            <div className={`px-3 py-2.5 border-b ${divider} flex flex-wrap gap-1.5`}>
              {/* Tovar — opens picker, highlighted when picker is open */}
              <button
                onClick={() => setShowPicker(s => !s)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-medium transition-all border
                  ${showPicker
                    ? D
                      ? 'bg-indigo-600/30 text-indigo-300 border-indigo-600/50'
                      : 'bg-indigo-100 text-indigo-600 border-indigo-300'
                    : D
                      ? 'bg-[#1c1c1e] hover:bg-gray-800 text-gray-300 border-gray-700/50'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-600 border-gray-200'}`}>
                <Tag size={11}/>
                <span>{t.noTovar}</span>
                {rows.length > 0 && (
                  <span className={`ml-0.5 min-w-[16px] h-4 px-1 rounded-full text-[9px] font-bold flex items-center justify-center
                    ${D ? 'bg-indigo-600/40 text-indigo-300' : 'bg-indigo-100 text-indigo-600'}`}>
                    {rows.length}
                  </span>
                )}
                <ChevronRight size={10} className={`transition-transform ${showPicker ? 'rotate-90' : ''}`}/>
              </button>

              {([
                { icon: FolderOpen, label: t.noGuruh,     action: undefined,                     danger: false, active: false },
                { icon: ArrowRight, label: t.noYonalish,  action: undefined,                     danger: false, active: false },
                { icon: Zap,        label: t.noAksiya,    action: undefined,                     danger: false, active: false },
                { icon: Trash2,     label: t.noOchir,     action: clearAll,                      danger: true,  active: false },
                { icon: RefreshCw,  label: t.noOstatok,   action: () => setShowOstatok(s => !s), danger: false, active: showOstatok },
              ] as const).map(btn => (
                <button
                  key={btn.label}
                  onClick={btn.action as (() => void) | undefined}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-medium transition-all border
                    ${btn.danger
                      ? D
                        ? 'bg-rose-900/25 hover:bg-rose-900/40 text-rose-400 border-rose-800/30'
                        : 'bg-rose-50 hover:bg-rose-100 text-rose-500 border-rose-200'
                      : btn.active
                        ? D
                          ? 'bg-emerald-900/25 text-emerald-400 border-emerald-800/30'
                          : 'bg-emerald-50 text-emerald-600 border-emerald-200'
                        : D
                          ? 'bg-[#1c1c1e] hover:bg-gray-800 text-gray-300 border-gray-700/50'
                          : 'bg-gray-100 hover:bg-gray-200 text-gray-600 border-gray-200'
                    }`}>
                  <btn.icon size={11}/>
                  <span>{btn.label}</span>
                </button>
              ))}
            </div>

            {/* Product table */}
            <div className="flex-1">

              {/* Table header — hidden on small mobile, shown on sm+ */}
              <div
                className={`hidden sm:grid items-center px-3 py-2 border-b ${divider} ${D ? 'bg-[#161618]' : 'bg-gray-50'}`}
                style={{ gridTemplateColumns: gridCols }}>
                <span className={`text-[10px] font-semibold ${sub}`}>№</span>
                <span className={`text-[10px] font-semibold ${sub}`}>{t.noTovar}</span>
                <span className={`text-[10px] font-semibold text-center ${D ? 'text-indigo-400' : 'text-indigo-600'}`}>{t.noKolvo}</span>
                <span className={`text-[10px] font-semibold text-right pr-1 ${sub}`}>{t.noNarx}</span>
                <span className={`text-[10px] font-semibold text-center ${D ? 'text-amber-400' : 'text-amber-600'}`}>{t.noSkidka}</span>
                <span className={`text-[10px] font-semibold text-center ${sub}`}>{t.noEd}</span>
                <span className={`text-[10px] font-semibold text-right pr-1 ${sub}`}>{t.noSumma}</span>
                <span/>
              </div>

              {/* Empty state */}
              {rows.length === 0 && (
                <div className={`flex flex-col items-center justify-center py-12 gap-3 ${sub}`}>
                  <Package size={36} className="opacity-20"/>
                  <span className="text-xs">{t.noEmpty}</span>
                  <button
                    onClick={() => setShowPicker(true)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-semibold transition-all
                      ${D
                        ? 'bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600/30 border border-indigo-700/40'
                        : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border border-indigo-200'}`}>
                    <Plus size={13}/> {t.noAddBtn}
                  </button>
                </div>
              )}

              {/* Desktop rows */}
              {rows.map((r, i) => (
                <div
                  key={r.id}
                  className={`hidden sm:grid items-center px-3 border-b text-xs transition-colors ${divider}
                    ${D ? 'hover:bg-gray-800/40' : 'hover:bg-gray-50/80'}`}
                  style={{ gridTemplateColumns: gridCols, minHeight: 40 }}
                >
                  <span className={`font-mono text-[11px] ${sub}`}>{i + 1}</span>
                  <span className={`text-[11px] truncate pr-2 ${D ? 'text-gray-200' : 'text-gray-700'}`}>{r.name}</span>

                  {/* Qty stepper */}
                  <div className="flex items-center justify-center gap-1">
                    <button
                      onClick={() => updateRowQty(r.id, r.qty - 1)}
                      className={`w-5 h-5 rounded-md flex items-center justify-center transition-colors
                        ${D ? 'bg-gray-800 hover:bg-rose-900/50 text-rose-400' : 'bg-gray-100 hover:bg-rose-50 text-rose-500'}`}>
                      <Minus size={9}/>
                    </button>
                    <input
                      type="number"
                      value={r.qty}
                      min={1}
                      onChange={e => updateRowQty(r.id, Number(e.target.value))}
                      className={`w-8 text-center text-[11px] font-semibold bg-transparent outline-none border-b
                        ${D ? 'text-indigo-300 border-gray-700' : 'text-indigo-600 border-gray-300'}`}
                    />
                    <button
                      onClick={() => updateRowQty(r.id, r.qty + 1)}
                      className={`w-5 h-5 rounded-md flex items-center justify-center transition-colors
                        ${D ? 'bg-gray-800 hover:bg-emerald-900/50 text-emerald-400' : 'bg-gray-100 hover:bg-emerald-50 text-emerald-600'}`}>
                      <Plus size={9}/>
                    </button>
                  </div>

                  <span className={`text-right pr-1 text-[11px] ${sub}`}>{fmt(r.cena)}</span>

                  {/* Skidka */}
                  <div className="flex items-center justify-center">
                    <input
                      type="number"
                      value={r.skidka || ''}
                      min={0} max={100}
                      placeholder="0"
                      onChange={e => updateRowSkidka(r.id, Number(e.target.value))}
                      className={`w-10 text-center text-[11px] bg-transparent outline-none border-b
                        ${r.skidka > 0
                          ? D ? 'text-amber-400 border-amber-700' : 'text-amber-600 border-amber-400'
                          : D ? 'text-gray-500 border-gray-700' : 'text-gray-400 border-gray-300'}`}
                    />
                    <span className={`text-[9px] ml-0.5 ${sub}`}>%</span>
                  </div>

                  <span className={`text-center text-[11px] ${sub}`}>{r.ed}</span>

                  <span className={`text-right pr-1 font-semibold text-[11px]
                    ${D ? 'text-indigo-400' : 'text-indigo-600'}`}>
                    {fmt(r.summa)}
                  </span>

                  <button
                    onClick={() => deleteRow(r.id)}
                    className={`w-5 h-5 flex items-center justify-center rounded-lg transition-colors
                      ${D ? 'text-gray-600 hover:text-rose-400 hover:bg-rose-900/30' : 'text-gray-300 hover:text-rose-500 hover:bg-rose-50'}`}>
                    <Trash2 size={11}/>
                  </button>
                </div>
              ))}

              {/* Mobile rows — card style */}
              {rows.map((r, i) => (
                <div
                  key={`m-${r.id}`}
                  className={`sm:hidden px-3 py-2.5 border-b ${divider} ${D ? 'bg-[#0d0d0d]' : 'bg-white'}`}>
                  <div className="flex items-start gap-2">
                    <span className={`text-[10px] font-mono mt-0.5 w-5 flex-shrink-0 ${sub}`}>{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs truncate mb-1.5 ${D ? 'text-gray-200' : 'text-gray-800'}`}>{r.name}</p>
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Qty stepper mobile */}
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => updateRowQty(r.id, r.qty - 1)}
                            className={`w-6 h-6 rounded-lg flex items-center justify-center
                              ${D ? 'bg-gray-800 text-rose-400' : 'bg-gray-100 text-rose-500'}`}>
                            <Minus size={10}/>
                          </button>
                          <span className={`text-xs font-semibold min-w-[20px] text-center ${D ? 'text-indigo-300' : 'text-indigo-600'}`}>
                            {r.qty}
                          </span>
                          <button
                            onClick={() => updateRowQty(r.id, r.qty + 1)}
                            className={`w-6 h-6 rounded-lg flex items-center justify-center
                              ${D ? 'bg-gray-800 text-emerald-400' : 'bg-gray-100 text-emerald-600'}`}>
                            <Plus size={10}/>
                          </button>
                        </div>
                        <span className={`text-[10px] ${sub}`}>{r.ed}</span>
                        <span className={`text-[10px] ${sub}`}>× {fmt(r.cena)}</span>
                        <span className={`text-[10px] font-semibold ml-auto ${D ? 'text-indigo-400' : 'text-indigo-600'}`}>
                          {fmt(r.summa)}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => deleteRow(r.id)}
                      className={`mt-0.5 w-6 h-6 flex items-center justify-center rounded-lg flex-shrink-0
                        ${D ? 'text-gray-600 hover:text-rose-400' : 'text-gray-300 hover:text-rose-500'}`}>
                      <Trash2 size={12}/>
                    </button>
                  </div>
                </div>
              ))}

              {/* Totals */}
              {rows.length > 0 && (
                <div className={`flex items-center justify-between px-3 py-2.5 border-t ${divider}
                  ${D ? 'bg-[#161618]' : 'bg-gray-50'}`}>
                  <span className={`text-[11px] font-semibold ${sub}`}>
                    {t.noJami} <span className={D ? 'text-gray-200' : 'text-gray-700'}>{rows.length} {t.noTovarCount}</span>
                    <span className={`ml-2 ${sub}`}>/ {totalQty} {t.noDona}</span>
                  </span>
                  <span className={`text-sm font-bold ${D ? 'text-indigo-400' : 'text-indigo-600'}`}>
                    {fmt(totalSum)} {t.taroziSomUnit}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* ── PRODUCT PICKER PANEL ──────────────────────────────────────── */}
          <div
            ref={pickerRef}
            className={`flex-shrink-0 flex flex-col border-l transition-all duration-300 overflow-hidden
              ${showPicker ? 'w-full sm:w-72' : 'w-0'}
              ${D ? 'border-gray-700/60 bg-[#0d0d0d]' : 'border-gray-200 bg-gray-50/50'}`}
          >
            {showPicker && (
              <>
                {/* Picker header */}
                <div className={`flex-shrink-0 flex items-center gap-2 px-3 py-2.5 border-b ${divider}
                  ${D ? 'bg-[#161618]' : 'bg-white'}`}>
                  <Tag size={12} className={D ? 'text-indigo-400' : 'text-indigo-500'}/>
                  <span className={`text-xs font-semibold flex-1 ${D ? 'text-gray-200' : 'text-gray-700'}`}>
                    {t.noPickerTitle}
                  </span>
                  <button
                    onClick={() => setShowPicker(false)}
                    className={`w-6 h-6 flex items-center justify-center rounded-lg
                      ${D ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'}`}>
                    <X size={12}/>
                  </button>
                </div>

                {/* Search */}
                <div className={`flex-shrink-0 px-3 pt-2.5 pb-2 border-b ${divider}`}>
                  <div className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl border
                    ${D ? 'bg-[#1c1c1e] border-gray-700' : 'bg-white border-gray-200'}`}>
                    <Search size={12} className={D ? 'text-gray-500' : 'text-gray-400'}/>
                    <input
                      ref={searchRef}
                      value={pickerSearch}
                      onChange={e => setPickerSearch(e.target.value)}
                      placeholder={t.noPickerSearch}
                      className={`flex-1 text-xs bg-transparent outline-none
                        ${D ? 'text-gray-200 placeholder-gray-600' : 'text-gray-800 placeholder-gray-400'}`}
                    />
                    {pickerSearch && (
                      <button onClick={() => setPickerSearch('')}
                        className={D ? 'text-gray-600 hover:text-gray-400' : 'text-gray-300 hover:text-gray-500'}>
                        <X size={10}/>
                      </button>
                    )}
                  </div>

                  {/* Kategoriya filter pills */}
                  <div className="flex gap-1 mt-2 flex-wrap">
                    {['', ...MOCK_CATS].map(k => (
                      <button
                        key={k || 'all'}
                        onClick={() => setPickerKat(k)}
                        className={`px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors border
                          ${pickerKat === k
                            ? D
                              ? 'bg-indigo-600/30 text-indigo-300 border-indigo-600/50'
                              : 'bg-indigo-100 text-indigo-600 border-indigo-300'
                            : D
                              ? 'bg-transparent text-gray-500 border-gray-700/50 hover:border-gray-600'
                              : 'bg-transparent text-gray-400 border-gray-200 hover:border-gray-300'}`}>
                        {k || t.noPickerAll}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Product list */}
                <div className="flex-1 overflow-y-auto overscroll-contain">
                  {filteredProducts.length === 0 && (
                    <div className={`flex flex-col items-center justify-center py-10 gap-2 ${sub}`}>
                      <Search size={24} className="opacity-20"/>
                      <span className="text-xs">{t.noPickerEmpty}</span>
                    </div>
                  )}
                  {filteredProducts.map(p => {
                    const qty = getRowQty(p.id);
                    const inOrder = qty > 0;
                    return (
                      <div
                        key={p.id}
                        className={`flex items-center gap-2 px-3 py-2.5 border-b transition-colors cursor-pointer
                          ${divider}
                          ${inOrder
                            ? D
                              ? 'bg-indigo-950/40'
                              : 'bg-indigo-50/80'
                            : D
                              ? 'hover:bg-gray-800/40'
                              : 'hover:bg-gray-100/60'}`}
                        onClick={() => addOrIncrProduct(p)}
                      >
                        {/* Left info */}
                        <div className="flex-1 min-w-0">
                          <p className={`text-[11px] leading-tight truncate font-medium
                            ${inOrder
                              ? D ? 'text-indigo-200' : 'text-indigo-700'
                              : D ? 'text-gray-200' : 'text-gray-700'}`}>
                            {p.name}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className={`text-[10px] font-semibold ${D ? 'text-indigo-400' : 'text-indigo-600'}`}>
                              {fmt(p.cena)}
                            </span>
                            <span className={`text-[9px] ${
                              p.qoldiq < 5
                                ? 'text-rose-400'
                                : D ? 'text-emerald-500' : 'text-emerald-600'}`}>
                              {showOstatok ? fmtQ(p.qoldiq) + ' ' + p.ed : p.ed}
                            </span>
                          </div>
                        </div>

                        {/* Qty badge / add button */}
                        {inOrder ? (
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <button
                              onClick={e => { e.stopPropagation(); decrProduct(p.id); }}
                              className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors
                                ${D ? 'bg-gray-800 hover:bg-rose-900/50 text-rose-400' : 'bg-white hover:bg-rose-50 text-rose-500 border border-gray-200'}`}>
                              <Minus size={9}/>
                            </button>
                            <span className={`text-xs font-bold min-w-[20px] text-center
                              ${D ? 'text-indigo-300' : 'text-indigo-600'}`}>
                              {qty}
                            </span>
                            <button
                              onClick={e => { e.stopPropagation(); addOrIncrProduct(p); }}
                              className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors
                                ${D ? 'bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-400' : 'bg-indigo-100 hover:bg-indigo-200 text-indigo-600'}`}>
                              <Plus size={9}/>
                            </button>
                          </div>
                        ) : (
                          <div className={`w-7 h-7 flex-shrink-0 rounded-xl flex items-center justify-center transition-colors
                            ${D ? 'bg-gray-800 hover:bg-indigo-600/30 text-gray-500 hover:text-indigo-400'
                                : 'bg-gray-100 hover:bg-indigo-100 text-gray-400 hover:text-indigo-600'}`}>
                            <Plus size={12}/>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Picker footer — added count */}
                {rows.length > 0 && (
                  <div className={`flex-shrink-0 px-3 py-2.5 border-t ${divider}
                    ${D ? 'bg-[#161618]' : 'bg-white'}`}>
                    <div className="flex items-center justify-between">
                      <span className={`text-[10px] ${sub}`}>
                        {rows.length} {t.noPickerAdded}
                      </span>
                      <button
                        onClick={() => setShowPicker(false)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors
                          ${D ? 'bg-indigo-600/30 text-indigo-300 hover:bg-indigo-600/50'
                              : 'bg-indigo-100 text-indigo-600 hover:bg-indigo-200'}`}>
                        {t.noPickerTayyor} <ChevronRight size={10}/>
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* ── Footer ──────────────────────────────────────────────────────── */}
        <div className={`flex-shrink-0 flex gap-2.5 px-4 py-3 border-t ${divider}
          ${D ? 'bg-[#161618]' : 'bg-gray-50/80'}`}>
          <button
            onClick={onClose}
            className={`flex-1 py-3 rounded-2xl text-sm font-medium transition-colors
              ${D ? 'bg-gray-800 hover:bg-gray-700 text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'}`}>
            {t.noBekor}
          </button>
          <button
            onClick={handleSave}
            className={`flex-[2] flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-semibold
              transition-all active:scale-[.97]
              ${saved
                ? 'bg-emerald-500 text-white'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white'}`}>
            <Save size={14}/>
            {saved ? t.noSaqlandi : t.noSaqlash}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes orderSlide {
          from { opacity: 0; transform: translateY(32px) scale(.97); }
          to   { opacity: 1; transform: translateY(0)    scale(1);   }
        }
        input[type=number]::-webkit-outer-spin-button,
        input[type=number]::-webkit-inner-spin-button { -webkit-appearance: none; }
        input[type=number] { -moz-appearance: textfield; }
      `}</style>
    </div>
  );
}