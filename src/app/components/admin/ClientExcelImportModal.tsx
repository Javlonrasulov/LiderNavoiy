import { useCallback, useMemo, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { FileSpreadsheet, Upload, X } from 'lucide-react';
import { api, type BackendClient } from '../../api/client';
import { ClientSimilarityWarningModal } from './ClientSimilarityWarningModal';
import {
  findBestSimilarityMatch,
  normalizeClientCode,
  parseActiveStatus,
  parseGpsCell,
  parseLineLabel,
  type SimilarityMatch,
} from '../../utils/clientSimilarity';

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
  address: string;
  lat: number | null;
  lng: number | null;
  selected: boolean;
};

type MissingLinePrompt = {
  label: string;
  suggestedCode: string;
  suggestedName: string;
};

type Props = {
  D: boolean;
  companyId?: string;
  onClose: () => void;
  onDone: () => void;
  t?: Record<string, string>;
};

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

export function ClientExcelImportModal({ D, companyId, onClose, onDone, t = {} }: Props) {
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
  const similarityResolveRef = useRef<((ok: boolean) => void) | null>(null);

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

  const askSimilarity = (match: SimilarityMatch) =>
    new Promise<boolean>((resolve) => {
      similarityResolveRef.current = resolve;
      setSimilarityMatch(match);
    });

  const finishSimilarity = (ok: boolean) => {
    const fn = similarityResolveRef.current;
    similarityResolveRef.current = null;
    setSimilarityMatch(null);
    fn?.(ok);
  };

  const parseFile = useCallback(async (file: File) => {
    setError(null);
    setRows([]);
    setLineResolutions({});
    try {
      const [lineList, clients] = await Promise.all([
        api.getLines(companyId),
        api.getClients(companyId),
      ]);
      setLines(lineList.map((l) => ({ id: l.id, code: l.code, name: l.name })));
      setExistingClients(clients);

      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const sheet = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1, defval: '' }) as string[][];

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
        setError('Jadval sarlavhasi topilmadi. "Торг.точка" / "Код" ustunlari kerak.');
        return;
      }

      const hdr = sheet[hdrIdx].map(normHeader);
      const cCode = findCol(hdr, ['код', 'kod', 'code']);
      const cName = findCol(hdr, ['торг.точк', 'торг точк', 'torg', 'точка', 'nomi', 'name']);
      const cLine = findCol(hdr, ['линия', 'liniya', 'line']);
      const cStatus = findCol(hdr, ['статус', 'status', 'holat']);
      const cClass = findCol(hdr, ['класс', 'klas', 'class', 'тт']);
      const cAddr = findCol(hdr, ['адрес', 'adres', 'address', 'manzil']);
      const cGps = findCol(hdr, ['gps', 'коорд', 'координат']);

      if (cName < 0) {
        setError('"Торг.точка" (nomi) ustuni topilmadi.');
        return;
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
          key: `${i}-${code}-${name}`,
          code,
          name,
          lineRaw,
          lineCode: existing?.code || parsedLine.code,
          lineName: existing?.name || parsedLine.name || lineRaw,
          isActive: parseActiveStatus(cStatus >= 0 ? String(r[cStatus] ?? '') : ''),
          clientClass: cClass >= 0 ? String(r[cClass] ?? '').trim() : '',
          address: cAddr >= 0 ? String(r[cAddr] ?? '').trim() : '',
          lat: gps.lat,
          lng: gps.lng,
          selected: true,
        });
      }

      if (parsed.length === 0) {
        setError("Excel'da mijoz qatorlari topilmadi.");
        return;
      }
      setRows(parsed);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Excel o‘qishda xatolik');
    }
  }, [companyId]);

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
    let created = 0;
    let skipped = 0;
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
            territory: row.address,
          },
          known,
        );
        if (match) {
          const ok = await askSimilarity(match);
          if (!ok) {
            skipped += 1;
            continue;
          }
        }

        const lineCode = row.lineRaw ? lineMap[row.lineRaw] || row.lineCode || undefined : undefined;
        const body = {
          ...(row.code ? { code: row.code } : {}),
          name: row.name,
          fullName: row.name,
          address: row.address || undefined,
          companyId,
          lineCode,
          latitude: row.lat ?? undefined,
          longitude: row.lng ?? undefined,
          clientClass: row.clientClass || undefined,
          category: 'Standard',
        };
        let saved = await api.createClient(body);
        // Production create DTO isActive qabul qilmasligi mumkin — holatni update bilan qo‘yamiz
        if (row.isActive === false) {
          saved = await api.updateClient(saved.id, { isActive: false });
        }
        known = [...known, saved];
        created += 1;
      }

      setProgress(`Tayyor: ${created} qo‘shildi${skipped ? `, ${skipped} o‘tkazib yuborildi` : ''}`);
      onDone();
      if (created > 0) onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Import xatosi');
    } finally {
      setBusy(false);
      setProgress('');
    }
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
      className="fixed inset-0 z-[70] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.55)' }}
      onClick={() => !busy && onClose()}
    >
      <div
        className={`w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl border shadow-xl ${card}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-5 py-4 border-b border-inherit flex-shrink-0">
          <FileSpreadsheet size={18} className="text-emerald-500" />
          <div className="flex-1 min-w-0">
            <p className={`text-base font-bold ${text}`}>{tr('excelImportTitle', "Excel'dan mijoz yuklash")}</p>
            <p className={`text-xs ${sub}`}>
              {tr('excelImportHint', 'Торг.точка, Линия, Статус, Класс ТТ, Адрес, GPS')}
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

        <div className="px-5 py-4 overflow-auto flex-1 space-y-3">
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = '';
              if (f) void parseFile(f);
            }}
          />
          <button
            type="button"
            disabled={busy}
            onClick={() => fileRef.current?.click()}
            className={`w-full h-11 rounded-xl border border-dashed flex items-center justify-center gap-2 text-sm font-semibold ${
              D ? 'border-gray-600 text-gray-300 hover:bg-gray-800' : 'border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Upload size={16} /> {tr('excelImportPick', 'Excel fayl tanlash (.xlsx)')}
          </button>

          {error && (
            <div className="rounded-xl px-3 py-2 text-sm text-red-500 bg-red-500/10 border border-red-500/30">
              {error}
            </div>
          )}
          {progress && (
            <div className={`text-xs font-medium ${sub}`}>{progress}</div>
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
              <div className="overflow-auto rounded-xl border border-inherit max-h-[46vh]">
                <table className="w-full text-xs">
                  <thead className={D ? 'bg-[#121212] sticky top-0' : 'bg-gray-50 sticky top-0'}>
                    <tr className={sub}>
                      <th className="p-2 text-left w-8" />
                      <th className="p-2 text-left">{tr('excelImportColCode', 'Kod')}</th>
                      <th className="p-2 text-left">{tr('excelImportColName', 'Nomi')}</th>
                      <th className="p-2 text-left">{tr('excelImportColLine', 'Liniya')}</th>
                      <th className="p-2 text-left">{tr('excelImportColStatus', 'Holat')}</th>
                      <th className="p-2 text-left">{tr('excelImportColCategory', 'Kategoriya')}</th>
                      <th className="p-2 text-left">{tr('excelImportColAddr', 'Manzil')}</th>
                      <th className="p-2 text-left">{tr('excelImportColGps', 'GPS')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.key} className={`border-t ${D ? 'border-gray-800' : 'border-gray-100'}`}>
                        <td className="p-2">
                          <input
                            type="checkbox"
                            checked={r.selected}
                            onChange={() =>
                              setRows((prev) =>
                                prev.map((x) => (x.key === r.key ? { ...x, selected: !x.selected } : x)),
                              )
                            }
                          />
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

        <div className={`flex justify-end gap-2 px-5 py-4 border-t ${D ? 'border-gray-800' : 'border-gray-100'}`}>
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className={`h-10 px-4 rounded-xl text-sm font-bold border ${
              D ? 'border-gray-600 text-gray-200' : 'border-gray-200 text-gray-700'
            }`}
          >
            {tr('excelImportClose', 'Yopish')}
          </button>
          <button
            type="button"
            disabled={busy || selectedCount === 0}
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
          onCancel={() => finishSimilarity(false)}
          onConfirm={() => finishSimilarity(true)}
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
    </div>
  );
}
