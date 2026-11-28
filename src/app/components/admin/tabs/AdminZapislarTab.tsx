import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Mic, Play, Pause, Search, ChevronLeft, ChevronRight, ExternalLink, Loader2,
} from 'lucide-react';
import { api, type VisitRecordingRecord } from '../../../api/client';
import { DateRangePicker } from '../DateRangePicker';

interface Props {
  D: boolean;
  sub: string;
  text: string;
  card: string;
  divider: string;
  t: Record<string, string>;
  selectedCompanyIds: Set<string>;
  onOpenVisit?: (visitId: string) => void;
  onOpenOrder?: (orderId: string) => void;
}

function fmtDur(sec: number | null | undefined) {
  if (sec == null || sec < 0) return '—';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function fmtWhen(iso: string) {
  try {
    return new Date(iso).toLocaleString('ru-RU', {
      timeZone: 'Asia/Tashkent',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function outcomeLabel(t: Record<string, string>, outcome: string) {
  switch (outcome) {
    case 'with_order':
      return t.zapOutcomeOrder || 'Buyurtma bilan';
    case 'without_order':
      return t.zapOutcomeNoOrder || 'Buyurtmasiz';
    case 'cancelled':
      return t.zapOutcomeCancel || 'Bekor';
    default:
      return t.zapOutcomeUnknown || '—';
  }
}

function audioStateLabel(t: Record<string, string>, state: string) {
  switch (state) {
    case 'ready':
      return t.zapReady || 'Tayyor';
    case 'pending_upload':
      return t.zapPendingUpload || 'Yuklanmoqda';
    case 'interrupted':
      return t.zapInterrupted || 'Uzilgan';
    case 'expired':
      return t.zapExpired || 'Muddati tugagan';
    case 'error':
      return t.zapError || 'Xato';
    default:
      return t.zapUnavailable || 'Mavjud emas';
  }
}

export function AdminZapislarTab({
  D, sub, text, card, divider, t, selectedCompanyIds, onOpenVisit, onOpenOrder,
}: Props) {
  const companyId = useMemo(() => {
    const ids = Array.from(selectedCompanyIds);
    return ids.length === 1 ? ids[0] : ids[0];
  }, [selectedCompanyIds]);

  const [q, setQ] = useState('');
  const [qDebounced, setQDebounced] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [items, setItems] = useState<VisitRecordingRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [playError, setPlayError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const pageSize = 20;

  useEffect(() => {
    const id = window.setTimeout(() => setQDebounced(q.trim()), 300);
    return () => window.clearTimeout(id);
  }, [q]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.listRecordingsAdmin({
        companyId: Array.from(selectedCompanyIds).join(',') || undefined,
        from: from || undefined,
        to: to ? `${to}T23:59:59.999+05:00` : undefined,
        q: qDebounced || undefined,
        page,
        pageSize,
      });
      setItems(res.items || []);
      setTotal(res.total || 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : (t.zapLoadError || 'Yuklash xatosi'));
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [selectedCompanyIds, from, to, qDebounced, page, t.zapLoadError]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [companyId, from, to, qDebounced]);

  useEffect(() => () => {
    audioRef.current?.pause();
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
  }, []);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const stopPlayback = () => {
    audioRef.current?.pause();
    audioRef.current = null;
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    setPlayingId(null);
  };

  const togglePlay = async (row: VisitRecordingRecord) => {
    setPlayError(null);
    if (playingId === row.id) {
      stopPlayback();
      return;
    }
    if (!row.hasAudio || row.audioState === 'expired') {
      setPlayError(
        row.audioState === 'expired'
          ? (t.zapExpired || 'Muddati tugagan')
          : (t.zapUnavailable || 'Audio mavjud emas'),
      );
      return;
    }
    stopPlayback();
    try {
      const blob = await api.fetchRecordingAudioAdmin(row.id);
      const url = URL.createObjectURL(blob);
      objectUrlRef.current = url;
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => stopPlayback();
      audio.onerror = () => {
        setPlayError(t.zapPlayError || 'Ijro xatosi');
        stopPlayback();
      };
      setPlayingId(row.id);
      await audio.play();
    } catch (e) {
      setPlayError(e instanceof Error ? e.message : (t.zapPlayError || 'Ijro xatosi'));
      stopPlayback();
    }
  };

  const border = D ? '#2a2a2e' : '#e5e7eb';
  const muted = sub;
  const txt = text;
  const indigo = '#5E48E8';

  return (
    <div className="space-y-4">
      <div
        className="rounded-2xl border p-4 md:p-5"
        style={{ background: card, borderColor: divider }}
      >
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[180px]">
            <label className="block text-[11px] font-semibold mb-1.5" style={{ color: muted }}>
              {t.zapSearch || 'Qidiruv'}
            </label>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: muted }} />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={t.zapSearchPh || 'Agent, mijoz, kod...'}
                className="w-full pl-9 pr-3 py-2.5 rounded-xl text-sm outline-none border"
                style={{ background: D ? '#121214' : '#f9fafb', borderColor: border, color: txt }}
              />
            </div>
          </div>
          <div className="shrink-0">
            <label className="block text-[11px] font-semibold mb-1.5" style={{ color: muted }}>
              {t.zapFrom || 'Dan'} — {t.zapTo || 'Gacha'}
            </label>
            <DateRangePicker
              from={from}
              to={to}
              onChange={(f, t2) => { setFrom(f); setTo(t2); }}
              onClear={() => { setFrom(''); setTo(''); }}
              D={D}
              compact
              align="right"
            />
          </div>
        </div>
        {playError && (
          <div className="mt-3 text-xs text-red-500">{playError}</div>
        )}
      </div>

      <div
        className="rounded-2xl border overflow-hidden"
        style={{ background: card, borderColor: divider }}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[900px]">
            <thead>
              <tr style={{ borderBottom: `1px solid ${divider}`, color: muted }}>
                <th className="text-left font-semibold px-4 py-3">{t.zapColAgent || 'Agent'}</th>
                <th className="text-left font-semibold px-4 py-3">{t.zapColClient || 'Mijoz'}</th>
                <th className="text-left font-semibold px-4 py-3">{t.zapColTime || 'Vaqt'}</th>
                <th className="text-left font-semibold px-4 py-3">{t.zapColDur || 'Davomiylik'}</th>
                <th className="text-left font-semibold px-4 py-3">{t.zapColOutcome || 'Natija'}</th>
                <th className="text-left font-semibold px-4 py-3">{t.zapColOrder || 'Buyurtma'}</th>
                <th className="text-left font-semibold px-4 py-3">{t.zapColStatus || 'Audio'}</th>
                <th className="text-right font-semibold px-4 py-3">{t.zapColPlay || 'Ijro'}</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={8} className="px-4 py-16 text-center" style={{ color: muted }}>
                    <Loader2 className="inline animate-spin mr-2" size={16} />
                    {t.loading || 'Yuklanmoqda...'}
                  </td>
                </tr>
              )}
              {!loading && error && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-red-500">{error}</td>
                </tr>
              )}
              {!loading && !error && items.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-16 text-center" style={{ color: muted }}>
                    <Mic size={28} className="mx-auto mb-2 opacity-40" />
                    {t.zapEmpty || 'Yozuvlar topilmadi'}
                  </td>
                </tr>
              )}
              {!loading && !error && items.map((row) => (
                <tr
                  key={row.id}
                  style={{ borderBottom: `1px solid ${D ? 'rgba(255,255,255,0.04)' : '#f3f4f6'}` }}
                >
                  <td className="px-4 py-3 font-medium" style={{ color: txt }}>
                    {row.agentName || '—'}
                  </td>
                  <td className="px-4 py-3" style={{ color: txt }}>
                    <div className="font-medium">{row.clientName}</div>
                    <div className="text-xs" style={{ color: muted }}>{row.clientCode}</div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap" style={{ color: txt }}>
                    {fmtWhen(row.startedAt)}
                  </td>
                  <td className="px-4 py-3" style={{ color: txt }}>
                    {fmtDur(row.durationSeconds)}
                  </td>
                  <td className="px-4 py-3" style={{ color: txt }}>
                    {outcomeLabel(t, row.visitOutcome)}
                  </td>
                  <td className="px-4 py-3" style={{ color: txt }}>
                    {row.orderId ? (
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 text-xs font-semibold"
                        style={{ color: indigo }}
                        onClick={() => onOpenOrder?.(row.orderId!)}
                        title={row.orderId}
                      >
                        {row.orderTotal?.toLocaleString?.('ru-RU') ?? row.orderTotal}
                        <ExternalLink size={12} />
                      </button>
                    ) : (
                      <span style={{ color: muted }}>—</span>
                    )}
                    {row.visitId && (
                      <button
                        type="button"
                        className="block text-[11px] mt-0.5 opacity-70 hover:opacity-100"
                        style={{ color: indigo }}
                        onClick={() => onOpenVisit?.(row.visitId)}
                      >
                        {t.zapOpenVisit || 'Tashrif'}
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className="inline-flex px-2 py-0.5 rounded-md text-[11px] font-semibold"
                      style={{
                        background: row.audioState === 'ready' ? `${indigo}18` : D ? 'rgba(255,255,255,0.06)' : '#f3f4f6',
                        color: row.audioState === 'ready' ? indigo : muted,
                      }}
                    >
                      {audioStateLabel(t, row.audioState)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => void togglePlay(row)}
                      disabled={!row.hasAudio || row.audioState === 'expired'}
                      className="inline-flex items-center justify-center w-9 h-9 rounded-xl disabled:opacity-40"
                      style={{
                        background: playingId === row.id ? indigo : D ? 'rgba(255,255,255,0.06)' : '#f3f4f6',
                        color: playingId === row.id ? '#fff' : txt,
                      }}
                      aria-label={playingId === row.id ? 'Pause' : 'Play'}
                    >
                      {playingId === row.id ? <Pause size={16} /> : <Play size={16} />}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div
          className="flex items-center justify-between px-4 py-3 text-xs"
          style={{ borderTop: `1px solid ${divider}`, color: muted }}
        >
          <span>
            {total} {t.zapFound || 'ta yozuv'}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="w-8 h-8 rounded-lg flex items-center justify-center disabled:opacity-40 border"
              style={{ borderColor: border, color: txt }}
            >
              <ChevronLeft size={14} />
            </button>
            <span style={{ color: txt }}>{page} / {totalPages}</span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="w-8 h-8 rounded-lg flex items-center justify-center disabled:opacity-40 border"
              style={{ borderColor: border, color: txt }}
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
