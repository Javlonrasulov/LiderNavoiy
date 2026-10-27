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
  Plus,
  Upload,
  User,
  X,
} from 'lucide-react';
import { api, type BackendClient } from '../../api/client';
import { ClientSimilarityWarningModal } from './ClientSimilarityWarningModal';
import AddClient from '../AddClient';
import type { ClientRow } from '../../data/adminData';
import {
  findBestSimilarityMatch,
  normalizeClientCode,
  parseActiveStatus,
  parseGpsCell,
  parseLineLabel,
  type SimilarityMatch,
} from '../../utils/clientSimilarity';
import { formatUzPhoneInput } from '../../utils/phoneFormat';

type LineRow = {
  id: string;
  code: string;
  name: string;
};

type ImportRow = {
  key: string;
  code: string;
  name: string;
  fullName: string;
  inn: string;
  contact: string;
  priceCat: string;
  agentRaw: string;
  agentId: string | null;
  agentName: string;
  lineRaw: string;
  lineCode: string;
  lineName: string;
  isActive: boolean;
  clientClass: string;
  territory: string;
  address: string;
  phone: string;
  lat: number | null;
  lng: number | null;
  selected: boolean;
};

type FailedImport = {
  row: ImportRow;
  error: string;
};

type ImportReport = {
  created: number;
  skippedExact: number;
  skippedSimilar: number;
  failed: number;
  aborted: boolean;
  files: number;
  agentName?: string;
  /** Tanlanganlardan qayta ishlanmay qolganlari (to'xtatilganda) */
  remaining: number;
};

type MissingLinePrompt = {
  label: string;
  suggestedCode: string;
  suggestedName: string;
};

type Props = {
  D: boolean;
  companyId?: string;
  agents?: { id: string; name: string; lineCode?: string }[];
  lineOptions?: string[];
  onClose: () => void;
  onDone: () => void;
  onCreateClient?: (data: Partial<ClientRow> & {
    appUsername?: string;
    appPassword?: string;
    isActive?: boolean;
  }) => Promise<string | void>;
  t?: Record<string, string>;
};

type ImportMode = 'general' | 'agent';

type FieldKey =
  | 'code' | 'name' | 'fullName' | 'line' | 'agent' | 'clientClass' | 'priceCat'
  | 'territory' | 'inn' | 'address' | 'phone' | 'contact' | 'gps' | 'status';

type FieldMapping = Record<FieldKey, string | null>;

/** Tizimdagi mijoz ustunlari — mijozlar jadvali tartibida. */
const IMPORT_FIELDS: {
  key: FieldKey;
  labelKey: string;
  fallback: string;
  required?: boolean;
  keywords: string[];
}[] = [
  { key: 'code', labelKey: 'colCode', fallback: 'Kod', keywords: ['код', 'kod', 'code'] },
  {
    key: 'name', labelKey: 'colClientName', fallback: 'Nomi', required: true,
    keywords: ['торг.точк', 'торг точк', 'torg', 'точка', 'харидор', 'клиент', 'контрагент', 'mijoz', 'nomi', 'назван', 'наимен', 'name'],
  },
  { key: 'fullName', labelKey: 'colFullName', fallback: "To'liq nomi", keywords: ['полн', "to'liq", 'toliq', 'юрид'] },
  { key: 'line', labelKey: 'colLine', fallback: 'Liniya', keywords: ['линия', 'liniya', 'line', 'маршрут'] },
  { key: 'agent', labelKey: 'colAgent', fallback: 'Agent', keywords: ['агент', 'agent', 'торговый пред'] },
  {
    key: 'clientClass', labelKey: 'colCategory', fallback: 'Klass TT',
    keywords: ['класс тт', 'класстт', 'klass tt', 'klas tt', 'класс', 'klass', 'klas', 'class', 'категор'],
  },
  { key: 'priceCat', labelKey: 'colPriceCat', fallback: 'Narx kat.', keywords: ['цен', 'прайс', 'narx', 'price'] },
  { key: 'territory', labelKey: 'colTerritory', fallback: 'Hudud', keywords: ['территор', 'hudud', 'ҳудуд', 'territory', 'регион', 'ориентир', 'orientir'] },
  { key: 'inn', labelKey: 'colINN', fallback: 'INN', keywords: ['инн', 'стир', 'inn', 'stir'] },
  { key: 'address', labelKey: 'colLegalAddr', fallback: 'Manzil', keywords: ['адрес', 'adres', 'address', 'manzil'] },
  {
    key: 'phone', labelKey: 'colPhone', fallback: 'Telefon',
    keywords: ['телефон', 'phone', 'telef', 'тел.', 'тел ', 'моб.', 'мобиль', 'mobile'],
  },
  { key: 'contact', labelKey: 'colContact', fallback: 'Kontakt', keywords: ['контакт', 'contact', 'масъул', 'ответств'] },
  { key: 'gps', labelKey: 'colGPS', fallback: 'GPS', keywords: ['gps', 'коорд', 'координат'] },
  { key: 'status', labelKey: 'colClass', fallback: 'Status', keywords: ['статус', 'status', 'holat'] },
];

const EMPTY_MAPPING: FieldMapping = {
  code: null, name: null, fullName: null, line: null, agent: null, clientClass: null, priceCat: null,
  territory: null, inn: null, address: null, phone: null, contact: null, gps: null, status: null,
};

type SheetColumn = { key: string; label: string };

type RawSheet = {
  fileName: string;
  columns: SheetColumn[];
  data: string[][];
  /** Excel'dagi birinchi ma'lumot qatori indeksi — qator kaliti uchun */
  dataStart: number;
};

type UnionColumn = SheetColumn & { sample: string };

/** Surilayotgan Excel ustuni; `from` — qaysi tizim ustunidan olindi (null — pastki ro'yxatdan) */
type ColumnDrag = { key: string; from: FieldKey | null };

function detectHeaderRow(sheet: string[][]): number {
  let best = -1;
  let bestScore = 0;
  const limit = Math.min(sheet.length, 40);
  for (let i = 0; i < limit; i++) {
    const cells = (sheet[i] || []).map(normHeader).filter(Boolean);
    if (cells.length < 2) continue;
    let score = 0;
    for (const f of IMPORT_FIELDS) {
      if (cells.some((c) => f.keywords.some((k) => c.includes(k)))) score += 1;
    }
    if (score > bestScore) {
      bestScore = score;
      best = i;
    }
  }
  if (best >= 0 && bestScore >= 2) return best;
  // Tanish sarlavha yo'q — kamida 3 ta to'ldirilgan katakli birinchi qator
  for (let i = 0; i < limit; i++) {
    if ((sheet[i] || []).filter((c) => String(c ?? '').trim()).length >= 3) return i;
  }
  return -1;
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
  return next;
}

function importRowToDraft(
  row: ImportRow,
  companyId?: string,
  agent?: { id: string; name: string } | null,
): ClientRow {
  const gps =
    row.lat != null && row.lng != null ? `${row.lat},${row.lng}` : '';
  const line =
    row.lineName && row.lineCode
      ? (row.lineRaw || `${row.lineCode} - ${row.lineName}`)
      : row.lineRaw || row.lineCode || '';
  return {
    id: '',
    code: row.code || '',
    name: row.name,
    fullName: row.fullName || row.name,
    line,
    lineCode: row.lineCode || '',
    priceCat: row.priceCat || 'Standard',
    territory: row.territory || '',
    inn: row.inn || '',
    legalAddr: row.address || '',
    phone: row.phone || '',
    contact: row.contact || '',
    cls: row.clientClass || '',
    gps,
    agent: agent?.name ?? row.agentName,
    distributorId: agent?.id ?? row.agentId ?? undefined,
    balance: 0,
    category: row.clientClass || 'Standard',
    lastVisit: '',
    rowType: 'normal',
    isActive: row.isActive,
    companyId,
    companyIds: companyId ? [companyId] : [],
  };
}

function normHeader(h: string): string {
  return String(h || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[ё]/g, 'е')
    .trim();
}

/** Excel telefon katakchasini (+998 …) formatiga keltirish */
function parsePhoneCell(raw: unknown): string {
  let s = String(raw ?? '').trim();
  if (!s) return '';
  // Ba'zan Excel scientific notation qoldiradi
  if (/e[+-]?\d+/i.test(s)) {
    const n = Number(s);
    if (Number.isFinite(n) && n > 0) s = String(Math.round(n));
  }
  const digits = s.replace(/\D/g, '');
  if (digits.length < 7) return s;
  if (digits.startsWith('998') || digits.length === 9) {
    return formatUzPhoneInput(digits);
  }
  return digits.startsWith('998') ? `+${digits}` : s;
}

function matchExistingLine(
  lines: LineRow[],
  lineRaw: string,
  parsed: { code: string; name: string },
): LineRow | undefined {
  const raw = lineRaw.trim().toLowerCase();
  if (!raw) return undefined;
  const byCode = parsed.code
    ? lines.find((l) => l.code.trim() === parsed.code.trim())
    : undefined;
  if (byCode) return byCode;
  const byFull = lines.find(
    (l) => `${l.code} - ${l.name}`.toLowerCase() === raw || `${l.code}-${l.name}`.toLowerCase() === raw.replace(/\s/g, ''),
  );
  if (byFull) return byFull;
  if (parsed.name) {
    return lines.find((l) => l.name.trim().toLowerCase() === parsed.name.trim().toLowerCase());
  }
  return undefined;
}

export function ClientExcelImportModal({
  D,
  companyId,
  agents = [],
  lineOptions = [],
  onClose,
  onDone,
  onCreateClient,
  t = {},
}: Props) {
  const text = D ? 'text-white' : 'text-gray-900';
  const sub = D ? 'text-gray-400' : 'text-gray-500';
  const card = D ? 'bg-[#1a1a1a] border-gray-700' : 'bg-white border-gray-200';
  const inp = D ? 'bg-[#121212] border-gray-700 text-white' : 'bg-white border-gray-200 text-gray-900';

  const tr = (key: string, fallback: string) => t[key] || fallback;
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [promptBusy, setPromptBusy] = useState(false);
  const [progress, setProgress] = useState('');
  const [lines, setLines] = useState<LineRow[]>([]);
  const [existingClients, setExistingClients] = useState<BackendClient[]>([]);
  const [missingPrompt, setMissingPrompt] = useState<MissingLinePrompt | null>(null);
  const [customLineMode, setCustomLineMode] = useState(false);
  const [customCode, setCustomCode] = useState('');
  const [customName, setCustomName] = useState('');
  const [lineResolutions, setLineResolutions] = useState<Record<string, string>>({});
  const missingResolveRef = useRef<((code: string | null) => void) | null>(null);
  const [similarityMatch, setSimilarityMatch] = useState<SimilarityMatch | null>(null);
  const [similarityProgress, setSimilarityProgress] = useState<{ index: number; total: number } | null>(null);
  const similarityResolveRef = useRef<((decision: 'add' | 'skip' | 'abort') => void) | null>(null);
  const [failedImports, setFailedImports] = useState<FailedImport[]>([]);
  const [manualDraft, setManualDraft] = useState<ClientRow | null>(null);
  const [manualFailKey, setManualFailKey] = useState<string | null>(null);
  const [loadedFiles, setLoadedFiles] = useState<string[]>([]);
  const [skipExactDuplicates, setSkipExactDuplicates] = useState(false);
  const [importReport, setImportReport] = useState<ImportReport | null>(null);
  const [parseBusy, setParseBusy] = useState(false);
  const [importMode, setImportMode] = useState<ImportMode>('general');
  const [agentId, setAgentId] = useState('');
  const [agentMenuOpen, setAgentMenuOpen] = useState(false);
  const [sheets, setSheets] = useState<RawSheet[]>([]);
  const [mapping, setMapping] = useState<FieldMapping>(EMPTY_MAPPING);
  const [mappingStep, setMappingStep] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  /** Shu oynada import qilingan / o'tkazilgan qatorlar — qayta moslashda qaytib chiqmasin */
  const [importedKeys, setImportedKeys] = useState<Set<string>>(new Set());
  const [drag, setDrag] = useState<ColumnDrag | null>(null);
  const [picked, setPicked] = useState<ColumnDrag | null>(null);
  const [dropTarget, setDropTarget] = useState<FieldKey | 'pool' | null>(null);
  const mapScrollRef = useRef<HTMLDivElement>(null);
  const panRef = useRef<{ x: number; left: number } | null>(null);
  const [mapEdges, setMapEdges] = useState({ left: false, right: false });

  const updateMapEdges = useCallback(() => {
    const el = mapScrollRef.current;
    if (!el) return;
    const left = el.scrollLeft > 2;
    const right = el.scrollLeft + el.clientWidth < el.scrollWidth - 2;
    setMapEdges((p) => (p.left === left && p.right === right ? p : { left, right }));
  }, []);

  useEffect(() => {
    const el = mapScrollRef.current;
    if (!mappingStep || !el) return;
    // React onWheel passiv — preventDefault uchun native listener kerak
    const onWheel = (e: WheelEvent) => {
      if (el.scrollWidth <= el.clientWidth) return;
      const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      if (!delta) return;
      e.preventDefault();
      el.scrollLeft += delta;
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    const ro = new ResizeObserver(updateMapEdges);
    ro.observe(el);
    updateMapEdges();
    return () => {
      el.removeEventListener('wheel', onWheel);
      ro.disconnect();
    };
  }, [mappingStep, updateMapEdges]);

  const scrollMap = (dir: -1 | 1) => {
    const el = mapScrollRef.current;
    if (el) el.scrollBy({ left: dir * Math.max(300, el.clientWidth * 0.7), behavior: 'smooth' });
  };

  const onMapPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 || (e.target as HTMLElement).closest('[draggable="true"],button')) return;
    const el = mapScrollRef.current;
    if (!el) return;
    panRef.current = { x: e.clientX, left: el.scrollLeft };
  };

  const onMapPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const el = mapScrollRef.current;
    if (!panRef.current || !el) return;
    el.scrollLeft = panRef.current.left - (e.clientX - panRef.current.x);
  };

  const endPan = () => {
    panRef.current = null;
  };
  const excelColumns = useMemo(() => unionColumns(sheets), [sheets]);
  const unusedColumns = useMemo(() => {
    const used = new Set(Object.values(mapping).filter(Boolean));
    return excelColumns.filter((c) => !used.has(c.key));
  }, [excelColumns, mapping]);
  const selectedAgent = importMode === 'agent'
    ? agents.find((a) => a.id === agentId) ?? null
    : null;

  const selectedCount = useMemo(() => rows.filter((r) => r.selected).length, [rows]);

  const askMissingLine = (prompt: MissingLinePrompt) =>
    new Promise<string | null>((resolve) => {
      missingResolveRef.current = resolve;
      setCustomLineMode(false);
      setCustomCode(prompt.suggestedCode);
      setCustomName(prompt.suggestedName);
      setMissingPrompt(prompt);
    });

  const finishMissing = (code: string | null) => {
    const fn = missingResolveRef.current;
    missingResolveRef.current = null;
    setMissingPrompt(null);
    setCustomLineMode(false);
    fn?.(code);
  };

  const askSimilarity = (
    match: SimilarityMatch,
    progress?: { index: number; total: number },
  ) =>
    new Promise<'add' | 'skip' | 'abort'>((resolve) => {
      similarityResolveRef.current = resolve;
      setSimilarityProgress(progress ?? null);
      setSimilarityMatch(match);
    });

  const finishSimilarity = (decision: 'add' | 'skip' | 'abort') => {
    const fn = similarityResolveRef.current;
    similarityResolveRef.current = null;
    setSimilarityMatch(null);
    setSimilarityProgress(null);
    fn?.(decision);
  };

  const readRawSheet = (sheet: string[][], fileName: string): RawSheet => {
    const hdrIdx = detectHeaderRow(sheet);
    if (hdrIdx < 0) {
      throw new Error(`${fileName}: ${tr('excelImportNoHeader', 'jadval sarlavhasi (ustun nomlari) topilmadi.')}`);
    }
    const data = sheet
      .slice(hdrIdx + 1)
      .map((r) => (r || []).map((c) => String(c ?? '')));
    const width = Math.max(
      sheet[hdrIdx].length,
      ...data.slice(0, 50).map((r) => r.length),
    );
    if (!data.some((r) => r.some((c) => c.trim()))) {
      throw new Error(`${fileName}: ${tr('excelImportNoRows', "Excel'da mijoz qatorlari topilmadi.")}`);
    }
    return {
      fileName,
      columns: buildSheetColumns(sheet[hdrIdx], width),
      data,
      dataStart: hdrIdx + 1,
    };
  };

  const matchAgent = (raw: string) => {
    const q = normHeader(raw);
    if (!q) return undefined;
    return (
      agents.find((a) => normHeader(a.name) === q) ??
      agents.find((a) => {
        const n = normHeader(a.name);
        return n.includes(q) || q.includes(n);
      })
    );
  };

  const buildRowsFromMapping = (
    list: RawSheet[],
    map: FieldMapping,
    lineList: LineRow[],
  ): ImportRow[] => {
    const out: ImportRow[] = [];
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
        const code = normalizeClientCode(cell(r, 'code'));
        const lineRaw = cell(r, 'line');
        const parsedLine = parseLineLabel(lineRaw);
        const gps = parseGpsCell(cell(r, 'gps'));
        const existing = matchExistingLine(lineList, lineRaw, parsedLine);
        const cPhone = idx('phone');
        const agentRaw = cell(r, 'agent');
        const agentHit = matchAgent(agentRaw);
        out.push({
          key: `${s.fileName}::${s.dataStart + ri}-${code}-${name}`,
          code,
          name,
          fullName: cell(r, 'fullName'),
          inn: cell(r, 'inn'),
          contact: cell(r, 'contact'),
          priceCat: cell(r, 'priceCat'),
          agentRaw,
          agentId: agentHit?.id ?? null,
          agentName: agentHit?.name ?? '',
          lineRaw,
          lineCode: existing?.code || parsedLine.code,
          lineName: existing?.name || parsedLine.name || lineRaw,
          isActive: parseActiveStatus(cell(r, 'status')),
          clientClass: cell(r, 'clientClass'),
          territory: cell(r, 'territory'),
          address: cell(r, 'address'),
          phone: cPhone >= 0 ? parsePhoneCell(r[cPhone]) : '',
          lat: gps.lat,
          lng: gps.lng,
          selected: true,
        });
      });
    }
    return out;
  };

  const parseFiles = useCallback(
    async (fileList: FileList | File[]) => {
      // FileList live — input tozalansa bo'shaydi; darhol nusxa olish kerak
      const files = Array.from(fileList).filter((f) => f && f.size >= 0);
      if (files.length === 0) {
        setError(tr('excelImportNoFiles', 'Excel fayl tanlang.'));
        return;
      }
      setError(null);
      setImportReport(null);
      setFailedImports([]);
      setParseBusy(true);
      setProgress(tr('excelImportReading', "Excel o'qilmoqda…"));
      try {
        setProgress(tr('excelImportLoadingMeta', 'Liniya va mijozlar yuklanmoqda…'));
        const [lineListRaw, clients] = await Promise.all([
          api.getLines(companyId),
          api.getClients(companyId),
        ]);
        const lineList = lineListRaw.map((l) => ({ id: l.id, code: l.code, name: l.name }));
        setLines(lineList);
        setExistingClients(clients);

        const newSheets: RawSheet[] = [];
        const newNames: string[] = [];
        const fileErrors: string[] = [];

        for (let fi = 0; fi < files.length; fi++) {
          const file = files[fi];
          setProgress(`${tr('excelImportReading', "Excel o'qilmoqda…")} ${fi + 1}/${files.length}: ${file.name}`);
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
            }) as string[][];
            newSheets.push(readRawSheet(sheet, file.name));
            newNames.push(file.name);
          } catch (e) {
            fileErrors.push(e instanceof Error ? e.message : String(e));
          }
        }

        if (newSheets.length === 0) {
          setError(fileErrors.join('\n') || tr('excelImportNoRows', "Excel'da mijoz qatorlari topilmadi."));
          setProgress('');
          return;
        }

        const newSet = new Set(newSheets.map((s) => s.fileName));
        const merged = [...sheets.filter((s) => !newSet.has(s.fileName)), ...newSheets];
        setSheets(merged);
        setMapping(autoMap(unionColumns(merged), mapping));
        setMappingStep(true);
        setPicked(null);
        setLoadedFiles((prev) => {
          const set = new Set(prev);
          for (const n of newNames) set.add(n);
          return Array.from(set);
        });
        setProgress(
          `${newNames.length} fayl · ${tr('excelImportMapNext', 'ustunlarni moslang')}`,
        );
        if (fileErrors.length > 0) {
          setError(fileErrors.join('\n'));
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Excel o‘qishda xatolik');
        setProgress('');
      } finally {
        setParseBusy(false);
      }
    },
    [companyId, t, sheets, mapping],
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
      /* boshqa manbadan surilgan */
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

  /** Surish paytida chetga yaqinlashsa gorizontal aylantirish */
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
      setError(tr('excelImportMapNameRequired', '«Nomi» maydoniga Excel ustunini belgilang.'));
      return;
    }
    const built = buildRowsFromMapping(sheets, mapping, lines).filter((r) => !importedKeys.has(r.key));
    if (built.length === 0) {
      setError(tr('excelImportNoRows', "Excel'da mijoz qatorlari topilmadi."));
      return;
    }
    const prevSel = new Map(rows.map((r) => [r.key, r.selected]));
    setRows(built.map((r) => ({ ...r, selected: prevSel.get(r.key) ?? true })));
    setMappingStep(false);
    setError(null);
    setProgress(`${sheets.length} fayl · ${built.length} ${tr('excelImportRowsLoaded', 'qator yuklandi')}`);
  };

  const clearLoaded = () => {
    setRows([]);
    setSheets([]);
    setImportedKeys(new Set());
    setMappingStep(false);
    setPicked(null);
    setLoadedFiles([]);
    setLineResolutions({});
    setFailedImports([]);
    setImportReport(null);
    setError(null);
    setProgress('');
  };

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  const createClientWithRetry = async (
    body: Parameters<typeof api.createClient>[0],
    tries = 5,
  ) => {
    let lastErr: unknown;
    for (let attempt = 1; attempt <= tries; attempt++) {
      try {
        return await api.createClient(body);
      } catch (e) {
        lastErr = e;
        const msg = e instanceof Error ? e.message : String(e);
        const is429 = /429|too many requests|throttler/i.test(msg);
        // Unique/duplicate — qayta urinish foydasiz
        if (/unique|duplicate|allaqachon mavjud|400/i.test(msg) && !is429) {
          throw e;
        }
        if (!is429 || attempt === tries) throw e;
        setProgress(`Kutish (juda ko‘p so‘rov)… ${attempt}/${tries}`);
        await sleep(1500 * attempt);
      }
    }
    throw lastErr instanceof Error ? lastErr : new Error('Import xatosi');
  };

  const createLineOnServer = async (code: string, name: string): Promise<string> => {
    const created = await api.createLine({
      code: code.trim(),
      name: name.trim() || code.trim(),
      companyId,
    });
    setLines((prev) => [...prev, { id: created.id, code: created.code, name: created.name }]);
    return created.code;
  };

  const resolveLinesForImport = async (selected: ImportRow[]) => {
    const map: Record<string, string> = { ...lineResolutions };
    const missingLabels = new Map<string, { code: string; name: string }>();

    for (const row of selected) {
      if (!row.lineRaw.trim()) continue;
      if (map[row.lineRaw]) continue;
      const parsed = parseLineLabel(row.lineRaw);
      const hit = matchExistingLine(lines, row.lineRaw, parsed);
      if (hit) {
        map[row.lineRaw] = hit.code;
        continue;
      }
      if (!missingLabels.has(row.lineRaw)) {
        missingLabels.set(row.lineRaw, {
          code: parsed.code || String(missingLabels.size + 1).padStart(2, '0'),
          name: parsed.name || row.lineRaw,
        });
      }
    }

    for (const [label, suggested] of missingLabels) {
      setProgress(`Liniya: ${label}`);
      const chosen = await askMissingLine({
        label,
        suggestedCode: suggested.code,
        suggestedName: suggested.name,
      });
      if (!chosen) {
        throw new Error('Liniya yaratish bekor qilindi');
      }
      map[label] = chosen;
      setLineResolutions((prev) => ({ ...prev, [label]: chosen }));
    }

    return map;
  };

  const runImport = async () => {
    const selected = rows.filter((r) => r.selected && r.name.trim());
    if (selected.length === 0) {
      setError('Kamida 1 ta mijoz tanlang.');
      return;
    }
    if (importMode === 'agent' && !selectedAgent) {
      setError(tr('excelImportAgentRequired', 'Avval agentni tanlang'));
      return;
    }
    setBusy(true);
    setError(null);
    setFailedImports([]);
    setImportReport(null);
    let created = 0;
    let skippedExact = 0;
    let skippedSimilar = 0;
    let aborted = false;
    const failed: FailedImport[] = [];
    // Qayta ishlangan qatorlar (qo'shilgan / o'tkazilgan / xato) ro'yxatdan olinadi
    const processed = new Set<string>();
    try {
      const lineMap = await resolveLinesForImport(selected);
      let known = [...existingClients];

      for (let i = 0; i < selected.length; i++) {
        const row = selected[i];
        setProgress(`${i + 1}/${selected.length}: ${row.name}`);
        const match = findBestSimilarityMatch(
          {
            name: row.name,
            fullName: row.fullName || row.name,
            territory: row.territory || row.address,
            phone: row.phone || undefined,
            inn: row.inn || undefined,
            code: row.code || undefined,
            line: row.lineRaw || undefined,
            agent: selectedAgent?.name || row.agentName || row.agentRaw || undefined,
          },
          known,
        );
        if (match) {
          // 100% bir xillik — ixtiyoriy avtomatik o'tkazish
          if (skipExactDuplicates && match.overallPct >= 100) {
            skippedExact += 1;
            processed.add(row.key);
            continue;
          }
          const decision = await askSimilarity(match, {
            index: i + 1,
            total: selected.length,
          });
          if (decision === 'abort') {
            aborted = true;
            setError(tr('excelImportAborted', 'Import to‘xtatildi'));
            break;
          }
          if (decision === 'skip') {
            processed.add(row.key);
            if (match.overallPct >= 100) {
              skippedExact += 1;
            } else {
              skippedSimilar += 1;
              failed.push({
                row,
                error: tr(
                  'excelImportSkippedSimilar',
                  "O'xshashlik sabab o'tkazildi — qo'lda tekshiring",
                ),
              });
            }
            continue;
          }
        }

        const lineCode = row.lineRaw ? lineMap[row.lineRaw] || row.lineCode || undefined : undefined;
        const klassTt = row.clientClass.trim();
        const body = {
          ...(row.code ? { code: row.code } : {}),
          name: row.name,
          fullName: row.fullName || row.name,
          address: row.address || undefined,
          territory: row.territory || undefined,
          phone: row.phone || undefined,
          ...(row.inn ? { inn: row.inn } : {}),
          ...(row.contact ? { contactPerson: row.contact } : {}),
          companyId,
          lineCode,
          latitude: row.lat ?? undefined,
          longitude: row.lng ?? undefined,
          ...(selectedAgent
            ? { distributorId: selectedAgent.id }
            : row.agentId
              ? { distributorId: row.agentId }
              : {}),
          ...(row.priceCat ? { priceCategory: row.priceCat } : {}),
          ...(klassTt
            ? { clientClass: klassTt, category: klassTt }
            : { category: 'Standard' }),
        };
        let saved;
        try {
          saved = await createClientWithRetry(body);
          if (row.isActive === false) {
            saved = await api.updateClient(saved.id, { isActive: false });
          }
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          failed.push({
            row,
            error: msg.replace(/^HTTP \d+:\s*/i, '') || 'Xato',
          });
          processed.add(row.key);
          setProgress(`${i + 1}/${selected.length}: xato — ${row.name}`);
          if (i + 1 < selected.length) await sleep(120);
          continue;
        }
        known = [...known, saved];
        created += 1;
        processed.add(row.key);
        if (i + 1 < selected.length) await sleep(80);
      }

      setFailedImports(failed);
      const report: ImportReport = {
        created,
        skippedExact,
        skippedSimilar,
        failed: failed.length,
        aborted,
        files: loadedFiles.length,
        agentName: selectedAgent?.name,
        remaining: selected.length - processed.size,
      };
      setImportReport(report);
      if (created > 0) onDone();
      setProgress('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Import xatosi');
    } finally {
      if (processed.size > 0) {
        setRows((prev) => prev.filter((r) => !processed.has(r.key)));
        setImportedKeys((prev) => new Set([...prev, ...processed]));
      }
      setBusy(false);
    }
  };

  const openManualAdd = (item: FailedImport) => {
    setManualFailKey(item.row.key);
    setManualDraft(importRowToDraft(item.row, companyId, selectedAgent));
  };

  const handleManualSave = async (
    data: Partial<ClientRow> & {
      appUsername?: string;
      appPassword?: string;
      isActive?: boolean;
    },
  ) => {
    if (onCreateClient) {
      await onCreateClient(data);
    } else {
      const { appUsername, appPassword, isActive, ...rest } = data;
      await api.createClient({
        code: rest.code,
        name: rest.name || '',
        fullName: rest.fullName,
        address: rest.legalAddr,
        territory: rest.territory,
        companyId: rest.companyId || companyId,
        companyIds: rest.companyIds,
        lineCode: rest.line?.split(' - ')[0]?.trim() || rest.lineCode,
        distributorId: rest.distributorId || selectedAgent?.id,
        clientClass: rest.cls,
        category: rest.category || rest.cls || 'Standard',
        phone: rest.phone,
        inn: rest.inn,
        isActive,
        appUsername,
        appPassword,
      });
    }
    if (manualFailKey) {
      setFailedImports((prev) => prev.filter((f) => f.row.key !== manualFailKey));
    }
    setManualDraft(null);
    setManualFailKey(null);
    onDone();
  };

  const confirmCreateFromExcel = async () => {
    if (!missingPrompt || promptBusy) return;
    try {
      setPromptBusy(true);
      setError(null);
      const code = await createLineOnServer(
        missingPrompt.suggestedCode || customCode,
        missingPrompt.suggestedName || customName,
      );
      finishMissing(code);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Liniya yaratilmadi');
    } finally {
      setPromptBusy(false);
    }
  };

  const confirmCreateCustom = async () => {
    if (promptBusy) return;
    if (!customCode.trim()) {
      setError('Liniya kodi kiriting');
      return;
    }
    try {
      setPromptBusy(true);
      setError(null);
      const code = await createLineOnServer(customCode.trim(), customName.trim() || customCode.trim());
      finishMissing(code);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Liniya yaratilmadi');
    } finally {
      setPromptBusy(false);
    }
  };

  return createPortal(
    <div
      className={`fixed inset-0 z-[1000] flex items-center justify-center ${
        fullscreen ? 'p-0' : 'p-3 sm:p-4'
      }`}
      style={{ background: 'rgba(0,0,0,0.55)' }}
      onClick={() => !busy && !parseBusy && onClose()}
    >
      <div
        className={`w-full flex flex-col overflow-hidden border shadow-xl ${card} ${
          fullscreen
            ? 'h-full max-w-none rounded-none'
            : 'max-w-4xl max-h-[calc(100dvh-1.5rem)] sm:max-h-[calc(100dvh-2rem)] rounded-2xl'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-5 py-4 border-b border-inherit flex-shrink-0">
          <FileSpreadsheet size={18} className="text-emerald-500" />
          <div className="flex-1 min-w-0">
            <p className={`text-base font-bold ${text}`}>{tr('excelImportTitle', "Excel'dan mijoz yuklash")}</p>
            <p className={`text-xs ${sub}`}>
              {tr('excelImportHint', 'Торг.точка, Линия, Статус, Класс ТТ, Адрес, Телефон, GPS')}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setFullscreen((v) => !v)}
            title={
              fullscreen
                ? tr('excelImportExitFullscreen', "To'liq ekrandan chiqish")
                : tr('excelImportFullscreen', "To'liq ekran")
            }
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
          <div className={`grid grid-cols-2 gap-1 p-1 rounded-xl ${D ? 'bg-white/5' : 'bg-gray-100'}`}>
            {([
              { id: 'general' as const, label: tr('excelImportModeGeneral', 'Umumiy import') },
              { id: 'agent' as const, label: tr('excelImportModeAgent', 'Agent uchun import') },
            ]).map((m) => {
              const active = importMode === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  disabled={busy}
                  onClick={() => { setImportMode(m.id); setError(null); }}
                  className={`h-9 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 ${
                    active
                      ? 'bg-indigo-500 text-white shadow-sm shadow-indigo-500/25'
                      : D ? 'text-gray-300 hover:bg-white/5' : 'text-gray-600 hover:bg-white'
                  }`}
                >
                  {m.label}
                </button>
              );
            })}
          </div>

          <div className={`rounded-xl border px-3 py-2.5 text-xs leading-relaxed ${
            D ? 'border-indigo-500/30 bg-indigo-500/10 text-indigo-100' : 'border-indigo-200 bg-indigo-50 text-indigo-900'
          }`}>
            {importMode === 'general'
              ? tr(
                'excelImportModeGeneralHint',
                "Mijozlar agentsiz qo'shiladi. Liniya, Klass TT, manzil, telefon va GPS Excel'dan olinadi. Agentni keyin mijoz kartasida yoki liniya orqali biriktirasiz.",
              )
              : tr(
                'excelImportModeAgentHint',
                "Tanlangan agent Excel'dagi barcha yangi mijozlarga yoziladi — Excel'da agent ustuni bo'lmasa ham. Liniya, Klass TT, manzil, telefon va GPS Excel'dan olinadi. O'tkazib yuborilgan yoki mavjud mijozlarning agenti o'zgarmaydi.",
              )}
          </div>

          {importMode === 'agent' && (
            <div>
              <label className={`block text-xs font-semibold mb-1.5 ${sub}`}>
                {tr('excelImportAgentLabel', 'Agent')} *
              </label>
              <div className="relative">
                <button
                  type="button"
                  disabled={busy || agents.length === 0}
                  onClick={() => setAgentMenuOpen((v) => !v)}
                  className={`w-full h-10 rounded-xl border px-3 flex items-center gap-2 text-sm text-left transition-colors disabled:opacity-50 ${
                    agentMenuOpen
                      ? 'border-indigo-500 ring-2 ring-indigo-500/20'
                      : D ? 'border-gray-700 hover:border-indigo-500/50' : 'border-gray-200 hover:border-indigo-300'
                  } ${D ? 'bg-[#121212]' : 'bg-white'}`}
                >
                  <span className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    selectedAgent ? 'bg-indigo-500/15 text-indigo-500' : D ? 'bg-white/5 text-gray-500' : 'bg-gray-100 text-gray-400'
                  }`}>
                    <User size={13} />
                  </span>
                  <span className={`flex-1 truncate ${selectedAgent ? `font-semibold ${text}` : sub}`}>
                    {selectedAgent?.name ?? tr('excelImportAgentPlaceholder', 'Agentni tanlang')}
                  </span>
                  {selectedAgent?.lineCode && (
                    <span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded-md flex-shrink-0 ${
                      D ? 'bg-white/5 text-gray-400' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {selectedAgent.lineCode}
                    </span>
                  )}
                  <ChevronDown size={14} className={`flex-shrink-0 transition-transform ${sub} ${agentMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {agentMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-[80]" onClick={() => setAgentMenuOpen(false)} />
                    <div className={`absolute left-0 right-0 top-full mt-1.5 z-[81] max-h-64 overflow-y-auto rounded-2xl border shadow-2xl py-1.5 ${
                      D ? 'bg-[#1a1a1a] border-gray-700 shadow-black/50' : 'bg-white border-gray-100 shadow-gray-300/50'
                    }`}>
                      {agents.map((a) => {
                        const active = a.id === agentId;
                        return (
                          <button
                            key={a.id}
                            type="button"
                            onClick={() => { setAgentId(a.id); setAgentMenuOpen(false); setError(null); }}
                            className={`w-full flex items-center gap-2 px-3 py-2 text-left text-sm transition-colors ${
                              active
                                ? D ? 'bg-indigo-500/20 text-indigo-300 font-semibold' : 'bg-indigo-50 text-indigo-700 font-semibold'
                                : D ? 'text-gray-300 hover:bg-white/5' : 'text-gray-700 hover:bg-gray-50'
                            }`}
                          >
                            <span className="flex-1 truncate">{a.name}</span>
                            {a.lineCode && (
                              <span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded-md flex-shrink-0 ${
                                D ? 'bg-white/5 text-gray-400' : 'bg-gray-100 text-gray-500'
                              }`}>
                                {a.lineCode}
                              </span>
                            )}
                            {active && <Check size={13} className="text-indigo-400 flex-shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
              {agents.length === 0 && (
                <p className={`text-xs mt-1.5 ${sub}`}>{tr('excelImportNoAgents', 'Agentlar topilmadi')}</p>
              )}
            </div>
          )}

          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
            multiple
            className="hidden"
            onChange={(e) => {
              const list = e.target.files;
              if (!list || list.length === 0) return;
              // Muhim: value='' FileListni bo'shatadi — avval Array.from
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
              D ? 'border-gray-600 text-gray-300 hover:bg-gray-800' : 'border-gray-300 text-gray-700 hover:bg-gray-50'
            } disabled:opacity-50`}
          >
            <Upload size={16} />{' '}
            {parseBusy
              ? tr('excelImportReading', "Excel o'qilmoqda…")
              : loadedFiles.length > 0
                ? tr('excelImportPickMore', "Yana Excel qo'shish (.xlsx)")
                : tr('excelImportPick', 'Excel fayllarni tanlash (.xlsx)')}
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
                {tr('excelImportClearFiles', 'Tozalash')}
              </button>
              {!mappingStep && sheets.length > 0 && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setMappingStep(true)}
                  className="text-xs font-semibold text-indigo-500 hover:underline disabled:opacity-50"
                >
                  {tr('excelImportRemap', 'Ustunlarni qayta moslash')}
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
                  {tr('excelImportMapTitle', 'Ustunlarni moslash')}
                </p>
                <p className={`text-xs mt-0.5 ${sub}`}>
                  {tr(
                    'excelImportMapHint',
                    "Har bir tizim ustuni tagidagi Excel ustunining ma'lumotlari o'sha ustunga yoziladi. Noto'g'risini boshqa ustun tagiga suring (o'rni almashadi), keraksizini × bilan olib tashlang. Sig'maganlarini ko'rish uchun yonga suring.",
                  )}
                </p>
              </div>
              <div className="relative">
              {mapEdges.left && (
                <button
                  type="button"
                  onClick={() => scrollMap(-1)}
                  onDragOver={(e) => {
                    e.preventDefault();
                    const el = mapScrollRef.current;
                    if (el) el.scrollLeft -= 20;
                  }}
                  className={`absolute left-0 top-0 bottom-3 z-10 w-9 flex items-center justify-start pl-1 rounded-l-lg bg-gradient-to-r ${
                    D ? 'from-[#1a1a2e] via-[#1a1a2e]/80 to-transparent text-gray-200' : 'from-indigo-50 via-indigo-50/80 to-transparent text-gray-700'
                  }`}
                  aria-label="left"
                >
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center shadow ${D ? 'bg-gray-800' : 'bg-white'}`}>
                    <ChevronLeft size={16} />
                  </span>
                </button>
              )}
              {mapEdges.right && (
                <button
                  type="button"
                  onClick={() => scrollMap(1)}
                  onDragOver={(e) => {
                    e.preventDefault();
                    const el = mapScrollRef.current;
                    if (el) el.scrollLeft += 20;
                  }}
                  className={`absolute right-0 top-0 bottom-3 z-10 w-9 flex items-center justify-end pr-1 rounded-r-lg bg-gradient-to-l ${
                    D ? 'from-[#1a1a2e] via-[#1a1a2e]/80 to-transparent text-gray-200' : 'from-indigo-50 via-indigo-50/80 to-transparent text-gray-700'
                  }`}
                  aria-label="right"
                >
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center shadow ${D ? 'bg-gray-800' : 'bg-white'}`}>
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
                className="show-sb overflow-x-auto pb-2"
              >
                <div className="flex gap-2 min-w-max">
                  {IMPORT_FIELDS.map((f) => {
                    const col = excelColumns.find((c) => c.key === mapping[f.key]);
                    const over = dropTarget === f.key;
                    const isPicked = picked?.from === f.key;
                    return (
                      <div key={f.key} className="w-[150px] flex-shrink-0 flex flex-col gap-1.5">
                        <div
                          className={`h-9 rounded-lg px-2.5 flex items-center text-xs font-bold border ${
                            D ? 'bg-[#121212] text-gray-200 border-gray-700' : 'bg-white text-gray-800 border-gray-200'
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
                                <span className={`block text-xs font-semibold truncate ${text}`}>{col.label}</span>
                                {col.sample && (
                                  <span className={`block text-[11px] truncate ${sub}`}>{col.sample}</span>
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
                                aria-label="clear"
                              >
                                <X size={12} />
                              </button>
                            </div>
                          ) : (
                            <span
                              className={`m-auto px-2 text-center text-[11px] leading-tight ${
                                picked ? 'text-indigo-500 font-semibold' : sub
                              }`}
                            >
                              {picked
                                ? tr('excelImportMapClickHere', 'Shu yerni bosing')
                                : tr('excelImportMapDropHere', 'Excel ustunini shu yerga suring')}
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
                  {tr('excelImportMapUnused', 'Ishlatilmagan Excel ustunlari')} ({unusedColumns.length})
                </p>
                {unusedColumns.length === 0 ? (
                  <p className={`text-[11px] ${sub}`}>
                    {tr('excelImportMapUnusedEmpty', 'Barcha Excel ustunlari moslangan.')}
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
                          } ${drag?.key === c.key && drag.from === null ? 'opacity-50' : ''}`}
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
                    setMapping(autoMap(excelColumns, EMPTY_MAPPING));
                    setPicked(null);
                  }}
                  className={`h-9 px-3 rounded-xl border text-xs font-semibold ${
                    D ? 'border-gray-700 text-gray-300 hover:bg-gray-800' : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {tr('excelImportMapAuto', 'Avtomatik moslash')}
                </button>
                <button
                  type="button"
                  onClick={() => setMapping(EMPTY_MAPPING)}
                  className={`h-9 px-3 rounded-xl border text-xs font-semibold ${
                    D ? 'border-gray-700 text-gray-300 hover:bg-gray-800' : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {tr('excelImportMapReset', 'Hammasini tozalash')}
                </button>
                <button
                  type="button"
                  disabled={!mapping.name}
                  onClick={applyMapping}
                  className="h-9 px-4 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50"
                >
                  {tr('excelImportMapApply', "Qatorlarni ko'rish")}
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
                {tr('excelImportSkipExact', "100% bir xilliklarni o'tkazib yuborish")}
              </span>
              <span className={`block text-xs mt-0.5 ${sub}`}>
                {tr(
                  'excelImportSkipExactHint',
                  "Belgilansa, mavjud mijoz bilan 100% bir xil qatorlar so'ralmasdan o'tkaziladi.",
                )}
              </span>
            </span>
          </button>

          {error && (
            <div className="rounded-xl px-3 py-2 text-sm text-red-500 bg-red-500/10 border border-red-500/30 whitespace-pre-wrap">
              {error}
            </div>
          )}
          {progress && (
            <div className={`text-xs font-medium ${sub}`}>{progress}</div>
          )}

          {importReport && (
            <div
              className={`rounded-xl border p-3 space-y-2 ${
                D ? 'border-emerald-500/40 bg-emerald-500/10' : 'border-emerald-300 bg-emerald-50'
              }`}
            >
              <p className={`text-sm font-bold ${D ? 'text-emerald-200' : 'text-emerald-900'}`}>
                {tr('excelImportReportTitle', 'Import hisoboti')}
                {importReport.aborted
                  ? ` · ${tr('excelImportAborted', "Import to'xtatildi")}`
                  : ''}
              </p>
              <ul className={`text-sm space-y-1 ${D ? 'text-emerald-100/90' : 'text-emerald-900'}`}>
                <li>
                  {tr('excelImportReportFiles', 'Fayllar')}: <b>{importReport.files}</b>
                </li>
                {importReport.agentName && (
                  <li>
                    {tr('excelImportReportAgent', 'Agent')}: <b>{importReport.agentName}</b>
                  </li>
                )}
                <li>
                  {tr('excelImportReportCreated', "Qo'shildi")}: <b>{importReport.created}</b>
                </li>
                <li>
                  {tr('excelImportReportExact', "100% bir xillik o'tkazildi")}:{' '}
                  <b>{importReport.skippedExact}</b>
                </li>
                <li>
                  {tr('excelImportReportSimilar', "O'xshashlik o'tkazildi")}:{' '}
                  <b>{importReport.skippedSimilar}</b>
                </li>
                <li>
                  {tr('excelImportReportFailed', "Qo'lda / xato")}: <b>{importReport.failed}</b>
                </li>
                {importReport.remaining > 0 && (
                  <li>
                    {tr('excelImportReportRemaining', 'Qolgan (import qilinmagan)')}:{' '}
                    <b>{importReport.remaining}</b>
                  </li>
                )}
              </ul>
              <p className={`text-xs font-medium ${D ? 'text-emerald-200/80' : 'text-emerald-800'}`}>
                {importReport.remaining > 0
                  ? tr(
                      'excelImportReportContinueHint',
                      "Qo'shilgan va o'tkazilgan qatorlar ro'yxatdan olindi. Pastda qolganlari turibdi — davom ettirish uchun «Davom ettirish» tugmasini bosing.",
                    )
                  : tr(
                      'excelImportReportDoneHint',
                      "Barcha tanlangan qatorlar qayta ishlandi. Oynani yopishingiz mumkin.",
                    )}
              </p>
            </div>
          )}

          {failedImports.length > 0 && (
            <div
              className={`rounded-xl border p-3 space-y-2 ${
                D ? 'border-amber-500/40 bg-amber-500/10' : 'border-amber-300 bg-amber-50'
              }`}
            >
              <p className={`text-sm font-bold ${D ? 'text-amber-200' : 'text-amber-900'}`}>
                {tr('excelImportFailedTitle', "Qo'lda kiritish kerak")} ({failedImports.length})
              </p>
              <p className={`text-xs ${D ? 'text-amber-200/80' : 'text-amber-800'}`}>
                {tr(
                  'excelImportFailedHint',
                  "Importda o'tkazilgan yoki xato bergan mijozlar. Bitta-bitta ochib qo'shing.",
                )}
              </p>
              <ul className="max-h-48 overflow-auto space-y-1.5">
                {failedImports.map((item) => (
                  <li
                    key={item.row.key}
                    className={`flex items-start gap-2 rounded-lg px-2.5 py-2 text-sm ${
                      D ? 'bg-black/20' : 'bg-white/80'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className={`font-semibold truncate ${text}`}>
                        {item.row.code ? `${item.row.code} · ` : ''}
                        {item.row.name}
                      </p>
                      <p className={`text-xs truncate ${sub}`}>{item.error}</p>
                    </div>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => openManualAdd(item)}
                      className="flex-shrink-0 h-8 px-2.5 rounded-lg text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 inline-flex items-center gap-1"
                    >
                      <Plus size={12} />
                      {tr('excelImportManualAdd', "Qo'lda")}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {!mappingStep && rows.length > 0 && (
            <>
              <div className="flex items-center justify-between gap-2">
                <p className={`text-sm font-semibold ${text}`}>
                  {selectedCount} / {rows.length} {tr('excelImportSelected', 'tanlangan')}
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
                  {tr('excelImportToggleAll', 'Barchasini belgilash / olish')}
                </button>
              </div>
              <div className="overflow-x-auto rounded-xl border border-inherit">
                <table className="w-full text-xs">
                  <thead className={D ? 'bg-[#121212] sticky top-0' : 'bg-gray-50 sticky top-0'}>
                    <tr className={sub}>
                      <th className="p-2 text-left w-8" />
                      <th className="p-2 text-left">{tr('excelImportColCode', 'Kod')}</th>
                      <th className="p-2 text-left">{tr('excelImportColName', 'Nomi')}</th>
                      <th className="p-2 text-left">{tr('colINN', 'INN')}</th>
                      <th className="p-2 text-left">{tr('excelImportColLine', 'Liniya')}</th>
                      <th className="p-2 text-left">{tr('colAgent', 'Agent')}</th>
                      <th className="p-2 text-left">{tr('excelImportColStatus', 'Holat')}</th>
                      <th className="p-2 text-left">{tr('excelImportColCategory', 'Klass TT')}</th>
                      <th className="p-2 text-left">{tr('colTerritory', 'Hudud')}</th>
                      <th className="p-2 text-left">{tr('excelImportColPhone', 'Telefon')}</th>
                      <th className="p-2 text-left">{tr('excelImportColAddr', 'Manzil')}</th>
                      <th className="p-2 text-left">{tr('excelImportColGps', 'GPS')}</th>
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
                                prev.map((x) => (x.key === r.key ? { ...x, selected: !x.selected } : x)),
                              )
                            }
                            className={`w-4 h-4 rounded border flex items-center justify-center ${
                              r.selected
                                ? 'bg-indigo-600 border-indigo-600'
                                : D
                                  ? 'border-gray-600'
                                  : 'border-gray-300'
                            }`}
                            aria-checked={r.selected}
                            role="checkbox"
                          >
                            {r.selected && <Check size={10} className="text-white" strokeWidth={3} />}
                          </button>
                        </td>
                        <td className={`p-2 font-mono ${text}`}>{r.code || '—'}</td>
                        <td className={`p-2 ${text}`}>{r.name}</td>
                        <td className={`p-2 font-mono ${sub}`}>{r.inn || '—'}</td>
                        <td className={`p-2 ${sub}`}>{r.lineRaw || '—'}</td>
                        <td className="p-2">
                          {selectedAgent || r.agentName ? (
                            <span className={text}>{selectedAgent?.name ?? r.agentName}</span>
                          ) : r.agentRaw ? (
                            <span className="text-amber-500" title={tr('excelImportAgentNotFound', 'Tizimda topilmadi')}>
                              {r.agentRaw} ?
                            </span>
                          ) : (
                            <span className={sub}>—</span>
                          )}
                        </td>
                        <td className="p-2">
                          <span className={r.isActive ? 'text-emerald-500' : 'text-amber-500'}>
                            {r.isActive
                              ? tr('excelImportWorking', 'Ishlaydi')
                              : tr('excelImportNotWorking', 'Ishlamaydi')}
                          </span>
                        </td>
                        <td className={`p-2 ${sub}`}>{r.clientClass || '—'}</td>
                        <td className={`p-2 ${sub}`}>{r.territory || '—'}</td>
                        <td className={`p-2 font-mono ${sub}`}>{r.phone || '—'}</td>
                        <td className={`p-2 ${sub}`}>{r.address || '—'}</td>
                        <td className={`p-2 font-mono ${sub}`}>
                          {r.lat != null && r.lng != null ? `${r.lat}, ${r.lng}` : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        <div className={`flex justify-end gap-2 px-5 py-4 border-t flex-shrink-0 ${D ? 'border-gray-800' : 'border-gray-100'}`}>
          <button
            type="button"
            disabled={busy || parseBusy}
            onClick={onClose}
            className={`h-10 px-4 rounded-xl text-sm font-bold border ${
              D ? 'border-gray-600 text-gray-200' : 'border-gray-200 text-gray-700'
            }`}
          >
            {tr('excelImportClose', 'Yopish')}
          </button>
          <button
            type="button"
            disabled={
              busy || parseBusy || mappingStep || selectedCount === 0 || (importMode === 'agent' && !selectedAgent)
            }
            onClick={() => void runImport()}
            className="h-10 px-4 rounded-xl text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50"
          >
            {busy
              ? tr('excelImportBusy', 'Yuklanmoqda…')
              : `${
                  importReport?.remaining
                    ? tr('excelImportContinue', 'Davom ettirish')
                    : tr('excelImportRun', 'Import')
                }${selectedAgent ? ` → ${selectedAgent.name}` : ''} (${selectedCount})`}
          </button>
        </div>
      </div>

      {missingPrompt && (
        <div
          className="fixed inset-0 z-[85] flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.55)' }}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className={`w-full max-w-md rounded-2xl border p-5 shadow-xl ${card}`}
            onClick={(e) => e.stopPropagation()}
          >
            {!customLineMode ? (
              <>
                <p className={`text-base font-bold ${text}`}>{tr('excelImportMissingLine', 'Liniya topilmadi')}</p>
                <p className={`mt-2 text-sm ${sub}`}>
                  «<span className={text}>{missingPrompt.label}</span>»{' '}
                  {tr('excelImportLineMissingAsk', "liniyasi yo'q. Excel'dagidek yaratilsinmi?")}
                </p>
                {error && (
                  <p className="mt-2 text-sm text-rose-500">{error}</p>
                )}
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={promptBusy}
                    onClick={() => setCustomLineMode(true)}
                    className={`h-11 rounded-xl text-sm font-bold border disabled:opacity-50 ${
                      D ? 'border-gray-600 text-gray-200' : 'border-gray-200 text-gray-700'
                    }`}
                  >
                    {tr('excelImportNo', "Yo'q")}
                  </button>
                  <button
                    type="button"
                    disabled={promptBusy}
                    onClick={() => void confirmCreateFromExcel()}
                    className="h-11 rounded-xl text-sm font-bold text-white bg-indigo-600 disabled:opacity-50"
                  >
                    {promptBusy
                      ? tr('excelImportBusy', 'Yuklanmoqda…')
                      : tr('excelImportYesCreate', 'Ha, yaratilsin')}
                  </button>
                </div>
                <button
                  type="button"
                  disabled={promptBusy}
                  onClick={() => finishMissing(null)}
                  className={`mt-3 w-full h-10 rounded-xl text-sm font-semibold disabled:opacity-50 ${sub}`}
                >
                  {tr('excelImportStop', "Importni to'xtatish")}
                </button>
              </>
            ) : (
              <>
                <p className={`text-base font-bold ${text}`}>{tr('excelImportNewLine', 'Yangi liniya')}</p>
                <p className={`mt-1 text-xs ${sub}`}>
                  {tr('excelImportNewLineHint', "Kod va nomni o'zingiz kiriting")}
                </p>
                {error && (
                  <p className="mt-2 text-sm text-rose-500">{error}</p>
                )}
                <div className="mt-3 space-y-2">
                  <input
                    className={`w-full h-10 px-3 rounded-xl border text-sm ${inp}`}
                    placeholder={tr('excelImportCodePh', 'Kod (masalan 02)')}
                    value={customCode}
                    onChange={(e) => setCustomCode(e.target.value)}
                    disabled={promptBusy}
                  />
                  <input
                    className={`w-full h-10 px-3 rounded-xl border text-sm ${inp}`}
                    placeholder={tr('excelImportNamePh', 'Nomi')}
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    disabled={promptBusy}
                  />
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={promptBusy}
                    onClick={() => setCustomLineMode(false)}
                    className={`h-11 rounded-xl text-sm font-bold border disabled:opacity-50 ${
                      D ? 'border-gray-600 text-gray-200' : 'border-gray-200 text-gray-700'
                    }`}
                  >
                    {tr('excelImportBack', 'Orqaga')}
                  </button>
                  <button
                    type="button"
                    disabled={promptBusy}
                    onClick={() => void confirmCreateCustom()}
                    className="h-11 rounded-xl text-sm font-bold text-white bg-indigo-600 disabled:opacity-50"
                  >
                    {promptBusy
                      ? tr('excelImportBusy', 'Yuklanmoqda…')
                      : tr('excelImportCreateLine', 'Yaratish')}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {similarityMatch && (
        <ClientSimilarityWarningModal
          D={D}
          match={similarityMatch}
          busy={false}
          progressIndex={similarityProgress?.index}
          progressTotal={similarityProgress?.total}
          progressHint={
            similarityProgress
              ? tr(
                  'excelImportSimProgress',
                  '{i} / {t} · {r} ta qoldi',
                )
                  .replace('{i}', String(similarityProgress.index))
                  .replace('{t}', String(similarityProgress.total))
                  .replace(
                    '{r}',
                    String(Math.max(0, similarityProgress.total - similarityProgress.index + 1)),
                  )
              : undefined
          }
          onCancel={() => finishSimilarity('skip')}
          onConfirm={() => finishSimilarity('add')}
          onClose={() => finishSimilarity('abort')}
          closeOnOverlay={false}
          title={tr('excelImportDupTitle', "O'xshash mijoz topildi")}
          confirmLabel={tr('excelImportDupConfirm', "Baribir qo'shish")}
          cancelLabel={tr('excelImportDupSkip', "O'tkazib yuborish")}
          labels={{
            probability: tr('simProbability', "O'xshashlik ehtimoli"),
            riskHigh: tr('simRiskHigh', 'Yuqori xavf'),
            riskMedium: tr('simRiskMedium', "O'rtacha xavf"),
            riskLow: tr('simRiskLow', 'Past xavf'),
            foundClient: tr('simFoundClient', 'Tizimdagi mijoz'),
            newClient: tr('simNewClient', "Yangi (qo'shilayotgan)"),
            same: tr('simSame', 'Bir xil'),
            innBlocked: tr(
              'simInnBlocked',
              "Bir xil INN bilan mijoz allaqachon mavjud. «Baribir qo'shish» mumkin emas — INN ni o'zgartiring yoki mavjud mijozni tahrirlang.",
            ),
            understand: tr('simUnderstand', 'Tushunarli'),
            fieldName: tr('simFieldName', 'Nomi'),
            fieldFullName: tr('simFieldFullName', "To'liq nomi"),
            fieldPhone: tr('simFieldPhone', 'Telefon'),
            fieldInn: tr('simFieldInn', 'INN'),
            fieldTerritory: tr('simFieldTerritory', 'Hudud'),
          }}
        />
      )}

      {manualDraft && (
        <AddClient
          client={manualDraft}
          agents={agents}
          lines={lineOptions}
          companyId={companyId}
          onSave={handleManualSave}
          onClose={() => {
            setManualDraft(null);
            setManualFailKey(null);
          }}
        />
      )}
    </div>,
    document.body,
  );
}
