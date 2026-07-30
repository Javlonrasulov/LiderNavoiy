import { useMemo, useState } from 'react';
import { ArrowRightLeft, Check, Search, X, AlertTriangle } from 'lucide-react';
import type { ClientRow } from '../../data/adminData';
import { api } from '../../api/client';
import { useCompanies } from '../CompaniesContext';

interface Props {
  D: boolean;
  sub: string;
  t: Record<string, string>;
  clients: ClientRow[];
  sourceCompanyId?: string;
  preselectedIds?: string[];
  onClose: () => void;
  onDone: () => void;
}

export function TransferClientsModal({
  D, sub, t, clients, sourceCompanyId, preselectedIds = [], onClose, onDone,
}: Props) {
  const { companies } = useCompanies();
  const [targetId, setTargetId] = useState('');
  const [mode, setMode] = useState<'selected' | 'all'>('selected');
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(preselectedIds),
  );
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    transferredCount: number;
    skippedCount: number;
    skipped: { id: string; name: string; code: string; inn: string | null; reason: string }[];
  } | null>(null);

  const targets = useMemo(
    () => companies.filter(c => !sourceCompanyId || c.id !== sourceCompanyId),
    [companies, sourceCompanyId],
  );

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return clients;
    return clients.filter(c =>
      c.name.toLowerCase().includes(s)
      || c.code.toLowerCase().includes(s)
      || (c.inn || '').toLowerCase().includes(s)
      || (c.agent || '').toLowerCase().includes(s),
    );
  }, [clients, q]);

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllFiltered = () => {
    const ids = filtered.map(c => c.id);
    const allOn = ids.every(id => selected.has(id));
    setSelected(prev => {
      const next = new Set(prev);
      if (allOn) ids.forEach(id => next.delete(id));
      else ids.forEach(id => next.add(id));
      return next;
    });
  };

  const canSubmit =
    !!targetId
    && !busy
    && (mode === 'all' ? !!sourceCompanyId : selected.size > 0);

  const handleTransfer = async () => {
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const res = await api.transferClients(
        mode === 'all'
          ? {
              targetCompanyId: targetId,
              sourceCompanyId,
              transferAll: true,
            }
          : {
              targetCompanyId: targetId,
              sourceCompanyId,
              clientIds: [...selected],
            },
      );
      setResult({
        transferredCount: res.transferredCount,
        skippedCount: res.skippedCount,
        skipped: res.skipped,
      });
      if (res.transferredCount > 0) onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const bg = D ? 'bg-[#161616]' : 'bg-white';
  const bd = D ? 'border-gray-700' : 'border-gray-200';
  const inp = D
    ? 'bg-[#1a1a1a] border-gray-700 text-white'
    : 'bg-gray-50 border-gray-200 text-gray-900';

  const reasonLabel = (r: string) => {
    if (r === 'inn_duplicate') return t.transferInnDup ?? 'INN allaqachon maqsad orgda bor';
    if (r === 'already_in_target') return t.transferAlready ?? 'Allaqachon shu orgda';
    return r;
  };

  return (
    <div
      className="fixed inset-0 z-[220] flex items-center justify-center p-4"
      style={{ backdropFilter: 'blur(6px)', backgroundColor: 'rgba(0,0,0,0.65)' }}
      onClick={onClose}
    >
      <div
        className={`relative w-full max-w-lg max-h-[90vh] flex flex-col rounded-2xl border shadow-2xl overflow-hidden ${bg} ${bd}`}
        onClick={e => e.stopPropagation()}
      >
        <div className={`flex items-center justify-between px-5 py-4 border-b ${bd}`}>
          <div className="flex items-center gap-2.5">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${D ? 'bg-indigo-900/40' : 'bg-indigo-50'}`}>
              <ArrowRightLeft size={16} className={D ? 'text-indigo-300' : 'text-indigo-600'} />
            </div>
            <div>
              <p className="font-bold text-sm">{t.transferTitle ?? "Boshqa tashkilotga o'tkazish"}</p>
              <p className={`text-xs ${sub}`}>
                {t.transferHint ?? 'INN bo\'yicha dublikat tekshiriladi'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`w-8 h-8 rounded-xl flex items-center justify-center ${D ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}
          >
            <X size={14} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4" style={{ minHeight: 0 }}>
          {/* Target org */}
          <div>
            <p className={`text-[10px] font-semibold uppercase tracking-wider ${sub} mb-1.5`}>
              {t.transferTarget ?? 'Maqsad tashkilot'}
            </p>
            <select
              value={targetId}
              onChange={e => setTargetId(e.target.value)}
              className={`w-full rounded-xl border px-3 py-2.5 text-sm outline-none ${inp}`}
            >
              <option value="">{t.transferPickOrg ?? '— tanlang —'}</option>
              {targets.map(c => (
                <option key={c.id} value={c.id}>
                  {c.icon ? `${c.icon} ` : ''}{c.name}
                </option>
              ))}
            </select>
            {!sourceCompanyId && mode === 'all' && (
              <p className="mt-1.5 text-[11px] text-amber-500 flex items-center gap-1">
                <AlertTriangle size={11} />
                {t.transferNeedSource ?? '«Hammasi» uchun bitta tashkilot tanlang (navbar)'}
              </p>
            )}
          </div>

          {/* Mode */}
          <div className={`flex gap-1 p-1 rounded-xl border ${bd} ${D ? 'bg-[#1a1a1a]' : 'bg-gray-50'}`}>
            <button
              type="button"
              onClick={() => setMode('selected')}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all
                ${mode === 'selected'
                  ? 'bg-indigo-600 text-white'
                  : `${sub} hover:opacity-80`}`}
            >
              {t.transferSelected ?? 'Tanlanganlar'} ({selected.size})
            </button>
            <button
              type="button"
              onClick={() => setMode('all')}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all
                ${mode === 'all'
                  ? 'bg-indigo-600 text-white'
                  : `${sub} hover:opacity-80`}`}
            >
              {t.transferAll ?? 'Hammasi'} ({clients.length})
            </button>
          </div>

          {mode === 'selected' && (
            <div>
              <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border mb-2 ${inp}`}>
                <Search size={13} className={sub} />
                <input
                  value={q}
                  onChange={e => setQ(e.target.value)}
                  placeholder={t.searchPlaceholder ?? 'Qidirish...'}
                  className="flex-1 bg-transparent outline-none text-sm min-w-0"
                />
              </div>
              <button
                type="button"
                onClick={toggleAllFiltered}
                className={`text-[11px] font-semibold mb-2 ${D ? 'text-indigo-300' : 'text-indigo-600'}`}
              >
                {filtered.every(c => selected.has(c.id)) && filtered.length > 0
                  ? (t.transferUnselectAll ?? 'Filtrlanganlarni bekor qilish')
                  : (t.transferSelectAll ?? 'Filtrlanganlarni tanlash')}
              </button>
              <div className={`rounded-xl border max-h-52 overflow-y-auto ${bd}`}>
                {filtered.length === 0 ? (
                  <p className={`text-xs text-center py-6 ${sub}`}>{t.noResults ?? 'Topilmadi'}</p>
                ) : (
                  filtered.map(c => {
                    const on = selected.has(c.id);
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => toggle(c.id)}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 text-left border-b last:border-0 transition-colors
                          ${bd}
                          ${on
                            ? D ? 'bg-indigo-900/25' : 'bg-indigo-50'
                            : D ? 'hover:bg-white/5' : 'hover:bg-gray-50'}`}
                      >
                        <span className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0
                          ${on
                            ? 'bg-indigo-600 border-indigo-600'
                            : D ? 'border-gray-600' : 'border-gray-300'}`}>
                          {on && <Check size={10} className="text-white" />}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold truncate">{c.name}</p>
                          <p className={`text-[10px] truncate ${sub}`}>
                            {c.code}{c.inn ? ` · INN ${c.inn}` : ''}
                          </p>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {error && (
            <div className={`px-3 py-2 rounded-xl text-xs border ${D ? 'bg-rose-900/30 border-rose-800 text-rose-300' : 'bg-rose-50 border-rose-200 text-rose-700'}`}>
              {error}
            </div>
          )}

          {result && (
            <div className={`px-3 py-3 rounded-xl border space-y-2 ${D ? 'bg-emerald-900/20 border-emerald-800' : 'bg-emerald-50 border-emerald-200'}`}>
              <p className={`text-xs font-semibold ${D ? 'text-emerald-300' : 'text-emerald-700'}`}>
                ✓ {result.transferredCount} {t.transferDone ?? "o'tkazildi"}
                {result.skippedCount > 0 && (
                  <span className={D ? 'text-amber-300' : 'text-amber-700'}>
                    {' · '}{result.skippedCount} {t.transferSkipped ?? 'o\'tkazilmadi'}
                  </span>
                )}
              </p>
              {result.skipped.filter(s => s.reason === 'inn_duplicate').length > 0 && (
                <div className="space-y-1">
                  <p className={`text-[10px] font-semibold ${sub}`}>
                    {t.transferInnDupList ?? 'INN dublikat (o\'tkazilmadi):'}
                  </p>
                  {result.skipped.filter(s => s.reason === 'inn_duplicate').map(s => (
                    <p key={s.id} className={`text-[11px] ${D ? 'text-amber-300' : 'text-amber-700'}`}>
                      {s.name} · INN {s.inn} — {reasonLabel(s.reason)}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className={`flex gap-2 px-5 py-4 border-t ${bd}`}>
          <button
            type="button"
            onClick={onClose}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border ${bd} ${D ? 'hover:bg-gray-800' : 'hover:bg-gray-50'}`}
          >
            {t.closeBtn ?? 'Yopish'}
          </button>
          <button
            type="button"
            disabled={!canSubmit}
            onClick={handleTransfer}
            className={`flex-[1.4] py-2.5 rounded-xl text-sm font-semibold text-white transition-colors
              ${canSubmit ? 'bg-indigo-600 hover:bg-indigo-500' : 'bg-indigo-600/40 cursor-not-allowed'}`}
          >
            {busy
              ? (t.loading || 'Yuklanmoqda...')
              : (t.transferBtn ?? "O'tkazish")}
          </button>
        </div>
      </div>
    </div>
  );
}
