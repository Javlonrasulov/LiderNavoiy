import { useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { Eye, EyeOff, Lock, X } from 'lucide-react';
import { useAppLock } from '../AppLockContext';

type Mode = 'set' | 'change' | 'remove';

interface Props {
  D: boolean;
  t: Record<string, string>;
  mode: Mode;
  onClose: () => void;
}

export function AppLockSetupModal({ D, t, mode, onClose }: Props) {
  const { setPasscode, changePasscode, removePasscode, minLen, maxLen } = useAppLock();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const title =
    mode === 'set'
      ? (t.appLockSetTitle ?? 'Kod-parol o‘rnatish')
      : mode === 'change'
        ? (t.appLockChangeTitle ?? 'Kod-parolni o‘zgartirish')
        : (t.appLockRemoveTitle ?? 'Kod-parolni o‘chirish');

  const inputCls = `w-full px-3.5 py-2.5 rounded-xl border text-sm outline-none transition-colors
    ${D
      ? 'bg-[#0d0d0d] border-gray-700 text-gray-100 placeholder-gray-600 focus:border-indigo-500'
      : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400 focus:border-indigo-400'}`;
  const labelCls = `text-[11px] font-semibold mb-1 block ${D ? 'text-gray-400' : 'text-gray-500'}`;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setError('');

    if (mode === 'set') {
      const n = next.trim();
      const c = confirm.trim();
      if (n.length < minLen) {
        setError((t.appLockErrShort ?? 'Kod kamida {n} belgidan iborat').replace('{n}', String(minLen)));
        return;
      }
      if (n.length > maxLen) {
        setError((t.appLockErrLong ?? 'Kod ko‘pi bilan {n} belgidan iborat').replace('{n}', String(maxLen)));
        return;
      }
      if (n !== c) {
        setError(t.appLockErrMismatch ?? 'Kodlar mos kelmadi');
        return;
      }
      setBusy(true);
      try {
        await setPasscode(n);
        onClose();
      } finally {
        setBusy(false);
      }
      return;
    }

    if (mode === 'remove') {
      if (!current.trim()) {
        setError(t.appLockErrCurrent ?? 'Joriy kod-parolni kiriting');
        return;
      }
      setBusy(true);
      try {
        const ok = await removePasscode(current);
        if (!ok) {
          setError(t.appLockWrong ?? "Noto'g'ri kod-parol");
          return;
        }
        onClose();
      } finally {
        setBusy(false);
      }
      return;
    }

    const n = next.trim();
    const c = confirm.trim();
    if (!current.trim()) {
      setError(t.appLockErrCurrent ?? 'Joriy kod-parolni kiriting');
      return;
    }
    if (n.length < minLen) {
      setError((t.appLockErrShort ?? 'Kod kamida {n} belgidan iborat').replace('{n}', String(minLen)));
      return;
    }
    if (n !== c) {
      setError(t.appLockErrMismatch ?? 'Kodlar mos kelmadi');
      return;
    }
    setBusy(true);
    try {
      const res = await changePasscode(current, n);
      if (res === 'bad_current') {
        setError(t.appLockWrong ?? "Noto'g'ri kod-parol");
        return;
      }
      onClose();
    } finally {
      setBusy(false);
    }
  };

  const type = show ? 'text' : 'password';

  return createPortal(
    <div
      className="fixed inset-0 z-[10050] flex items-center justify-center px-4"
      style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(5px)' }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-[400px] rounded-2xl border shadow-2xl overflow-hidden
          ${D ? 'bg-[#1a1a1a] border-gray-700' : 'bg-white border-gray-100'}`}
      >
        <div className={`flex items-center justify-between px-5 py-4 border-b
          ${D ? 'border-gray-700' : 'border-gray-100'}`}>
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0
              ${D ? 'bg-indigo-600/20 text-indigo-300' : 'bg-indigo-50 text-indigo-600'}`}>
              <Lock size={16} />
            </div>
            <div className="min-w-0">
              <p className={`text-sm font-semibold truncate ${D ? 'text-white' : 'text-gray-900'}`}>{title}</p>
              <p className={`text-[11px] truncate ${D ? 'text-gray-500' : 'text-gray-400'}`}>
                {t.appLockHint ?? 'Telegramdagi kabi — faqat shu qurilmada'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors
              ${D ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={onSubmit} className="p-5 space-y-3.5">
          {(mode === 'change' || mode === 'remove') && (
            <div>
              <label className={labelCls}>{t.appLockCurrent ?? 'Joriy kod-parol'}</label>
              <div className="relative">
                <input
                  type={type}
                  autoFocus
                  value={current}
                  onChange={(e) => setCurrent(e.target.value)}
                  className={`${inputCls} pr-10`}
                  autoComplete="off"
                  placeholder="••••"
                />
                <button
                  type="button"
                  onClick={() => setShow((v) => !v)}
                  className={`absolute right-2.5 top-1/2 -translate-y-1/2 p-1 ${D ? 'text-gray-500' : 'text-gray-400'}`}
                >
                  {show ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>
          )}

          {(mode === 'set' || mode === 'change') && (
            <>
              <div>
                <label className={labelCls}>{t.appLockNew ?? 'Yangi kod-parol'}</label>
                <div className="relative">
                  <input
                    type={type}
                    autoFocus={mode === 'set'}
                    value={next}
                    onChange={(e) => setNext(e.target.value)}
                    className={`${inputCls} pr-10`}
                    autoComplete="off"
                    placeholder="••••"
                    inputMode="numeric"
                  />
                  <button
                    type="button"
                    onClick={() => setShow((v) => !v)}
                    className={`absolute right-2.5 top-1/2 -translate-y-1/2 p-1 ${D ? 'text-gray-500' : 'text-gray-400'}`}
                  >
                    {show ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                <p className={`mt-1 text-[10px] ${D ? 'text-gray-600' : 'text-gray-400'}`}>
                  {(t.appLockErrShort ?? 'Kod kamida {n} belgidan iborat').replace('{n}', String(minLen))}
                </p>
              </div>
              <div>
                <label className={labelCls}>{t.appLockConfirmNew ?? 'Yangi kodni tasdiqlang'}</label>
                <input
                  type={type}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className={inputCls}
                  autoComplete="off"
                  placeholder="••••"
                  inputMode="numeric"
                />
              </div>
            </>
          )}

          {error && <p className="text-xs text-rose-500">{error}</p>}

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className={`px-3.5 py-2 rounded-xl text-sm font-medium
                ${D ? 'text-gray-300 hover:bg-gray-800' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              {t.cancel ?? 'Bekor qilish'}
            </button>
            <button
              type="submit"
              disabled={busy}
              className={`px-4 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-50
                ${mode === 'remove' ? 'bg-rose-600 hover:bg-rose-500' : 'bg-indigo-600 hover:bg-indigo-500'}`}
            >
              {busy
                ? (t.saving ?? 'Saqlanmoqda…')
                : mode === 'remove'
                  ? (t.appLockRemoveBtn ?? 'O‘chirish')
                  : (t.save ?? 'Saqlash')}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
