import { useCallback, useMemo, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { Check, FileSpreadsheet, Plus, Upload, X } from 'lucide-react';
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

function importRowToDraft(row: ImportRow, companyId?: string): ClientRow {
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
    fullName: row.name,
    line,
    lineCode: row.lineCode || '',
    priceCat: 'Standard',
    territory: row.territory || '',
    inn: '',
    legalAddr: row.address || '',
    phone: row.phone || '',
    contact: '',
    cls: row.clientClass || '',
    gps,
    agent: '',
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

function findCol(hdr: string[], keywords: string[]): number {
  return hdr.findIndex((h) => keywords.some((k) => h.includes(k)));
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

  const parseSheetRows = (
    sheet: string[][],
    lineList: LineRow[],
    fileName: string,
  ): ImportRow[] => {
    let hdrIdx = -1;
    for (let i = 0; i < Math.min(sheet.length, 40); i++) {
      const joined = sheet[i].map(normHeader).join('|');
      if (
        (joined.includes('торг') && joined.includes('точк')) ||
        joined.includes('torg') ||
        (joined.includes('код') && joined.includes('линия')) ||
        (joined.includes('kod') && joined.includes('liniya'))
      ) {
        hdrIdx = i;
        break;
      }
    }
    if (hdrIdx < 0) {
      throw new Error(
        `${fileName}: jadval sarlavhasi topilmadi. "Торг.точка" / "Код" ustunlari kerak.`,
      );
    }

    const hdr = sheet[hdrIdx].map(normHeader);
    const cCode = findCol(hdr, ['код', 'kod', 'code']);
    const cName = findCol(hdr, ['торг.точк', 'торг точк', 'torg', 'точка', 'nomi', 'name']);
    const cLine = findCol(hdr, ['линия', 'liniya', 'line']);
    const cStatus = findCol(hdr, ['статус', 'status', 'holat']);
    const cClass = findCol(hdr, ['класс тт', 'класстт', 'klas tt', 'класс', 'klas', 'class']);
    const cTerritory = findCol(hdr, ['территория', 'hudud', 'ҳудуд', 'territory', 'регион']);
    const cAddr = findCol(hdr, ['адрес', 'adres', 'address', 'manzil']);
    const cGps = findCol(hdr, ['gps', 'коорд', 'координат']);
    const cPhone = findCol(hdr, [
      'телефон',
      'phone',
      'telef',
      'тел.',
      'тел ',
      'моб.',
      'мобиль',
      'mobile',
    ]);

    if (cName < 0) {
      throw new Error(`${fileName}: "Торг.точка" (nomi) ustuni topilmadi.`);
    }

    const parsed: ImportRow[] = [];
    for (let i = hdrIdx + 1; i < sheet.length; i++) {
      const r = sheet[i];
      const name = String(r[cName] ?? '').trim();
      if (!name || /итого|всего|жами/i.test(name)) continue;
      const code = normalizeClientCode(cCode >= 0 ? r[cCode] : '');
      const lineRaw = cLine >= 0 ? String(r[cLine] ?? '').trim() : '';
      const parsedLine = parseLineLabel(lineRaw);
      const gps = parseGpsCell(cGps >= 0 ? String(r[cGps] ?? '') : '');
      const existing = matchExistingLine(lineList, lineRaw, parsedLine);
      parsed.push({
        key: `${fileName}::${i}-${code}-${name}`,
        code,
        name,
        lineRaw,
        lineCode: existing?.code || parsedLine.code,
        lineName: existing?.name || parsedLine.name || lineRaw,
        isActive: parseActiveStatus(cStatus >= 0 ? String(r[cStatus] ?? '') : ''),
        clientClass: cClass >= 0 ? String(r[cClass] ?? '').trim() : '',
        territory: cTerritory >= 0 ? String(r[cTerritory] ?? '').trim() : '',
        address: cAddr >= 0 ? String(r[cAddr] ?? '').trim() : '',
        phone: cPhone >= 0 ? parsePhoneCell(r[cPhone]) : '',
        lat: gps.lat,
        lng: gps.lng,
        selected: true,
      });
    }
    if (parsed.length === 0) {
      throw new Error(`${fileName}: mijoz qatorlari topilmadi.`);
    }
    return parsed;
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

        const allParsed: ImportRow[] = [];
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
            const parsed = parseSheetRows(sheet, lineList, file.name);
            allParsed.push(...parsed);
            newNames.push(file.name);
          } catch (e) {
            fileErrors.push(e instanceof Error ? e.message : String(e));
          }
        }

        if (allParsed.length === 0) {
          setError(fileErrors.join('\n') || tr('excelImportNoRows', "Excel'da mijoz qatorlari topilmadi."));
          setProgress('');
          return;
        }

        setRows((prev) => {
          const seen = new Set(prev.map((r) => r.key));
          const merged = [...prev];
          for (const row of allParsed) {
            if (seen.has(row.key)) continue;
            seen.add(row.key);
            merged.push(row);
          }
          return merged;
        });
        setLoadedFiles((prev) => {
          const set = new Set(prev);
          for (const n of newNames) set.add(n);
          return Array.from(set);
        });
        setProgress(
          `${newNames.length} fayl · ${allParsed.length} ${tr('excelImportRowsLoaded', 'qator yuklandi')}`,
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
    [companyId, t],
  );

  const clearLoaded = () => {
    setRows([]);
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
    setBusy(true);
    setError(null);
    setFailedImports([]);
    setImportReport(null);
    let created = 0;
    let skippedExact = 0;
    let skippedSimilar = 0;
    let aborted = false;
    const failed: FailedImport[] = [];
    try {
      const lineMap = await resolveLinesForImport(selected);
      let known = [...existingClients];

      for (let i = 0; i < selected.length; i++) {
        const row = selected[i];
        setProgress(`${i + 1}/${selected.length}: ${row.name}`);
        const match = findBestSimilarityMatch(
          {
            name: row.name,
            fullName: row.name,
            territory: row.territory || row.address,
            phone: row.phone || undefined,
          },
          known,
        );
        if (match) {
          // 100% bir xillik — ixtiyoriy avtomatik o'tkazish
          if (skipExactDuplicates && match.overallPct >= 100) {
            skippedExact += 1;
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
          fullName: row.name,
          address: row.address || undefined,
          territory: row.territory || undefined,
          phone: row.phone || undefined,
          companyId,
          lineCode,
          latitude: row.lat ?? undefined,
          longitude: row.lng ?? undefined,
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
          setProgress(`${i + 1}/${selected.length}: xato — ${row.name}`);
          if (i + 1 < selected.length) await sleep(120);
          continue;
        }
        known = [...known, saved];
        created += 1;
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
      };
      setImportReport(report);
      if (created > 0) onDone();
      setProgress('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Import xatosi');
    } finally {
      setBusy(false);
    }
  };

  const openManualAdd = (item: FailedImport) => {
    setManualFailKey(item.row.key);
    setManualDraft(importRowToDraft(item.row, companyId));
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

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      style={{ background: 'rgba(0,0,0,0.55)' }}
      onClick={() => !busy && !parseBusy && onClose()}
    >
      <div
        className={`w-full max-w-4xl my-auto max-h-[min(90vh,100dvh-1.5rem)] flex flex-col overflow-hidden rounded-2xl border shadow-xl ${card}`}
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
            onClick={onClose}
            disabled={busy}
            className={`w-8 h-8 rounded-lg flex items-center justify-center ${sub}`}
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-5 py-4 overflow-y-auto flex-1 min-h-0 space-y-3">
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

          {rows.length > 0 && (
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
                      <th className="p-2 text-left">{tr('excelImportColLine', 'Liniya')}</th>
                      <th className="p-2 text-left">{tr('excelImportColStatus', 'Holat')}</th>
                      <th className="p-2 text-left">{tr('excelImportColCategory', 'Klass TT')}</th>
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
                        <td className={`p-2 ${sub}`}>{r.lineRaw || '—'}</td>
                        <td className="p-2">
                          <span className={r.isActive ? 'text-emerald-500' : 'text-amber-500'}>
                            {r.isActive
                              ? tr('excelImportWorking', 'Ishlaydi')
                              : tr('excelImportNotWorking', 'Ishlamaydi')}
                          </span>
                        </td>
                        <td className={`p-2 ${sub}`}>{r.clientClass || '—'}</td>
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
            disabled={busy || parseBusy || selectedCount === 0}
            onClick={() => void runImport()}
            className="h-10 px-4 rounded-xl text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50"
          >
            {busy
              ? tr('excelImportBusy', 'Yuklanmoqda…')
              : `${tr('excelImportRun', 'Import')} (${selectedCount})`}
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
          title={tr('excelImportDupTitle', "O'xshash mijoz topildi")}
          confirmLabel={tr('excelImportDupConfirm', "Baribir qo'shish")}
          cancelLabel={tr('excelImportDupSkip', "O'tkazib yuborish")}
          labels={{
            probability: tr('simProbability', "O'xshashlik ehtimoli"),
            riskHigh: tr('simRiskHigh', 'Yuqori xavf'),
            riskMedium: tr('simRiskMedium', "O'rtacha xavf"),
            riskLow: tr('simRiskLow', 'Past xavf'),
            foundClient: tr('simFoundClient', 'Topilgan mijoz'),
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
    </div>
  );
}
