import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Smile, Unlock } from 'lucide-react';
import { useAppLock } from '../AppLockContext';
import { useAdminAuth } from '../AdminAuthContext';
import { useTheme } from '../ThemeContext';

interface Props {
  t: Record<string, string>;
}

export function AppLockScreen({ t }: Props) {
  const { isLocked, unlock } = useAppLock();
  const { logout } = useAdminAuth();
  const { isDark } = useTheme();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isLocked) {
      setCode('');
      setError('');
      return;
    }
    const id = window.setTimeout(() => inputRef.current?.focus(), 80);
    return () => window.clearTimeout(id);
  }, [isLocked]);

  useEffect(() => {
    if (!isLocked) return;
    const block = (e: KeyboardEvent) => {
      if (e.key === 'Escape') e.preventDefault();
    };
    window.addEventListener('keydown', block, true);
    return () => window.removeEventListener('keydown', block, true);
  }, [isLocked]);

  if (!isLocked) return null;

  const D = isDark;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setError('');
    setBusy(true);
    try {
      const ok = await unlock(code);
      if (!ok) {
        setError(t.appLockWrong ?? "Noto'g'ri kod-parol");
        setCode('');
        inputRef.current?.focus();
      }
    } finally {
      setBusy(false);
    }
  };

  const onLogout = () => {
    logout();
    window.location.assign('/admin/login');
  };

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={t.appLockTitle ?? 'Kod-parolni kiriting'}
      style={{
        background: D
          ? 'radial-gradient(ellipse at 50% 20%, #1a2744 0%, #0b1220 55%, #070b14 100%)'
          : 'radial-gradient(ellipse at 50% 20%, #e8eef8 0%, #d7e0ee 55%, #c9d4e4 100%)',
      }}
    >
      <form
        onSubmit={onSubmit}
        className={`w-full max-w-sm rounded-3xl border px-6 pt-10 pb-8 shadow-2xl
          ${D ? 'bg-[#0f1728]/90 border-sky-500/25' : 'bg-white/95 border-sky-300/60'}`}
      >
        <div className="flex justify-center mb-5">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center
            ${D ? 'bg-sky-500/15 text-sky-300' : 'bg-sky-100 text-sky-600'}`}>
            <Unlock size={28} strokeWidth={1.8} />
          </div>
        </div>

        <h1 className={`text-center text-xl font-semibold mb-8 ${D ? 'text-white' : 'text-slate-800'}`}>
          {t.appLockTitle ?? 'Kod-parolni kiriting'}
        </h1>

        <label className={`block text-xs font-semibold mb-2 ${D ? 'text-sky-300' : 'text-sky-600'}`}>
          {t.appLockCodeLabel ?? 'Kirish kodi'}
        </label>
        <div className={`relative mb-2 border-b ${D ? 'border-sky-400/40' : 'border-sky-400/70'}`}>
          <input
            ref={inputRef}
            type="password"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={code}
            onChange={(e) => {
              setCode(e.target.value);
              if (error) setError('');
            }}
            className={`w-full bg-transparent outline-none py-2.5 pr-10 text-base tracking-[0.2em]
              ${D ? 'text-white placeholder:text-slate-500' : 'text-slate-900 placeholder:text-slate-400'}`}
            placeholder="••••"
            disabled={busy}
          />
          <Smile
            size={18}
            className={`absolute right-0 top-1/2 -translate-y-1/2 opacity-70
              ${D ? 'text-sky-300' : 'text-sky-500'}`}
          />
        </div>

        {error && (
          <p className="text-xs text-rose-400 mb-3">{error}</p>
        )}

        <button
          type="submit"
          disabled={busy || !code.trim()}
          className="mt-5 w-full rounded-xl bg-sky-500 hover:bg-sky-400 disabled:opacity-50
            text-white font-semibold py-3.5 transition-colors shadow-lg shadow-sky-900/20"
        >
          {busy ? (t.appLockChecking ?? 'Tekshirilmoqda…') : (t.appLockConfirm ?? 'Tasdiqlash')}
        </button>

        <button
          type="button"
          onClick={onLogout}
          className={`mt-4 w-full text-center text-sm font-medium transition-colors
            ${D ? 'text-sky-300/80 hover:text-sky-200' : 'text-sky-600 hover:text-sky-800'}`}
        >
          {t.logout ?? 'Chiqish'}
        </button>
      </form>
    </div>
  );
}
