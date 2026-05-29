import { useState, useEffect, useRef } from 'react';
import {
  X, Maximize2, Minimize2, Check, ChevronDown,
  Calculator, Package, Tag, Plus, Trash2, ArrowUp, ArrowDown,
  RefreshCw, FileDown, FileUp, AlertCircle, CheckCircle2,
} from 'lucide-react';
import * as XLSX from 'xlsx';

interface PostItem {
  id: number;
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

interface Props {
  D: boolean;
  t: Record<string, string>;
  onClose: () => void;
}

type MainTab = 'postavshiki' | 'vagon' | 'prodazha';
type InnerTab = 'tovary' | 'gruppy' | 'brendy' | 'dop' | 'materialy';

const VIDY     = ['Баланс', 'Отв.хран'];
const TSELI    = ['Оптовая', 'Розничная', 'Производство'];
const SKLADY   = ['Склад SHERIN', 'Склад SOFIN', 'Склад MAIN'];
const NAPRAVL  = ['SHERIN', 'SOF IN', 'MAIN'];

export function PostupleniyaModal({ D, t, onClose }: Props) {
  const [fullscreen, setFullscreen]     = useState(false);
  const [mainTab,    setMainTab]        = useState<MainTab>('postavshiki');
  const [innerTab,   setInnerTab]       = useState<InnerTab>('tovary');
  const [items,      setItems]          = useState<PostItem[]>([]);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());

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
  const [dataDoc,     setDataDoc]     = useState('10.03.2026');
  const [dataPog,     setDataPog]     = useState('');
  const [postavshik,  setPostavshik]  = useState('');
  const [poluchatel,  setPoluchatel]  = useState("OOO 'BORAN LEADERS'");
  const [napravlenie, setNapravlenie] = useState('SHERIN');
  const [avtor,       setAvtor]       = useState('Менеджер');
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

  /* ── style helpers ── */
  const bg    = D ? 'bg-[#0d0d0d]' : 'bg-white';
  const card  = D ? 'bg-[#111] border-gray-800' : 'bg-gray-50 border-gray-200';
  const bdr   = D ? 'border-gray-800' : 'border-gray-200';
  const sub   = D ? 'text-gray-500' : 'text-gray-400';
  const inp   = D ? 'bg-[#1a1a1a] border-gray-700 text-white placeholder-gray-600' : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400';
  const lbl   = D ? 'text-gray-400' : 'text-gray-500';
  const hdr   = D ? 'bg-[#161616] border-gray-800' : 'bg-gray-50 border-gray-200';

  const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="flex flex-col gap-1 min-w-0">
      <span className={`text-[10px] font-medium ${lbl} whitespace-nowrap`}>{label}</span>
      {children}
    </div>
  );

  const Inp = ({
    value, onChange, w, red, placeholder,
  }: { value: string; onChange: (v: string) => void; w?: string; red?: boolean; placeholder?: string }) => (
    <input
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className={`rounded-lg border px-2 py-1.5 text-xs outline-none transition-colors ${w ?? 'w-full'}
        ${red
          ? 'border-rose-500/50 bg-rose-500/5 text-rose-400'
          : inp}`}
    />
  );

  const Sel = ({
    value, onChange, opts, w,
  }: { value: string; onChange: (v: string) => void; opts: string[]; w?: string }) => (
    <div className={`relative ${w ?? 'w-full'}`}>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className={`rounded-lg border px-2 py-1.5 pr-6 text-xs outline-none appearance-none w-full cursor-pointer ${inp}`}
      >
        {opts.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
      <ChevronDown size={11} className={`absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none ${sub}`} />
    </div>
  );

  const toggleRow = (id: number) => setSelectedRows(prev => {
    const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s;
  });

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
              <span className={`font-normal text-xs ${sub}`}>— создание</span>
            </span>
          </div>

          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-semibold transition-colors">
            <Check size={12} /> Провести и закрыть
          </button>
          <button className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${D ? 'border-gray-700 hover:bg-white/5' : 'border-gray-200 hover:bg-gray-100'}`}>
            <Check size={11} className="text-emerald-400" /> Провести
          </button>
          <button className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${D ? 'border-gray-700 hover:bg-white/5' : 'border-gray-200 hover:bg-gray-100'}`}>
            <Calculator size={11} className="text-blue-400" /> Прогноз прибыли
          </button>

          <div className="flex-1" />

          <button className={`flex items-center gap-1 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${D ? 'border-gray-700 hover:bg-white/5' : 'border-gray-200 hover:bg-gray-100'}`}>
            Все действия <ChevronDown size={10} className={sub} />
          </button>
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
            { id: 'postavshiki', label: 'Поставщики' },
            { id: 'vagon',       label: 'Вагон'       },
            { id: 'prodazha',    label: 'Продажа'     },
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

          {/* ── ПОСТАВЩИКИ ── */}
          {mainTab === 'postavshiki' && (
            <>
              {/* Row 1: basic info */}
              <div className={`rounded-xl border ${card} p-3`}>
                <div className="flex flex-wrap gap-3 items-end">

                  <Field label="Вид поступления">
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

                  <Field label="Цель прихода">
                    <Sel value={tselPrikh} onChange={setTselPrikh} opts={TSELI} w="w-32" />
                  </Field>

                  <Field label="N_Сч.фак">
                    <Inp value={nSchFak} onChange={setNSchFak} w="w-24" placeholder="—" />
                  </Field>

                  <Field label="Дата">
                    <Inp value={dataDoc} onChange={setDataDoc} w="w-28" />
                  </Field>

                  <Field label="Дата погашения">
                    <Inp value={dataPog} onChange={setDataPog} w="w-28" placeholder="—" />
                  </Field>

                  <Field label="Поставщик">
                    <Inp value={postavshik} onChange={setPostavshik} w="w-36" placeholder="Выберите..." />
                  </Field>

                  <Field label="Получатель">
                    <Inp value={poluchatel} onChange={setPoluchatel} w="w-44" />
                  </Field>

                  <Field label="Направление">
                    <Sel value={napravlenie} onChange={setNapravlenie} opts={NAPRAVL} w="w-24" />
                  </Field>

                  <Field label="Автор">
                    <Inp value={avtor} onChange={setAvtor} w="w-24" />
                  </Field>
                </div>
              </div>

              {/* Row 2: warehouse + payments */}
              <div className={`rounded-xl border ${card} p-3`}>
                <div className="flex flex-wrap gap-3 items-end">

                  <Field label="Склад">
                    <Sel value={sklad} onChange={setSklad} opts={SKLADY} w="w-36" />
                  </Field>

                  <Field label="Пер-е">
                    <Inp value={pere} onChange={setPere} w="w-20" />
                  </Field>

                  <Field label="Нал">
                    <Inp value={nal} onChange={setNal} w="w-20" />
                  </Field>

                  <Field label="Получ.нал">
                    <Inp value={poluchNal} onChange={setPoluchNal} w="w-20" />
                  </Field>

                  <Field label="Скидка пер">
                    <Inp value={skidkaPer} onChange={setSkidkaPer} w="w-20" red />
                  </Field>

                  <Field label="Скидка нал">
                    <Inp value={skidkaNal} onChange={setSkidkaNal} w="w-20" red />
                  </Field>

                  <Field label="К_оплате">
                    <div className={`px-2 py-1.5 rounded-lg border text-xs font-semibold tabular-nums w-28
                      ${D ? 'border-gray-700 bg-[#1a1a1a] text-emerald-400' : 'border-gray-200 bg-white text-emerald-600'}`}>
                      0.00
                    </div>
                  </Field>

                  <Field label="Сумма брак">
                    <div className={`px-2 py-1.5 rounded-lg border text-xs tabular-nums w-20 ${sub}
                      ${D ? 'border-gray-700 bg-[#1a1a1a]' : 'border-gray-200 bg-white'}`}>
                      0.00
                    </div>
                  </Field>

                  <Field label="Конт прайс">
                    <Sel value={kontPrays} onChange={setKontPrays} opts={['Нет', 'Да']} w="w-16" />
                  </Field>
                </div>
              </div>

              {/* ══ INNER TABS + TABLE ══ */}
              <div className={`rounded-xl border overflow-hidden ${D ? 'border-gray-800' : 'border-gray-200'}`}>

                {/* Tab bar */}
                <div className={`flex items-center border-b ${bdr} ${hdr} px-2`}>
                  {([
                    { id: 'tovary',    label: 'Товары'      },
                    { id: 'gruppy',    label: 'Группы'      },
                    { id: 'brendy',    label: 'Бренды'      },
                    { id: 'dop',       label: 'Доп расходы' },
                    { id: 'materialy', label: 'Материалы'   },
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
                  <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-semibold transition-colors">
                    <Plus size={11} /> Добавить
                  </button>
                  {[
                    { icon: <Trash2 size={11} />,    tip: 'Удалить' },
                    { icon: <ArrowUp size={11} />,   tip: 'Вверх'   },
                    { icon: <ArrowDown size={11} />, tip: 'Вниз'    },
                  ].map((b, i) => (
                    <button key={i} title={b.tip}
                      className={`p-1.5 rounded-lg border transition-colors ${D ? 'border-gray-700 hover:bg-white/5' : 'border-gray-200 hover:bg-gray-100'} ${sub}`}
                    >
                      {b.icon}
                    </button>
                  ))}
                  <div className={`w-px h-4 mx-1 ${D ? 'bg-gray-700' : 'bg-gray-200'}`} />
                  {[
                    { icon: <RefreshCw size={11} />, label: 'Заполнить', onClick: undefined },
                    { icon: <FileDown size={11} />,  label: 'Экспорт',   onClick: undefined },
                    { icon: <FileUp size={11} />,    label: 'Импорт',    onClick: handleImportClick },
                  ].map((b, i) => (
                    <button key={i} onClick={b.onClick}
                      className={`flex items-center gap-1 px-2 py-1.5 rounded-lg border text-xs font-medium transition-colors
                        ${b.label === 'Импорт'
                          ? D ? 'border-indigo-500/50 text-indigo-400 hover:bg-indigo-500/10' : 'border-indigo-300 text-indigo-600 hover:bg-indigo-50'
                          : D ? 'border-gray-700 hover:bg-white/5' : 'border-gray-200 hover:bg-gray-100'
                        } ${b.label !== 'Импорт' ? sub : ''}`}
                    >
                      {b.icon}
                      <span className="hidden sm:inline">{b.label}</span>
                    </button>
                  ))}
                  <div className="flex-1" />
                  <button className={`flex items-center gap-1 px-2 py-1.5 rounded-lg border text-xs font-medium transition-colors ${D ? 'border-gray-700 hover:bg-white/5' : 'border-gray-200 hover:bg-gray-100'} ${sub}`}>
                    Все действия <ChevronDown size={10} />
                  </button>
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
                            { k: 'N',           w: 'w-8'  },
                            { k: 'Товар',       w: ''     },
                            { k: 'Артикул',     w: 'w-24' },
                            { k: 'Кол-во',      w: 'w-20' },
                            { k: 'Кол.брак',    w: 'w-20' },
                            { k: 'Ед.изм',      w: 'w-16' },
                            { k: 'Цена пост.',  w: 'w-24' },
                            { k: '% скид',      w: 'w-16' },
                            { k: 'Цена прих.',  w: 'w-24' },
                            { k: 'Сумма',       w: 'w-28' },
                            { k: 'Вес (кг)',    w: 'w-18' },
                          ].map(h => (
                            <th key={h.k} className={`px-3 py-2.5 text-left font-semibold ${sub} whitespace-nowrap ${h.w}`}>
                              {h.k}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {items.length === 0 ? (
                          <tr>
                            <td colSpan={11}>
                              <div className={`flex flex-col items-center justify-center py-10 gap-2 ${sub}`}>
                                <Package size={22} className="opacity-25" />
                                <p>Товары не добавлены — нажмите «Добавить»</p>
                              </div>
                            </td>
                          </tr>
                        ) : items.map((r, i) => (
                          <tr
                            key={r.id}
                            onClick={() => toggleRow(r.id)}
                            className={`cursor-pointer border-b ${bdr} transition-colors ${
                              selectedRows.has(r.id)
                                ? D ? 'bg-indigo-500/10' : 'bg-indigo-50'
                                : D ? 'hover:bg-white/[0.02]' : 'hover:bg-gray-50'
                            }`}
                          >
                            <td className={`px-3 py-2 ${sub}`}>{i + 1}</td>
                            <td className="px-3 py-2 font-medium">{r.tovar}</td>
                            <td className={`px-3 py-2 tabular-nums ${sub}`}>{r.artikul}</td>
                            <td className="px-3 py-2 tabular-nums text-right font-semibold">{r.kolFakt}</td>
                            <td className={`px-3 py-2 tabular-nums text-right ${r.kolBrak > 0 ? 'text-rose-400 font-semibold' : sub}`}>
                              {r.kolBrak > 0 ? r.kolBrak : '—'}
                            </td>
                            <td className={`px-3 py-2 ${sub}`}>{r.upakovka}</td>
                            <td className="px-3 py-2 tabular-nums text-right">{r.tsenaPost.toLocaleString('ru-RU')}</td>
                            <td className={`px-3 py-2 tabular-nums text-right ${r.skid > 0 ? 'text-rose-400' : sub}`}>
                              {r.skid > 0 ? `${r.skid}%` : '—'}
                            </td>
                            <td className="px-3 py-2 tabular-nums text-right">{r.tsenaPriv.toLocaleString('ru-RU')}</td>
                            <td className="px-3 py-2 tabular-nums text-right font-semibold text-emerald-400">
                              {r.summa.toLocaleString('ru-RU')}
                            </td>
                            <td className={`px-3 py-2 tabular-nums text-right ${sub}`}>{r.ves}</td>
                          </tr>
                        ))}
                      </tbody>
                      {items.length > 0 && (
                        <tfoot>
                          <tr className={`border-t-2 ${D ? 'border-gray-700 bg-white/[0.03]' : 'border-gray-300 bg-gray-100'}`}>
                            <td colSpan={3} className="px-3 py-2 font-bold">Итого ({items.length})</td>
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
                    <p className="text-xs">Нет данных</p>
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
                <p className="text-sm font-semibold mb-1">Вагон</p>
                <p className={`text-xs ${sub}`}>Данные о вагоне не введены</p>
              </div>
            </div>
          )}

          {/* ── ПРОДАЖА ── */}
          {mainTab === 'prodazha' && (
            <div className="flex flex-col items-center justify-center py-16">
              <div className={`rounded-2xl border ${card} p-10 text-center max-w-xs w-full`}>
                <Tag size={28} className="mx-auto mb-3 text-emerald-400 opacity-50" />
                <p className="text-sm font-semibold mb-1">Продажа</p>
                <p className={`text-xs ${sub}`}>Настройки продажи не заданы</p>
              </div>
            </div>
          )}
        </div>

        {/* ══ BOTTOM STATUS BAR ══ */}
        <div className={`flex items-center justify-between px-4 py-2 border-t ${bdr} ${hdr} flex-shrink-0`}>
          <span className={`text-[11px] ${sub}`}>
            Статус: <span className="text-amber-400 font-semibold">Черновик</span>
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