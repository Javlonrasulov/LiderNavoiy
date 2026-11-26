import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent as ReactDragEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { createPortal } from 'react-dom';
import * as XLSX from 'xlsx';
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  GripVertical,
  Maximize2,
  Minimize2,
  Upload,
  X,
} from 'lucide-react';
import { api } from '../../api/client';

type ImportRow = {
  key: string;
  code: string;
  artikul: string;
  name: string;
  category: string;
  brand: string;
  price: number;
  unit: string;
  stock: number;
  selected: boolean;
};

type FailedImport = { row: ImportRow; error: string };

type ImportReport = {
  created: number;
  skippedExact: number;
  failed: number;
  aborted: boolean;
  files: number;
  remaining: number;
  companyId: string;
};

type Props = {
  D: boolean;
  defaultCompanyId?: string;
  orgOptions?: { id: string; label: string }[];
  /** Mavjud kategoriyalar (tanlash uchun) */
  categories?: { id: string; name: string }[];
  /** Mavjud brendlar */
  brands?: string[];
  onClose: () => void;
  onDone: () => void;
  t?: Record<string, string>;
};

type FieldKey = 'name' | 'artikul' | 'code' | 'brand' | 'category' | 'price' | 'unit' | 'stock';
type FieldMapping = Record<FieldKey, string | null>;

const IMPORT_FIELDS: {
  key: FieldKey;
  labelKey: string;
  fallback: string;
  required?: boolean;
  keywords: string[];
}[] = [
  {
    key: 'name',
    labelKey: 'prodExcelColName',
    fallback: 'Nomi',
    required: true,
    keywords: ['nomi', 'name', 'товар', 'tovar', 'mahsulot', 'маҳсулот', 'назван', 'наимен', 'product'],
  },
  {
    key: 'artikul',
    labelKey: 'prodExcelColArtikul',
    fallback: 'Artikul',
    keywords: ['артикул', 'artikul', 'sku', 'арт.', 'article'],
  },
  {
    key: 'code',
    labelKey: 'prodExcelColCode',
    fallback: 'Kod',
    keywords: ['kod', 'код', 'code'],
  },
  {
    key: 'brand',
    labelKey: 'prodExcelColBrand',
    fallback: 'Brend',
    keywords: ['brend', 'brand', 'бренд', 'марка'],
  },
  {
    key: 'category',
    labelKey: 'prodExcelColCategory',
    fallback: 'Kategoriya',
    keywords: ['kategoriya', 'category', 'группа', 'gruppa', 'категор', 'категория'],
  },
  {
    key: 'price',
    labelKey: 'prodExcelColPrice',
    fallback: 'Narx',
    keywords: ['narx', 'price', 'rtl', 'цена', 'narxi', 'сумма'],
  },
  {
    key: 'unit',
    labelKey: 'prodExcelColUnit',
    fallback: 'Birlik',
    keywords: ['birlik', 'unit', 'ед', 'единиц', 'dona', 'kg', 'шт'],
  },
  {
    key: 'stock',
    labelKey: 'prodExcelColStock',
    fallback: 'Qoldiq',
    keywords: ['qoldiq', 'stock', 'остаток', 'balance', 'количест', 'кол-во', 'miqdor', 'qty', 'quantity'],
  },
];

/** Sarlavha qatori uchun — qisqa kalitlar mahsulot nomiga yopishib qolmasin */
const HEADER_KEYWORDS: string[] = [
  'nomi', 'name', 'товар', 'tovar', 'mahsulot', 'маҳсулот', 'назван', 'наимен', 'product', 'наименование',
  'артикул', 'artikul', 'sku', 'article',
  'kod', 'код', 'code',
  'brend', 'brand', 'бренд', 'марка',
  'kategoriya', 'category', 'группа', 'gruppa', 'категор', 'категория',
  'narx', 'price', 'rtl', 'цена', 'narxi', 'сумма', 'стоимость',
  'birlik', 'unit', 'единиц', 'ед.изм', 'ед изм',
  'qoldiq', 'stock', 'остаток', 'balance', 'количест', 'miqdor', 'quantity',
];

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function cellMatchesHeaderKeyword(cell: string, keyword: string): boolean {
  const c = normHeader(cell);
  const k = normHeader(keyword);
  if (!c || !k) return false;
  if (c === k) return true;
  // Qisqa kalitlar faqat alohida so‘z sifatida (masalan "шт", "кг") —
  // "колбаса" ichidagi "кол" yoki "Шодлик" ichida tasodifiy match bo‘lmasin
  if (k.length <= 3) {
    return new RegExp(`(?:^|[\\s._\\-/(])${escapeRegExp(k)}(?:$|[\\s._\\-/)])`, 'i').test(c);
  }
  return c.includes(k);
}

function looksLikeSku(raw: string): boolean {
  const s = String(raw || '').trim();
  if (!s || s.length < 3 || s.length > 32) return false;
  // Harf+raqam aralash kodlar: ШДВК0033, TVBK0071, PR-101
  return /^(?=.*[A-Za-zА-Яа-яЁёЎўҚқҒғҲҳ])(?=.*\d)[A-Za-zА-Яа-яЁёЎўҚқҒғҲҳ0-9._\-]+$/.test(s);
}

function looksLikeDataRow(row: string[]): boolean {
  const cells = (row || []).map((c) => String(c ?? '').trim()).filter(Boolean);
  if (cells.length < 2) return false;
  const skuHits = cells.filter(looksLikeSku).length;
  const numHits = cells.filter((c) => {
    const n = Number(String(c).replace(/\s/g, '').replace(',', '.'));
    return Number.isFinite(n) && String(c).replace(/\s/g, '').length >= 1;
  }).length;
  // Kod + (nom yoki narx) — bu mahsulot qatori, sarlavha emas
  return skuHits >= 1 && (cells.length >= 2 || numHits >= 1);
}

function detectHeaderRow(sheet: string[][]): { idx: number; headerless: boolean } {
  let best = -1;
  let bestScore = 0;
  const limit = Math.min(sheet.length, 200);
  for (let i = 0; i < limit; i++) {
    const row = sheet[i] || [];
    const cells = row.map((c) => String(c ?? '').trim()).filter(Boolean);
    if (cells.length < 2) continue;
    let score = 0;
    for (const kw of HEADER_KEYWORDS) {
      if (cells.some((c) => cellMatchesHeaderKeyword(c, kw))) score += 1;
    }
    // Ma'lumot qatoriga o‘xshasa — sarlavha deb hisoblama
    if (looksLikeDataRow(row)) score -= 3;
    if (score > bestScore) {
      bestScore = score;
      best = i;
    }
  }
  // Kamida 2 ta ustun nomi mos kelishi kerak
  if (best >= 0 && bestScore >= 2) return { idx: best, headerless: false };

  // Sarlavhasiz fayl: birinchi to‘liq qator — ma'lumot (tashlab yuborilmaydi)
  for (let i = 0; i < Math.max(limit, sheet.length); i++) {
    const row = sheet[i] || [];
    if ((row || []).filter((c) => String(c ?? '').trim()).length >= 2) {
      return { idx: i, headerless: true };
    }
  }
  return { idx: -1, headerless: false };
}

const EMPTY_MAPPING: FieldMapping = {
  name: null,
  artikul: null,
  code: null,
  brand: null,
  category: null,
  price: null,
  unit: null,
  stock: null,
};

type SheetColumn = { key: string; label: string };
type RawSheet = {
  fileName: string;
  columns: SheetColumn[];
  data: string[][];
  dataStart: number;
};
type UnionColumn = SheetColumn & { sample: string };
type ColumnDrag = { key: string; from: FieldKey | null };

function normHeader(h: string): string {
  return String(h || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[ё]/g, 'е')
    .trim();
}

function buildSheetColumns(header: string[], width: number): SheetColumn[] {
  const seen = new Set<string>();
  const cols: SheetColumn[] = [];
  for (let i = 0; i < width; i++) {
    const raw = String(header[i] ?? '').trim();
    const label = raw || `Ustun ${i + 1}`;
    let key = normHeader(raw) || `#${i + 1}`;
    if (seen.has(key)) key = `${key}#${i + 1}`;
    seen.add(key);
    cols.push({ key, label });
  }
  return cols;
}

function unionColumns(list: RawSheet[]): UnionColumn[] {
  const map = new Map<string, UnionColumn>();
  for (const s of list) {
    s.columns.forEach((c, idx) => {
      const existing = map.get(c.key);
      if (existing && existing.sample) return;
      const sample = s.data.map((r) => String(r[idx] ?? '').trim()).find(Boolean) ?? '';
      map.set(c.key, { ...c, sample });
    });
  }
  return Array.from(map.values());
}

function inferFieldFromSample(sample: string, label: string): FieldKey | null {
  const s = String(sample || '').trim();
  const lab = normHeader(label);
  if (!s && !lab) return null;
  for (const f of IMPORT_FIELDS) {
    if (f.keywords.some((k) => lab.includes(k) || cellMatchesHeaderKeyword(lab, k))) return f.key;
  }
  if (looksLikeSku(s)) return 'artikul';
  const asNum = Number(String(s).replace(/\s/g, '').replace(',', '.'));
  if (Number.isFinite(asNum) && asNum > 0 && !looksLikeSku(s) && s.length <= 16) return 'price';
  if (s.length >= 4) return 'name';
  return null;
}

function autoMap(columns: UnionColumn[], current: FieldMapping): FieldMapping {
  const keys = new Set(columns.map((c) => c.key));
  const next: FieldMapping = { ...EMPTY_MAPPING };
  const used = new Set<string>();
  for (const f of IMPORT_FIELDS) {
    const kept = current[f.key];
    if (kept && keys.has(kept)) {
      next[f.key] = kept;
      used.add(kept);
    }
  }
  for (const f of IMPORT_FIELDS) {
    if (next[f.key]) continue;
    const hit = columns.find(
      (c) => !used.has(c.key) && !c.key.startsWith('#') && f.keywords.some((k) => c.key.includes(k)),
    );
    if (hit) {
      next[f.key] = hit.key;
      used.add(hit.key);
    }
  }
  // Sarlavhasiz / "Ustun N" ustunlari — namuna qiymatidan taxmin
  for (const c of columns) {
    if (used.has(c.key)) continue;
    const guessed = inferFieldFromSample(c.sample, c.label);
    if (!guessed || next[guessed]) continue;
    next[guessed] = c.key;
    used.add(c.key);
  }
  // Kod yo‘q bo‘lsa — artikuldan foydalaniladi (buildRowsFromMapping ichida)
  if (!next.code && next.artikul) next.code = next.artikul;
  if (!next.artikul && next.code) next.artikul = next.code;
  return next;
}

function parseNumber(raw: string): number {
  if (!raw) return 0;
  const cleaned = String(raw)
    .replace(/\s/g, '')
    .replace(/[^\d,.\-]/g, '')
    .replace(',', '.');
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

const UNIT_IDS = ['dona', 'kg'] as const;

function UnitToggle({
  value,
  onChange,
  D,
  size = 'md',
  labelOf,
}: {
  value: string;
  onChange: (v: string) => void;
  D: boolean;
  size?: 'sm' | 'md';
  labelOf?: (id: string) => string;
}) {
  const h = size === 'sm' ? 'h-6' : 'h-8';
  const text = size === 'sm' ? 'text-[10px]' : 'text-xs';
  const pad = size === 'sm' ? 'px-2' : 'px-2.5';
  return (
    <div
      className={`inline-flex rounded-xl overflow-hidden border ${
        D ? 'border-gray-700' : 'border-gray-200'
      }`}
    >
      {UNIT_IDS.map((id) => {
        const active = (value || 'dona') === id;
        const label = labelOf ? labelOf(id) : id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            className={`${h} ${pad} ${text} font-semibold transition-colors ${
              active
                ? 'bg-indigo-600 text-white'
                : D
                  ? 'bg-[#121212] text-gray-400 hover:bg-gray-800 hover:text-gray-200'
                  : 'bg-white text-gray-500 hover:bg-gray-50 hover:text-gray-800'
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

function parseUnit(raw: string): string {
  const u = normHeader(raw);
  if (!u) return '';
  if (u.includes('kg') || u.includes('кг') || u.includes('кило')) return 'kg';
  if (u.includes('g') || u.includes('гр') || u.includes('г.')) return 'kg';
  if (u.includes('dona') || u.includes('шт') || u.includes('dona') || u.includes('штуч')) return 'dona';
  return 'dona';
}

function uniqueCode(base: string, used: Set<string>): string {
  let code = (base || `PR${Date.now().toString(36).slice(-6)}`).trim() || `PR${Date.now().toString(36).slice(-6)}`;
  if (!used.has(code.toLowerCase())) {
    used.add(code.toLowerCase());
    return code;
  }
  let i = 2;
  while (used.has(`${code}-${i}`.toLowerCase())) i += 1;
  const next = `${code}-${i}`;
  used.add(next.toLowerCase());
  return next;
}

export function ProductExcelImportModal({
  D,
  defaultCompanyId = '',
  orgOptions = [],
  categories = [],
  brands = [],
  onClose,
  onDone,
  t = {},
}: Props) {
  const tr = (key: string, fb: string) => t[key] ?? fb;
  const unitLabel = (id: string) => {
    if (id === 'dona') return tr('prodExcelUnitDona', tr('pieces', 'dona'));
    if (id === 'kg') return tr('prodExcelUnitKg', 'kg');
    return id;
  };
  const orgs = orgOptions;

  const text = D ? 'text-white' : 'text-gray-900';
  const sub = D ? 'text-gray-400' : 'text-gray-500';

  const [companyId, setCompanyId] = useState(() => {
    if (defaultCompanyId && defaultCompanyId !== 'all') return defaultCompanyId;
    return orgOptions[0]?.id ?? '';
  });
  const [defaultBrand, setDefaultBrand] = useState('');
  const [defaultCategory, setDefaultCategory] = useState('');
  const [defaultUnit, setDefaultUnit] = useState('dona');
  const [orgMenuOpen, setOrgMenuOpen] = useState(false);
  const [brandMenuOpen, setBrandMenuOpen] = useState(false);
  const [catMenuOpen, setCatMenuOpen] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [parseBusy, setParseBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState('');
  const [sheets, setSheets] = useState<RawSheet[]>([]);
  const [loadedFiles, setLoadedFiles] = useState<string[]>([]);
  const [mapping, setMapping] = useState<FieldMapping>(EMPTY_MAPPING);
  const [mappingStep, setMappingStep] = useState(false);
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [importedKeys, setImportedKeys] = useState<Set<string>>(new Set());
  const [skipExactDuplicates, setSkipExactDuplicates] = useState(true);
  const [importReport, setImportReport] = useState<ImportReport | null>(null);
  const [failedImports, setFailedImports] = useState<FailedImport[]>([]);
  const [drag, setDrag] = useState<ColumnDrag | null>(null);
  const [dropTarget, setDropTarget] = useState<FieldKey | 'pool' | null>(null);
  const [picked, setPicked] = useState<ColumnDrag | null>(null);
  const [mapEdges, setMapEdges] = useState({ left: false, right: false });

  const fileRef = useRef<HTMLInputElement>(null);
  const mapScrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef(false);
  const panRef = useRef<{ x: number; left: number } | null>(null);

  const excelColumns = useMemo(() => unionColumns(sheets), [sheets]);
  const unusedColumns = useMemo(() => {
    const used = new Set(Object.values(mapping).filter(Boolean));
    return excelColumns.filter((c) => !used.has(c.key));
  }, [excelColumns, mapping]);
  const selectedCount = useMemo(() => rows.filter((r) => r.selected).length, [rows]);
  const selectedOrg = orgs.find((o) => o.id === companyId);

  useEffect(() => {
    if (orgs.length === 0) return;
    if (!orgs.some((o) => o.id === companyId)) {
      const next =
        (defaultCompanyId && orgs.some((o) => o.id === defaultCompanyId) && defaultCompanyId)
        || orgs[0].id;
      setCompanyId(next);
    }
  }, [orgs, companyId, defaultCompanyId]);

  const updateMapEdges = () => {
    const el = mapScrollRef.current;
    if (!el) return;
    setMapEdges({
      left: el.scrollLeft > 4,
      right: el.scrollLeft + el.clientWidth < el.scrollWidth - 4,
    });
  };

  useEffect(() => {
    updateMapEdges();
  }, [mappingStep, excelColumns.length]);

  const scrollMap = (dir: -1 | 1) => {
    mapScrollRef.current?.scrollBy({ left: dir * 160, behavior: 'smooth' });
  };

  const onMapPointerDown = (e: ReactPointerEvent) => {
    const el = mapScrollRef.current;
    if (!el || e.button !== 0) return;
    panRef.current = { x: e.clientX, left: el.scrollLeft };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };
  const onMapPointerMove = (e: ReactPointerEvent) => {
    const el = mapScrollRef.current;
    const pan = panRef.current;
    if (!el || !pan) return;
    el.scrollLeft = pan.left - (e.clientX - pan.x);
    updateMapEdges();
  };
  const endPan = () => {
    panRef.current = null;
  };

  const readRawSheet = (sheet: string[][], fileName: string): RawSheet => {
    const detected = detectHeaderRow(sheet);
    if (detected.idx < 0) {
      throw new Error(`${fileName}: ${tr('prodExcelNoHeader', 'jadval sarlavhasi (ustun nomlari) topilmadi.')}`);
    }
    const hdrIdx = detected.idx;
    const headerless = detected.headerless;
    // Sarlavhasiz faylda birinchi qator ham mahsulot — tashlab yuborilmaydi
    const data = sheet
      .slice(headerless ? hdrIdx : hdrIdx + 1)
      .map((r) => (r || []).map((c) => String(c ?? '')));
    const width = Math.max(
      (sheet[hdrIdx] || []).length,
      ...data.slice(0, 80).map((r) => r.length),
      1,
    );
    if (!data.some((r) => r.some((c) => c.trim()))) {
      throw new Error(`${fileName}: ${tr('prodExcelNoRows', "Excel'da mahsulot qatorlari topilmadi.")}`);
    }
    const headerRow = headerless ? Array.from({ length: width }, () => '') : (sheet[hdrIdx] || []);
    return {
      fileName,
      columns: buildSheetColumns(headerRow, width),
      data,
      dataStart: headerless ? hdrIdx : hdrIdx + 1,
    };
  };

  const buildRowsFromMapping = (list: RawSheet[], map: FieldMapping): ImportRow[] => {
    const out: ImportRow[] = [];
    const usedCodes = new Set<string>();
    for (const s of list) {
      const idx = (f: FieldKey) => {
        const k = map[f];
        return k ? s.columns.findIndex((c) => c.key === k) : -1;
      };
      const cName = idx('name');
      if (cName < 0) continue;
      const cell = (r: string[], f: FieldKey) => {
        const i = idx(f);
        return i >= 0 ? String(r[i] ?? '').trim() : '';
      };
      s.data.forEach((r, ri) => {
        const name = String(r[cName] ?? '').trim();
        if (!name || /итого|всего|жами/i.test(name)) return;
        const rawArtikul = cell(r, 'artikul');
        const rawCode = cell(r, 'code');
        const artikul = rawArtikul || rawCode;
        const code = uniqueCode(artikul || rawCode, usedCodes);
        out.push({
          key: `${s.fileName}::${s.dataStart + ri}-${rawArtikul || rawCode || code}-${name}`,
          code,
          artikul: artikul || code,
          name,
          category: cell(r, 'category'),
          brand: cell(r, 'brand'),
          price: parseNumber(cell(r, 'price')),
          unit: parseUnit(cell(r, 'unit')),
          stock: parseNumber(cell(r, 'stock')),
          selected: true,
        });
      });
    }
    return out;
  };

  const parseFiles = useCallback(
    async (fileList: FileList | File[]) => {
      const files = Array.from(fileList).filter((f) => f && f.size >= 0);
      if (files.length === 0) {
        setError(tr('prodExcelNoFiles', 'Excel fayl tanlang.'));
        return;
      }
      setError(null);
      setImportReport(null);
      setFailedImports([]);
      setParseBusy(true);
      setProgress(tr('prodExcelReading', "Excel o'qilmoqda…"));
      try {
        const newSheets: RawSheet[] = [];
        const newNames: string[] = [];
        const fileErrors: string[] = [];

        for (let fi = 0; fi < files.length; fi++) {
          const file = files[fi];
          setProgress(`${tr('prodExcelReading', "Excel o'qilmoqda…")} ${fi + 1}/${files.length}: ${file.name}`);
          try {
            const buf = await file.arrayBuffer();
            const wb = XLSX.read(buf, { type: 'array' });
            const sheetName = wb.SheetNames[0];
            if (!sheetName || !wb.Sheets[sheetName]) {
              throw new Error(`${file.name}: varaq topilmadi`);
            }
            const ws = wb.Sheets[sheetName];
            const sheet = XLSX.utils.sheet_to_json<string[]>(ws, {
              header: 1,
              defval: '',
              raw: false,
              blankrows: true,
            }) as string[][];
            newSheets.push(readRawSheet(sheet, file.name));
            newNames.push(file.name);
          } catch (e) {
            fileErrors.push(e instanceof Error ? e.message : String(e));
          }
        }

        if (newSheets.length === 0) {
          setError(fileErrors.join('\n') || tr('prodExcelNoRows', "Excel'da mahsulot qatorlari topilmadi."));
          setProgress('');
          return;
        }

        const newSet = new Set(newSheets.map((s) => s.fileName));
        const merged = [...sheets.filter((s) => !newSet.has(s.fileName)), ...newSheets];
        setSheets(merged);
        const nextMap = autoMap(unionColumns(merged), mapping);
        if (defaultCategory.trim()) nextMap.category = null;
        setMapping(nextMap);
        setMappingStep(true);
        setPicked(null);
        setLoadedFiles((prev) => {
          const set = new Set(prev);
          for (const n of newNames) set.add(n);
          return Array.from(set);
        });
        setProgress(`${newNames.length} ${tr('prodExcelFileWord', 'fayl')} · ${tr('prodExcelMapNext', 'ustunlarni moslang')}`);
        if (fileErrors.length > 0) setError(fileErrors.join('\n'));
      } catch (e) {
        setError(e instanceof Error ? e.message : tr('prodExcelReadError', "Excel o'qishda xatolik"));
        setProgress('');
      } finally {
        setParseBusy(false);
      }
    },
    [sheets, mapping, defaultCategory, t],
  );

  const moveColumn = (target: FieldKey | null, src: ColumnDrag) => {
    setMapping((prev) => {
      const next = { ...prev };
      if (target === null) {
        if (src.from) next[src.from] = null;
        return next;
      }
      const displaced = next[target];
      for (const f of IMPORT_FIELDS) if (next[f.key] === src.key) next[f.key] = null;
      next[target] = src.key;
      if (src.from && src.from !== target) next[src.from] = displaced;
      return next;
    });
    setPicked(null);
    setDrag(null);
    setDropTarget(null);
  };

  const clearField = (field: FieldKey) => {
    setMapping((prev) => ({ ...prev, [field]: null }));
    setPicked(null);
  };

  const readDrag = (e: ReactDragEvent): ColumnDrag | null => {
    try {
      const v = JSON.parse(e.dataTransfer.getData('text/plain')) as ColumnDrag;
      if (v && typeof v.key === 'string') return v;
    } catch {
      /* ignore */
    }
    return drag;
  };

  const startDrag = (e: ReactDragEvent, src: ColumnDrag) => {
    e.dataTransfer.setData('text/plain', JSON.stringify(src));
    e.dataTransfer.effectAllowed = 'move';
    setDrag(src);
  };

  const endDrag = () => {
    setDrag(null);
    setDropTarget(null);
  };

  const autoScrollOnDrag = (e: ReactDragEvent) => {
    const el = mapScrollRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const edge = 60;
    if (e.clientX < rect.left + edge) el.scrollLeft -= 18;
    else if (e.clientX > rect.right - edge) el.scrollLeft += 18;
  };

  const applyMapping = () => {
    if (!mapping.name) {
      setError(tr('prodExcelMapNameRequired', '«Nomi» maydoniga Excel ustunini belgilang.'));
      return;
    }
    const built = buildRowsFromMapping(sheets, mapping).filter((r) => !importedKeys.has(r.key));
    if (built.length === 0) {
      setError(tr('prodExcelNoRows', "Excel'da mahsulot qatorlari topilmadi."));
      return;
    }
    const prevSel = new Map(rows.map((r) => [r.key, r.selected]));
    const prevUnit = new Map(rows.map((r) => [r.key, r.unit]));
    setRows(built.map((r) => ({
      ...r,
      unit: r.unit || prevUnit.get(r.key) || defaultUnit || 'dona',
      selected: prevSel.get(r.key) ?? true,
    })));
    setMappingStep(false);
    setError(null);
    setProgress(`${sheets.length} ${tr('prodExcelFileWord', 'fayl')} · ${built.length} ${tr('prodExcelRowsLoaded', 'qator yuklandi')}`);
  };

  const clearLoaded = () => {
    setRows([]);
    setSheets([]);
    setImportedKeys(new Set());
    setMappingStep(false);
    setLoadedFiles([]);
    setFailedImports([]);
    setImportReport(null);
    setError(null);
    setProgress('');
    setMapping(EMPTY_MAPPING);
  };

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  const createProductWithRetry = async (
    body: Parameters<typeof api.createProduct>[0],
    tries = 5,
  ) => {
    let lastErr: unknown;
    for (let attempt = 1; attempt <= tries; attempt++) {
      try {
        return await api.createProduct(body);
      } catch (e) {
        lastErr = e;
        const msg = e instanceof Error ? e.message : String(e);
        const is429 = /429|too many requests|throttler/i.test(msg);
        if (/unique|duplicate|already exists|allaqachon mavjud|409/i.test(msg) && !is429) {
          throw e;
        }
        if (!is429 || attempt === tries) throw e;
        setProgress(`${tr('prodExcelRateLimit', "Kutish (juda ko'p so'rov)…")} ${attempt}/${tries}`);
        await sleep(1500 * attempt);
      }
    }
    throw lastErr;
  };

  const runImport = async () => {
    if (!companyId || !orgs.some((o) => o.id === companyId)) {
      setError(tr('prodExcelPickOrg', 'Tashkilotni tanlang'));
      return;
    }
    const selected = rows.filter((r) => r.selected);
    if (selected.length === 0) {
      setError(tr('prodExcelNoneSelected', 'Kamida bitta qatorni belgilang.'));
      return;
    }
    const missingBrandCat = selected.some(
      (r) => !(r.brand.trim() || defaultBrand.trim()) || !defaultCategory.trim(),
    );
    if (!defaultCategory.trim()) {
      setError(
        tr(
          'prodExcelCategoryRequired',
          'Yuqoridan kategoriyani tanlang — Excel’dagi kategoriya ustuni hisobga olinmaydi.',
        ),
      );
      return;
    }
    if (missingBrandCat) {
      setError(
        tr(
          'prodExcelBrandCatRequired',
          'Har bir mahsulot uchun Brend kerak — yuqoridan tanlang yoki Excel ustunini moslang.',
        ),
      );
      return;
    }
    abortRef.current = false;
    setBusy(true);
    setError(null);
    setFailedImports([]);
    setImportReport(null);

    let created = 0;
    let skippedExact = 0;
    let failed = 0;
    const failedList: FailedImport[] = [];
    const doneKeys = new Set<string>();

    try {
      setProgress(tr('prodExcelLoadingMeta', 'Mavjud mahsulotlar yuklanmoqda…'));
      const existing = await api.getProducts(undefined, companyId);
      const byCode = new Map(existing.map((p) => [p.code.trim().toLowerCase(), p]));
      const byName = new Map(existing.map((p) => [p.name.trim().toLowerCase(), p]));

      for (let i = 0; i < selected.length; i++) {
        if (abortRef.current) break;
        const row = selected[i];
        setProgress(`${tr('prodExcelBusy', 'Yuklanmoqda…')} ${i + 1}/${selected.length}: ${row.name}`);

        const brand = row.brand.trim() || defaultBrand.trim();
        // Yuqoridagi kategoriya ustunlik — Excel kategoriya ustuni e'tiborga olinmaydi
        const category = defaultCategory.trim();
        const code = row.artikul.trim() || row.code;
        const codeKey = code.trim().toLowerCase();
        const nameKey = row.name.trim().toLowerCase();
        const exact = byCode.get(codeKey) ?? byName.get(nameKey);
        if (exact && skipExactDuplicates) {
          skippedExact += 1;
          doneKeys.add(row.key);
          continue;
        }

        try {
          const createdProduct = await createProductWithRetry({
            companyId,
            code,
            name: row.name,
            category: category || undefined,
            brand: brand || undefined,
            price: row.price,
            unit: row.unit || defaultUnit || 'dona',
            stockBalance: row.stock,
          });
          created += 1;
          doneKeys.add(row.key);
          byCode.set(createdProduct.code.trim().toLowerCase(), createdProduct);
          byName.set(createdProduct.name.trim().toLowerCase(), createdProduct);
        } catch (e) {
          failed += 1;
          failedList.push({
            row,
            error: e instanceof Error ? e.message : String(e),
          });
          doneKeys.add(row.key);
        }
      }

      const remaining = selected.filter((r) => !doneKeys.has(r.key)).length;
      setImportedKeys((prev) => {
        const next = new Set(prev);
        for (const k of doneKeys) next.add(k);
        return next;
      });
      setRows((prev) => prev.filter((r) => !doneKeys.has(r.key)));
      setFailedImports(failedList);
      setImportReport({
        created,
        skippedExact,
        failed,
        aborted: abortRef.current,
        files: sheets.length,
        remaining,
        companyId,
      });
      setProgress('');
      if (created > 0) onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setProgress('');
    } finally {
      setBusy(false);
    }
  };

  const modal = (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center p-3 sm:p-4"
      style={{ background: 'rgba(0,0,0,0.55)' }}
      onClick={() => {
        if (!busy && !parseBusy) onClose();
      }}
    >
      <div
        className={`w-full flex flex-col border shadow-2xl overflow-hidden ${
          D ? 'bg-[#1c1c1e] border-gray-700' : 'bg-white border-gray-200'
        } ${
          fullscreen
            ? 'h-full max-w-none rounded-none'
            : 'max-w-4xl max-h-[calc(100dvh-1.5rem)] sm:max-h-[calc(100dvh-2rem)] rounded-2xl'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-5 py-4 border-b border-inherit flex-shrink-0">
          <FileSpreadsheet size={18} className="text-emerald-500" />
          <div className="flex-1 min-w-0">
            <p className={`text-base font-bold ${text}`}>
              {tr('prodExcelTitle', "Excel'dan mahsulot yuklash")}
            </p>
            <p className={`text-xs ${sub}`}>
              {tr('prodExcelHint', 'Nomi, Kod, Kategoriya, Brend, Narx, Birlik, Qoldiq')}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setFullscreen((v) => !v)}
            className={`w-8 h-8 rounded-lg flex items-center justify-center ${sub} ${
              D ? 'hover:bg-gray-800' : 'hover:bg-gray-100'
            }`}
          >
            {fullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className={`w-8 h-8 rounded-lg flex items-center justify-center ${sub} ${
              D ? 'hover:bg-gray-800' : 'hover:bg-gray-100'
            }`}
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-5 py-4 overflow-y-auto flex-1 min-h-0 space-y-3">
          <div>
            <label className={`block text-xs font-semibold mb-1.5 ${sub}`}>
              {tr('prodExcelOrgLabel', 'Tashkilot')} *
            </label>
            <div className="relative">
              <button
                type="button"
                disabled={busy}
                onClick={() => setOrgMenuOpen((v) => !v)}
                className={`w-full h-10 rounded-xl border px-3 flex items-center gap-2 text-sm text-left transition-colors disabled:opacity-50 ${
                  orgMenuOpen
                    ? 'border-indigo-500 ring-2 ring-indigo-500/20'
                    : D
                      ? 'border-gray-700 hover:border-indigo-500/50'
                      : 'border-gray-200 hover:border-indigo-300'
                } ${D ? 'bg-[#121212]' : 'bg-white'}`}
              >
                <span className={`flex-1 truncate font-semibold ${text}`}>
                  {selectedOrg?.label
                    ?? (orgs.length === 0
                      ? tr('prodExcelNoOrgs', 'Organizatsiya topilmadi')
                      : tr('prodExcelPickOrg', 'Tashkilotni tanlang'))}
                </span>
                <ChevronDown
                  size={14}
                  className={`flex-shrink-0 transition-transform ${sub} ${orgMenuOpen ? 'rotate-180' : ''}`}
                />
              </button>
              {orgMenuOpen && (
                <>
                  <div className="fixed inset-0 z-[80]" onClick={() => setOrgMenuOpen(false)} />
                  <div
                    className={`absolute left-0 right-0 top-full mt-1.5 z-[81] max-h-64 overflow-y-auto rounded-2xl border shadow-2xl py-1.5 ${
                      D
                        ? 'bg-[#1a1a1a] border-gray-700 shadow-black/50'
                        : 'bg-white border-gray-100 shadow-gray-300/50'
                    }`}
                  >
                    {orgs.map((o) => {
                      const active = o.id === companyId;
                      return (
                        <button
                          key={o.id}
                          type="button"
                          onClick={() => {
                            setCompanyId(o.id);
                            setOrgMenuOpen(false);
                          }}
                          className={`w-full flex items-center gap-2 px-3 py-2 text-left text-sm transition-colors ${
                            active
                              ? D
                                ? 'bg-indigo-500/20 text-indigo-300 font-semibold'
                                : 'bg-indigo-50 text-indigo-700 font-semibold'
                              : D
                                ? 'text-gray-300 hover:bg-white/5'
                                : 'text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          <span className="flex-1 truncate">{o.label}</span>
                          {active && <Check size={13} className="text-indigo-400 flex-shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>

          <div
            className={`rounded-xl border px-3 py-2.5 text-xs leading-relaxed ${
              D
                ? 'border-indigo-500/30 bg-indigo-500/10 text-indigo-100'
                : 'border-indigo-200 bg-indigo-50 text-indigo-900'
            }`}
          >
            {tr(
              'prodExcelOrgHint',
              "Tuzilma: Brend → Kategoriya → Mahsulot. Kategoriya yuqoridan tanlanadi — Excel’dagi kategoriya ustuni hisobga olinmaydi.",
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={`block text-xs font-semibold mb-1.5 ${sub}`}>
                {tr('prodExcelDefaultBrand', 'Brend')} *
              </label>
              <div className="relative">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => { setBrandMenuOpen((v) => !v); setCatMenuOpen(false); }}
                  className={`w-full h-10 rounded-xl border px-3 flex items-center gap-2 text-sm text-left ${
                    D ? 'border-gray-700 bg-[#121212]' : 'border-gray-200 bg-white'
                  }`}
                >
                  <span className={`flex-1 truncate ${defaultBrand ? `font-semibold ${text}` : sub}`}>
                    {defaultBrand || tr('prodExcelPickBrand', 'Brendni tanlang / yozing')}
                  </span>
                  <ChevronDown size={14} className={sub} />
                </button>
                {brandMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-[80]" onClick={() => setBrandMenuOpen(false)} />
                    <div className={`absolute left-0 right-0 top-full mt-1.5 z-[81] max-h-56 overflow-y-auto rounded-2xl border shadow-2xl py-1.5 ${
                      D ? 'bg-[#1a1a1a] border-gray-700' : 'bg-white border-gray-100'
                    }`}>
                      <div className="px-2 pb-1.5">
                        <input
                          value={defaultBrand}
                          onChange={(e) => setDefaultBrand(e.target.value)}
                          placeholder={tr('prodExcelBrandPh', 'Yangi brend...')}
                          className={`w-full h-9 rounded-lg border px-2.5 text-sm outline-none ${
                            D ? 'bg-[#121212] border-gray-700 text-white' : 'bg-gray-50 border-gray-200'
                          }`}
                        />
                      </div>
                      {brands.map((b) => (
                        <button
                          key={b}
                          type="button"
                          onClick={() => { setDefaultBrand(b); setBrandMenuOpen(false); }}
                          className={`w-full px-3 py-2 text-left text-sm ${
                            defaultBrand === b
                              ? 'bg-indigo-500/15 text-indigo-400 font-semibold'
                              : D ? 'text-gray-300 hover:bg-white/5' : 'text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          {b}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
            <div>
              <label className={`block text-xs font-semibold mb-1.5 ${sub}`}>
                {tr('prodExcelDefaultCategory', 'Kategoriya')} *
              </label>
              <div className="relative">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => { setCatMenuOpen((v) => !v); setBrandMenuOpen(false); }}
                  className={`w-full h-10 rounded-xl border px-3 flex items-center gap-2 text-sm text-left ${
                    D ? 'border-gray-700 bg-[#121212]' : 'border-gray-200 bg-white'
                  }`}
                >
                  <span className={`flex-1 truncate ${defaultCategory ? `font-semibold ${text}` : sub}`}>
                    {defaultCategory || tr('prodExcelPickCategory', 'Kategoriyani tanlang')}
                  </span>
                  <ChevronDown size={14} className={sub} />
                </button>
                {catMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-[80]" onClick={() => setCatMenuOpen(false)} />
                    <div className={`absolute left-0 right-0 top-full mt-1.5 z-[81] max-h-56 overflow-y-auto rounded-2xl border shadow-2xl py-1.5 ${
                      D ? 'bg-[#1a1a1a] border-gray-700' : 'bg-white border-gray-100'
                    }`}>
                      {categories.length === 0 ? (
                        <p className={`px-3 py-2 text-xs ${sub}`}>
                          {tr('prodExcelNoCategories', "Kategoriya yo'q — avval yarating yoki Excel'dan moslang")}
                        </p>
                      ) : (
                        categories.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => {
                              setDefaultCategory(c.name);
                              setMapping((m) => ({ ...m, category: null }));
                              setCatMenuOpen(false);
                            }}
                            className={`w-full px-3 py-2 text-left text-sm ${
                              defaultCategory === c.name
                                ? 'bg-indigo-500/15 text-indigo-400 font-semibold'
                                : D ? 'text-gray-300 hover:bg-white/5' : 'text-gray-700 hover:bg-gray-50'
                            }`}
                          >
                            {c.name}
                          </button>
                        ))
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
            multiple
            className="hidden"
            onChange={(e) => {
              const list = e.target.files;
              if (!list || list.length === 0) return;
              const files = Array.from(list);
              e.target.value = '';
              void parseFiles(files);
            }}
          />
          <button
            type="button"
            disabled={busy || parseBusy}
            onClick={() => fileRef.current?.click()}
            className={`w-full h-11 rounded-xl border border-dashed flex items-center justify-center gap-2 text-sm font-semibold ${
              D
                ? 'border-gray-600 text-gray-300 hover:bg-gray-800'
                : 'border-gray-300 text-gray-700 hover:bg-gray-50'
            } disabled:opacity-50`}
          >
            <Upload size={16} />{' '}
            {parseBusy
              ? tr('prodExcelReading', "Excel o'qilmoqda…")
              : loadedFiles.length > 0
                ? tr('prodExcelPickMore', "Yana Excel qo'shish (.xlsx)")
                : tr('prodExcelPick', 'Excel fayllarni tanlash (.xlsx)')}
          </button>

          {loadedFiles.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              {loadedFiles.map((name) => (
                <span
                  key={name}
                  className={`inline-flex items-center gap-1.5 max-w-full truncate rounded-lg px-2.5 py-1 text-xs font-medium ${
                    D ? 'bg-emerald-500/15 text-emerald-300' : 'bg-emerald-50 text-emerald-800'
                  }`}
                  title={name}
                >
                  <FileSpreadsheet size={12} className="flex-shrink-0" />
                  <span className="truncate">{name}</span>
                </span>
              ))}
              <button
                type="button"
                disabled={busy}
                onClick={clearLoaded}
                className={`text-xs font-semibold ${sub} hover:underline disabled:opacity-50`}
              >
                {tr('prodExcelClearFiles', 'Tozalash')}
              </button>
              {!mappingStep && sheets.length > 0 && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setMappingStep(true)}
                  className="text-xs font-semibold text-indigo-500 hover:underline disabled:opacity-50"
                >
                  {tr('prodExcelRemap', 'Ustunlarni qayta moslash')}
                </button>
              )}
            </div>
          )}

          {mappingStep && sheets.length > 0 && (
            <div
              className={`rounded-xl border p-3 space-y-3 ${
                D ? 'border-indigo-500/40 bg-indigo-500/5' : 'border-indigo-200 bg-indigo-50/40'
              }`}
            >
              <div>
                <p className={`text-sm font-bold ${text}`}>
                  {tr('prodExcelMapTitle', 'Ustunlarni moslash')}
                </p>
                <p className={`text-xs mt-0.5 ${sub}`}>
                  {tr(
                    'prodExcelMapHint',
                    "Har bir tizim ustuni tagidagi Excel ustunining ma'lumotlari o'sha ustunga yoziladi. Noto'g'risini boshqa ustun tagiga suring, keraksizini × bilan olib tashlang.",
                  )}
                </p>
              </div>

              <div className="relative">
                {mapEdges.left && (
                  <button
                    type="button"
                    onClick={() => scrollMap(-1)}
                    className={`absolute left-0 top-0 bottom-3 z-10 w-9 flex items-center justify-start pl-1 rounded-l-lg bg-gradient-to-r ${
                      D
                        ? 'from-[#1a1a2e] via-[#1a1a2e]/80 to-transparent text-gray-200'
                        : 'from-indigo-50 via-indigo-50/80 to-transparent text-gray-700'
                    }`}
                  >
                    <span
                      className={`w-7 h-7 rounded-full flex items-center justify-center shadow ${
                        D ? 'bg-gray-800' : 'bg-white'
                      }`}
                    >
                      <ChevronLeft size={16} />
                    </span>
                  </button>
                )}
                {mapEdges.right && (
                  <button
                    type="button"
                    onClick={() => scrollMap(1)}
                    className={`absolute right-0 top-0 bottom-3 z-10 w-9 flex items-center justify-end pr-1 rounded-r-lg bg-gradient-to-l ${
                      D
                        ? 'from-[#1a1a2e] via-[#1a1a2e]/80 to-transparent text-gray-200'
                        : 'from-indigo-50 via-indigo-50/80 to-transparent text-gray-700'
                    }`}
                  >
                    <span
                      className={`w-7 h-7 rounded-full flex items-center justify-center shadow ${
                        D ? 'bg-gray-800' : 'bg-white'
                      }`}
                    >
                      <ChevronRight size={16} />
                    </span>
                  </button>
                )}
                <div
                  ref={mapScrollRef}
                  onDragOver={autoScrollOnDrag}
                  onScroll={updateMapEdges}
                  onPointerDown={onMapPointerDown}
                  onPointerMove={onMapPointerMove}
                  onPointerUp={endPan}
                  onPointerLeave={endPan}
                  className="overflow-x-auto pb-2"
                >
                  <div className="flex gap-2 min-w-max">
                    {IMPORT_FIELDS.filter((f) => !(f.key === 'category' && defaultCategory.trim())).map((f) => {
                      const col = excelColumns.find((c) => c.key === mapping[f.key]);
                      const over = dropTarget === f.key;
                      const isPicked = picked?.from === f.key;
                      return (
                        <div key={f.key} className="w-[150px] flex-shrink-0 flex flex-col gap-1.5">
                          <div
                            className={`h-9 rounded-lg px-2.5 flex items-center text-xs font-bold border ${
                              D
                                ? 'bg-[#121212] text-gray-200 border-gray-700'
                                : 'bg-white text-gray-800 border-gray-200'
                            }`}
                          >
                            <span className="truncate">{tr(f.labelKey, f.fallback)}</span>
                            {f.required && <span className="text-red-500 ml-0.5">*</span>}
                          </div>
                          <div
                            onDragOver={(e) => {
                              e.preventDefault();
                              e.dataTransfer.dropEffect = 'move';
                              if (dropTarget !== f.key) setDropTarget(f.key);
                            }}
                            onDragLeave={() => setDropTarget((p) => (p === f.key ? null : p))}
                            onDrop={(e) => {
                              e.preventDefault();
                              const src = readDrag(e);
                              if (src) moveColumn(f.key, src);
                            }}
                            onClick={() => {
                              if (picked) moveColumn(f.key, picked);
                            }}
                            className={`h-[60px] rounded-lg border flex transition-colors ${
                              over
                                ? 'border-indigo-500 bg-indigo-500/10'
                                : col
                                  ? 'border-transparent'
                                  : picked
                                    ? 'border-dashed border-indigo-400 cursor-pointer'
                                    : D
                                      ? 'border-dashed border-gray-600'
                                      : 'border-dashed border-gray-300'
                            }`}
                          >
                            {col ? (
                              <div
                                draggable
                                onDragStart={(e) => {
                                  e.stopPropagation();
                                  startDrag(e, { key: col.key, from: f.key });
                                }}
                                onDragEnd={endDrag}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (picked && picked.from !== f.key) {
                                    moveColumn(f.key, picked);
                                    return;
                                  }
                                  setPicked(isPicked ? null : { key: col.key, from: f.key });
                                }}
                                title={col.label}
                                className={`w-full rounded-lg border px-2 py-1.5 flex items-start gap-1 cursor-grab active:cursor-grabbing select-none ${
                                  isPicked
                                    ? 'border-indigo-500 ring-2 ring-indigo-500/30 bg-indigo-500/10'
                                    : D
                                      ? 'border-emerald-500/40 bg-emerald-500/10'
                                      : 'border-emerald-200 bg-emerald-50'
                                } ${drag?.from === f.key ? 'opacity-50' : ''}`}
                              >
                                <GripVertical size={12} className={`flex-shrink-0 mt-0.5 ${sub}`} />
                                <span className="min-w-0 flex-1">
                                  <span className={`block text-xs font-semibold truncate ${text}`}>
                                    {col.label}
                                  </span>
                                  {col.sample && (
                                    <span className={`block text-[11px] truncate ${sub}`}>
                                      {col.sample}
                                    </span>
                                  )}
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    clearField(f.key);
                                  }}
                                  className={`flex-shrink-0 w-5 h-5 rounded-md flex items-center justify-center ${
                                    D ? 'hover:bg-black/30 text-gray-400' : 'hover:bg-white text-gray-500'
                                  }`}
                                >
                                  <X size={12} />
                                </button>
                              </div>
                            ) : f.key === 'unit' ? (
                              <div
                                className="w-full px-1.5 py-1 flex flex-col gap-1 items-center justify-center"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <UnitToggle
                                  D={D}
                                  size="sm"
                                  value={defaultUnit}
                                  onChange={setDefaultUnit}
                                  labelOf={unitLabel}
                                />
                                <span className={`text-[10px] text-center leading-tight ${picked ? 'text-indigo-500' : sub}`}>
                                  {picked
                                    ? tr('prodExcelMapClickHere', 'Shu yerni bosing')
                                    : tr('prodExcelUnitOrDrop', 'yoki Excel ustunini tashlang')}
                                </span>
                              </div>
                            ) : (
                              <span
                                className={`m-auto px-2 text-center text-[11px] leading-tight ${
                                  picked ? 'text-indigo-500 font-semibold' : sub
                                }`}
                              >
                                {picked
                                  ? tr('prodExcelMapClickHere', 'Shu yerni bosing')
                                  : tr('prodExcelMapDropHere', 'Excel ustunini shu yerga suring')}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  if (dropTarget !== 'pool') setDropTarget('pool');
                }}
                onDragLeave={() => setDropTarget((p) => (p === 'pool' ? null : p))}
                onDrop={(e) => {
                  e.preventDefault();
                  const src = readDrag(e);
                  if (src) moveColumn(null, src);
                }}
                onClick={() => {
                  if (picked?.from) moveColumn(null, picked);
                }}
                className={`rounded-lg border border-dashed p-2 transition-colors ${
                  dropTarget === 'pool'
                    ? 'border-indigo-500 bg-indigo-500/10'
                    : D
                      ? 'border-gray-700'
                      : 'border-gray-300'
                }`}
              >
                <p className={`text-[11px] font-bold uppercase tracking-wide mb-1.5 ${sub}`}>
                  {tr('prodExcelMapUnused', 'Ishlatilmagan Excel ustunlari')} ({unusedColumns.length})
                </p>
                {unusedColumns.length === 0 ? (
                  <p className={`text-[11px] ${sub}`}>
                    {tr('prodExcelMapUnusedEmpty', 'Barcha Excel ustunlari moslangan.')}
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {unusedColumns.map((c) => {
                      const isPicked = picked?.key === c.key && picked.from === null;
                      return (
                        <div
                          key={c.key}
                          draggable
                          onDragStart={(e) => startDrag(e, { key: c.key, from: null })}
                          onDragEnd={endDrag}
                          onClick={(e) => {
                            e.stopPropagation();
                            setPicked(isPicked ? null : { key: c.key, from: null });
                          }}
                          title={c.label}
                          className={`max-w-[180px] rounded-lg border px-2 py-1 cursor-grab active:cursor-grabbing select-none ${
                            isPicked
                              ? 'border-indigo-500 ring-2 ring-indigo-500/30 bg-indigo-500/10'
                              : D
                                ? 'border-gray-700 bg-[#121212] hover:border-gray-500'
                                : 'border-gray-200 bg-white hover:border-gray-400'
                          }`}
                        >
                          <span className="flex items-center gap-1 min-w-0">
                            <GripVertical size={12} className={`flex-shrink-0 ${sub}`} />
                            <span className={`text-xs font-semibold truncate ${text}`}>{c.label}</span>
                          </span>
                          {c.sample && (
                            <span className={`block text-[11px] truncate pl-4 ${sub}`}>{c.sample}</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const next = autoMap(excelColumns, EMPTY_MAPPING);
                    if (defaultCategory.trim()) next.category = null;
                    setMapping(next);
                    setPicked(null);
                  }}
                  className={`h-9 px-3 rounded-xl border text-xs font-semibold ${
                    D
                      ? 'border-gray-700 text-gray-300 hover:bg-gray-800'
                      : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {tr('prodExcelMapAuto', 'Avtomatik moslash')}
                </button>
                <button
                  type="button"
                  onClick={() => setMapping(EMPTY_MAPPING)}
                  className={`h-9 px-3 rounded-xl border text-xs font-semibold ${
                    D
                      ? 'border-gray-700 text-gray-300 hover:bg-gray-800'
                      : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {tr('prodExcelMapReset', 'Hammasini tozalash')}
                </button>
                <button
                  type="button"
                  disabled={!mapping.name}
                  onClick={applyMapping}
                  className="h-9 px-4 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50"
                >
                  {tr('prodExcelMapApply', "Qatorlarni ko'rish")}
                </button>
              </div>
            </div>
          )}

          <button
            type="button"
            disabled={busy}
            onClick={() => setSkipExactDuplicates((v) => !v)}
            className={`w-full flex items-start gap-2.5 rounded-xl border px-3 py-2.5 text-left select-none transition-colors disabled:opacity-50 ${
              D ? 'border-gray-700 hover:bg-white/5' : 'border-gray-200 hover:bg-gray-50'
            }`}
          >
            <span
              className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                skipExactDuplicates
                  ? 'bg-indigo-600 border-indigo-600'
                  : D
                    ? 'border-gray-600 bg-transparent'
                    : 'border-gray-300 bg-white'
              }`}
            >
              {skipExactDuplicates && <Check size={10} className="text-white" strokeWidth={3} />}
            </span>
            <span className="min-w-0">
              <span className={`block text-sm font-semibold ${text}`}>
                {tr('prodExcelSkipExact', "100% bir xilliklarni o'tkazib yuborish")}
              </span>
              <span className={`block text-xs mt-0.5 ${sub}`}>
                {tr(
                  'prodExcelSkipExactHint',
                  "Belgilansa, bir xil kod yoki nomli mavjud mahsulotlar so'ralmasdan o'tkaziladi.",
                )}
              </span>
            </span>
          </button>

          {error && (
            <div className="rounded-xl px-3 py-2 text-sm text-red-500 bg-red-500/10 border border-red-500/30 whitespace-pre-wrap">
              {error}
            </div>
          )}
          {progress && <div className={`text-xs font-medium ${sub}`}>{progress}</div>}

          {importReport && (
            <div
              className={`rounded-xl border p-3 space-y-2 ${
                D ? 'border-emerald-500/40 bg-emerald-500/10' : 'border-emerald-300 bg-emerald-50'
              }`}
            >
              <p className={`text-sm font-bold ${D ? 'text-emerald-200' : 'text-emerald-900'}`}>
                {tr('prodExcelReportTitle', 'Import hisoboti')}
                {importReport.aborted
                  ? ` · ${tr('prodExcelAborted', "Import to'xtatildi")}`
                  : ''}
              </p>
              <ul className={`text-sm space-y-1 ${D ? 'text-emerald-100/90' : 'text-emerald-900'}`}>
                <li>
                  {tr('prodExcelReportFiles', 'Fayllar')}: <b>{importReport.files}</b>
                </li>
                <li>
                  {tr('prodExcelReportOrg', 'Tashkilot')}:{' '}
                  <b>{orgs.find((o) => o.id === importReport.companyId)?.label ?? importReport.companyId}</b>
                </li>
                <li>
                  {tr('prodExcelReportCreated', "Qo'shildi")}: <b>{importReport.created}</b>
                </li>
                <li>
                  {tr('prodExcelReportExact', "100% bir xillik o'tkazildi")}:{' '}
                  <b>{importReport.skippedExact}</b>
                </li>
                <li>
                  {tr('prodExcelReportFailed', 'Xato')}: <b>{importReport.failed}</b>
                </li>
                {importReport.remaining > 0 && (
                  <li>
                    {tr('prodExcelReportRemaining', 'Qolgan')}: <b>{importReport.remaining}</b>
                  </li>
                )}
              </ul>
            </div>
          )}

          {failedImports.length > 0 && (
            <div
              className={`rounded-xl border p-3 space-y-2 ${
                D ? 'border-amber-500/40 bg-amber-500/10' : 'border-amber-300 bg-amber-50'
              }`}
            >
              <p className={`text-sm font-bold ${D ? 'text-amber-200' : 'text-amber-900'}`}>
                {tr('prodExcelFailedTitle', 'Xatoliklar')} ({failedImports.length})
              </p>
              <ul className="max-h-40 overflow-auto space-y-1.5">
                {failedImports.map((item) => (
                  <li
                    key={item.row.key}
                    className={`rounded-lg px-2.5 py-2 text-sm ${D ? 'bg-black/20' : 'bg-white/80'}`}
                  >
                    <p className={`font-semibold truncate ${text}`}>
                      {item.row.code} · {item.row.name}
                    </p>
                    <p className={`text-xs truncate ${sub}`}>{item.error}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {!mappingStep && rows.length > 0 && (
            <>
              <div className="flex items-center justify-between gap-2">
                <p className={`text-sm font-semibold ${text}`}>
                  {selectedCount} / {rows.length} {tr('prodExcelSelected', 'tanlangan')}
                </p>
                <button
                  type="button"
                  className={`text-xs font-semibold ${sub}`}
                  onClick={() =>
                    setRows((prev) => {
                      const allOn = prev.every((r) => r.selected);
                      return prev.map((r) => ({ ...r, selected: !allOn }));
                    })
                  }
                >
                  {tr('prodExcelToggleAll', 'Barchasini belgilash / olish')}
                </button>
              </div>
              <div className="overflow-x-auto rounded-xl border border-inherit">
                <table className="w-full text-xs">
                  <thead className={D ? 'bg-[#121212] sticky top-0' : 'bg-gray-50 sticky top-0'}>
                    <tr className={sub}>
                      <th className="p-2 text-left w-8" />
                      <th className="p-2 text-left">{tr('prodExcelColArtikul', 'Artikul')}</th>
                      <th className="p-2 text-left">{tr('prodExcelColCode', 'Kod')}</th>
                      <th className="p-2 text-left">{tr('prodExcelColName', 'Nomi')}</th>
                      <th className="p-2 text-left">{tr('prodExcelColBrand', 'Brend')}</th>
                      <th className="p-2 text-left">{tr('prodExcelColCategory', 'Kategoriya')}</th>
                      <th className="p-2 text-right">{tr('prodExcelColPrice', 'Narx')}</th>
                      <th className="p-2 text-left">
                        <div className="flex items-center gap-1.5">
                          <span>{tr('prodExcelColUnit', 'Birlik')}</span>
                          <UnitToggle
                            D={D}
                            size="sm"
                            value={defaultUnit}
                            onChange={(u) => {
                              setDefaultUnit(u);
                              setRows((prev) => prev.map((x) => ({ ...x, unit: u })));
                            }}
                            labelOf={unitLabel}
                          />
                        </div>
                      </th>
                      <th className="p-2 text-right">{tr('prodExcelColStock', 'Qoldiq')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.key} className={`border-t ${D ? 'border-gray-800' : 'border-gray-100'}`}>
                        <td className="p-2">
                          <button
                            type="button"
                            onClick={() =>
                              setRows((prev) =>
                                prev.map((x) =>
                                  x.key === r.key ? { ...x, selected: !x.selected } : x,
                                ),
                              )
                            }
                            className={`w-4 h-4 rounded border flex items-center justify-center ${
                              r.selected
                                ? 'bg-indigo-600 border-indigo-600'
                                : D
                                  ? 'border-gray-600'
                                  : 'border-gray-300'
                            }`}
                          >
                            {r.selected && <Check size={10} className="text-white" strokeWidth={3} />}
                          </button>
                        </td>
                        <td className={`p-2 font-mono ${text}`}>{r.artikul || r.code}</td>
                        <td className={`p-2 font-mono ${sub}`}>{r.code}</td>
                        <td className={`p-2 ${text}`}>{r.name}</td>
                        <td className={`p-2 ${sub}`}>{r.brand || defaultBrand || '—'}</td>
                        <td className={`p-2 ${sub}`}>{defaultCategory || '—'}</td>
                        <td className={`p-2 text-right font-mono ${text}`}>
                          {r.price ? r.price.toLocaleString('uz-UZ') : '—'}
                        </td>
                        <td className="p-2">
                          <UnitToggle
                            D={D}
                            value={r.unit || defaultUnit || 'dona'}
                            onChange={(u) => {
                              setRows((prev) =>
                                prev.map((x) => (x.key === r.key ? { ...x, unit: u } : x)),
                              );
                            }}
                            labelOf={unitLabel}
                          />
                        </td>
                        <td className={`p-2 text-right font-mono ${text}`}>
                          {r.stock ? r.stock.toLocaleString('uz-UZ') : '0'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        <div
          className={`flex justify-end gap-2 px-5 py-4 border-t flex-shrink-0 ${
            D ? 'border-gray-800' : 'border-gray-100'
          }`}
        >
          {busy ? (
            <button
              type="button"
              onClick={() => {
                abortRef.current = true;
              }}
              className="h-10 px-4 rounded-xl text-sm font-bold text-white bg-rose-600 hover:bg-rose-500"
            >
              {tr('prodExcelStop', "Importni to'xtatish")}
            </button>
          ) : (
            <button
              type="button"
              disabled={parseBusy}
              onClick={onClose}
              className={`h-10 px-4 rounded-xl text-sm font-bold border ${
                D ? 'border-gray-600 text-gray-200' : 'border-gray-200 text-gray-700'
              }`}
            >
              {tr('prodExcelClose', 'Yopish')}
            </button>
          )}
          <button
            type="button"
            disabled={busy || parseBusy || mappingStep || selectedCount === 0}
            onClick={() => void runImport()}
            className="h-10 px-5 rounded-xl text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50"
          >
            {busy ? tr('prodExcelBusy', 'Yuklanmoqda…') : tr('prodExcelRun', 'Import')}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
