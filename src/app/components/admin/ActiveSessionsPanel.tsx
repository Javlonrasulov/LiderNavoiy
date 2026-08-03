import { useCallback, useEffect, useState } from 'react';
import { MonitorSmartphone, Trash2, RefreshCw } from 'lucide-react';
import { api } from '../../api/client';

type SessionRow = {
  id: string;
  brand: string | null;
  model: string | null;
  os: string | null;
  ip: string | null;
  createdAt: string;
  lastSeenAt: string;
  current: boolean;
};

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
      const data = await api.getSessions();
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

  const revoke = async (id: string) => {
    try {
      await api.revokeSession(id);
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
          const title =
            [s.brand, s.model].filter(Boolean).join(' ') ||
            s.os ||
            'Noma’lum qurilma';
          return (
            <li
              key={s.id}
              className="flex items-center justify-between gap-2 text-xs border border-black/5 dark:border-white/10 rounded-lg px-3 py-2"
            >
              <div className="min-w-0">
                <div className="font-medium truncate">
                  {title}
                  {s.current && (
                    <span className="ml-2 text-[10px] uppercase tracking-wide text-emerald-600">
                      joriy
                    </span>
                  )}
                </div>
                <div className={`${sub} truncate`}>
                  {s.ip || '—'} · {new Date(s.lastSeenAt).toLocaleString()}
                </div>
              </div>
              {!s.current && (
                <button
                  type="button"
                  onClick={() => void revoke(s.id)}
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
