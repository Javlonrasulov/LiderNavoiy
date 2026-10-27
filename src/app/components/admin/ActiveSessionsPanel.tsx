import { useCallback, useEffect, useState } from 'react';
import { MonitorSmartphone, Trash2, RefreshCw } from 'lucide-react';
import { api } from '../../api/client';

type SessionRow = {
  id: string;
  userId: string;
  fullName: string;
  username: string;
  position: string | null;
  client: 'web' | 'app';
  name: string | null;
  userAgent: string | null;
  brand: string | null;
  model: string | null;
  os: string | null;
  ip: string | null;
  createdAt: string;
  lastSeenAt: string;
  current: boolean;
};

function browserLabel(ua: string | null): string | null {
  if (!ua) return null;
  const browser =
    /Edg\//.test(ua) ? 'Edge'
      : /YaBrowser\//.test(ua) ? 'Yandex'
        : /OPR\//.test(ua) ? 'Opera'
          : /Chrome\//.test(ua) ? 'Chrome'
            : /Firefox\//.test(ua) ? 'Firefox'
              : /Safari\//.test(ua) ? 'Safari'
                : null;
  const os =
    /Windows/.test(ua) ? 'Windows'
      : /Android/.test(ua) ? 'Android'
        : /iPhone|iPad/.test(ua) ? 'iOS'
          : /Mac OS X/.test(ua) ? 'macOS'
            : /Linux/.test(ua) ? 'Linux'
              : null;
  return [browser, os].filter(Boolean).join(' · ') || null;
}

export function ActiveSessionsPanel({
  card,
  sub,
}: {
  card: string;
  sub: string;
}) {
  const [rows, setRows] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.listSystemSessions();
      setRows(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Xato');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const revoke = async (s: SessionRow) => {
    try {
      await api.revokeSystemSession(s.userId, s.id);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Xato');
    }
  };

  return (
    <div className={`${card} rounded-xl p-4 mb-4`}>
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <MonitorSmartphone size={16} className="text-blue-500" />
          <h3 className="text-sm font-semibold">Faol qurilmalar / sessiyalar</h3>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10"
          title="Yangilash"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>
      <p className={`text-xs ${sub} mb-3`}>
        Boshqa qurilmadagi sessiyani o‘chirib, chiqarib yuborishingiz mumkin.
      </p>
      {error && <p className="text-xs text-red-500 mb-2">{error}</p>}
      {rows.length === 0 && !loading && (
        <p className={`text-xs ${sub}`}>Faol sessiya topilmadi</p>
      )}
      <ul className="space-y-2">
        {rows.map((s) => {
          const device =
            [s.brand, s.model].filter(Boolean).join(' ') ||
            s.name ||
            s.os ||
            browserLabel(s.userAgent) ||
            'Noma’lum qurilma';
          return (
            <li
              key={s.id}
              className="flex items-center justify-between gap-2 text-xs border border-black/5 dark:border-white/10 rounded-lg px-3 py-2"
            >
              <div className="min-w-0">
                <div className="font-semibold truncate">
                  {s.fullName}
                  {s.position && (
                    <span className="ml-1.5 font-medium text-indigo-500">· {s.position}</span>
                  )}
                  <span
                    className={`ml-2 text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                      s.client === 'app'
                        ? 'bg-amber-500/10 text-amber-600'
                        : 'bg-indigo-500/10 text-indigo-500'
                    }`}
                  >
                    {s.client === 'app' ? 'Ilova' : 'Web'}
                  </span>
                  {s.current && (
                    <span className="ml-2 text-[10px] uppercase tracking-wide text-emerald-600">
                      joriy
                    </span>
                  )}
                </div>
                <div className={`${sub} truncate`}>
                  {s.username} · {device}
                </div>
                <div className={`${sub} truncate`}>
                  {s.ip || '—'} · {new Date(s.lastSeenAt).toLocaleString()}
                </div>
              </div>
              {!s.current && (
                <button
                  type="button"
                  onClick={() => void revoke(s)}
                  className="p-1.5 rounded-lg text-red-500 hover:bg-red-500/10"
                  title="Chiqarib yuborish"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
